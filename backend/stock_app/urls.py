from django.urls import path

from user_app.menu_access import PROJECT_PICKER_MENUS, menu_api
from .allocation_report import AllocationReportView
from .dividends import DividendListCreateView
from .profit_report import ProfitReportView

from .views import (AccountReceivableCreateApiView,
                    AccountRecivableDetailsListApiView,
                    AddFinancialAdvisorListCreateView,
                    ClientInvestmentDetailsListView, DisbursementDetailsView, FinancialAdvisorListView,
                    InstrumentListView, InvestmentCreateAPIView, InstrumentClosePriceView, InstrumentLivePriceView,
                    InvestorContributionRetrieveAPI, InvestorProfitDetailsView,
                    ProfitCreateView, ProfitDisburse,
                    ProjectBalanceDetailsView, ProjectCloseView, ProjectCommissionView,
                    ProjectCreateView, ProjectInvestmentHistoryView, ProjectProfitTotalListApiView,ProjectListView,
                    ProjectStatusRetriveView, RefreshMarketPricesView, SellableInstrumentView,
                    TradeCreateView, TradeDeleteView, TradeDetailsListView)

urlpatterns = [
    path('profit/report/', menu_api(ProfitReportView, '/profit-details'), name='profit-report'),
    path('profit/allocation-report/', AllocationReportView.as_view(), name='allocation-report'),
    path('dividends/', menu_api(DividendListCreateView, '/dividends'), name='dividends'),



    path('instruments/', menu_api(InstrumentListView, '/buy-instruments'), name='instrument-list'),
    path('instruments/close/price/',menu_api(InstrumentClosePriceView, '/project-details'),name='instrument-close-price'),
    path('instruments/live/price/<str:project_id>/', menu_api(InstrumentLivePriceView, '/live-share-update'), name='instrument-live-price'),
    path('instruments/close/refresh/', RefreshMarketPricesView.as_view(), name='refresh-market-prices'),
    path('create/trade/', menu_api(TradeCreateView, '/buy-instruments', '/sell-instruments'), name='create-trade'),
    path('delete/trade/<str:trade_id>/',menu_api(TradeDeleteView, '/sell-instruments'),name='delete-trade'),
    path('trade/details/',menu_api(TradeDetailsListView, '/trade-details'),name='trade-details-ason'),
    path('sellable/instruments/<str:project_id>/',menu_api(SellableInstrumentView, '/sell-instruments', '/project-details', '/live-share-update', '/close-project', '/dividends'),name='sellable-instruments'),

    path('create/project/',menu_api(ProjectCreateView, '/create-project'),name='create-project'),
    path('project/status/<str:pk>/',menu_api(ProjectStatusRetriveView, '/sell-instruments', '/buy-instruments', '/add-advisor', '/add-investments', '/close-project', '/dividends'),name='project-status'),
    path('project/commission/<str:pk>/', menu_api(ProjectCommissionView, '/project-list'), name='project-commission'),
    path('project/balance/details/<str:pk>/', menu_api(ProjectBalanceDetailsView, '/project-details', '/live-share-update', '/buy-instruments', '/add-investments', '/close-project'), name='project-balance'),
    path('project/list/',menu_api(ProjectListView, *PROJECT_PICKER_MENUS),name='project-list'),
    path('close/project/<str:pk>/',menu_api(ProjectCloseView, '/close-project'),name='close-project'),
    
    
    path('add/investment/',menu_api(InvestmentCreateAPIView, '/add-investments'),name='add-investment'),
    path('investor/contrib/percent/<str:project_id>/',menu_api(InvestorContributionRetrieveAPI, '/project-investment-summary', '/close-project'),name='inv-cont-percent'),
    path('investor/investment-details/',menu_api(ClientInvestmentDetailsListView, '/investment-history'),name='client-investment-details'),
    path('project/investment-history/<str:project_id>/', menu_api(ProjectInvestmentHistoryView, '/investment-history'), name='project-investment-history'),
    
    path('add/financial/advisor/',menu_api(AddFinancialAdvisorListCreateView, '/add-advisor'),name='add-fin-advisor'),
    path('fin/advisor/commission/<str:project_id>/',menu_api(FinancialAdvisorListView, '/add-advisor'),name='fin-advisor-commission'),

    path('add/profit/',menu_api(ProfitCreateView),name='create-profit'),
    path('project/total/profit/',menu_api(ProjectProfitTotalListApiView, '/close-project'),name='total-profit'),
    path('investor/profit-details/',menu_api(InvestorProfitDetailsView, '/profit-details'),name='investor-profit-details'),
    
    path('create/acc/recvable/',menu_api(AccountReceivableCreateApiView, '/sell-instruments'),name='create-acc_rcvable'),
    path('acc/recvable/details/',menu_api(AccountRecivableDetailsListApiView, '/acc-rec-details'),name='acc_rcvable-details'),

    path('profit/disburse/',menu_api(ProfitDisburse, '/disburse-profit'),name='disburse_profit'),
    path('profit/disbursement-details/<str:project_id>/', menu_api(DisbursementDetailsView, '/disbursement-details'), name='disbursement-details'),

    

]
