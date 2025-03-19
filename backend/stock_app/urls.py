from django.urls import path
from .views import (
                     ProjectCreateView
                    ,ProjectBalanceView
                    ,InstrumentListView,TradeCreateView,TradeDetailsRetriveView

                    ,BuyableInstrumentView,InvestmentCreateAPIView
                    ,InvestorContributionRetrieveApiView,
                    FinancialAdvisorListView,AddFinancialAdvisorListCreateView,

                    AccountReceivableCreateApiView,AccountRecivableDetailsListApiView,
                    AccountReceivableDetailsAsonListApiView,
                    UpdateAccountReceivableView
                    )

urlpatterns = [



    path('instruments/', InstrumentListView.as_view(), name='instrument-list'),
    path('create-trade/', TradeCreateView.as_view(), name='create-trade'),
    path('trade-details/',TradeDetailsRetriveView.as_view(),name='trade-details'),

    path('create-project/',ProjectCreateView.as_view(),name='create-project'),
    path('project-balance/<str:project_id>/', ProjectBalanceView.as_view(), name='project-balance'),
    
    
    path('buyable-instruments/<str:project_id>/',BuyableInstrumentView.as_view(),name='buyable-instruments'),
    path('add-investment/',InvestmentCreateAPIView.as_view(),name='add-investment'),
    path('investor-contrib-percent/<str:project_id>/',InvestorContributionRetrieveApiView.as_view(),name='inv-cont-percent'),
    
    path('add-financial-advisor/',AddFinancialAdvisorListCreateView.as_view(),name='add-fin-advisor'),
    path('fin-advisor-commission/<str:project_id>/',FinancialAdvisorListView.as_view(),name='fin-advisor-commission'),
    
    path('create-acc-recvable/',AccountReceivableCreateApiView.as_view(),name='create-acc_rcvable'),

    path('acc-recvable-details/<str:project_id>/',AccountRecivableDetailsListApiView.as_view(),name='acc_rcvable-details'),

    path('acc-recvable-details-ason/<str:project_id>/',AccountReceivableDetailsAsonListApiView.as_view(),name='acc_rcvable-details-ason'),
    path('update-acc-recvable/',UpdateAccountReceivableView.as_view(),name='update-acc_rcvable'),
    

]