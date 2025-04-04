from rest_framework import serializers
from .models import Account, Transaction,FundTransfer
from user_app.models import CustomUser

class ShortUserDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model=CustomUser
        fields=['id','name','email','profile_image']

class AccountSerializer(serializers.ModelSerializer):
    user = ShortUserDetailsSerializer(read_only=True)  # Include user details

    class Meta:
        model = Account
        fields = ['user', 'balance']  # Include user and balance

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'user', 'amount', 'transaction_type', 'trans_mode', 'narration','issued_by', 'issued_date', 'status']
        read_only_fields = ['issued_by', 'issued_date', 'status']  
class TransactionDetailsSerializer(serializers.ModelSerializer):

    class Meta:
        model=Transaction
        
        fields = ['amount', 'transaction_type', 'narration', 'issued_date', 'status']
class PendingPaymentsSerializer(serializers.ModelSerializer):
    user=ShortUserDetailsSerializer(read_only=True)
    issued_by=ShortUserDetailsSerializer(read_only=True)
    
    class Meta:
        model=Transaction
        fields=['id','user','amount','issued_by','issued_date','status']

    
class TransactionApproveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['status']

class FundTransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundTransfer
        fields = ['transfer_to', 'transfer_from', 'amount']
        read_only_fields = ['issued_by', 'issued_date']

    def validate(self, data):
        transferor_account = Account.objects.get(user=data['transfer_from'])
        if transferor_account.balance < data['amount']:
            raise serializers.ValidationError({'error': 'Insufficient balance for this transfer.'})
        return data