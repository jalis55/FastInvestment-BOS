from django.urls import path

from user_app.menu_access import menu_api

from .views import (AllUserBalanceDetailsView, CheckBalanceView,
                    FundTransferView, PendingPaymentsView,
                    TransactionApproveView, TransactionCreateView,
                    TransactionDetailsView)

urlpatterns = [
    path('user/<int:pk>/balance/', menu_api(CheckBalanceView, '/transaction', '/fund-transfer', '/add-investments', '/trans-history'), name='check_balance'),
    path('users/balance-details/',menu_api(AllUserBalanceDetailsView),name='all_user_balance'),
    path('user/create-transaction/',menu_api(TransactionCreateView, '/transaction'),name='create_transaction'),
    path('user/transaction-details/',menu_api(TransactionDetailsView, '/trans-history'),name='transaction-details'),
    path('user/pending-payments/',PendingPaymentsView.as_view(),name='pending_payments'),
    path('user/approve-transaction/<int:pk>/',TransactionApproveView.as_view(),name='approve_transaction'),
    path('user/fund-transfer/',menu_api(FundTransferView, '/fund-transfer'),name='fund_transfer'),

]
