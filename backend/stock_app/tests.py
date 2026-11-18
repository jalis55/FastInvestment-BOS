from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounting.models import Account, Transaction
from stock_app.models import (
    FinancialAdvisor, FinAdvisorCommission, Instrument, Investment,
    InvestorProfit, Profit, Project, Trade,
)


class TradeCommissionTests(TestCase):
    def setUp(self):
        self.staff = get_user_model().objects.create_user('trader@example.test', is_staff=True)
        self.project = Project.objects.create(project_title='Default rate', created_by=self.staff)
        self.instrument = Instrument.objects.create(name='Commission test')
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def trade(self, project_id, trade_type='buy', **data):
        return self.client.post('/api/stock/create/trade/', {
            'project': project_id,
            'instrument': self.instrument.pk,
            'qty': 100,
            'unit_price': '100.00',
            'trns_type': trade_type,
            **data,
        }, format='json')

    def test_project_rates_apply_to_buys_and_sells_with_a_minimum(self):
        project = self.client.post('/api/stock/create/project/', {
            'project_title': 'Custom rate',
            'project_description': 'Commission test',
            'project_responsible_mail': self.staff.email,
            'trade_commission_rate': '0.3',
        }, format='json')
        self.assertEqual(project.status_code, 201, project.data)
        custom = Project.objects.get(project_title='Custom rate')
        self.assertEqual(self.trade(self.project.pk).data['total_commission'], '40.00')
        self.assertEqual(self.trade(custom.pk).data['total_commission'], '30.00')
        self.assertEqual(self.trade(custom.pk, 'sell').data['total_commission'], '30.00')
        self.assertEqual(self.trade(custom.pk, qty=2000, unit_price='1.00').data['total_commission'], '10.00')
        balances = self.client.get(f'/api/stock/project/balance/details/{custom.pk}/')
        self.assertEqual(balances.data['total_buy_amount'], '12040.00')
        self.assertEqual(balances.data['total_sell_amount'], '9970.00')

    def test_rate_update_preserves_existing_trades_and_rejects_stale_quotes(self):
        recorded = self.trade(self.project.pk)
        self.assertEqual(recorded.status_code, 201, recorded.data)
        endpoint = f'/api/stock/project/commission/{self.project.pk}/'
        self.assertEqual(self.client.patch(endpoint, {'trade_commission_rate': '-0.1'}, format='json').status_code, 400)
        response = self.client.patch(endpoint, {'trade_commission_rate': '0.3'}, format='json')
        self.assertEqual(response.data['trade_commission_rate'], '0.3000')
        stale = self.trade(self.project.pk, expected_commission_rate='0.4')
        self.assertEqual(stale.status_code, 400)
        self.assertEqual(Trade.objects.count(), 1)
        original = Trade.objects.get(pk=recorded.data['id'])
        original.save()
        original.refresh_from_db()
        self.assertEqual(original.total_commission, Decimal('40.00'))
        self.assertEqual(original.commission_rate, Decimal('0.4'))
        self.assertEqual(self.trade(self.project.pk, expected_commission_rate='0.3').data['total_commission'], '30.00')

        self.client.force_authenticate(get_user_model().objects.create_user('customer@example.test'))
        self.assertEqual(self.client.patch(endpoint, {'trade_commission_rate': '0.5'}, format='json').status_code, 403)


