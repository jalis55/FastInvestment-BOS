from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Dividend, InvestorProfit, Profit, Project


class ProfitReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff = request.user.is_staff or request.user.is_superuser
        projects = Project.objects.all() if staff else Project.objects.filter(
            investment_project_details__investor=request.user).distinct()
        project_id = request.query_params.get('project_id')
        if project_id:
            projects = projects.filter(pk=project_id)
        project_map = {p.pk: {'project': p.pk, 'project_title': p.project_title,
                            'cash_profit': '0.00', 'bonus_shares': 0, 'records': []}
                       for p in projects.order_by('project_id')}
        if staff:
            profits = Profit.objects.filter(project_id__in=project_map).select_related('trade__instrument', 'dividend__instrument')
        else:
            profits = InvestorProfit.objects.filter(investor=request.user, project_id__in=project_map).select_related('trade__instrument', 'dividend__instrument')
        for profit in profits:
            dividend = profit.dividend
            amount = profit.amount if staff else profit.profit_amount
            instrument = dividend.instrument if dividend else profit.trade.instrument if profit.trade else None
            project_map[profit.project_id]['records'].append({
                'id': f'profit-{profit.pk}',
                'date': dividend.received_date if dividend else profit.trade.trade_date if profit.trade else profit.disburse_dt.date(),
                'type': 'cash_dividend' if dividend else 'trade_profit',
                'instrument': instrument.name if instrument else '',
                'amount': str(amount), 'qty': None,
                'status': 'disbursed' if not staff or profit.disburse_st else 'undisbursed',
            })
        bonuses = Dividend.objects.filter(project_id__in=project_map, dividend_type=Dividend.SHARE).select_related('instrument')
        for bonus in bonuses:
            project_map[bonus.project_id]['records'].append({
                'id': f'bonus-{bonus.pk}', 'date': bonus.received_date, 'type': 'share_dividend',
                'instrument': bonus.instrument.name, 'amount': None, 'qty': bonus.qty, 'status': 'added_to_holdings',
            })
        from decimal import Decimal
        for project in project_map.values():
            project['cash_profit'] = str(sum((Decimal(r['amount']) for r in project['records'] if r['amount'] is not None), Decimal('0.00')))
            project['bonus_shares'] = sum(r['qty'] or 0 for r in project['records'])
            project['records'].sort(key=lambda r: (str(r['date']), r['id']), reverse=True)
        return Response({'scope': 'project' if staff else 'investor',
                         'projects': [p for p in project_map.values() if p['records']]})
