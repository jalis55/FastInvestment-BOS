from django.db import models
from django.conf import settings
from decimal import Decimal
from rest_framework.exceptions import ValidationError

class Account(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.name}'s Account"

    def update_balance(self, amount, transaction_type):
        # Ensure amount is a Decimal
        amount = Decimal(amount)  # Convert to Decimal explicitly
        
        if transaction_type == 'deposit':
            self.balance += amount  # Use Decimal addition
        elif transaction_type == 'payment':
            if self.balance < amount:
                raise ValidationError({f"Insufficient balance for withdrawal of {self.user}."})
            self.balance -= amount  # Use Decimal subtraction
        
        self.save()

class Transaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('payment', 'Payment'),  # For withdrawals
        ('deposit', 'Deposit'),   # For deposits
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    trans_mode = models.CharField(max_length=50)  # e.g., 'bank_transfer', 'cash'
    narration=models.CharField(max_length=300,blank=True,null=True)
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions_issued')
    issued_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending')  # Add status if needed

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

