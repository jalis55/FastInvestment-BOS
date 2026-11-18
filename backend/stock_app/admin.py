from django.contrib import admin

from stock_app.models import (AccountReceivable, Dividend, FinAdvisorCommission,
                              FinancialAdvisor, Instrument, Investment,
                              InvestorProfit, Profit, Project, Trade)

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


@admin.register(Dividend)
class DividendAdmin(admin.ModelAdmin):
    list_display = (
        'project', 'instrument', 'dividend_type', 'amount', 'qty',
        'received_date', 'authorized_by',
    )
    list_filter = ('dividend_type', 'received_date')
    search_fields = ('project__project_id', 'project__project_title', 'instrument__name')
    list_select_related = ('project', 'instrument', 'authorized_by')
    ordering = ('-received_date', '-created_at')
    readonly_fields = (*list_display, 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
