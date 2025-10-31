from decimal import Decimal

from django.conf import settings
from django.db import models
from rest_framework.exceptions import ValidationError


class Account(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.name}'s Account"

    def deposit(self, amount: Decimal):
        self.balance += amount
        self.save()

    def withdraw(self, amount: Decimal):
        if self.balance < amount:
            raise ValidationError(f"Insufficient balance for {self.user}")
        self.balance -= amount
        self.save()

class Transaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('payment', 'Payment'),
        ('deposit', 'Deposit'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    trans_mode = models.CharField(max_length=50)  # e.g. 'bank_transfer', 'cash', 'internal'
    narration = models.CharField(max_length=300, blank=True, null=True)
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions_issued')
    issued_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending')

    def __str__(self):
        return f"{self.transaction_type} of {self.amount} by {self.user.name}"
    
class FundTransfer(models.Model):
    transfer_to=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='transfer_to')
    transfer_from=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='transfer_from')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    issued_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='issued_by')
    issued_date = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.transfer_from } trnasfer fund to {self.transfer_to}"
    
    def clean(self):
        transferor_account = Account.objects.get(user=self.transfer_from)
        if transferor_account.balance < self.amount:
            raise ValidationError("Insufficient balance for this transfer.")

