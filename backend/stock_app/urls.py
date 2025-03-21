from django.urls import path
from .views import (
                     ProjectCreateView
                    ,ProjectBalanceDetailsView
                    ,InstrumentListView,TradeCreateView,TradeDetailsListView

                    ,SellableInstrumentView,InvestmentCreateAPIView
                    ,InvestorContributionRetrieveApiView,
                    FinancialAdvisorListView,AddFinancialAdvisorListCreateView,

                    AccountReceivableCreateApiView,AccountRecivableDetailsListApiView,
                    UpdateAccountReceivableView
                    )

urlpatterns = [



    path('instruments/', InstrumentListView.as_view(), name='instrument-list'),
    path('create-trade/', TradeCreateView.as_view(), name='create-trade'),
    path('trade-details/',TradeDetailsListView.as_view(),name='trade-details-ason'),
    path('sellable-instruments/<str:project_id>/',SellableInstrumentView.as_view(),name='buyable-instruments'),

    path('create-project/',ProjectCreateView.as_view(),name='create-project'),
    path('project-balance-details/<str:project_id>/', ProjectBalanceDetailsView.as_view(), name='project-balance'),
    
    
    path('add-investment/',InvestmentCreateAPIView.as_view(),name='add-investment'),
    path('investor-contrib-percent/<str:project_id>/',InvestorContributionRetrieveApiView.as_view(),name='inv-cont-percent'),
    
    path('add-financial-advisor/',AddFinancialAdvisorListCreateView.as_view(),name='add-fin-advisor'),
    path('fin-advisor-commission/<str:project_id>/',FinancialAdvisorListView.as_view(),name='fin-advisor-commission'),
    
    path('create-acc-recvable/',AccountReceivableCreateApiView.as_view(),name='create-acc_rcvable'),
    path('acc-recvable-details/',AccountRecivableDetailsListApiView.as_view(),name='acc_rcvable-details'),
    path('update-acc-recvable/',UpdateAccountReceivableView.as_view(),name='update-acc_rcvable'),
    

]