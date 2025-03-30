from rest_framework import generics
from .models import Account,Transaction,FundTransfer
from .serializers import (AccountSerializer
                          ,TransactionSerializer
                          ,TransactionApproveSerializer
                          ,FundTransferSerializer
                          ,PendingPaymentsSerializer
                        )
from user_app.permissions import IsSuperUser,IsAdminUser
from rest_framework.permissions import AllowAny,IsAuthenticated  
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status 
from rest_framework.exceptions import ValidationError
from django.db import transaction as db_transaction
from django.utils import timezone
from decimal import Decimal




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
        account = Account.objects.get(user_id=self.kwargs['pk'])
        
        # Ensure the requesting user is either the owner of the account or a staff member
        if self.request.user.is_staff or account.user == self.request.user:
            return account
        else:
            # If not allowed, raise a permission denied error
            raise PermissionDenied("You do not have permission to view this balance.")
        


class TransactionCreateView(generics.ListCreateAPIView):  # Change to ListCreateAPIView
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    
    def create(self, request, *args, **kwargs):
        """Handle bulk creation of transactions."""
        is_bulk = isinstance(request.data, list)
        serializer = self.get_serializer(data=request.data, many=is_bulk)
        serializer.is_valid(raise_exception=True)

        with db_transaction.atomic():
            transactions = serializer.save(issued_by=self.request.user, status="pending", issued_date=timezone.now())

            for transaction in transactions if is_bulk else [transactions]:
                if transaction.transaction_type == "deposit":
                    account, created = Account.objects.get_or_create(user=transaction.user)
                    amount = Decimal(transaction.amount)
                    account.update_balance(amount, "deposit")
                    transaction.status = "completed"
                    if transaction.narration is None:
                        transaction.narration=f"Deposit of {amount} is completed"

                    transaction.save()

        return Response(serializer.data)


class PendingPaymentsView(generics.ListAPIView):
    queryset=Transaction.objects.filter(transaction_type='payment',status='pending')
    serializer_class=PendingPaymentsSerializer
    permission_classes=[IsSuperUser]

class TransactionApproveView(generics.UpdateAPIView):
    queryset = Transaction.objects.all()
    serializer_class = TransactionApproveSerializer
    permission_classes = [IsSuperUser]  # Use the custom permission class

    def update(self, request, *args, **kwargs):
        transaction = self.get_object()
        serializer = self.get_serializer(transaction, data=request.data, partial=True)
        
        if serializer.is_valid():
            status_update = serializer.validated_data.get('status')
            account = transaction.user.account

            # Check if the transaction is being approved and balance is sufficient
            if status_update == 'approved':
                try:
                    # Attempt to update the balance
                    account.update_balance(transaction.amount, transaction.transaction_type)
                    
                    # Only set the status to "approved" if balance update succeeds
                    transaction.status = 'approved'
                    transaction.narration=f'Withdrawl of {transaction.amount}'
                    transaction.save()
                    
                except ValidationError as e:
                    # Return error response if balance is insufficient
                    return Response({"detail": "Insufficient balance for approval."}, status=status.HTTP_400_BAD_REQUEST)
            
            elif status_update == 'declined':
                transaction.status = 'declined'
                transaction.save()
            
            # Return the updated transaction data
            return Response(self.get_serializer(transaction).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class FundTransferView(generics.CreateAPIView):
    serializer_class = FundTransferSerializer
    permission_classes = [IsAdminUser]

    @db_transaction.atomic
    def perform_create(self, serializer):
        try:
            transaction = serializer.save(issued_by=self.request.user)
            transfer_to = transaction.transfer_to
            transfer_from = transaction.transfer_from

            transfer_to_account, created = Account.objects.get_or_create(user=transfer_to)
            transfer_from_account = Account.objects.get(user=transfer_from)

            transfer_from_account.update_balance(transaction.amount, 'payment')
            transfer_to_account.update_balance(transaction.amount, 'deposit')

        except ValidationError as e:
            raise serializers.ValidationError("Insufficient balance for this transfer.")

