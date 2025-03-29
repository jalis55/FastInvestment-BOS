from django.contrib import admin
from stock_app.models import (Project,Instrument,Investment,Trade
                              ,FinancialAdvisor,AccountReceivable
                              ,FinAdvisorCommission
                              ,Profit
                              ,InvestorProfit
                              )

# Register your models here.

admin.site.register(Project)
admin.site.register(Investment)
admin.site.register(Trade)
admin.site.register(Instrument)
admin.site.register(FinancialAdvisor)
admin.site.register(FinAdvisorCommission)
admin.site.register(AccountReceivable)
admin.site.register(Profit)
admin.site.register(InvestorProfit)
