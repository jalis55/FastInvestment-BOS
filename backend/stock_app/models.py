import random
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

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
    authorized_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trade_authorizer_details')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_total_commission(self):
        commission_rate = 0.004  # 0.4%
        self.total_commission = round(float(self.unit_price) * self.qty * commission_rate, 2)
        return self.total_commission

    def calculate_actual_unit_price(self):
        """Calculates and sets the actual unit price."""
        if self.qty == 0:
            return None  # Avoid division by zero

        qty_decimal = Decimal(self.qty)
        unit_price_decimal = Decimal(self.unit_price)
        total_commission_decimal = Decimal(self.total_commission)

        if self.trns_type == self.BUY:
            price = ((qty_decimal * unit_price_decimal) + total_commission_decimal) / qty_decimal
        elif self.trns_type == self.SELL:
            price = ((qty_decimal * unit_price_decimal) - total_commission_decimal) / qty_decimal
        else:
            return None

        self.actual_unit_price = round(price, 2)
        return self.actual_unit_price

    def save(self, *args, **kwargs):
        """Override save() to compute total_commission and actual_unit_price before saving."""
        self.calculate_total_commission()
        self.calculate_actual_unit_price()
        super().save(*args, **kwargs)

    def __str__(self):
        return str(self.id)
    



class Profit(models.Model):
    project=models.ForeignKey(Project,on_delete=models.CASCADE,related_name='profit_project_details')
    trade=models.ForeignKey(Trade,on_delete=models.CASCADE,related_name="profit_trade_details")
    amount=models.DecimalField(max_digits=1000,decimal_places=2)
    accrued_dt=models.DateTimeField(auto_now_add=True)
    disburse_st=models.BooleanField(default=False)
    disburse_dt = models.DateTimeField(null=True, blank=True)
    authorized_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,related_name='profit_authorizer_details')


class FinAdvisorCommission(models.Model):
    advisor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='fin_advisor_com')
    project=models.ForeignKey(Project,on_delete=models.CASCADE,related_name='fin_project')
    trade=models.ForeignKey(Trade,on_delete=models.CASCADE,related_name='com_trade_details')
    com_percent=models.DecimalField(max_digits=100,decimal_places=2)
    com_amount=models.DecimalField(max_digits=1000,decimal_places=2)
    disburse_dt = models.DateTimeField(null=True, blank=True)
    authorized_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,related_name='commission_authorizer_details')

class InvestorProfit(models.Model):
    project=models.ForeignKey(Project,on_delete=models.CASCADE,related_name="inv_profit_project_details")
    investor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="ben_investor_details")
    trade=models.ForeignKey(Trade,on_delete=models.CASCADE,related_name='inv_profit_trade_details')
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

