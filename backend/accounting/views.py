from drf_spectacular.utils import extend_schema
from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from user_app.permissions import IsAdminUser, IsSuperUser

from .models import Account, FundTransfer, Transaction
from .serializers import (AccountSerializer, FundTransferSerializer,
                          PendingPaymentsSerializer,
                          TransactionApproveSerializer,
                          TransactionCreateSerializer,
                          TransactionDetailsSerializer)


@extend_schema(summary='List user balances', description='Returns every account with nested user details and its balance.')
class AllUserBalanceDetailsView(generics.ListAPIView):
    queryset=Account.objects.all()
    serializer_class=AccountSerializer
    permission_classes=[IsAdminUser]


@extend_schema(summary='Get a user balance', description='The path ID is a user ID, not an account ID. Only the owner or staff may read it. A missing account returns HTTP 400.')
class CheckBalanceView(generics.RetrieveAPIView):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]  # Require authentication and custom permission

    def get_object(self):
        # Get the account for the user with the ID passed in the URL
        try:
            account = Account.objects.get(user_id=self.kwargs['pk'])
        except Account.DoesNotExist:
            raise ValidationError("Account not found.")
        
        # Ensure the requesting user is either the owner of the account or a staff member
        if self.request.user.is_staff or account.user == self.request.user:
            return account
        else:
            # If not allowed, raise a permission denied error
            raise PermissionDenied("You do not have permission to view this balance.")



        
@extend_schema(summary='List your completed transactions', description='Returns only transactions belonging to the current user whose status is completed. Approved payments are not included by this filter.')
class TransactionDetailsView(generics.ListAPIView):
    serializer_class=TransactionDetailsSerializer
    permission_classes=[IsAuthenticated]
    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user,status='completed')

@extend_schema(summary='Create a transaction', description='Creates a transaction for the supplied user ID. External deposits credit the account immediately and become completed. Internal transactions become completed without changing balances here. Other payments remain pending.')
class TransactionCreateView(generics.CreateAPIView):
    serializer_class = TransactionCreateSerializer
    permission_classes = [IsAuthenticated]

    @db_transaction.atomic
    def perform_create(self, serializer):
        serializer.save()


@extend_schema(summary='List pending payments', description='Returns pending payment transactions with nested user and issuer details.')
class PendingPaymentsView(generics.ListAPIView):
    permission_classes = [IsSuperUser]
    serializer_class = PendingPaymentsSerializer

    def get_queryset(self):
        return (Transaction.objects
                .filter(transaction_type='payment', status='pending')
                .select_related('user', 'issued_by'))


@extend_schema(summary='Approve or decline a pending transaction', description='Accepts status=approved or declined using PUT/PATCH. Approval withdraws the amount from the account; decline leaves the balance unchanged. Only pending transactions can be selected.')
class TransactionApproveView(generics.UpdateAPIView):
    queryset = Transaction.objects.filter(status='pending')
    serializer_class = TransactionApproveSerializer
    permission_classes = [IsAdminUser]

    @db_transaction.atomic
    def perform_update(self, serializer):
        transaction_obj = serializer.instance
        new_status = serializer.validated_data.get('status')

        # Acquire account with lock
        try:
            account = Account.objects.select_for_update().get(user_id=transaction_obj.user_id)
        except Account.DoesNotExist:
            raise serializers.ValidationError({"detail": "User account not found."})

        if new_status == "approved":
            try:
                # account.update_balance(transaction_obj.amount, transaction_obj.transaction_type)
                account.withdraw(transaction_obj.amount)
            except ValidationError as e:
                raise serializers.ValidationError({"detail": f"Balance update failed: {str(e)}"})

            narration = (
                transaction_obj.narration or
                (f"Withdrawal of {transaction_obj.amount} approved"
                 if transaction_obj.transaction_type == "payment"
                 else f"Deposit of {transaction_obj.amount} approved")
            )
        else:  # Declined
            narration = transaction_obj.narration or "Transaction declined"

        # Apply update in one DB hit
        Transaction.objects.filter(pk=transaction_obj.pk).update(status=new_status, narration=narration)

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True  # Allow partial update
        return super().update(request, *args, **kwargs)

@extend_schema(summary='Transfer funds between users', description='Atomically debits transfer_from, credits transfer_to, and creates completed internal payment/deposit records. IDs identify users. Insufficient funds fail validation.')
class FundTransferView(generics.CreateAPIView):
    serializer_class = FundTransferSerializer
    permission_classes = [IsAdminUser]

    @db_transaction.atomic
    def perform_create(self, serializer):
        serializer.save()

