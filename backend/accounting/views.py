from rest_framework import generics
from .models import Account,Transaction,FundTransfer
from .serializers import (AccountSerializer
                          ,TransactionSerializer,TransactionDetailsSerializer
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
from django.core.exceptions import ObjectDoesNotExist




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
        
class TransactionDetailsView(generics.ListAPIView):
    serializer_class=TransactionDetailsSerializer
    permission_classes=[IsAuthenticated]
    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user,status='completed')

class TransactionCreateView(generics.CreateAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """Handle creation of single or bulk transactions."""
        is_bulk = isinstance(request.data, list)
        serializer = self.get_serializer(data=request.data, many=is_bulk)
        serializer.is_valid(raise_exception=True)

        with db_transaction.atomic():
            # Save transactions with default fields
            transactions = serializer.save(
                issued_by=self.request.user,
                status="pending",
                issued_date=timezone.now()
            )

            # Process each transaction (bulk or single)
            transactions_list = transactions if is_bulk else [transactions]
            for transaction in transactions_list:
                try:
                    # Handle deposit transactions (non-internal)
                    if transaction.transaction_type == "deposit" and transaction.trans_mode != "internal":
                        account, created = Account.objects.get_or_create(user=transaction.user)
                        amount = Decimal(transaction.amount)
                        account.update_balance(amount, "deposit")
                        transaction.status = "completed"
                        if transaction.narration is None:
                            transaction.narration = f"Deposit of {amount} completed"
                        transaction.save()

                    # Handle internal transactions
                    elif transaction.trans_mode == "internal":
                        account, created = Account.objects.get_or_create(user=transaction.user)
                        amount = Decimal(transaction.amount)
                        transaction.status = "completed"
                        if transaction.narration is None:
                            transaction.narration = f"Internal transfer of {amount} completed"
                        transaction.save()

                except (ValueError, Account.DoesNotExist) as e:
                    # Handle errors (e.g., invalid amount or account issues)
                    return Response(
                        {"error": f"Transaction failed: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PendingPaymentsView(generics.ListAPIView):
    queryset=Transaction.objects.filter(transaction_type='payment',status='pending')
    serializer_class=PendingPaymentsSerializer
    permission_classes=[IsSuperUser]

class TransactionApproveView(generics.UpdateAPIView):
    queryset = Transaction.objects.all()
    serializer_class = TransactionApproveSerializer
    permission_classes = [IsSuperUser]  # Restrict to superusers

    def update(self, request, *args, **kwargs):
        transaction = self.get_object()
        serializer = self.get_serializer(transaction, data=request.data, partial=True)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        status_update = serializer.validated_data.get('status')

        with db_transaction.atomic():
            try:
                # Ensure the user has an account
                account = transaction.user.account
            except (ObjectDoesNotExist, AttributeError):
                return Response(
                    {"detail": "No account found for the user."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Handle approval
            if status_update == "approved":
                try:
                    # Update balance based on transaction type
                    account.update_balance(transaction.amount, transaction.transaction_type)
                    transaction.status = "approved"
                    # Set narration based on transaction type
                    if transaction.transaction_type == "withdrawal":
                        transaction.narration = f"Withdrawal of {transaction.amount} approved"
                    elif transaction.transaction_type == "deposit":
                        transaction.narration = f"Deposit of {transaction.amount} approved"
                    transaction.save()
                except ValidationError as e:
                    return Response(
                        {"detail": f"Balance update failed: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            # Handle decline
            elif status_update == "declined":
                transaction.status = "declined"
                transaction.narration = transaction.narration or f"Transaction declined"
                transaction.save()

        return Response(serializer.data, status=status.HTTP_200_OK)  
class FundTransferView(generics.CreateAPIView):
    serializer_class = FundTransferSerializer
    permission_classes = [IsAdminUser]


    def __make_transaction(self,user1,user2,amount,trans_type,narration):
        """Helper method to create a transaction."""
        return Transaction.objects.create(
            user=user1,
            amount=amount,
            transaction_type=trans_type,
            narration=f'{narration} - {user2}',
            status='completed',
            issued_by=self.request.user,
            issued_date=timezone.now

        )

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

            # Create a transaction record for the transfer
            self.__make_transaction(transfer_from, transfer_to, transaction.amount, 'payment', 'Fund transfer to')
            self.__make_transaction(transfer_to, transfer_from, transaction.amount, 'deposit', 'Fund receive from')

        except ValidationError as e:
            raise serializers.ValidationError("Insufficient balance for this transfer.")

