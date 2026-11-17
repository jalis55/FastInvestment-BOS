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
