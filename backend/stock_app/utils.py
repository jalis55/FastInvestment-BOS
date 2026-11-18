from django.db.models import Q, Sum

from accounting.models import Account

from .models import FinAdvisorCommission, FinancialAdvisor, Investment, InvestorProfit, Project


def projects_visible_to(user):
    projects = Project.objects.all()
    if user.is_staff or user.is_superuser:
        return projects
    return projects.filter(
        Q(pk__in=Investment.objects.filter(investor=user).values('project_id'))
        | Q(pk__in=FinancialAdvisor.objects.filter(advisor=user).values('project_id'))
        | Q(pk__in=InvestorProfit.objects.filter(investor=user, disburse_dt__isnull=False).values('project_id'))
        | Q(pk__in=FinAdvisorCommission.objects.filter(advisor=user, disburse_dt__isnull=False).values('project_id')),
    )


def investor_contributions_map(project):
    """
    Return a dict {user_id: total_contribution} for a given project.
    """
    qs = (
        project.investment_project_details
        .values('investor')
        .annotate(total_contribution=Sum('amount'))
    )
    return {row['investor']: row['total_contribution'] for row in qs}

def update_customer_balance(customer,amount):
    account=Account.objects.select_for_update().get(user=customer)
    account.deposit(amount)
