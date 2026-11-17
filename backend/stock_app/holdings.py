"""Moving average cost for remaining holdings, including zero-cost bonus shares."""
from decimal import Decimal
from .models import Dividend, Trade


def project_holdings(project):
    events = [(t.created_at, 0, t) for t in Trade.objects.filter(project=project).select_related('instrument')]
    events += [(d.created_at, 1, d) for d in Dividend.objects.filter(project=project, dividend_type=Dividend.SHARE).select_related('instrument')]
    holdings = {}
    for _, kind, event in sorted(events, key=lambda e: (e[0], e[1])):
        row = holdings.setdefault(event.instrument_id, {
            'instrument': event.instrument, 'available_quantity': 0, 'total_cost': Decimal('0'),
        })
        qty = row['available_quantity']
        if kind == 1:
            row['available_quantity'] += event.qty
        elif event.trns_type == Trade.BUY:
            row['available_quantity'] += event.qty
            row['total_cost'] += event.qty * (event.actual_unit_price or event.unit_price)
        else:
            if qty > 0:
                row['total_cost'] *= Decimal(max(qty - event.qty, 0)) / qty
            row['available_quantity'] -= event.qty
    for row in holdings.values():
        qty = row['available_quantity']
        row['average_buy_unit_price'] = row['total_cost'] / qty if qty > 0 else Decimal('0')
    return holdings
