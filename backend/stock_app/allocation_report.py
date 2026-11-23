from user_app.menu_access import require_menu_access
from collections import defaultdict
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .distribution import allocation_row, calculate_distribution, recorded_allocation_rows
from .models import FinAdvisorCommission, FinancialAdvisor, Investment, InvestorProfit, Profit, Project
from .serializers import DisbursementReportFilterSerializer
from .utils import projects_visible_to


class AllocationReportFilters(DisbursementReportFilterSerializer):
    status = serializers.ChoiceField(choices=['all', 'pending', 'disbursed'], default='pending')
    project_id = serializers.CharField(required=False)
    projects_only = serializers.BooleanField(default=False)


def earnings_date_filter(criteria):
    dates = {lookup: criteria[key] for key, lookup in (('from_dt', 'gte'), ('to_dt', 'lte')) if key in criteria}
    if not dates:
        return Q()
    return Q(**{f'trade__trade_date__{lookup}': value for lookup, value in dates.items()}) | Q(
        **{f'dividend__received_date__{lookup}': value for lookup, value in dates.items()}
    )


class AllocationReportView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='List pending or disbursed profit allocations', parameters=[AllocationReportFilters])
    def get(self, request):
        filters = AllocationReportFilters(data=request.query_params)
        filters.is_valid(raise_exception=True)
        criteria = filters.validated_data
        staff = request.user.is_staff or request.user.is_superuser
        user = None if staff else request.user
        status = criteria['status']
        scope = 'project' if staff else 'personal'
        if criteria['projects_only']:
            require_menu_access(request.user, '/allocation-details', '/project-details', '/live-share-update')
            projects = projects_visible_to(request.user).order_by('-project_active_status', 'project_title', 'project_id')
            return Response({'scope': scope, 'projects': list(projects.values('project_id', 'project_title'))})
        require_menu_access(request.user, '/allocation-details')
        if status == 'all':
            return Response({
                'status': status,
                'scope': scope,
                'pending': self._pending(criteria, user),
                'disbursed': self._disbursed(criteria, user.pk if user is not None else None),
            })
        projects = self._pending(criteria, user) if status == 'pending' else self._disbursed(
            criteria, user.pk if user is not None else None,
        )
        return Response({'status': status, 'scope': scope, 'projects': projects})

    def _pending(self, criteria, user):
        profits = Profit.objects.filter(disburse_st=False).filter(
            Q(trade_id__isnull=False) | Q(dividend_id__isnull=False),
        )
        if 'project_id' in criteria:
            profits = profits.filter(project_id=criteria['project_id'])
        if user is not None:
            investments = Investment.objects.filter(investor=user).values('project_id')
            assignments = FinancialAdvisor.objects.filter(advisor=user).values('project_id')
            profits = profits.filter(Q(project_id__in=investments) | Q(project_id__in=assignments))
        profits = profits.filter(earnings_date_filter(criteria))

        by_project = defaultdict(list)
        for profit in profits.select_related('project', 'trade', 'dividend').order_by('project_id', 'pk'):
            by_project[profit.project_id].append(profit)
        advisors = defaultdict(list)
        for assignment in FinancialAdvisor.objects.filter(project_id__in=by_project).order_by('pk'):
            advisors[assignment.project_id].append(assignment)
        investments = defaultdict(list)
        for investment in Investment.objects.filter(project_id__in=by_project):
            investments[investment.project_id].append(investment)

        projects = []
        for project_id, records in by_project.items():
            project = records[0].project
            commissions, allocations, payouts = calculate_distribution(
                project, records, advisors[project_id], investments[project_id],
                recipient_id=user.pk if user is not None else None,
            )
            if not payouts:
                continue
            users = {user.pk: user} if user is not None else get_user_model().objects.in_bulk(payouts)
            projects.append({
                'project': project_id,
                'project_title': project.project_title,
                'advisor_rows': [allocation_row(row, users[row.advisor_id]) for row in commissions],
                'investor_rows': [allocation_row(row, users[row.investor_id]) for row in allocations],
                'advisor_total': str(sum((amount[0] for amount in payouts.values()), Decimal('0.00'))),
                'investor_total': str(sum((amount[1] for amount in payouts.values()), Decimal('0.00'))),
            })
        return projects

    def _disbursed(self, criteria, user_id):
        filters = {'disburse_dt__isnull': False}
        if 'project_id' in criteria:
            filters['project_id'] = criteria['project_id']
        dates = earnings_date_filter(criteria)

        grouped = defaultdict(lambda: {'advisor_rows': [], 'investor_rows': []})
        for model, role in ((FinAdvisorCommission, 'advisor'), (InvestorProfit, 'investor')):
            scoped = {**filters, f'{role}_id': user_id} if user_id is not None else filters
            for row in recorded_allocation_rows(model, role, dates, **scoped):
                grouped[row['project']][f'{role}_rows'].append(row)
        projects = Project.objects.filter(pk__in=grouped).order_by('pk')
        return [{
            'project': project.pk,
            'project_title': project.project_title,
            **grouped[project.pk],
            **{
                f'{role}_total': str(sum(
                    (row['amount'] for row in grouped[project.pk][f'{role}_rows']),
                    Decimal('0.00'),
                )) for role in ('advisor', 'investor')
            },
        } for project in projects]
