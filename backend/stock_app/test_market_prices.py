from datetime import datetime
from unittest.mock import Mock, patch
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.test import SimpleTestCase, override_settings

from stock_app.market_prices import MarketPriceError, get_daily_prices, parse_prices, scrape_prices
from stock_app.views import SellableInstrumentView


@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
class MarketPriceTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def test_parse_close_and_fall_back_to_previous_close(self):
        result = parse_prices({
            'aa': [' ACI ', 'BEXIMCO', 'MISSING'],
            'ee': [176.2, 0, None],
            'aj': [178.1, 99.1, 0],
        })
        self.assertEqual(result, {'ACI': '176.2', 'BEXIMCO': '99.1'})

    def test_reject_malformed_feed(self):
        with self.assertRaises(MarketPriceError):
            parse_prices({'aa': ['ACI'], 'ee': []})

    @patch('stock_app.market_prices.requests.get')
    def test_discover_feed_from_page_script(self, get):
        page = Mock(text='<script src="https://staticv2.amarstock.com/bundles/js/lsp-page?v=abc"></script>')
        script = Mock(text='endpoint:{lsc:"823af3f1ebdd"}')
        feed = Mock()
        feed.json.return_value = {'aa': ['ACI'], 'ee': [176.2], 'aj': [178.1]}
        get.side_effect = [page, script, feed]

        self.assertEqual(scrape_prices(), {'ACI': '176.2'})
        self.assertEqual(get.call_args_list[2].args[0], 'https://www.amarstock.com/823af3f1ebdd')

    @patch('stock_app.market_prices.datetime')
    @patch('stock_app.market_prices.scrape_prices')
    def test_one_fetch_per_dhaka_day(self, scrape, clock):
        clock.now.return_value = datetime(2026, 11, 5, 8, tzinfo=ZoneInfo('Asia/Dhaka'))
        scrape.return_value = {'ACI': '176.2'}

        first = get_daily_prices()
        second = get_daily_prices()

        self.assertEqual(first, second)
        self.assertEqual(first['fetched_on'], '2026-11-05')
        self.assertFalse(first['stale'])
        scrape.assert_called_once_with()

    @patch('stock_app.market_prices.datetime')
    @patch('stock_app.market_prices.scrape_prices')
    def test_failed_next_day_uses_last_good_snapshot_only_once(self, scrape, clock):
        clock.now.return_value = datetime(2026, 11, 5, 8, tzinfo=ZoneInfo('Asia/Dhaka'))
        scrape.return_value = {'ACI': '176.2'}
        get_daily_prices()

        clock.now.return_value = datetime(2026, 11, 6, 8, tzinfo=ZoneInfo('Asia/Dhaka'))
        scrape.side_effect = MarketPriceError('Source unavailable')
        stale = get_daily_prices()
        self.assertEqual(stale['prices'], {'ACI': '176.2'})
        self.assertEqual(stale['fetched_on'], '2026-11-05')
        self.assertTrue(stale['stale'])
        self.assertEqual(get_daily_prices(), stale)
        self.assertEqual(scrape.call_count, 2)

    @patch('stock_app.market_prices.datetime')
    @patch('stock_app.market_prices.scrape_prices', side_effect=MarketPriceError('Source unavailable'))
    def test_failure_without_snapshot_is_not_retried_that_day(self, scrape, clock):
        clock.now.return_value = datetime(2026, 11, 5, 8, tzinfo=ZoneInfo('Asia/Dhaka'))
        with self.assertRaises(MarketPriceError):
            get_daily_prices()
        with self.assertRaises(MarketPriceError):
            get_daily_prices()
        scrape.assert_called_once_with()

    @patch('stock_app.views.Trade.objects.filter')
    def test_holding_cost_uses_only_the_selected_project(self, filter_trades):
        filter_trades.return_value.aggregate.return_value = {'total_qty': 2, 'total_cost': 200}

        self.assertEqual(SellableInstrumentView().get_average_buy_unit_price('12345678', 5), 100)
        self.assertEqual(filter_trades.call_args.kwargs['project_id'], '12345678')
        self.assertEqual(filter_trades.call_args.kwargs['instrument_id'], 5)
