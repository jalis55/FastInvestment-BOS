from .schema import ErrorSerializer, ProfitDisbursementResultSerializer, ProjectClosedSerializer, StockMessageSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
import json
import logging
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import (Case, DecimalField, ExpressionWrapper, F,
                              FloatField, IntegerField, Q, Sum, When)
from django.db.models.functions import Coalesce
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounting.models import Account, Transaction
from stock_app.utils import investor_contributions_map, update_customer_balance
from stock_app.market_prices import MarketPriceError, get_daily_prices
from user_app.permissions import IsSuperUser

from .distribution import allocation_row, calculate_distribution, recorded_allocation_rows
from .models import (AccountReceivable, FinAdvisorCommission, FinancialAdvisor,
                     Instrument, Investment, InvestorProfit, Profit, Project,
                     Trade)
from .serializers import (AccountReceivableDetailsSerializer,
                          AccountReceivableSerializer,
                          ClientInvestmentDetailsSerializer,
                          DisbursementReportFilterSerializer,
                          FinancialAdvisorAddSerializer,
                          FinancialAdvisorSerializer, InstrumentSerializer,
                          InvestmentContributionSerializer,
                          InvestmentSerializer, InvestorProfitSerializer,
                          ProfitDisburseSerializer, ProfitSerializer,
                          ProjectBalanceDetailsSerializer,
                          ProjectCloseSerializer, ProjectCommissionSerializer, ProjectCreateSerializer,
                          ProjectStatusSerializer,ProjectListSerializer,
                          SellableInstrumentSerializer, TradeDetailsSerializer,
                          TradeSerializer, UserDetailsSerializer)

User=get_user_model()
logger = logging.getLogger(__name__)


@extend_schema(summary='Create a project', description='Creates a project and records the current user as creator.')
class ProjectCreateView(generics.CreateAPIView):
    serializer_class=ProjectCreateSerializer
    permission_classes=[IsAdminUser]

    def perform_create(self,serializer):
        serializer.save(created_by=self.request.user)


@extend_schema(summary='List projects', description='Lists all projects, active first, then newest opening date. Includes creator and closer details.')
class ProjectListView(generics.ListAPIView):
    queryset = Project.objects.all().order_by('-project_active_status', '-project_opening_dt')
    serializer_class=ProjectListSerializer
    permission_classes=[AllowAny]
    

@extend_schema(summary='Get project status', description='Returns the project ID, active status, and trade commission percentage.')
class ProjectStatusRetriveView(generics.RetrieveAPIView):
    queryset=Project.objects.all()
    serializer_class=ProjectStatusSerializer
    permission_classes=[IsAdminUser]


