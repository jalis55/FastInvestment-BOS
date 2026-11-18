from decimal import Decimal
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from accounting.models import Account, Transaction
from .models import Dividend, FinAdvisorCommission, FinancialAdvisor, Instrument, Investment, InvestorProfit, Profit, Project, Trade
from .holdings import project_holdings


class DividendTests(TestCase):
    def setUp(self):
        cache_patch = patch('user_app.signals.cache.delete_pattern')
        cache_patch.start()
        self.addCleanup(cache_patch.stop)
        self.admin = get_user_model().objects.create_user('dividend-admin@example.test', is_staff=True)
        self.investor = get_user_model().objects.create_user('dividend-investor@example.test')
        self.project = Project.objects.create(project_title='Dividends', created_by=self.admin)
        self.instrument = Instrument.objects.create(name='ACI')
        Investment.objects.create(project=self.project, investor=self.investor, amount=1000, authorized_by=self.admin)
        self.buy(100, '10')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.today = timezone.localdate().isoformat()

    def buy(self, qty, price):
        trade = Trade.objects.create(project=self.project, instrument=self.instrument, trns_type='buy', qty=qty, unit_price=price, authorized_by=self.admin)
        # Isolate the user's exact cost example from the normal buy commission.
        Trade.objects.filter(pk=trade.pk).update(actual_unit_price=price, total_commission=0)

    def record(self, kind='share', **extra):
        payload = dict(project=self.project.pk, instrument=self.instrument.pk, dividend_type=kind,
                       qty=10 if kind == 'share' else 0, amount='1000' if kind == 'cash' else '0', received_date=self.today)
        return self.client.post('/api/stock/dividends/', {**payload, **extra}, format='json')

    def test_bonus_shares_keep_cost_and_reduce_average(self):
        response = self.record()
        self.assertEqual(response.status_code, 201, response.data)
        row = self.client.get(f'/api/stock/sellable/instruments/{self.project.pk}/').data[0]
        self.assertEqual(row['available_quantity'], 110)
        self.assertEqual(Decimal(row['total_cost']), Decimal('1000'))
        self.assertEqual(round(Decimal(row['average_buy_unit_price']), 2), Decimal('9.09'))
        self.assertFalse(Profit.objects.exists())
        self.assertEqual(Trade.objects.count(), 1)

    def test_bonus_after_partial_sale_and_subsequent_buy(self):
        Trade.objects.create(project=self.project, instrument=self.instrument, trns_type='sell', qty=50, unit_price=15, authorized_by=self.admin)
        self.assertEqual(self.record().status_code, 201)
        row = project_holdings(self.project)[self.instrument.pk]
        self.assertEqual(row['available_quantity'], 60)
        self.assertEqual(row['total_cost'], Decimal('500'))
        self.buy(40, '20')
        row = project_holdings(self.project)[self.instrument.pk]
        self.assertEqual(row['available_quantity'], 100)
        self.assertEqual(row['average_buy_unit_price'], Decimal('13'))

    def test_cash_is_eligible_on_receipt_date_and_disbursed_once(self):
        FinancialAdvisor.objects.create(project=self.project, advisor=self.admin, com_percentage=10)
        response = self.record('cash', received_date='2020-01-01')
        self.assertEqual(response.status_code, 201, response.data)
        profit = Profit.objects.get()
        self.assertEqual(profit.amount, Decimal('1000'))
        self.assertIsNone(profit.trade_id)
        params = dict(project_id=self.project.pk, from_dt='2020-01-01', to_dt='2020-01-01', is_disbursed=0)
        preview = self.client.get('/api/stock/project/total/profit/', params)
        self.assertEqual(len(preview.data), 1)
        balance = self.client.get(f'/api/stock/project/balance/details/{self.project.pk}/').data
        self.assertEqual(Decimal(balance['available_balance']), 0)
        payload = dict(project_id=self.project.pk, from_dt='2020-01-01', to_dt='2020-01-01')
        paid = self.client.post('/api/stock/profit/disburse/', payload, format='json')
        self.assertEqual(paid.status_code, 200, paid.data)
        self.assertEqual(Account.objects.get(user=self.investor).balance, Decimal('900'))
        self.assertEqual(Account.objects.get(user=self.admin).balance, Decimal('100'))
        self.assertEqual(InvestorProfit.objects.get().dividend_id, response.data['id'])
        self.assertEqual(FinAdvisorCommission.objects.get().dividend_id, response.data['id'])
        self.assertEqual(self.client.post('/api/stock/profit/disburse/', payload, format='json').status_code, 404)
        self.assertEqual(Transaction.objects.count(), 2)
        self.assertEqual(self.client.get('/api/stock/project/total/profit/', params).data, [])

    def test_invalid_inputs_and_closed_project(self):
        for values in [dict(qty=0), dict(qty=-1), dict(qty=1.5), dict(amount='5'), dict(received_date='2099-01-01')]:
            self.assertEqual(self.record(**values).status_code, 400, values)
        self.assertEqual(self.record('cash', amount='0').status_code, 400)
        self.assertEqual(self.record('cash', qty=1).status_code, 400)
        other = Instrument.objects.create(name='OTHER')
        self.assertEqual(self.record(instrument=other.pk).status_code, 400)
        self.assertEqual(self.record('cash', instrument=other.pk).status_code, 400)
        self.project.project_active_status = False
        self.project.save()
        self.assertEqual(self.record('cash').status_code, 400)
        self.assertFalse(Dividend.objects.exists())

    def test_permissions_and_project_history(self):
        self.assertEqual(self.record('cash').status_code, 201)
        history = self.client.get('/api/stock/dividends/', {'project_id': self.project.pk})
        self.assertEqual(len(history.data), 1)
        self.assertEqual(self.client.get('/api/stock/dividends/', {'project_id': 'missing'}).data, [])
        self.client.force_authenticate(self.investor)
        self.assertEqual(self.record().status_code, 403)
        self.assertEqual(self.client.get('/api/stock/dividends/').status_code, 403)

    def test_cash_creation_is_atomic(self):
        with patch.object(Profit.objects, 'create', side_effect=RuntimeError('failure')):
            with self.assertRaises(RuntimeError):
                self.record('cash')
        self.assertFalse(Dividend.objects.exists())

    def test_holdings_are_scoped_to_the_selected_project(self):
        other = Project.objects.create(project_title='Other', created_by=self.admin)
        Trade.objects.create(project=other, instrument=self.instrument, trns_type='buy', qty=200, unit_price=500, authorized_by=self.admin)
        Dividend.objects.create(project=other, instrument=self.instrument, dividend_type='share', qty=100, authorized_by=self.admin)
        row = self.client.get(f'/api/stock/sellable/instruments/{self.project.pk}/').data[0]
        self.assertEqual(row['available_quantity'], 100)
        self.assertEqual(Decimal(row['average_buy_unit_price']), Decimal('10'))
        self.assertEqual(Decimal(row['total_cost']), Decimal('1000'))

    def test_staff_profit_report_combines_cash_trade_and_bonus_by_project(self):
        self.record('cash')
        self.record('share')
        trade = Trade.objects.first()
        Profit.objects.create(project=self.project, trade=trade, amount='250', authorized_by=self.admin)
        response = self.client.get('/api/stock/profit/report/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['scope'], 'project')
        project = response.data['projects'][0]
        self.assertEqual(Decimal(project['cash_profit']), Decimal('1250'))
        self.assertEqual(project['bonus_shares'], 10)
        self.assertEqual({r['type'] for r in project['records']}, {'trade_profit', 'cash_dividend', 'share_dividend'})
        self.assertEqual(self.client.get('/api/stock/profit/report/', {'project_id': 'missing'}).data['projects'], [])

    def test_investor_report_shows_own_payouts_and_project_bonus_without_leaking_other_projects(self):
        cash = self.record('cash').data
        self.record('share')
        InvestorProfit.objects.create(project=self.project, investor=self.investor, dividend_id=cash['id'], contribute_amount=1000, percentage=100, profit_amount=900)
        other = Project.objects.create(project_title='Private', created_by=self.admin)
        Dividend.objects.create(project=other, instrument=self.instrument, dividend_type='share', qty=999, authorized_by=self.admin)
        self.client.force_authenticate(self.investor)
        response = self.client.get('/api/stock/profit/report/')
        self.assertEqual(response.data['scope'], 'investor')
        self.assertEqual(len(response.data['projects']), 1)
        project = response.data['projects'][0]
        self.assertEqual(Decimal(project['cash_profit']), Decimal('900'))
        self.assertEqual(project['bonus_shares'], 10)
        self.assertEqual(len(project['records']), 2)
        self.assertEqual(self.client.get('/api/stock/profit/report/', {'project_id': other.pk}).data['projects'], [])
        self.client.force_authenticate(None)
        self.assertIn(self.client.get('/api/stock/profit/report/').status_code, [401, 403])
