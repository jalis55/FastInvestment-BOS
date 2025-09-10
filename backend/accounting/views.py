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


class AllUserBalanceDetailsView(generics.ListAPIView):
    queryset=Account.objects.all()
    serializer_class=AccountSerializer
    permission_classes=[IsAdminUser]


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



        
class TransactionDetailsView(generics.ListAPIView):
    serializer_class=TransactionDetailsSerializer
    permission_classes=[IsAuthenticated]
    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user,status='completed')

class TransactionCreateView(generics.CreateAPIView):
    serializer_class = TransactionCreateSerializer
    permission_classes = [IsAuthenticated]

    @db_transaction.atomic
    def perform_create(self, serializer):
        serializer.save()


class PendingPaymentsView(generics.ListAPIView):
    permission_classes = [IsSuperUser]
    serializer_class = PendingPaymentsSerializer

    def get_queryset(self):
        return (Transaction.objects
                .filter(transaction_type='payment', status='pending')
                .select_related('user', 'issued_by'))


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

class FundTransferView(generics.CreateAPIView):
    serializer_class = FundTransferSerializer
    permission_classes = [IsAdminUser]

    @db_transaction.atomic
    def perform_create(self, serializer):
        serializer.save()

