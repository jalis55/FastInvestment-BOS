from django.urls import path
from .views import (
                     ProjectCreateView,ProjectCloseView
                    ,ProjectBalanceDetailsView,ProjectUpdateView,ProjectStatusRetriveView
                    ,InstrumentListView,TradeCreateView,TradeDeleteView,TradeDetailsListView

                    ,SellableInstrumentView,InvestmentCreateAPIView
                    ,InvestorContributionRetrieveApiView,InvestorProfitCreateView,UpdateProfitView,
                    FinancialAdvisorListView,AddFinancialAdvisorListCreateView,FinAdvisorCommissionListCreateView,

                    AccountReceivableCreateApiView,AccountRecivableDetailsListApiView,
                    UpdateAccountReceivableView,
                    ProfitCreateView,ProjectProfitTotalListApiView
                    )

urlpatterns = [



    path('instruments/', InstrumentListView.as_view(), name='instrument-list'),
    path('create-trade/', TradeCreateView.as_view(), name='create-trade'),
    path('delete-trade/<str:trade_id>/',TradeDeleteView.as_view(),name='delete-trade'),
    path('trade-details/',TradeDetailsListView.as_view(),name='trade-details-ason'),
    path('sellable-instruments/<str:project_id>/',SellableInstrumentView.as_view(),name='buyable-instruments'),

    path('create-project/',ProjectCreateView.as_view(),name='create-project'),
    path('update-project/',ProjectUpdateView.as_view(),name='update-project'),
    path('project-status/<str:project_id>/',ProjectStatusRetriveView.as_view(),name='project-status'),
    path('project-balance-details/<str:project_id>/', ProjectBalanceDetailsView.as_view(), name='project-balance'),
    
    
    path('add-investment/',InvestmentCreateAPIView.as_view(),name='add-investment'),
    path('investor-contrib-percent/<str:project_id>/',InvestorContributionRetrieveApiView.as_view(),name='inv-cont-percent'),
    path('add-investor-profit/',InvestorProfitCreateView.as_view(),name='add-investor-profit'),
    
    path('add-financial-advisor/',AddFinancialAdvisorListCreateView.as_view(),name='add-fin-advisor'),
    path('fin-advisor-commission/<str:project_id>/',FinancialAdvisorListView.as_view(),name='fin-advisor-commission'),
    path('add-fin-advisor-commission/',FinAdvisorCommissionListCreateView.as_view(),name='add-fin-adv-commission'),

    path('add-profit/',ProfitCreateView.as_view(),name='create-profit'),
    path('project-total-profit/',ProjectProfitTotalListApiView.as_view(),name='total-profit'),
    
    path('create-acc-recvable/',AccountReceivableCreateApiView.as_view(),name='create-acc_rcvable'),
    path('acc-recvable-details/',AccountRecivableDetailsListApiView.as_view(),name='acc_rcvable-details'),
    path('update-acc-recvable/',UpdateAccountReceivableView.as_view(),name='update-acc_rcvable'),
    path('update-profit/',UpdateProfitView.as_view(),name='update-update'),
    path('close-project/',ProjectCloseView.as_view(),name='close-project')
    

]