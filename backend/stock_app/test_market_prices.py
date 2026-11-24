from datetime import datetime
from unittest.mock import Mock, patch
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from stock_app.market_prices import (
    FALLBACK_KEY, SNAPSHOT_KEY, MarketPriceError, fetch_quote, get_daily_prices,
    get_live_prices, holding_symbols, parse_quote, refresh_daily_prices,
)
from stock_app.models import Instrument, Project, Trade
from user_app.models import CustomUser


LOC_MEM = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
QUOTE = {'price': '226.7', 'date': '2026-11-23'}


def dhaka(day, hour, minute=0):
    return datetime(2026, 11, day, hour, minute, tzinfo=ZoneInfo('Asia/Dhaka'))


@override_settings(CACHES=LOC_MEM)
class MarketPriceTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def test_parse_close_and_keep_actual_trading_date(self):
        payload = {
            'ok': True, 'symbol': 'GP',
            'quote': {'close': 226.7, 'previous_close': 228, 'date': '2026-11-23'},
        }
        self.assertEqual(parse_quote(payload, 'GP'), QUOTE)
        self.assertIsNone(parse_quote(payload, 'ACI'))
        payload['quote']['close'] = 0
        self.assertIsNone(parse_quote(payload, 'GP'))

    @patch('stock_app.market_prices.requests.get')
    def test_request_uses_stockchartbd_quote_endpoint(self, get):
        response = Mock()
        response.json.return_value = {
            'ok': True, 'symbol': 'GP', 'quote': {'close': 226.7, 'date': '2026-11-23'},
        }
        get.return_value = response
        self.assertEqual(fetch_quote('GP'), QUOTE)
        self.assertEqual(get.call_args.kwargs['params'], {'endpoint': 'quote', 'symbol': 'GP'})

    @patch('stock_app.market_prices.market_now')
    @patch('stock_app.market_prices.holding_symbols', return_value={'GP'})
    @patch('stock_app.market_prices.fetch_quote', return_value=QUOTE)
    def test_bootstrap_then_refresh_once_at_seven(self, fetch, symbols, clock):
        clock.return_value = dhaka(23, 18, 59)
        self.assertEqual(get_daily_prices([])['quotes'], {'GP': QUOTE})
        self.assertEqual(cache.get(SNAPSHOT_KEY)['cycle'], '2026-11-22')
        self.assertFalse(get_daily_prices([])['stale'])
        fetch.assert_called_once_with('GP')

        clock.return_value = dhaka(23, 19)
        self.assertTrue(get_daily_prices([])['stale'])
        refresh_daily_prices()
        refresh_daily_prices()
        self.assertEqual(cache.get(SNAPSHOT_KEY)['cycle'], '2026-11-23')
        self.assertFalse(get_daily_prices([])['stale'])
        self.assertEqual(fetch.call_count, 2)

    @patch('stock_app.market_prices.holding_symbols', return_value={'GP'})
    @patch('stock_app.market_prices.fetch_quote')
    def test_live_requests_fetch_fresh_quotes_even_with_saved_snapshot(self, fetch, symbols):
        cache.set(SNAPSHOT_KEY, {'cycle': '2026-11-23', 'quotes': {'GP': QUOTE}})
        newer_quote = {'price': '230', 'date': '2026-11-24'}
        fetch.side_effect = [QUOTE, newer_quote]
        project = object()

        self.assertEqual(get_live_prices(project), {'quotes': {'GP': QUOTE}})
        self.assertEqual(get_live_prices(project), {'quotes': {'GP': newer_quote}})
        self.assertEqual(fetch.call_count, 2)
        symbols.assert_called_with([project])
        self.assertEqual(cache.get(SNAPSHOT_KEY)['quotes'], {'GP': QUOTE})

    @patch('stock_app.market_prices.market_now')
    @patch('stock_app.market_prices.holding_symbols', return_value={'GP'})
    @patch('stock_app.market_prices.fetch_quote', return_value=QUOTE)
    def test_failed_refresh_preserves_previous_snapshot(self, fetch, symbols, clock):
        clock.return_value = dhaka(23, 19)
        refresh_daily_prices()
        cache.delete(SNAPSHOT_KEY)
        self.assertIsNotNone(cache.get(FALLBACK_KEY))
        clock.return_value = dhaka(24, 19)
        fetch.return_value = None
        with self.assertRaises(MarketPriceError):
            refresh_daily_prices()
        self.assertEqual(get_daily_prices([])['prices'], {'GP': '226.7'})
        self.assertTrue(get_daily_prices([])['stale'])


@override_settings(CACHES=LOC_MEM)
class MarketPriceEndpointTests(TestCase):
    @override_settings(CRON_SECRET='test-cron-secret')
    @patch('stock_app.views.refresh_daily_prices')
    def test_cron_requires_secret(self, refresh):
        refresh.return_value = {'fetched_on': '2026-11-23', 'quotes': {}, 'missing_count': 0}
        client = APIClient()
        url = '/api/stock/instruments/close/refresh/'
        self.assertEqual(client.get(url).status_code, 401)
        refresh.assert_not_called()
        response = client.get(url, HTTP_AUTHORIZATION='Bearer test-cron-secret')
        self.assertEqual(response.status_code, 200)
        refresh.assert_called_once()

    @patch('stock_app.views.get_live_prices', return_value={'quotes': {'GP': QUOTE}})
    def test_live_endpoint_disallows_http_caching(self, prices):
        staff = CustomUser.objects.create_user('live-market@example.test', name='Staff', is_staff=True)
        project = Project.objects.create(project_title='Live Market', created_by=staff)
        client = APIClient()
        client.force_authenticate(staff)

        response = client.get(f'/api/stock/instruments/live/price/{project.pk}/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('no-store', response.headers['Cache-Control'])
        prices.assert_called_once_with(project)

    def test_holdings_symbols_exclude_sold_out_instruments(self):
        staff = CustomUser.objects.create_user('market-staff@example.test', name='Staff', is_staff=True)
        project = Project.objects.create(project_title='Market', created_by=staff)
        sold = Instrument.objects.create(name='SOLD')
        held = Instrument.objects.create(name=' gp ')
        for instrument, trade_type in ((sold, Trade.BUY), (sold, Trade.SELL), (held, Trade.BUY)):
            Trade.objects.create(project=project, instrument=instrument, trns_type=trade_type,
                                 qty=2, unit_price=100, authorized_by=staff)
        self.assertEqual(holding_symbols(), {'GP'})
        self.assertEqual(holding_symbols([project]), {'GP'})