class ProfitDisbursementTests(TestCase):
    def setUp(self):
        # Account creation is real; only the unrelated Redis cache invalidation
        # is stubbed so these accounting tests require no external service.
        cache_patch = patch('user_app.signals.cache.delete_pattern')
        cache_patch.start()
        self.addCleanup(cache_patch.stop)
        User = get_user_model()
        self.admin = User.objects.create_user('admin@example.test', is_staff=True)
        self.users = [User.objects.create_user(f'{name}@example.test', name=name)
                      for name in ('rahim', 'karim', 'habib', 'rakib')]
        self.project = Project.objects.create(
            project_title='Disbursement regression', created_by=self.admin,
            project_responsible_mail='admin@example.test',
        )
        for user, contribution, balance in zip(
            self.users[:3], ('8000', '6500', '5000'), ('2000', '3500', '5000')
        ):
            Investment.objects.create(
                project=self.project, investor=user, amount=contribution,
                authorized_by=self.admin,
            )
            Account.objects.filter(user=user).update(balance=Decimal(balance))
        FinancialAdvisor.objects.create(
            project=self.project, advisor=self.users[3], com_percentage='10',
        )
        trade = Trade.objects.create(
            project=self.project, instrument=Instrument.objects.create(name='ACI'),
            trns_type='sell', qty=130, unit_price='120', authorized_by=self.admin,
        )
        self.profit = Profit.objects.create(
            project=self.project, trade=trade, amount='2537.60',
            authorized_by=self.admin,
        )
        self.payload = {
            'project_id': self.project.pk,
            'from_dt': trade.trade_date.isoformat(),
            'to_dt': trade.trade_date.isoformat(),
        }
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def disburse(self):
        return self.client.post('/api/stock/profit/disburse/', self.payload, format='json')

    def balances(self):
        return [Account.objects.get(user=user).balance for user in self.users]

    def test_cycle_payouts_credit_accounts_and_cannot_be_paid_twice(self):
        response = self.disburse()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.balances(), list(map(Decimal, (
            '2937.06', '4261.20', '5585.58', '253.76',
        ))))
        for user, amount in zip(self.users, ('937.06', '761.20', '585.58', '253.76')):
            payout = Transaction.objects.get(user=user)
            self.assertEqual(payout.amount, Decimal(amount))
            self.assertEqual(payout.transaction_type, 'deposit')
            self.assertEqual(payout.status, 'completed')
        self.profit.refresh_from_db()
        self.assertTrue(self.profit.disburse_st)
        self.assertIsNotNone(self.profit.disburse_dt)
        for user, amount in zip(self.users, ('937.06', '761.20', '585.58', '253.76')):
            payout = Transaction.objects.get(user=user)
            self.assertEqual(payout.amount, Decimal(amount))
            self.assertEqual(payout.transaction_type, 'deposit')
            self.assertEqual(payout.status, 'completed')
        self.profit.refresh_from_db()
        self.assertTrue(self.profit.disburse_st)
        self.assertIsNotNone(self.profit.disburse_dt)
        balances = self.balances()
        self.assertEqual(self.disburse().status_code, 404)
        self.assertEqual(self.balances(), balances)
        self.assertEqual(Transaction.objects.count(), 4)

    def test_advisor_who_also_invests_receives_both_credits(self):
        FinancialAdvisor.objects.filter(project=self.project).update(advisor=self.users[0])
        response = self.disburse()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.balances()[0], Decimal('3190.82'))
        self.assertEqual(Transaction.objects.filter(user=self.users[0]).count(), 2)

    def test_fractional_cent_commission_credits_the_ledger_amount(self):
        self.profit.amount = Decimal('2537.66')
        self.profit.save()
        response = self.disburse()
        self.assertEqual(response.status_code, 200, response.data)
        advisor = self.users[3]
        self.assertEqual(Account.objects.get(user=advisor).balance, Decimal('253.77'))
        self.assertEqual(Transaction.objects.get(user=advisor).amount, Decimal('253.77'))

    def test_failed_credit_rolls_back_ledger_allocations_and_disbursement(self):
        original_deposit = Account.deposit
        calls = []

        def fail_second_credit(account, amount):
            calls.append(account.user_id)
            if len(calls) == 2:
                raise RuntimeError('Simulated credit failure')
            return original_deposit(account, amount)

        with patch.object(Account, 'deposit', fail_second_credit):
            response = self.disburse()
        self.assertEqual(response.status_code, 500)
        self.assertEqual(len(calls), 2)
        self.assertEqual(self.balances(), list(map(Decimal, ('2000', '3500', '5000', '0'))))
        self.assertFalse(Transaction.objects.exists())
        self.assertFalse(InvestorProfit.objects.exists())
        self.assertFalse(FinAdvisorCommission.objects.exists())
        self.profit.refresh_from_db()
        self.assertFalse(self.profit.disburse_st)
        self.assertIsNone(self.profit.disburse_dt)
        self.assertEqual(self.disburse().status_code, 200)
