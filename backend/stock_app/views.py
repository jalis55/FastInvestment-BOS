from rest_framework import generics
from rest_framework.permissions import IsAuthenticated,AllowAny
from .models import Project, Instrument,Trade,Investment,FinancialAdvisor,AccountReceivable
from accounting.models import Account,Transaction
from .projectserializers import ProjectCreateSerializer,ProjectBalanceSerializer

from .serializers import (InstrumentSerializer,TradeSerializer,TradeDetailsSerializer,BuyableInstrumentSerializer,
                          InvestmentSerializer,InvestmentContributionSerializer,
                          FinancialAdvisorSerializer,FinancialAdvisorAddSerializer
                          ,AccountReceivableSerializer,AccountReceivableDetailsSerializer
                          )
from django.db import transaction
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.db.models import Sum, F,Case, When, IntegerField,Q
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from django.utils import timezone
from django.core.mail import send_mail


class ProjectCreateView(generics.CreateAPIView):

    queryset = Project.objects.all()
    serializer_class = ProjectCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class ProjectBalanceView(generics.RetrieveAPIView):
    serializer_class = ProjectBalanceSerializer
    permission_classes = [AllowAny]


    def get_object(self):
        project_id = self.kwargs['project_id']
        project = get_object_or_404(Project, project_id=project_id)

        # Fetch total investment
        total_investment = Investment.objects.filter(project=project).aggregate(
                total=Sum('amount')
            )['total'] or 0  # Default to 0 if no investment

        # Calculate total buy
        total_buy = Trade.objects.filter(project=project, trns_type=Trade.BUY).aggregate(
            total=Sum(F('qty') * F('actual_unit_price'))
        )['total'] or Decimal('0.00')

        # Calculate total sell
        # total_sell = Trade.objects.filter(project=project, trns_type=Trade.SELL).aggregate(
        #     total=Sum(F('qty') * F('actual_unit_price'))
        # )['total'] or Decimal('0.00')

        # Compute available balance
        available_balance = total_investment  - total_buy

        return {
            "project_id": project.project_id,
            "available_balance": available_balance
        }

class InstrumentListView(generics.ListAPIView):
    queryset = Instrument.objects.all()
    serializer_class = InstrumentSerializer
    permission_classes = [AllowAny]  # Allow any user to view instruments

class BuyableInstrumentView(generics.GenericAPIView):
    serializer_class = BuyableInstrumentSerializer
    permission_classes = [AllowAny]

    def get(self, request, project_id):
        """Returns available instrument quantity after buy/sell for a project, including the average actual buy unit price."""
        try:
            # Ensure the project exists
            project = Project.objects.get(pk=project_id)

            # Aggregate total buy and sell quantities per instrument
            trades = Trade.objects.filter(project=project).values('instrument_id').annotate(
                total_buy=Sum(Case(When(trns_type='buy', then='qty'), default=0, output_field=IntegerField())),
                total_sell=Sum(Case(When(trns_type='sell', then='qty'), default=0, output_field=IntegerField()))
            )

            # Construct response data
            results = [
                {
                    'instrument_id': trade['instrument_id'],
                    'name': Instrument.objects.get(id=trade['instrument_id']).name,
                    'available_quantity': trade['total_buy'] - trade['total_sell'],
                    'average_buy_unit_price': self.get_average_buy_unit_price(trade['instrument_id'])
                }
                for trade in trades if trade['total_buy'] - trade['total_sell'] > 0
            ]

            return Response(results, status=status.HTTP_200_OK)

        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

    def get_average_buy_unit_price(self, instrument_id):
        """Fetches the average buy unit price for a given instrument."""
        # Filter buy trades for the instrument
        buy_trades = Trade.objects.filter(instrument_id=instrument_id, trns_type=Trade.BUY)

        total_qty = 0
        total_cost = 0
        
        for trade in buy_trades:
            # Ensure actual_unit_price is not None
            if trade.actual_unit_price is not None:
                total_qty += trade.qty
                total_cost += trade.qty * trade.actual_unit_price


        if total_qty > 0:
            return round(total_cost / total_qty, 2)  
        return None  


class TradeCreateView(generics.CreateAPIView):
    queryset = Trade.objects.all()
    serializer_class = TradeSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(authorized_by=self.request.user)

class TradeDetailsRetriveView(generics.ListAPIView):
    queryset=Trade.objects.all()
    serializer_class=TradeDetailsSerializer
    permission_classes=[AllowAny]

class TradeDetailsListAson(generics.ListAPIView):
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

class InvestmentCreateAPIView(generics.CreateAPIView):
    queryset = Investment.objects.all()
    serializer_class = InvestmentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(authorized_by=self.request.user)

    
