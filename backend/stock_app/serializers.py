from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from accounting.models import Account, Transaction

from .models import (AccountReceivable, FinAdvisorCommission, FinancialAdvisor,
                     Instrument, Investment, InvestorProfit, Profit, Project,
                     Trade)

User = get_user_model()

class UserDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model=User
        fields=('id',
            'email',
            'name')



class FinancialAdvisorAddSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialAdvisor
        fields = ('project','advisor', 'com_percentage')


class FinancialAdvisorSerializer(serializers.ModelSerializer):
    advisor=UserDetailsSerializer(read_only=True)

    class Meta:
        model = FinancialAdvisor
        fields = ('project','advisor', 'com_percentage')

class FinAdvisorCommissionSerializer(serializers.ModelSerializer):
    class Meta:
        model=FinAdvisorCommission
        fields=('advisor','project','trade','dividend','com_percent','com_amount')

class InvestorProfitSerializer(serializers.ModelSerializer):
    class Meta:
        model=InvestorProfit
        fields=('investor','project','trade','dividend','contribute_amount','percentage','profit_amount')

        
class InvestmentSerailizer(serializers.ModelField):
    investor=UserDetailsSerializer(read_only=True)
    class Meta:
        model=Investment
        fields=['project','investor','amount','authorized_by']

        

class InvestmentDetailsSerializer(serializers.ModelSerializer):
    investor_name = serializers.CharField(source='investor.name', read_only=True)
    investor_email = serializers.CharField(source='investor.email', read_only=True)

    class Meta:
        model = Investment
        fields = ['investor', 'amount', 'investor_name', 'investor_email']

class InvestmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Investment
        fields = ['project', 'investor', 'amount']
        read_only_field=["authorized_by"]
        
        

    def validate_amount(self, value):
        """Ensure the amount is a positive value."""
        if value <= 0:
            raise serializers.ValidationError("Amount must be a positive value.")
        return value

    def create(self, validated_data):
        investor = validated_data['investor']
        amount = Decimal(validated_data['amount'])
        project = validated_data['project']

        # Access request.user from serializer context
        authorized_by = self.context['request'].user

        # Use atomic transaction to ensure all operations succeed or rollback
        with transaction.atomic():
            # Check if the investor has an account; create one if not
            account = Account.objects.select_for_update().get(user=investor)

            # Update the account balance
            # account.update_balance(amount, transaction_type='payment')
            account.withdraw(amount)

            # Create a transaction record
            transaction_record = Transaction.objects.create(
                user=investor,
                amount=amount,
                transaction_type='payment',
                narration=f'Payment for project: {project.project_id}',
                issued_by=authorized_by,
                status='completed'
            )

            # Remove authorized_by from validated_data to avoid duplication
            validated_data.pop('authorized_by', None)

            # Create the investment record
            investment = Investment.objects.create(
                **validated_data, 
                authorized_by=authorized_by  # Set the authorized_by field to request.user
            )

        return investment

class InvestmentContributionSerializer(serializers.Serializer):
    investor = UserDetailsSerializer()
    contribute_amount = serializers.DecimalField(max_digits=100, decimal_places=2)
    contribution_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)

class ClientInvestmentDetailsSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source='project.project_title', read_only=True)

    class Meta:
        model = Investment
        fields = ['id', 'project', 'project_title', 'amount', 'is_reinvestment', 'created_at']


class ProjectInvestmentHistorySerializer(ClientInvestmentDetailsSerializer):
    investor = UserDetailsSerializer(read_only=True)

    class Meta(ClientInvestmentDetailsSerializer.Meta):
        fields = [*ClientInvestmentDetailsSerializer.Meta.fields, 'investor']

# Add the InstrumentSerializer
class InstrumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instrument
        fields = ['id', 'name'] 


class TradeSerializer(serializers.ModelSerializer):
    expected_commission_rate = serializers.DecimalField(
        max_digits=7, decimal_places=4, required=False, write_only=True,
    )

    class Meta:
        model = Trade
        fields = ['id', 'project', 'instrument', 'qty', 'unit_price', 'trns_type', 'total_commission', 'expected_commission_rate']
        read_only_fields = ['total_commission']

    @transaction.atomic
    def create(self, validated_data):
        expected_rate = validated_data.pop('expected_commission_rate', None)
        trade = super().create(validated_data)
        if expected_rate is not None and trade.commission_rate != expected_rate:
            raise serializers.ValidationError({
                'expected_commission_rate': 'The commission rate changed. Search for the project again before submitting.',
            })
        return trade



class TradeDetailsSerializer(serializers.ModelSerializer):

    instrument=InstrumentSerializer(read_only=True)
    total_trade_value = serializers.DecimalField(max_digits=100, decimal_places=2, read_only=True)
    class Meta:
        model = Trade
        fields = ['project','id','trade_date' ,'instrument', 'qty', 'unit_price', 'trns_type', 'total_commission','actual_unit_price', 'total_trade_value']


