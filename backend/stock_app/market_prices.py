"""Daily AmarStock closing prices for project valuations."""

import re
import time
from datetime import datetime
from decimal import Decimal, InvalidOperation
from urllib.parse import urljoin, urlparse
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup
from django.core.cache import cache


SOURCE_URL = 'https://www.amarstock.com/latest-share-price'
MARKET_TIME_ZONE = ZoneInfo('Asia/Dhaka')
DAILY_CACHE_SECONDS = 60 * 60 * 48
LATEST_CACHE_SECONDS = 60 * 60 * 24 * 30


class MarketPriceError(Exception):
    """The upstream price list could not be read or validated."""


def positive_decimal(value):
    try:
        number = Decimal(str(value))
        return number if number.is_finite() and number > 0 else None
    except (InvalidOperation, TypeError, ValueError):
        return None


def parse_prices(payload):
    """Map AmarStock's columnar trading codes to positive closing prices.

    ``ee`` is the displayed Close column; ``aj`` is YCP, used when Close is
    zero because the instrument did not trade in the current session.
    """
    if not isinstance(payload, dict):
        raise MarketPriceError('Unexpected price data format.')
    symbols = payload.get('aa')
    closes = payload.get('ee')
    previous_closes = payload.get('aj')
    if not all(isinstance(column, list) for column in (symbols, closes, previous_closes)):
        raise MarketPriceError('Price columns are missing.')
    if not symbols or len(symbols) != len(closes) or len(symbols) != len(previous_closes):
        raise MarketPriceError('Price columns have different lengths.')

    prices = {}
    for symbol, close, previous_close in zip(symbols, closes, previous_closes):
        if not isinstance(symbol, str) or not symbol.strip():
            continue
        value = positive_decimal(close) or positive_decimal(previous_close)
        if value is not None:
            prices[symbol.strip().upper()] = str(value)
    if not prices or len(prices) < len(symbols) // 2:
        raise MarketPriceError('Too few valid prices were returned.')
    return prices


def scrape_prices():
    """Discover the public feed used by AmarStock's share-price page."""
    try:
        page_response = requests.get(SOURCE_URL, timeout=12)
        page_response.raise_for_status()
        page = BeautifulSoup(page_response.text, 'html.parser')
        script = next((tag.get('src') for tag in page.find_all('script', src=True)
                       if 'lsp-page' in tag.get('src', '')), None)
        if not script:
            raise MarketPriceError('AmarStock price script was not found.')

        script_url = urljoin(SOURCE_URL, script)
        if urlparse(script_url).scheme != 'https' or urlparse(script_url).hostname not in {
            'www.amarstock.com', 'staticv2.amarstock.com',
        }:
            raise MarketPriceError('Unexpected AmarStock script URL.')
        script_response = requests.get(script_url, timeout=12)
        script_response.raise_for_status()
        endpoint = re.search(r'\blsc\s*:\s*["\']([^"\']+)["\']', script_response.text)
        if not endpoint:
            raise MarketPriceError('AmarStock price feed was not found.')

        feed_url = urljoin(SOURCE_URL, endpoint.group(1))
        if urlparse(feed_url).scheme != 'https' or urlparse(feed_url).hostname != 'www.amarstock.com':
            raise MarketPriceError('Unexpected AmarStock price feed URL.')
        feed_response = requests.get(feed_url, timeout=12)
        feed_response.raise_for_status()
        return parse_prices(feed_response.json())
    except (requests.RequestException, ValueError) as exc:
        raise MarketPriceError('AmarStock could not be reached or returned invalid data.') from exc


def get_daily_prices():
    """Fetch once per Dhaka date across workers; retain the last good prices."""
    today = datetime.now(MARKET_TIME_ZONE).date().isoformat()
    daily_key = f'amarstock:close:{today}'
    latest_key = 'amarstock:close:latest'
    snapshot = cache.get(daily_key)
    if snapshot:
        if snapshot.get('error'):
            raise MarketPriceError('Market prices are temporarily unavailable.')
        return snapshot

    lock_key = f'{daily_key}:lock'
    if cache.add(lock_key, 'fetching', timeout=45):
        try:
            # A second worker may have completed while this one acquired the lock.
            snapshot = cache.get(daily_key)
            if not snapshot:
                snapshot = {'prices': scrape_prices(), 'fetched_on': today, 'stale': False}
                cache.set(daily_key, snapshot, timeout=DAILY_CACHE_SECONDS)
                cache.set(latest_key, snapshot, timeout=LATEST_CACHE_SECONDS)
            return snapshot
        except MarketPriceError:
            snapshot = cache.get(latest_key)
            if snapshot:
                stale_snapshot = {**snapshot, 'stale': True}
                cache.set(daily_key, stale_snapshot, timeout=DAILY_CACHE_SECONDS)
                return stale_snapshot
            cache.set(daily_key, {'error': True}, timeout=DAILY_CACHE_SECONDS)
            raise
        finally:
            cache.delete(lock_key)

    # Another worker is updating the snapshot. Wait for its result rather than
    # issuing a second request to the source.
    for _ in range(120):
        time.sleep(0.25)
        snapshot = cache.get(daily_key)
        if snapshot:
            if snapshot.get('error'):
                raise MarketPriceError('Market prices are temporarily unavailable.')
            return snapshot
        if not cache.get(lock_key):
            break
    snapshot = cache.get(latest_key)
    if snapshot:
        return {**snapshot, 'stale': True}
    raise MarketPriceError('Market prices are temporarily unavailable.')
