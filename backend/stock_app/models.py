import random
import uuid
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

DEFAULT_TRADE_COMMISSION_RATE = Decimal('0.4000')
MINIMUM_TRADE_COMMISSION = Decimal('10.00')

# Create your models here.

def generate_unique_id():
    while True:
        project_id = str(random.randint(10000000, 99999999))  # Generate 8-digit ID
        if not Project.objects.filter(project_id=project_id).exists():
            return project_id
        


class Project(models.Model):
    project_id = models.CharField(max_length=8, primary_key=True, default=generate_unique_id, unique=True)
    project_title = models.CharField(max_length=255)
    project_description = models.TextField()
    trade_commission_rate = models.DecimalField(
        max_digits=7, decimal_places=4, default=DEFAULT_TRADE_COMMISSION_RATE,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        help_text='Percentage of trade value, such as 0.4 for 0.4%.',
    )
    total_investment = models.DecimalField(max_digits=100, decimal_places=2, null=True, blank=True)
    total_buy = models.DecimalField(max_digits=100, decimal_places=2, null=True, blank=True)
    total_sell = models.DecimalField(max_digits=100, decimal_places=2, null=True, blank=True)
    total_sell_profit=models.DecimalField(max_digits=100, decimal_places=2, null=True, blank=True)
    gain_or_loss = models.DecimalField(max_digits=100, decimal_places=2, null=True, blank=True)
    closing_balance = models.DecimalField(max_digits=100, decimal_places=2, null=True, blank=True)
    project_active_status=models.BooleanField(default=True)
    project_responsible_mail=models.EmailField(max_length=100)
    project_opening_dt=models.DateTimeField(default=timezone.now)
    project_closing_dt=models.DateTimeField(blank=True,null=True)
    closed_by = models.ForeignKey(settings.AUTH_USER_MODEL,blank=True,null=True, on_delete=models.CASCADE,related_name='project_closed_by')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.project_title} ({self.project_id})"
    

class Investment(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE,related_name='investment_project_details')
    investor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,related_name='invesment_investor_details')
    amount = models.DecimalField(max_digits=100, decimal_places=2)
    authorized_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,related_name='investor_authorizer_details')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.project.project_title
    
class FinancialAdvisor(models.Model):
    advisor=models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,related_name='fin_investor_details')
    com_percentage=models.DecimalField(max_digits=100, decimal_places=2)
    project = models.ForeignKey(Project, on_delete=models.CASCADE,related_name="fin_advisor_proj_details")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)




class Instrument(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)

    def __str__(self) -> str:
        return self.name



class Trade(models.Model):
    BUY = 'buy'
    SELL = 'sell'

    TRANSACTION_TYPES = [
        (BUY, 'Buy'),
        (SELL, 'Sell'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='trade_project_details')
    instrument = models.ForeignKey('Instrument', related_name='trade_instrument_details', on_delete=models.CASCADE)
    trns_type = models.CharField(max_length=6, choices=TRANSACTION_TYPES)
    qty = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=100, decimal_places=2)
    actual_unit_price = models.DecimalField(max_digits=100, decimal_places=2, blank=True, null=True)
    trade_date = models.DateField(auto_now_add=True)
    total_commission = models.DecimalField(max_digits=100, decimal_places=2, blank=True, null=True)
    commission_rate = models.DecimalField(max_digits=7, decimal_places=4, null=True, editable=False)
    authorized_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trade_authorizer_details')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_total_commission(self, qty, unit_price):
        commission = unit_price * qty * self.commission_rate / 100
        self.total_commission = max(
            MINIMUM_TRADE_COMMISSION,
            commission.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
        )
        return self.total_commission

    def calculate_actual_unit_price(self, qty, unit_price, trade_type):
        """Calculates and sets the actual unit price."""
        if not qty or trade_type not in (self.BUY, self.SELL):
            self.actual_unit_price = None
            return
        fee_per_unit = self.total_commission / qty
        price = unit_price + fee_per_unit if trade_type == self.BUY else unit_price - fee_per_unit
        self.actual_unit_price = round(price, 2)

    def _calculate_prices(self, qty, unit_price, trade_type):
        self.calculate_total_commission(qty, unit_price)
        self.calculate_actual_unit_price(qty, unit_price, trade_type)

    @property
    def total_trade_value(self):
        if self.commission_rate is None:
            return self.qty * (self.actual_unit_price if self.actual_unit_price is not None else self.unit_price)
        commission = self.total_commission if self.trns_type == self.BUY else -self.total_commission
        return self.qty * self.unit_price + commission

    def save(self, *args, **kwargs):
        # Lock in the project rate when a trade is recorded. Legacy trades retain
        # their stored charges unless their pricing inputs are explicitly edited.
        current = (self.qty, Decimal(self.unit_price), self.trns_type)
        if self._state.adding:
            self.commission_rate = Project.objects.values_list('trade_commission_rate', flat=True).get(pk=self.project_id)
            self._calculate_prices(*current)
        else:
            pricing_fields = ('qty', 'unit_price', 'trns_type')
            update_fields = kwargs.get('update_fields')
            if update_fields is None or set(pricing_fields).intersection(update_fields):
                previous = Trade.objects.values_list(*pricing_fields).get(pk=self.pk)
                prices = tuple(
                    after if update_fields is None or field in update_fields else before
                    for field, before, after in zip(pricing_fields, previous, current)
                )
                if prices != previous:
                    self.commission_rate = (
                        self.commission_rate if self.commission_rate is not None else DEFAULT_TRADE_COMMISSION_RATE
                    )
                    self._calculate_prices(*prices)
                    if update_fields is not None:
                        kwargs['update_fields'] = {*update_fields, 'commission_rate', 'total_commission', 'actual_unit_price'}
        super().save(*args, **kwargs)

    def __str__(self):
        return str(self.id)
    



