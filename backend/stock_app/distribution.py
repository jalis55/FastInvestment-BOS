from collections import defaultdict
from decimal import Decimal

from django.utils import timezone

from .models import FinAdvisorCommission, InvestorProfit
from .serializers import UserDetailsSerializer


def calculate_distribution(project, profits, advisors, investments, *, recipient_id=None):
    """Calculate payouts using the same eligibility and rounding as disbursement."""
    contributions = defaultdict(Decimal)
    reinvestments = []
    for entry in investments:
        if entry.is_reinvestment:
            reinvestments.append(entry)
        else:
            contributions[entry.investor_id] += entry.amount

    commissions = []
    allocations = []
    advisor_payouts = defaultdict(Decimal)
    investor_payouts = defaultdict(Decimal)
    for profit in profits:
        remaining = profit.amount
        source = {'project': project, 'trade': profit.trade, 'dividend': profit.dividend}
        for assignment in advisors:
            amount = remaining * assignment.com_percentage / 100
            remaining -= amount
            if recipient_id is not None and assignment.advisor_id != recipient_id:
                continue
            advisor_payouts[assignment.advisor_id] += amount
            commissions.append(FinAdvisorCommission(
                **source, advisor_id=assignment.advisor_id, com_percent=assignment.com_percentage,
                com_amount=amount.quantize(Decimal('0.01')),
            ))

        eligible = contributions.copy()
        for entry in reinvestments:
            # Cash dividends have only a receipt date, so a reinvestment
            # becomes eligible for dividends on subsequent calendar days.
            earned_after_reinvestment = (
                entry.created_at < profit.trade.created_at if profit.trade_id
                else timezone.localdate(entry.created_at) < profit.dividend.received_date
            )
            if earned_after_reinvestment:
                eligible[entry.investor_id] += entry.amount

        total_investment = sum(eligible.values())
        investor_ids = eligible if recipient_id is None else eligible.keys() & {recipient_id}
        for investor_id in investor_ids:
            contribution = eligible[investor_id]
            percentage = round(contribution * 100 / total_investment, 2) if total_investment else Decimal('0')
            amount = round(remaining * percentage / 100, 2)
            investor_payouts[investor_id] += amount
            allocations.append(InvestorProfit(
                **source, investor_id=investor_id, contribute_amount=contribution,
                percentage=percentage, profit_amount=amount,
            ))

    payouts = {
        user_id: (
            advisor_payouts[user_id].quantize(Decimal('0.01')),
            investor_payouts[user_id].quantize(Decimal('0.01')),
        )
        for user_id in sorted(advisor_payouts.keys() | investor_payouts.keys())
    }
    return commissions, allocations, payouts


def allocation_row(row, user):
    advisor = isinstance(row, FinAdvisorCommission)
    return {
        'trade': str(row.trade_id) if row.trade_id else (f'Dividend {row.dividend_id}' if row.dividend_id else '—'),
        'user': UserDetailsSerializer(user).data,
        'percentage': row.com_percent if advisor else row.percentage,
        'amount': row.com_amount if advisor else row.profit_amount,
        'contribution': None if advisor else row.contribute_amount,
    }


def recorded_allocation_rows(model, user_field, *conditions, **filters):
    records = model.objects.filter(*conditions, **filters).select_related(user_field).order_by('-disburse_dt', '-pk')
    return [{
        **allocation_row(record, getattr(record, user_field)),
        'id': record.pk,
        'project': record.project_id,
        'disbursed_at': record.disburse_dt.isoformat(),
    } for record in records]
