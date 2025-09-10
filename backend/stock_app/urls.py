from django.urls import path

from .views import (AccountReceivableCreateApiView,
                    AccountRecivableDetailsListApiView,
                    AddFinancialAdvisorListCreateView,
                    ClientInvestmentDetailsListView, FinancialAdvisorListView,
                    InstrumentListView, InvestmentCreateAPIView,
                    InvestorContributionRetrieveAPI, InvestorProfitDetailsView,
                    ProfitCreateView, ProfitDisburse,
                    ProjectBalanceDetailsView, ProjectCloseView,
                    ProjectCreateView, ProjectProfitTotalListApiView,
                    ProjectStatusRetriveView, SellableInstrumentView,
                    TradeCreateView, TradeDeleteView, TradeDetailsListView)

urlpatterns = [



    path('instruments/', InstrumentListView.as_view(), name='instrument-list'),
    path('create/trade/', TradeCreateView.as_view(), name='create-trade'),
    path('delete/trade/<str:trade_id>/',TradeDeleteView.as_view(),name='delete-trade'),
    path('trade/details/',TradeDetailsListView.as_view(),name='trade-details-ason'),
    path('sellable/instruments/<str:project_id>/',SellableInstrumentView.as_view(),name='buyable-instruments'),

    path('create/project/',ProjectCreateView.as_view(),name='create-project'),
    path('project/status/<str:pk>/',ProjectStatusRetriveView.as_view(),name='project-status'),
    path('project/balance/details/<str:pk>/', ProjectBalanceDetailsView.as_view(), name='project-balance'),
    path('close/project/<str:pk>/',ProjectCloseView.as_view(),name='close-project'),
    
    
    path('add/investment/',InvestmentCreateAPIView.as_view(),name='add-investment'),
    path('investor/contrib/percent/<str:project_id>/',InvestorContributionRetrieveAPI.as_view(),name='inv-cont-percent'),
    path('investor/investment-details/',ClientInvestmentDetailsListView.as_view(),name='client-investment-details'),
    
    path('add/financial/advisor/',AddFinancialAdvisorListCreateView.as_view(),name='add-fin-advisor'),
    path('fin/advisor/commission/<str:project_id>/',FinancialAdvisorListView.as_view(),name='fin-advisor-commission'),

    path('add/profit/',ProfitCreateView.as_view(),name='create-profit'),
    path('project/total/profit/',ProjectProfitTotalListApiView.as_view(),name='total-profit'),
    path('investor/profit-details/',InvestorProfitDetailsView.as_view(),name='investor-profit-details'),
    
    path('create/acc/recvable/',AccountReceivableCreateApiView.as_view(),name='create-acc_rcvable'),
    path('acc/recvable/details/',AccountRecivableDetailsListApiView.as_view(),name='acc_rcvable-details'),

    path('profit/disburse/',ProfitDisburse.as_view(),name='disburse_profit'),

    

]