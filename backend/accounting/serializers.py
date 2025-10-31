from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import serializers

from user_app.models import CustomUser

from .models import Account, FundTransfer, Transaction


class ShortUserDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model=CustomUser
        fields=['id','name','email','profile_image']

class AccountSerializer(serializers.ModelSerializer):
    user = ShortUserDetailsSerializer(read_only=True)  # Include user details

    class Meta:
        model = Account
        fields = ['user', 'balance']  # Include user and balance

        def validate_user(self,value):
            if not CustomUser.objects.filter(id=value).exists():
                raise serializers.ValidationError("User Account does not exist")

class TransactionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'user', 'amount', 'transaction_type', 'trans_mode', 'narration']
    
    def create(self, validated_data):
        user = validated_data['user']
        amount = validated_data['amount']
        trans_type = validated_data['transaction_type']
        trans_mode = validated_data['trans_mode']
        narration = validated_data.get('narration')

        with db_transaction.atomic():
            # Lock account row during balance update to avoid race conditions
            account = Account.objects.select_for_update().get(user=user)

            transaction = Transaction.objects.create(
                **validated_data,
                status='pending',
                issued_by=self.context['request'].user,
                issued_date=timezone.now()
            )

            # Business logic encapsulated within model methods
            if trans_type == 'deposit' and trans_mode != 'internal':
                account.deposit(amount)
                transaction.status = 'completed'
                if not narration:
                    transaction.narration = f"Deposit of {amount} completed"
                transaction.save()
            elif trans_mode == 'internal':
                transaction.status = 'completed'
                if not narration:
                    transaction.narration = f"Internal transfer of {amount} completed"
                transaction.save()
            # Add handling for 'payment' or other types as needed

        return transaction

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
        fields = ["status"]
        read_only_fields = []  # No fields are read-only, as status is updatable

    def validate_status(self, value):
        """Ensure status is either 'approved' or 'declined'."""
        valid_statuses = ["approved", "declined"]
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Status must be one of {valid_statuses}."
            )
        return value

class FundTransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundTransfer
        fields = ['transfer_to', 'transfer_from', 'amount']

    def validate(self, data):
        transferor_account = Account.objects.get(user=data['transfer_from'])
        if transferor_account.balance < data['amount']:
            raise serializers.ValidationError({'error': 'Insufficient balance for this transfer.'})
        return data

    def create(self,validated_data):
        transfer_to=validated_data['transfer_to']
        transfer_from=validated_data['transfer_from']
        amount=validated_data['amount']

        with db_transaction.atomic():
            from_acc=Account.objects.select_for_update().get(user=transfer_from)
            to_acc=Account.objects.select_for_update().get(user=transfer_to)

            fund_transfer=FundTransfer.objects.create(
                **validated_data,
                issued_by=self.context['request'].user,
                issued_date=timezone.now()
            )
                        # Create corresponding Transaction logs
            Transaction.objects.create(
                user=transfer_from,
                amount=amount,
                transaction_type='payment',
                trans_mode='internal',
                narration=f'Fund transfer to {transfer_to}',
                status='completed',
                issued_by=self.context['request'].user,
                issued_date=timezone.now()
            )
            Transaction.objects.create(
                user=transfer_to,
                amount=amount,
                transaction_type='deposit',
                trans_mode='internal',
                narration=f'Fund received from {transfer_from}',
                status='completed',
                issued_by=self.context['request'].user,
                issued_date=timezone.now()
            )
            from_acc.withdraw(amount)
            to_acc.deposit(amount)

            return fund_transfer