@extend_schema(summary='Set a project trade commission rate')
class ProjectCommissionView(generics.UpdateAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectCommissionSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['patch', 'options']


@extend_schema(summary='Get project balances', description='Aggregates investments, buy/sell amounts, and accrued profit. Available balance is clamped to zero.')
class ProjectBalanceDetailsView(generics.RetrieveAPIView):
    serializer_class = ProjectBalanceDetailsSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        project_id = self.kwargs['pk']
        project = get_object_or_404(Project, pk=project_id)

        total_investment=project.investment_project_details.aggregate(t=Sum('amount'))['t'] or 0

        gross = F('qty') * F('unit_price')
        trade_totals = project.trade_project_details.values('trns_type').annotate(
            total=Sum(Case(
                When(commission_rate__isnull=True, then=F('qty') * F('actual_unit_price')),
                When(trns_type=Trade.BUY, then=gross + F('total_commission')),
                default=gross - F('total_commission'),
                output_field=DecimalField(max_digits=100, decimal_places=2),
            )),
        )
        totals = {row['trns_type']: row['total'] for row in trade_totals}
        total_buy = totals.get(Trade.BUY) or Decimal('0.00')
        total_sell = totals.get(Trade.SELL) or Decimal('0.00')

        total_profit=project.profit_project_details.aggregate(t=Sum('amount'))['t'] or 0

        cash_dividends = project.dividends.filter(dividend_type='cash').aggregate(t=Sum('amount'))['t'] or 0
        available_balance = total_investment - total_buy + total_sell + cash_dividends - total_profit

        return {
            "project_id": project_id,
            "total_investment": total_investment,
            "total_buy_amount": total_buy,
            "total_sell_amount": total_sell,
            "accrued_profit": total_profit,
            "cash_dividends": cash_dividends,
            "available_balance": max(available_balance, Decimal('0.00'))
        }




@extend_schema(summary='Close a project', description='Closes a project and credits investor returns. Supply total_investment and closing_balance even for PATCH: the implementation reads both directly. Other totals are optional. Already closed projects return 400; missing projects return 404. This view requires staff access.')
@extend_schema(request=ProjectCloseSerializer, responses={200: ProjectClosedSerializer, 400: ErrorSerializer, 404: ErrorSerializer, 500: ErrorSerializer}, parameters=[OpenApiParameter("pk", OpenApiTypes.STR, OpenApiParameter.PATH, description="Eight-digit project ID.")])
class ProjectCloseView(APIView):
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def __prepare_transactions(self, project, closing_bal, total_investment):
        """Prepare investor transactions atomically"""
        investors_contrib = investor_contributions_map(project)
        
        print(investors_contrib)
        for investor, amount in investors_contrib.items():

            percentage = round((amount /total_investment) *100, 2)
            customer = User.objects.get(id=investor)

            amount=(closing_bal * percentage) / 100
            Transaction.objects.create(
                user=customer,
                amount=amount,
                transaction_type='deposit',
                narration=f'Return from project {project}',
                status='completed',
                issued_date=timezone.now(),
                issued_by=self.request.user,
            )
            update_customer_balance(customer,amount)


    @transaction.atomic
    def patch(self, request, pk, format=None):
        """Close project atomically - all operations succeed or fail together"""
        try:
            # Use select_for_update to lock the project row for update
            project = Project.objects.select_for_update().get(pk=pk)
            
            # Check if project is already closed
            if not project.project_active_status:
                return Response(
                    {"error": "Project is already closed"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = ProjectCloseSerializer(project, data=request.data, partial=True)
            
            if serializer.is_valid():
                # Calculate gain/loss
                gain_lose = project.receivable_project_details.aggregate(
                    t=Sum('gain_lose')
                )['t'] or 0
                
                # Prepare data for update
                update_data = {
                    'project_closing_dt': timezone.now(),
                    'project_active_status': False,
                    'gain_or_loss': gain_lose,
                    'closed_by': request.user,
                    **serializer.validated_data
                }
                
                # Update project
                for attr, value in update_data.items():
                    setattr(project, attr, value)
                project.save()
                
                # Prepare transactions (this is also atomic and part of the main transaction)
                self.__prepare_transactions(
                    project, 
                    serializer.validated_data['closing_balance'], 
                    serializer.validated_data['total_investment']
                )
                
                # Return response with updated data
                response_serializer = ProjectCloseSerializer(project)
                return Response({
                    "status": "closed", 
                    "data": response_serializer.data
                })
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            # Transaction will be automatically rolled back due to @transaction.atomic
            return Response(
                {"error": f"Failed to close project: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



@extend_schema(summary='List instruments', description='Returns instrument IDs and names.')
class InstrumentListView(generics.ListAPIView):
    queryset = Instrument.objects.all()
    serializer_class = InstrumentSerializer
    permission_classes = [IsAdminUser]  # Allow any user to view instruments

@extend_schema(summary='Get daily market reference prices', description='Returns AmarStock Close prices, falling back to YCP when Close is zero. The source is fetched at most once per Asia/Dhaka calendar day. A stale flag indicates the last successful snapshot is being served after an upstream failure.')
@extend_schema(responses={200: {'type': 'object', 'properties': {
    'prices': {'type': 'object', 'additionalProperties': {'type': 'string'}},
    'fetched_on': {'type': 'string', 'format': 'date'},
    'stale': {'type': 'boolean'},
}}, 503: {'type': 'object', 'properties': {'detail': {'type': 'string'}}}})
class InstrumentClosePriceView(APIView):
    permission_classes=[AllowAny]

    def get(self, request):
        try:
            return Response(get_daily_prices())
        except MarketPriceError:
            return Response({'detail': 'Market prices are temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)




@extend_schema(summary='List sellable holdings', description='Returns instruments with positive remaining quantity for the project. Moving average cost includes bonus shares at zero added cost and removes sold quantities at their average cost.')
@extend_schema(responses=SellableInstrumentSerializer(many=True))
class SellableInstrumentView(APIView):
    permission_classes = [IsAdminUser]
    serializer_class = SellableInstrumentSerializer

    def get_project(self, project_id):
        try:
            return Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            raise NotFound("Project not found.")

    def get(self, request, project_id, *args, **kwargs):
        from .holdings import project_holdings
        project = self.get_project(project_id)
        rows = [row for row in project_holdings(project).values() if row['available_quantity'] > 0]
        return Response(self.serializer_class(rows, many=True).data)

@extend_schema(summary='Record a trade', description='Records a buy or sell trade. Trade date and authorizer are assigned by the server; commission and actual unit price are calculated on save.')
class TradeCreateView(generics.CreateAPIView):
    queryset = Trade.objects.all()
    serializer_class = TradeSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(authorized_by=self.request.user)

@extend_schema(summary='Delete a trade', description='Deletes a trade by UUID. Returns HTTP 204 without a response body.')
class TradeDeleteView(generics.DestroyAPIView):
    queryset=Trade.objects.all()
    serializer_class=TradeSerializer
    permission_classes=[IsAdminUser]
    lookup_url_kwarg = 'trade_id'



@extend_schema(summary='List trade details', description='Optionally filters by project_id. Date filtering is applied only when from_dt, to_dt, and project_id are all supplied.')
@extend_schema(parameters=[OpenApiParameter('project_id', OpenApiTypes.STR, description='Project ID (eight digits).'), OpenApiParameter('from_dt', OpenApiTypes.DATE, description='Inclusive start trade date (YYYY-MM-DD).'), OpenApiParameter('to_dt', OpenApiTypes.DATE, description='Inclusive end trade date (YYYY-MM-DD).')])
class TradeDetailsListView(generics.ListAPIView):
    serializer_class = TradeDetailsSerializer
    permission_classes=[IsAdminUser]

    def get_queryset(self):
        # Extract query parameters
        from_dt = self.request.query_params.get('from_dt')
        to_dt = self.request.query_params.get('to_dt')
        project_id = self.request.query_params.get('project_id')

        # Start with the base queryset
        # queryset = Trade.objects.all()
        queryset = Trade.objects.select_related('instrument')


        # Apply date range filter
        if from_dt and to_dt and project_id:
            queryset = queryset.filter(trade_date__gte=from_dt, trade_date__lte=to_dt)

        # Apply project filter
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        return queryset



@extend_schema(summary='Record accrued profit', description='Creates a profit record linked to a project and trade.')
class ProfitCreateView(generics.CreateAPIView):
    queryset = Profit.objects.all()
    serializer_class = ProfitSerializer
    permission_classes=[IsAdminUser]

@extend_schema(summary='Add an investment', description='Requires a positive amount. Withdraws funds from the investor account and records a completed payment and investment atomically.')
class InvestmentCreateAPIView(generics.CreateAPIView):
    queryset = Investment.objects.all()
    serializer_class = InvestmentSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(authorized_by=self.request.user)

@extend_schema(summary='List your investments', description='Returns investments belonging to the current user.')
class ClientInvestmentDetailsListView(generics.ListAPIView):
    serializer_class = ClientInvestmentDetailsSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        queryset=Investment.objects.filter(investor=self.request.user)
        return queryset
    
@extend_schema(summary='Get investor contributions', description='Returns nested investor details, contribution amounts, and percentages for a project.')
@extend_schema(responses=InvestmentContributionSerializer(many=True))
class InvestorContributionRetrieveAPI(APIView):
    permission_classes = [IsAdminUser]
    serializer_class = InvestmentContributionSerializer

    def get(self, request, project_id, *args, **kwargs):
        project = get_object_or_404(Project, project_id=project_id)
        contrib_map = investor_contributions_map(project)
        total = sum(contrib_map.values())

        # build payload
        users = User.objects.in_bulk(contrib_map.keys())
        data = [
            {
                'investor': users[user_id],
                'contribute_amount': amount,
                'contribution_percentage': round(amount * 100 / total, 2) if total else 0,
            }
            for user_id, amount in contrib_map.items()
        ]
        serializer = self.serializer_class(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)



@extend_schema(summary='List your investor profits', description='Returns profit allocations belonging to the current user.')
class InvestorProfitDetailsView(generics.ListAPIView):
    serializer_class=InvestorProfitSerializer
    permission_classes=[IsAuthenticated]

    def get_queryset(self):
        return InvestorProfit.objects.filter(investor=self.request.user)
    


@extend_schema(summary='List or assign financial advisors', description='GET lists all advisor assignments. POST assigns an advisor user to a project with a commission percentage.')
class AddFinancialAdvisorListCreateView(generics.ListCreateAPIView):
    queryset = FinancialAdvisor.objects.all()
    serializer_class = FinancialAdvisorAddSerializer
    permission_classes=[IsAdminUser]





@extend_schema(summary='List project advisor assignments', description='Returns assignments and configured percentages, with nested advisor details. This endpoint does not return paid commission records.')
class FinancialAdvisorListView(generics.ListAPIView):
    serializer_class = FinancialAdvisorSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        # Filter FinancialAdvisor objects by project_id
        return FinancialAdvisor.objects.filter(project=project_id)


    
@extend_schema(summary='Record a receivable', description='Creates a project/trade gain or loss record; authorized_by is assigned to the current user.')
class AccountReceivableCreateApiView(generics.CreateAPIView):
    queryset = Trade.objects.all()
    serializer_class = AccountReceivableSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(authorized_by=self.request.user)
    

@extend_schema(summary='List accrued profit records', description='Returns individual records, not an aggregated total. Optional project_id, from_dt/to_dt, and is_disbursed filters. Both dates must be supplied for date filtering.')
@extend_schema(parameters=[OpenApiParameter('project_id', OpenApiTypes.STR, description='Project ID (eight digits).'), OpenApiParameter('from_dt', OpenApiTypes.DATE, description='Inclusive start trade date (YYYY-MM-DD).'), OpenApiParameter('to_dt', OpenApiTypes.DATE, description='Inclusive end trade date (YYYY-MM-DD).'), OpenApiParameter('is_disbursed', OpenApiTypes.BOOL, description='Filter disbursement status: true or false.')])
class ProjectProfitTotalListApiView(generics.ListAPIView):
    serializer_class=ProfitSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        from_dt = self.request.query_params.get('from_dt')
        to_dt = self.request.query_params.get('to_dt')
        is_disbursed=self.request.query_params.get('is_disbursed')

        # Initialize the queryset
        queryset = Profit.objects.all()


        # Apply date range filtering if both from_dt and to_dt are provided
        if from_dt and to_dt:
            queryset = queryset.filter(Q(trade__trade_date__range=(from_dt, to_dt)) | Q(dividend__received_date__range=(from_dt, to_dt)))

        # If project_id is provided, filter by project_id and calculate the total profit for that project
        if project_id:
            queryset=queryset.filter(project=project_id)
        if is_disbursed:
            queryset=queryset.filter(disburse_st=is_disbursed)

        
        return queryset


    

@extend_schema(summary='List receivables', description='Filters by project_id and optionally an inclusive trade date range. Omitting project_id yields no matching project records.')
@extend_schema(parameters=[OpenApiParameter('project_id', OpenApiTypes.STR, description='Project ID (eight digits).'), OpenApiParameter('from_dt', OpenApiTypes.DATE, description='Inclusive start trade date (YYYY-MM-DD).'), OpenApiParameter('to_dt', OpenApiTypes.DATE, description='Inclusive end trade date (YYYY-MM-DD).')])
class AccountRecivableDetailsListApiView(generics.ListAPIView):

    serializer_class=AccountReceivableDetailsSerializer
    permission_classes=[IsAdminUser]

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        from_dt=self.request.query_params.get('from_dt')
        to_dt=self.request.query_params.get('to_dt')

        

        queryset=AccountReceivable.objects.filter(project=project_id)
        if from_dt and to_dt:
            queryset=queryset.filter(trade__trade_date__gte=from_dt, trade__trade_date__lte=to_dt)

        return queryset




class DisbursementDetailsView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(summary='Report recorded disbursements for a project', parameters=[DisbursementReportFilterSerializer])
    def get(self, request, project_id):
        serializer = DisbursementReportFilterSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        project = get_object_or_404(Project, pk=project_id)
        filters = {'project': project, 'disburse_dt__isnull': False}
        if 'from_dt' in serializer.validated_data:
            filters['disburse_dt__date__gte'] = serializer.validated_data['from_dt']
        if 'to_dt' in serializer.validated_data:
            filters['disburse_dt__date__lte'] = serializer.validated_data['to_dt']

        return Response({
            'project_title': project.project_title,
            'investor_rows': recorded_allocation_rows(InvestorProfit, 'investor', **filters),
            'advisor_rows': recorded_allocation_rows(FinAdvisorCommission, 'advisor', **filters),
        })


class ProfitDisburse(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(summary='Preview project profit disbursement', parameters=[ProfitDisburseSerializer])
    def get(self, request):
        serializer = ProfitDisburseSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        project, profits, commissions, allocations, payouts = self._prepare_distribution(serializer.validated_data)
        users = User.objects.in_bulk(payouts)
        return Response({
            'project_active': project.project_active_status,
            'profit_count': len(profits),
            'gross': sum(profit.amount for profit in profits),
            'advisor_rows': [allocation_row(row, users[row.advisor_id]) for row in commissions],
            'investor_rows': [allocation_row(row, users[row.investor_id]) for row in allocations],
            'recipients': [
                {
                    'user': UserDetailsSerializer(users[user_id]).data,
                    'advisor_amount': advisor_amount,
                    'investor_amount': investor_amount,
                }
                for user_id, (advisor_amount, investor_amount) in payouts.items()
            ],
        })

    @extend_schema(
        summary='Disburse project profits',
        description='Pays accrued trade profits and cash dividends to wallets, reinvests them, or splits each payout between both.',
        request=ProfitDisburseSerializer,
        responses={200: ProfitDisbursementResultSerializer, 404: StockMessageSerializer, 500: ErrorSerializer},
    )
    def post(self, request):
        serializer = ProfitDisburseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                return self._disburse(serializer.validated_data, request.user)
        except (Http404, ValidationError):
            raise
        except Exception:
            logger.exception('Project profit disbursement failed')
            return Response(
                {'error': 'An error occurred during profit disbursement.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _prepare_distribution(self, criteria, *, lock=False):
        projects = Project.objects.select_for_update() if lock else Project.objects.all()
        project = get_object_or_404(projects, pk=criteria['project_id'])
        date_range = (criteria['from_dt'], criteria['to_dt'])
        profits = list(Profit.objects.filter(project=project, disburse_st=False).filter(
            Q(trade__trade_date__range=date_range) | Q(dividend__received_date__range=date_range),
        ).select_related('trade', 'dividend').order_by('pk'))
        commissions, allocations, payouts = calculate_distribution(
            project, profits, FinancialAdvisor.objects.filter(project=project).order_by('pk'),
            project.investment_project_details.all(),
        )
        return project, profits, commissions, allocations, payouts

    def _disburse(self, criteria, issued_by):
        project, profits, commissions, allocations, payouts = self._prepare_distribution(criteria, lock=True)
        if not profits:
            return Response({'message': 'No profits found for disbursement'}, status=status.HTTP_404_NOT_FOUND)

        reinvest_ids = set(criteria['reinvest_recipient_ids'])
        splits = {split['recipient_id']: split['amount'] for split in criteria['reinvest_splits']}
        if (reinvest_ids or splits) and not project.project_active_status:
            raise ValidationError({'reinvest_recipient_ids': 'Reinvestment requires an active project.'})
        if any(sum(payouts.get(user_id, (0, 0))) <= 0 for user_id in reinvest_ids):
            raise ValidationError({'reinvest_recipient_ids': 'Select only recipients with a positive payout in this period.'})
        if any(amount >= sum(payouts.get(user_id, (0, 0))) for user_id, amount in splits.items()):
            raise ValidationError({'reinvest_splits': 'Each split must reinvest less than the recipient’s total payout.'})

        reinvestments = {}
        wallet_total = Decimal('0.00')
        reinvested_total = Decimal('0.00')
        payout_label = 'Cash dividend' if all(profit.dividend_id for profit in profits) else 'Payout'
        for user_id, (advisor_amount, investor_amount) in payouts.items():
            amount = advisor_amount + investor_amount
            reinvest_amount = amount if user_id in reinvest_ids else splits.get(user_id, Decimal('0.00'))
            wallet_amount = amount - reinvest_amount
            if reinvest_amount:
                reinvestments[user_id] = Investment.objects.create(
                    project=project, investor_id=user_id, amount=reinvest_amount,
                    is_reinvestment=True, authorized_by=issued_by,
                )
                self._credit_payout(
                    user_id, amount, f'{payout_label} from project {project.pk}', issued_by,
                    reinvestment=reinvestments[user_id],
                )
            else:
                for payment, label in ((advisor_amount, 'Commission'), (investor_amount, 'Profit')):
                    if payment:
                        self._credit_payout(user_id, payment, f'{label} from project {project.pk}', issued_by)
            wallet_total += wallet_amount
            reinvested_total += reinvest_amount

        disbursed_at = timezone.now()
        for row in commissions:
            row.disburse_dt = disbursed_at
            row.reinvestment = reinvestments.get(row.advisor_id)
        for row in allocations:
            row.disburse_dt = disbursed_at
            row.reinvestment = reinvestments.get(row.investor_id)
        FinAdvisorCommission.objects.bulk_create(commissions)
        InvestorProfit.objects.bulk_create(allocations)
        Profit.objects.filter(pk__in=[profit.pk for profit in profits]).update(disburse_st=True, disburse_dt=disbursed_at)
        return Response({
            'message': 'Profit disbursement completed successfully',
            'wallet_total': wallet_total,
            'reinvested_total': reinvested_total,
        })

    def _credit_payout(self, user_id, amount, narration, issued_by, *, reinvestment=None):
        account = Account.objects.select_for_update().get(user_id=user_id)
        Transaction.objects.create(
            user_id=user_id, amount=amount, transaction_type='deposit',
            narration=narration, status='completed', issued_by=issued_by,
        )
        if reinvestment is not None:
            Transaction.objects.create(
                user_id=user_id, amount=reinvestment.amount, transaction_type='payment',
                trans_mode='internal', narration=f'Reinvestment in project {reinvestment.project_id}',
                status='completed', issued_by=issued_by,
            )
            amount -= reinvestment.amount
        if amount:
            account.deposit(amount)
