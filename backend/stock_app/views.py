import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import (Case, DecimalField, ExpressionWrapper, F,
                              FloatField, IntegerField, Q, Sum, When)
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounting.models import Account, Transaction
from stock_app.utils import investor_contributions_map, update_customer_balance
from user_app.permissions import IsSuperUser

from .models import (AccountReceivable, FinAdvisorCommission, FinancialAdvisor,
                     Instrument, Investment, InvestorProfit, Profit, Project,
                     Trade)
from .serializers import (AccountReceivableDetailsSerializer,
                          AccountReceivableSerializer,
                          ClientInvestmentDetailsSerializer,
                          FinancialAdvisorAddSerializer,
                          FinancialAdvisorSerializer, InstrumentSerializer,
                          InvestmentContributionSerializer,
                          InvestmentSerializer, InvestorProfitSerializer,
                          ProfitDisburseSerializer, ProfitSerializer,
                          ProjectBalanceDetailsSerializer,
                          ProjectCloseSerializer, ProjectCreateSerializer,
                          ProjectStatusSerializer,
                          SellableInstrumentSerializer, TradeDetailsSerializer,
                          TradeSerializer)

User=get_user_model()


class ProjectCreateView(generics.CreateAPIView):
    serializer_class=ProjectCreateSerializer
    permission_classes=[IsAdminUser]

    def perform_create(self,serializer):
        serializer.save(created_by=self.request.user)



    

class ProjectStatusRetriveView(generics.RetrieveAPIView):
    queryset=Project.objects.all()
    serializer_class=ProjectStatusSerializer
    permission_classes=[IsAdminUser]


class ProjectBalanceDetailsView(generics.RetrieveAPIView):
    serializer_class = ProjectBalanceDetailsSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        project_id = self.kwargs['pk']
        project = get_object_or_404(Project, pk=project_id)

        total_investment=project.investment_project_details.aggregate(t=Sum('amount'))['t'] or 0

        total_buy=project.trade_project_details.filter(trns_type='buy').aggregate(t=Sum(F('qty')
            *F('actual_unit_price')))['t'] or 0

        total_sell=project.trade_project_details.filter(trns_type='sell').aggregate(t=Sum(F('qty')
            *F('actual_unit_price')))['t'] or 0

        total_profit=project.profit_project_details.aggregate(t=Sum('amount'))['t'] or 0

        available_balance = (total_investment - total_buy + (total_sell-total_profit))

        return {
            "project_id": project_id,
            "total_investment": total_investment,
            "total_buy_amount": total_buy,
            "total_sell_amount": total_sell,
            "accrued_profit": total_profit,
            "available_balance": max(available_balance, Decimal('0.00'))
        }




class ProjectCloseView(APIView):
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



class InstrumentListView(generics.ListAPIView):
    queryset = Instrument.objects.all()
    serializer_class = InstrumentSerializer
    permission_classes = [IsAdminUser]  # Allow any user to view instruments



