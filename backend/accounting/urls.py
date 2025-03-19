from django.urls import path

from .views import (CheckBalanceView
                    ,AllUserBalanceDetailsView
                    ,TransactionCreateView
                    ,TransactionApproveView
                    ,FundTransferView
                    ,PendingPaymentsView
                    )

urlpatterns = [
    path('user/<int:pk>/balance/', CheckBalanceView.as_view(), name='check_balance'),
    path('users/balance-details/',AllUserBalanceDetailsView.as_view(),name='all_user_balance'),
    path('user/create-transaction/',TransactionCreateView.as_view(),name='create_transaction'),
    path('user/pending-payments/',PendingPaymentsView.as_view(),name='pending_payments'),
    path('user/approve-transaction/<int:pk>/',TransactionApproveView.as_view(),name='approve_transaction'),
    path('user/fund-transfer/',FundTransferView.as_view(),name='fund_transfer'),

]
