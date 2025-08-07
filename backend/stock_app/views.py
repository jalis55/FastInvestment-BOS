from rest_framework import generics
from rest_framework.permissions import IsAuthenticated,AllowAny,IsAdminUser
from user_app.permissions import IsSuperUser
from .models import Project, Instrument,Trade,Investment,FinancialAdvisor,FinAdvisorCommission,AccountReceivable,Profit,InvestorProfit
from accounting.models import Account,Transaction
from .projectserializers import ProjectCreateSerializer,ProjectBalanceDetailsSerializer,ProjectStatusSerializer

from .serializers import (InstrumentSerializer,TradeSerializer,TradeDetailsSerializer,SellableInstrumentSerializer,
                          InvestmentSerializer,InvestmentContributionSerializer,ClientInvestmentDetailsSerializer,
                          FinancialAdvisorSerializer,FinancialAdvisorAddSerializer,FinAdvisorCommissionSerializer
                          ,AccountReceivableSerializer,AccountReceivableDetailsSerializer,ProfitSerializer
                          ,InvestorProfitSerializer
                          )
from django.db import transaction
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.db.models import Sum, F,Case, When, IntegerField,Q,DecimalField, FloatField,ExpressionWrapper
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from django.utils import timezone
from django.core.mail import send_mail
from django.db.models.functions import Coalesce
from django.contrib.auth import get_user_model

User=get_user_model()


class ProjectCreateView(generics.CreateAPIView):

    queryset = Project.objects.all()
    serializer_class = ProjectCreateSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class ProjectUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAdminUser]

    def update(self, request, *args, **kwargs):
        project_id = request.data.get("project_id")
        total_investment = request.data.get("total_investment")
        total_collection = request.data.get("total_collection")
        gain_or_loss = request.data.get("gain_or_lose")  # Corrected field name

        try:
            project = Project.objects.get(project_id=project_id)
            project.total_investment = total_investment
            project.total_collection = total_collection
            project.gain_or_loss = gain_or_loss
            project.project_closing_dt=timezone.now()
            project.project_active_status = False
            project.save()

            return Response({"message": f"Project {project_id}({project.project_title}) records updated successfully"}, status=status.HTTP_200_OK)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProjectStatusRetriveView(generics.RetrieveAPIView):
    queryset=Project.objects.all()
    serializer_class=ProjectStatusSerializer
    permission_classes=[IsAdminUser]
    lookup_field = 'project_id'

class ProjectBalanceDetailsView(generics.RetrieveAPIView):
    serializer_class = ProjectBalanceDetailsSerializer
    permission_classes = [IsAdminUser]


    def get_object(self):
        project_id = self.kwargs['project_id']
        try:
            project = Project.objects.get(project_id=project_id)
        except Project.DoesNotExist:
            raise NotFound("Project not found.")

            # Fetch total investment
        total_investment = Investment.objects.filter(project=project).aggregate(
            total=Coalesce(Sum('amount'), 0, output_field=DecimalField())
        )['total']

        # Calculate total buy
        total_buy = Trade.objects.filter(project=project, trns_type=Trade.BUY).aggregate(
            total=Coalesce(Sum(F('qty') * F('actual_unit_price')), 0, output_field=DecimalField())
        )['total']

        # Calculate total sell
        total_sell = Trade.objects.filter(project=project, trns_type=Trade.SELL).aggregate(
            total=Coalesce(Sum(F('qty') * F('actual_unit_price')), 0, output_field=DecimalField())
        )['total']

        accrued_profit = Profit.objects.filter(project=project_id).aggregate(total_amount=Sum('amount'))['total_amount']

        # Compute available balance and gain/loss
        available_balance = total_investment - total_buy
        

        return {
            "project_id": project.project_id,
            "total_investment": total_investment,
            "total_buy_amount": total_buy,
            "available_balance": available_balance,
            "total_sell_amount": total_sell,
            "accrued_profit":accrued_profit
            
    }

class InstrumentListView(generics.ListAPIView):
    queryset = Instrument.objects.all()
    serializer_class = InstrumentSerializer
    permission_classes = [IsAdminUser]  # Allow any user to view instruments