class Dividend(models.Model):
    CASH = 'cash'
    SHARE = 'share'
    project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name='dividends')
    instrument = models.ForeignKey(Instrument, on_delete=models.PROTECT)
    dividend_type = models.CharField(max_length=5, choices=[(CASH, 'Cash'), (SHARE, 'Share')])
    amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    qty = models.PositiveIntegerField(default=0)
    received_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)
    authorized_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)


class Profit(models.Model):
    dividend = models.ForeignKey(Dividend, on_delete=models.PROTECT, null=True, blank=True)
    project=models.ForeignKey(Project,on_delete=models.CASCADE,related_name='profit_project_details')
    trade=models.ForeignKey(Trade,on_delete=models.CASCADE,related_name="profit_trade_details", null=True, blank=True)
    amount=models.DecimalField(max_digits=1000,decimal_places=2)
    accrued_dt=models.DateTimeField(auto_now_add=True)
    disburse_st=models.BooleanField(default=False)
    disburse_dt = models.DateTimeField(null=True, blank=True)
    authorized_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,related_name='profit_authorizer_details')


class FinAdvisorCommission(models.Model):
    dividend = models.ForeignKey(Dividend, on_delete=models.PROTECT, null=True, blank=True)
    advisor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='fin_advisor_com')
    project=models.ForeignKey(Project,on_delete=models.CASCADE,related_name='fin_project')
    trade=models.ForeignKey(Trade,on_delete=models.CASCADE,related_name='com_trade_details', null=True, blank=True)
    com_percent=models.DecimalField(max_digits=100,decimal_places=2)
    com_amount=models.DecimalField(max_digits=1000,decimal_places=2)
    disburse_dt = models.DateTimeField(null=True, blank=True)
    authorized_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,related_name='commission_authorizer_details')

class InvestorProfit(models.Model):
    dividend = models.ForeignKey(Dividend, on_delete=models.PROTECT, null=True, blank=True)
    project=models.ForeignKey(Project,on_delete=models.CASCADE,related_name="inv_profit_project_details")
    investor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="ben_investor_details")
    trade=models.ForeignKey(Trade,on_delete=models.CASCADE,related_name='inv_profit_trade_details', null=True, blank=True)
    contribute_amount=models.DecimalField(max_digits=1000,decimal_places=2)
    percentage=models.DecimalField(max_digits=1000,decimal_places=2)
    profit_amount=models.DecimalField(max_digits=1000,decimal_places=2)
    disburse_dt = models.DateTimeField(null=True, blank=True)
    authorized_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,related_name='inv_profit_authorizer_details')



    
class AccountReceivable(models.Model):
    project=models.ForeignKey(Project,on_delete=models.CASCADE,related_name='receivable_project_details')
    trade=models.ForeignKey(Trade,on_delete=models.CASCADE,related_name='receivable_trade_details')
    gain_lose=models.DecimalField(max_digits=100,decimal_places=2)
    authorized_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='receivable_authorizer_details')