class SellableInstrumentView(APIView):
    permission_classes = [IsAdminUser]
    serializer_class = SellableInstrumentSerializer

    def get_project(self, project_id):
        try:
            return Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            raise NotFound("Project not found.")

    def get_average_buy_unit_price(self, instrument_id):
        totals = (
            Trade.objects.filter(
                instrument_id=instrument_id,
                trns_type=Trade.BUY,
                actual_unit_price__isnull=False
            )
            .aggregate(
                total_qty=Sum('qty'),
                total_cost=Sum(F('qty') * F('actual_unit_price'))
            )
        )
        total_qty = totals.get('total_qty') or 0
        if total_qty > 0:
            return round(totals['total_cost'] / total_qty, 2)
        return None

    def get(self, request, project_id, *args, **kwargs):
        project = self.get_project(project_id)

        trades = (
            Trade.objects.filter(project=project)
            .values('instrument_id')
            .annotate(
                total_buy=Sum(Case(When(trns_type='buy', then='qty'), default=0, output_field=IntegerField())),
                total_sell=Sum(Case(When(trns_type='sell', then='qty'), default=0, output_field=IntegerField()))
            )
        )

        instruments = Instrument.objects.in_bulk([t['instrument_id'] for t in trades])

        results = []
        for t in trades:
            available = t['total_buy'] - t['total_sell']
            if available > 0:
                results.append({
                    'instrument': instruments.get(t['instrument_id']),
                    'available_quantity': available,
                    'average_buy_unit_price': self.get_average_buy_unit_price(t['instrument_id'])
                })

        serializer = self.serializer_class(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class TradeCreateView(generics.CreateAPIView):
    queryset = Trade.objects.all()
    serializer_class = TradeSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(authorized_by=self.request.user)

class TradeDeleteView(generics.DestroyAPIView):
    queryset=Trade.objects.all()
    serializer_class=TradeSerializer
    permission_classes=[IsAdminUser]
    lookup_url_kwarg = 'trade_id'



class TradeDetailsListView(generics.ListAPIView):
    serializer_class = TradeDetailsSerializer
    permission_classes=[AllowAny]

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



class ProfitCreateView(generics.CreateAPIView):
    queryset = Profit.objects.all()
    serializer_class = ProfitSerializer
    permission_classes=[IsAdminUser]

class InvestmentCreateAPIView(generics.CreateAPIView):
    queryset = Investment.objects.all()
    serializer_class = InvestmentSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(authorized_by=self.request.user)

class ClientInvestmentDetailsListView(generics.ListAPIView):
    serializer_class = ClientInvestmentDetailsSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        queryset=Investment.objects.filter(investor=self.request.user)
        return queryset
    
class InvestorContributionRetrieveAPI(APIView):
    permission_classes = [IsAdminUser]
    serializer_class = InvestmentContributionSerializer

    def get(self, request, project_id, *args, **kwargs):
        project = get_object_or_404(Project, project_id=project_id)
        total = project.investment_project_details.aggregate(t=Sum('amount'))['t'] or 0
        contrib_map = investor_contributions_map(project)

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



class InvestorProfitDetailsView(generics.ListAPIView):
    serializer_class=InvestorProfitSerializer
    permission_classes=[IsAuthenticated]

    def get_queryset(self):
        return InvestorProfit.objects.filter(investor=self.request.user)
    


class AddFinancialAdvisorListCreateView(generics.ListCreateAPIView):
    queryset = FinancialAdvisor.objects.all()
    serializer_class = FinancialAdvisorAddSerializer
    permission_classes=[IsAdminUser]





class FinancialAdvisorListView(generics.ListAPIView):
    serializer_class = FinancialAdvisorSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        # Filter FinancialAdvisor objects by project_id
        return FinancialAdvisor.objects.filter(project=project_id)


    
class AccountReceivableCreateApiView(generics.CreateAPIView):
    queryset = Trade.objects.all()
    serializer_class = AccountReceivableSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(authorized_by=self.request.user)
    

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
            queryset = queryset.filter(trade__trade_date__gte=from_dt, trade__trade_date__lte=to_dt)

        # If project_id is provided, filter by project_id and calculate the total profit for that project
        if project_id:
            queryset=queryset.filter(project=project_id)
        if is_disbursed:
            queryset=queryset.filter(disburse_st=is_disbursed)

        
        return queryset


    

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




class ProfitDisburse(APIView):
    permission_classes = [AllowAny]

    def post(self, request, format=None):
        serializer = ProfitDisburseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        from_dt = request.data.get("from_dt")
        to_dt = request.data.get("to_dt")
        project_id = request.data.get("project_id")

        try:
            with transaction.atomic():  # Ensure all operations succeed or fail together
                return self._process_profit_disbursement(project_id, from_dt, to_dt, request)
        except Exception as e:
            return Response(
                {"error": f"An error occurred during profit disbursement: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _process_profit_disbursement(self, project_id, from_dt, to_dt, request):
        # --- fetch the project once -------------------------------------------------
        project_instance = get_object_or_404(Project, project_id=project_id)
        total_investment = project_instance.investment_project_details.aggregate(
            total=Sum('amount')
        )['total'] or 0

        # --- profits to disburse ----------------------------------------------------
        profits = self._get_profits_for_disbursement(project_instance, from_dt, to_dt)
        if not profits.exists():
            return Response(
                {"message": "No profits found for disbursement"},
                status=status.HTTP_404_NOT_FOUND
            )

        # --- advisors for this project ---------------------------------------------
        fin_advisors = FinancialAdvisor.objects.filter(
            project=project_instance
        ).values('advisor', 'com_percentage')

        # --- pre-load required instances to avoid N+1 ------------------------------
        trade_ids = profits.values_list('trade', flat=True)
        advisor_ids = [fa['advisor'] for fa in fin_advisors]

        trades = {t.id: t for t in Trade.objects.filter(id__in=trade_ids)}
        advisors = self._prepare_advisors_data(advisor_ids)
        investors = investor_contributions_map(project_instance)
        investors_profit = {}

        # --- process commissions and profits ---------------------------------------
        self._process_commissions_and_profits(
            profits, fin_advisors, trades, advisors, 
            investors, investors_profit, total_investment, 
            project_instance
        )

        # --- create transactions ---------------------------------------------------
        self._create_transactions(advisors, investors_profit, project_id)

        # --- update profit records -------------------------------------------------
        profits.update(disburse_st=1, disburse_dt=timezone.now())

        return Response(
            {"message": "Profit disbursement completed successfully"},
            status=status.HTTP_200_OK
        )

    def _get_profits_for_disbursement(self, project_instance, from_dt, to_dt):
        """Retrieve profits eligible for disbursement"""
        filters = Q(
            project=project_instance,
            trade__trade_date__range=(from_dt, to_dt),
            disburse_st=0
        )
        return Profit.objects.filter(filters)

    def _prepare_advisors_data(self, advisor_ids):
        """Prepare advisor data structure"""
        advisors = {}
        for user in User.objects.filter(id__in=advisor_ids):
            advisors[user.id] = {"user": user, "amount": 0}
        return advisors

    def _process_commissions_and_profits(self, profits, fin_advisors, trades, advisors, 
                                       investors, investors_profit, total_investment, project_instance):
        """Process advisor commissions and investor profits"""
        for profit in profits:
            total_profit_amount = profit.amount
            trade_instance = trades[profit.trade_id]

            # Process advisor commissions
            total_profit_amount = self._process_advisor_commissions(
                fin_advisors, advisors, total_profit_amount, 
                trade_instance, project_instance
            )

            # Process investor profits
            self._process_investor_profits(
                investors, investors_profit, total_investment, 
                total_profit_amount, trade_instance, project_instance
            )

    def _process_advisor_commissions(self, fin_advisors, advisors, total_profit_amount, 
                                   trade_instance, project_instance):
        """Process financial advisor commissions"""
        for fa in fin_advisors:
            profit_amount = total_profit_amount * fa['com_percentage'] / 100
            user_instance = advisors[fa['advisor']]

            FinAdvisorCommission.objects.create(
                advisor=user_instance['user'],
                project=project_instance,
                com_percent=fa['com_percentage'],
                com_amount=profit_amount,
                trade=trade_instance,
                disburse_dt=timezone.now(),
            )
            user_instance['amount'] += profit_amount
            total_profit_amount -= profit_amount  # leftover after each advisor
            
        return total_profit_amount

    def _process_investor_profits(self, investors, investors_profit, total_investment, 
                                total_profit_amount, trade_instance, project_instance):
        """Process investor profit distribution"""
        for investor_id, cont_amount in investors.items():
            percentage = round(cont_amount * 100 / total_investment, 2) if total_investment else 0
            inv_profit_amt = round((total_profit_amount * percentage) / 100, 2)
            
            investors_profit[investor_id] = investors_profit.get(investor_id, 0) + inv_profit_amt

            InvestorProfit.objects.create(
                investor=User.objects.get(id=investor_id),
                project=project_instance,
                trade=trade_instance,
                contribute_amount=cont_amount,
                percentage=percentage,
                profit_amount=inv_profit_amt,
                disburse_dt=timezone.now()
            )

    def _create_transactions(self, advisors, investors_profit, project_id):
        """Create transactions for advisors and investors"""
        # Create transactions for advisors
        for advisor in advisors.values():
            Transaction.objects.create(
                user=advisor['user'],
                amount=advisor['amount'],
                transaction_type='deposit',
                narration=f'Commission from project {project_id}',
                status='completed',
                issued_date=timezone.now(),
                issued_by=self.request.user
            )
        
        # Create transactions for investors
        for investor_id, amount in investors_profit.items():
            investor_user = User.objects.get(id=investor_id)
            Transaction.objects.create(
                user=investor_user,
                amount=amount,
                transaction_type='deposit',
                narration=f'Profit from project {project_id}',
                status='completed',
                issued_date=timezone.now(),
                issued_by=self.request.user,
            )