class SellableInstrumentView(generics.GenericAPIView):
    serializer_class = SellableInstrumentSerializer
    permission_classes = [IsAdminUser]

    def get_object(self):
        """Fetch the project based on project_id."""
        project_id = self.kwargs['project_id']
        try:
            return Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            raise NotFound("Project not found.")

    def get(self, request, project_id):
        """Returns available instrument quantity after buy/sell for a project, including the average actual buy unit price."""
        project = self.get_object()  # Fetch the project using get_object

        # Aggregate total buy and sell quantities per instrument
        trades = Trade.objects.filter(project=project).values('instrument_id').annotate(
            total_buy=Sum(Case(When(trns_type='buy', then='qty'), default=0, output_field=IntegerField())),
            total_sell=Sum(Case(When(trns_type='sell', then='qty'), default=0, output_field=IntegerField()))
        )

        # Prefetch instrument names to reduce database queries
        instruments = Instrument.objects.in_bulk([trade['instrument_id'] for trade in trades])

        # Construct response data
        results = [
            {
                'instrument': instruments[trade['instrument_id']],  # Pass the Instrument object
                'available_quantity': trade['total_buy'] - trade['total_sell'],
                'average_buy_unit_price': self.get_average_buy_unit_price(trade['instrument_id'])
            }
            for trade in trades if trade['total_buy'] - trade['total_sell'] > 0
        ]

        # Serialize the results
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_average_buy_unit_price(self, instrument_id):
        """Fetches the average buy unit price for a given instrument."""
        # Filter buy trades for the instrument and calculate total quantity and cost in a single query
        buy_trades = Trade.objects.filter(instrument_id=instrument_id, trns_type=Trade.BUY, actual_unit_price__isnull=False)
        
        total_qty_cost = buy_trades.aggregate(
            total_qty=Sum('qty'),
            total_cost=Sum(F('qty') * F('actual_unit_price'))
        )

        if total_qty_cost['total_qty'] and total_qty_cost['total_qty'] > 0:
            return round(total_qty_cost['total_cost'] / total_qty_cost['total_qty'], 2)
        return None

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
        queryset = Trade.objects.all()

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
    
class InvestorContributionRetrieveApiView(generics.GenericAPIView):  # Not RetrieveAPIView
    permission_classes = [IsAdminUser]
    serializer_class = InvestmentContributionSerializer

    def get(self, request, project_id):
        try:
            project = Project.objects.get(project_id=project_id)
        except Project.DoesNotExist:
            raise NotFound("Project not found")

        investments = Investment.objects.filter(project=project)
        total_project_investment = investments.aggregate(total=Sum('amount'))['total'] or 0

        # More efficient single-query approach
        investor_contributions = (
            investments.values('investor')
            .annotate(
                total_contribution=Sum('amount'),
                percentage=ExpressionWrapper(
                    Sum('amount') * 100.0 / total_project_investment if total_project_investment > 0 else 0,
                    output_field=FloatField()
                )
            )
            .order_by('-total_contribution')
        )

        # Prefetch users in one query
        users = User.objects.in_bulk([item['investor'] for item in investor_contributions])
        
        data = [{
            'investor': users[item['investor']],
            'contribute_amount': item['total_contribution'],
            'contribution_percentage': round(item['percentage'], 2)
        } for item in investor_contributions]

        serializer = self.get_serializer(data, many=True)
        return Response(serializer.data)

class InvestorProfitCreateView(generics.GenericAPIView):
    queryset=InvestorProfit.objects.all()
    serializer_class=InvestorProfitSerializer
    permission_classes=[IsAdminUser]

    def post(self,request,*args,**kwargs):
        serializer=InvestorProfitSerializer(data=request.data,many=True)

        if serializer.is_valid():
            serializer.save(authorized_by=self.request.user,disburse_dt=timezone.now())
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InvestorProfitDetailsView(generics.ListAPIView):
    serializer_class=InvestorProfitSerializer
    permission_classes=[IsAuthenticated]

    def get_queryset(self):
        return InvestorProfit.objects.filter(investor=self.request.user)
    


class AddFinancialAdvisorListCreateView(generics.ListCreateAPIView):
    queryset = FinancialAdvisor.objects.all()
    serializer_class = FinancialAdvisorAddSerializer
    permission_classes=[IsAdminUser]



class FinAdvisorCommissionListCreateView(generics.ListCreateAPIView):
    queryset=FinAdvisorCommission.objects.all()
    serializer_class=FinAdvisorCommissionSerializer
    permission_classes=[IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(
            authorized_by=self.request.user,
            disburse_dt=timezone.now()
        )

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


    
class ProjectCloseView(generics.UpdateAPIView):
    permission_classes=[IsAdminUser]

    def update(self,request,*args,**kwargs):
        project_id=request.data.get("project_id")
        total_investment=request.data.get("total_investment")
        total_buy=request.data.get("total_buy")
        total_sell=request.data.get("total_sell")
        total_sell_profit=request.data.get("total_sell_profit")
        gain_or_loss=request.data.get("gain_or_loss")
        closing_balance=request.data.get("closing_balance")

        if not project_id:
            return Response({"error": "project id is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            
            update_count = Project.objects.filter(project_id=project_id).update(
                
                total_investment=total_investment,
                total_buy=total_buy,
                total_sell=total_sell,
                total_sell_profit=total_sell_profit,
                gain_or_loss=gain_or_loss,
                closing_balance=closing_balance,
                project_active_status=0,
                project_closing_dt=timezone.now(),
                closed_by=request.user
            )

            return Response({"message": f"{update_count} records updated successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdateProfitView(generics.UpdateAPIView):
    permission_classes = [IsAdminUser]

    def update(self,request,*args,**kwargs):
        from_dt = request.data.get("from_dt")
        to_dt = request.data.get("to_dt")
        project_id = request.data.get("project")
        if not from_dt or not to_dt or not project_id:
            return Response({"error": "from_dt, to_dt, and project are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            filters = Q(project=project_id, trade__trade_date__range=(from_dt, to_dt))

            update_count = Profit.objects.filter(filters).update(
                disburse_st=1,
                disburse_dt=timezone.now(),
                authorized_by=request.user
            )

            return Response({"message": f"{update_count} records updated successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