class InvestorContributionRetrieveApiView(generics.RetrieveAPIView):
    permission_classes=[AllowAny]
    def get(self, request, project_id):
        try:
            # Get the project
            project = Project.objects.get(project_id=project_id)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get all investments for the project
        investments = Investment.objects.filter(project=project)

        # Calculate the total investment amount for the project
        total_project_investment = investments.aggregate(total=Sum('amount'))['total'] or 0

        # Group investments by investor and calculate their total contribution and percentage
        investor_data = []
        for investor in investments.values('investor').distinct():
            investor_id = investor['investor']
            investor_investments = investments.filter(investor_id=investor_id)
            total_investor_contribution = investor_investments.aggregate(total=Sum('amount'))['total'] or 0

            # Calculate percentage
            percentage = (total_investor_contribution / total_project_investment) * 100 if total_project_investment > 0 else 0

            investor_data.append({
                'investor': investor_id,
                'contribute_amount': total_investor_contribution,
                'contribution_percentage': round(percentage, 2),  # Round to 2 decimal places
            })

        # Serialize the data
        serializer = InvestmentContributionSerializer(investor_data, many=True)
        return Response(serializer.data)
class AddFinancialAdvisorListCreateView(generics.ListCreateAPIView):
    queryset = FinancialAdvisor.objects.all()
    serializer_class = FinancialAdvisorAddSerializer
    permission_classes=[AllowAny]

class FinancialAdvisorListView(generics.ListAPIView):
    serializer_class = FinancialAdvisorSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        # Filter FinancialAdvisor objects by project_id
        return FinancialAdvisor.objects.filter(project=project_id)


    
class AccountReceivableCreateApiView(generics.GenericAPIView):
    queryset = AccountReceivable.objects.all()
    serializer_class = AccountReceivableSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # Use 'many=True' to allow handling of a list of objects
        serializer = AccountReceivableSerializer(data=request.data, many=True)

        if serializer.is_valid():
            # Save all objects
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        # If validation fails, return the errors
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class AccountRecivableDetailsListApiView(generics.ListAPIView):

    serializer_class=AccountReceivableDetailsSerializer
    permission_classes=[AllowAny]

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        from_dt=self.request.query_params.get('from_dt')
        to_dt=self.request.query_params.get('to_dt')
        disburse_st=self.request.query_params.get('disburse_st')
        

        queryset=AccountReceivable.objects.filter(project=project_id)
        if from_dt and to_dt:
            queryset=queryset.filter(trade__trade_date__gte=from_dt, trade__trade_date__lte=to_dt)

        if disburse_st:
            queryset=queryset.filter(disburse_st=disburse_st)

        return queryset
    
class AccountReceivableDetailsAsonListApiView(generics.ListAPIView):
    serializer_class = AccountReceivableDetailsSerializer
    permission_classes=[AllowAny]

    def get_queryset(self):

        # Extract parameters from the request body
        project_id = self.request.get('project_id')
        from_dt = self.request.data.get('from_dt')
        to_dt = self.request.data.get('to_dt')
        disburse_st = self.request.data.get('disburse_st')
        # Validate required parameters
        if not from_dt or not to_dt:
            return AccountReceivable.objects.none()  # Return an empty queryset if dates are missing

        # Convert date strings to date objects
        try:
            from_dt = timezone.datetime.strptime(from_dt, '%Y-%m-%d').date()
            to_dt = timezone.datetime.strptime(to_dt, '%Y-%m-%d').date()
        except ValueError:
            return AccountReceivable.objects.none()  # Return an empty queryset if date format is invalid

        queryset=AccountReceivable.objects.filter(project=project_id
                        ,trade__trade_date__range=(from_dt,to_dt),
                        disburse_st=disburse_st)


        return queryset

    def post(self, request, *args, **kwargs):
        """
        Handles POST requests to filter and return AccountReceivable records.
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    


class UpdateAccountReceivableView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        """Update disburse_st, disburse_dt, and authorized_by for a given date range, project, and user IDs."""
        from_dt = request.data.get("from_dt")
        to_dt = request.data.get("to_dt")
        project_id = request.data.get("project")
        user_ids = request.data.get("user_ids", [])

        if not from_dt or not to_dt or not project_id:
            return Response({"error": "from_dt, to_dt, and project are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(user_ids, list) or not all(isinstance(uid, int) for uid in user_ids):
            return Response({"error": "user_ids must be a list of integers."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            filters = Q(project=project_id, accr_dt__date__range=(from_dt, to_dt))
            if user_ids:
                filters &= Q(investor_id__in=user_ids)

            update_count = AccountReceivable.objects.filter(filters).update(
                disburse_st=1,
                disburse_dt=timezone.now(),
                authorized_by=request.user
            )

            return Response({"message": f"{update_count} records updated successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