class SimplifiedTradeDetailsSerializer(serializers.ModelSerializer):
    instrument=InstrumentSerializer(read_only=True)
    authorized_by=UserDetailsSerializer(read_only=True)
    class Meta:
        model = Trade
        fields = ('instrument',
                 'qty',
                 'unit_price',
                 'total_commission',
                 'actual_unit_price',
                 'trade_date',
                 'authorized_by')

class SellableInstrumentSerializer(serializers.Serializer):
    instrument = InstrumentSerializer(read_only=True)
    available_quantity = serializers.IntegerField()
    average_buy_unit_price = serializers.DecimalField(max_digits=20, decimal_places=8, required=False)
    total_cost = serializers.DecimalField(max_digits=20, decimal_places=2)



class AccountReceivableSerializer(serializers.ModelSerializer):
    class Meta:
        model=AccountReceivable
        fields=['project','trade','gain_lose']





class ProfitSerializer(serializers.ModelSerializer):
    def validate(self, data):
        trade = data.get('trade')
        if trade is None or trade.project_id != data['project'].pk:
            raise serializers.ValidationError('A trade belonging to this project is required. Record cash dividends through the dividends endpoint.')
        return data

    class Meta:
        model=Profit
        fields=('project','trade','dividend','amount')
        read_only_fields = ('dividend',)

        
class AccountReceivableDetailsSerializer(serializers.ModelSerializer):
    trade=SimplifiedTradeDetailsSerializer(read_only=True)
    class Meta:
        model=AccountReceivable
        fields=(
            'project',
            'trade',
            'gain_lose',
        )

# projects

class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model=Project
        fields=(
            'project_title',
            'project_description',
            'project_responsible_mail',
            'trade_commission_rate',
        )
        read_only_fields = ['created_by']


class ProjectStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model=Project
        fields=('project_id', 'project_active_status', 'trade_commission_rate')


class ProjectCommissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ('trade_commission_rate',)

    def update(self, instance, validated_data):
        if 'trade_commission_rate' in validated_data:
            instance.trade_commission_rate = validated_data['trade_commission_rate']
            instance.save(update_fields=['trade_commission_rate', 'updated_at'])
        return instance

class ProjectBalanceDetailsSerializer(serializers.Serializer):
    cash_dividends = serializers.DecimalField(max_digits=100, decimal_places=2)
    project_id = serializers.CharField()
    project_title = serializers.CharField()
    total_investment=serializers.DecimalField(max_digits=10,decimal_places=2)
    total_buy_amount=serializers.DecimalField(max_digits=10,decimal_places=2)
    available_balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_sell_amount=serializers.DecimalField(max_digits=10,decimal_places=2)
    accrued_profit=serializers.DecimalField(max_digits=10,decimal_places=2)



class ProjectCloseSerializer(serializers.ModelSerializer):
    class Meta:
        model=Project
        fields=('project_id',
                'total_investment',
                'total_buy',
                'total_sell',
                'total_sell_profit',
                'closing_balance',

        )
        read_only_fields=['closed_by','project_closing_dt','project_active_status','gain_or_loss']

class ProjectListSerializer(serializers.ModelSerializer):
    created_by=UserDetailsSerializer(read_only=True)
    closed_by=UserDetailsSerializer(read_only=True)

    class Meta:
        model=Project
        fields=(
            'project_id',
            'project_title',
            'project_responsible_mail',
            'project_active_status',
            'trade_commission_rate',
            'project_opening_dt',
            'created_by',
            'project_closing_dt',
            'closed_by'
        )




class DisbursementReportFilterSerializer(serializers.Serializer):
    from_dt = serializers.DateField(required=False)
    to_dt = serializers.DateField(required=False)

    def validate(self, data):
        if 'from_dt' in data and 'to_dt' in data and data['from_dt'] > data['to_dt']:
            raise serializers.ValidationError({'to_dt': 'The end date must be on or after the start date.'})
        return data


class PayoutSplitSerializer(serializers.Serializer):
    recipient_id = serializers.IntegerField(min_value=1)
    amount = serializers.DecimalField(max_digits=100, decimal_places=2, min_value=Decimal('0.01'))


class ProfitDisburseSerializer(serializers.Serializer):
    from_dt=serializers.DateField(required=True)
    to_dt=serializers.DateField(required=True)
    project_id=serializers.CharField(required=True)
    reinvest_recipient_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, default=list,
    )
    reinvest_splits = PayoutSplitSerializer(many=True, required=False, default=list)

    def validate(self,data):
        if data['from_dt']>data['to_dt']:
            raise serializers.ValidationError('From date can not be after To date')

        split_ids = [split['recipient_id'] for split in data['reinvest_splits']]
        if len(set(split_ids)) != len(split_ids) or set(split_ids).intersection(data['reinvest_recipient_ids']):
            raise serializers.ValidationError({'reinvest_splits': 'Choose one payout destination per recipient.'})
        
        return data
    def validate_project_id(self, value):
        if not Project.objects.filter(project_id=value).exists():
            raise serializers.ValidationError("Project does not exist")
        return value

