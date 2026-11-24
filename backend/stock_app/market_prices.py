"""StockChartBD closing quotes and the Dhaka evening snapshot for Project Details."""

from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, time, timedelta
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

import requests
from django.core.cache import cache
from django.db.models import Case, F, Sum, When

from .models import Dividend, Instrument, Trade


QUOTE_URL = 'https://stockchartbd.com/api/v1.php'
MARKET_TIME_ZONE = ZoneInfo('Asia/Dhaka')
EVENING_REFRESH = time(19)
SNAPSHOT_TTL = 24 * 60 * 60
FALLBACK_TTL = 7 * SNAPSHOT_TTL
RETRY_TTL = 60
REQUEST_BUDGET = 110
CACHE_PREFIX = 'stockchartbd:close:v1'
SNAPSHOT_KEY = f'{CACHE_PREFIX}:snapshot'
FALLBACK_KEY = f'{CACHE_PREFIX}:last-good'
REFRESH_LOCK = f'{CACHE_PREFIX}:refresh'
RETRY_KEY = f'{CACHE_PREFIX}:retry'
BUDGET_KEY = f'{CACHE_PREFIX}:request-budget'


class MarketPriceError(Exception):
    """No usable price snapshot is available."""


def market_now():
    return datetime.now(MARKET_TIME_ZONE)


def snapshot_cycle(now):
    day = now.date()
    if now.time() < EVENING_REFRESH:
        day -= timedelta(days=1)
    return day.isoformat()


def holding_symbols(projects=None):
    trades = Trade.objects.all()
    dividends = Dividend.objects.filter(dividend_type=Dividend.SHARE)
    if projects is not None:
        trades = trades.filter(project__in=projects)
        dividends = dividends.filter(project__in=projects)

    quantities = defaultdict(int)
    trade_totals = trades.values('project_id', 'instrument_id').annotate(
        quantity=Sum(Case(When(trns_type=Trade.BUY, then=F('qty')), default=-F('qty'))),
    ).values_list('project_id', 'instrument_id', 'quantity')
    share_totals = dividends.values('project_id', 'instrument_id').annotate(
        quantity=Sum('qty'),
    ).values_list('project_id', 'instrument_id', 'quantity')
    for totals in (trade_totals.iterator(), share_totals.iterator()):
        for project_id, instrument_id, quantity in totals:
            quantities[project_id, instrument_id] += quantity

    held_ids = {instrument_id for (_, instrument_id), quantity in quantities.items() if quantity > 0}
    names = Instrument.objects.filter(pk__in=held_ids).values_list('name', flat=True)
    return {name.strip().upper() for name in names if name.strip()}


def parse_quote(payload, symbol):
    try:
        if payload.get('ok') is not True or payload.get('symbol') != symbol:
            return None
        quote = payload['quote']
        price = Decimal(str(quote['close']))
        if price.is_finite() and price > 0:
            return {'price': str(price), 'date': date.fromisoformat(quote['date']).isoformat()}
    except (AttributeError, InvalidOperation, KeyError, TypeError, ValueError):
        pass
    return None


def fetch_quote(symbol):
    cache.add(BUDGET_KEY, 0, timeout=3600)
    try:
        if cache.incr(BUDGET_KEY) > REQUEST_BUDGET:
            return None
    except ValueError:
        return None

    try:
        response = requests.get(
            QUOTE_URL, params={'endpoint': 'quote', 'symbol': symbol}, timeout=(2, 3),
        )
        response.raise_for_status()
        return parse_quote(response.json(), symbol)
    except (requests.RequestException, ValueError):
        return None


def collect_quotes(symbols):
    with ThreadPoolExecutor(max_workers=12) as pool:
        return {
            symbol: quote
            for symbol, quote in zip(symbols, pool.map(fetch_quote, symbols))
            if quote is not None
        }


def refresh_daily_prices(now=None):
    now = now or market_now()
    cycle = snapshot_cycle(now)
    current = cache.get(SNAPSHOT_KEY)
    if current is not None and current['cycle'] == cycle:
        return current
    if cache.get(RETRY_KEY) or not cache.add(REFRESH_LOCK, True, timeout=120):
        raise MarketPriceError('The closing snapshot is not ready.')

    try:
        current = cache.get(SNAPSHOT_KEY)
        if current is not None and current['cycle'] == cycle:
            return current

        symbols = sorted(holding_symbols())
        quotes = collect_quotes(symbols)
        if symbols and not quotes:
            cache.set(RETRY_KEY, True, timeout=RETRY_TTL)
            raise MarketPriceError('StockChartBD did not return valid closing quotes.')

        snapshot = {
            'cycle': cycle,
            'fetched_on': now.date().isoformat(),
            'quotes': quotes,
            'stale': False,
            'missing_count': len(symbols) - len(quotes),
        }
        cache.set(SNAPSHOT_KEY, snapshot, timeout=SNAPSHOT_TTL)
        cache.set(FALLBACK_KEY, snapshot, timeout=FALLBACK_TTL)
        return snapshot
    finally:
        cache.delete(REFRESH_LOCK)


def read_snapshot(now):
    snapshot = cache.get(SNAPSHOT_KEY)
    if snapshot is not None and snapshot['cycle'] == snapshot_cycle(now):
        return snapshot
    previous = snapshot if snapshot is not None else cache.get(FALLBACK_KEY)
    return {**previous, 'stale': True} if previous is not None else None


def get_daily_prices(projects):
    now = market_now()
    snapshot = read_snapshot(now)
    if snapshot is None:
        snapshot = refresh_daily_prices(now)
    symbols = holding_symbols(projects)
    quotes = {symbol: quote for symbol, quote in snapshot['quotes'].items() if symbol in symbols}
    return {
        'quotes': quotes,
        'prices': {symbol: quote['price'] for symbol, quote in quotes.items()},
        'fetched_on': snapshot['fetched_on'],
        'stale': snapshot['stale'],
    }


def get_live_prices(project):
    symbols = sorted(holding_symbols([project]))
    return {'quotes': collect_quotes(symbols)}
