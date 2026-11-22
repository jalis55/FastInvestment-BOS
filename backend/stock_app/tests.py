from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
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

    @patch('user_app.signals.cache.delete_pattern')
    def test_legacy_trade_details_and_balances_use_stored_commission(self, _delete_pattern):
        for trade_type in (Trade.BUY, Trade.SELL):
            response = self.trade(self.project.pk, trade_type, qty=1850, unit_price='10.83')
            self.assertEqual(response.status_code, 201, response.data)
        Trade.objects.filter(project=self.project).update(commission_rate=None)

        details = self.client.get(f'/api/stock/trade/details/?project_id={self.project.pk}')
        self.assertEqual(details.status_code, 200)
        values = {row['trns_type']: row['total_trade_value'] for row in details.data}
        self.assertEqual(values, {Trade.BUY: '20115.64', Trade.SELL: '19955.36'})

        balances = self.client.get(f'/api/stock/project/balance/details/{self.project.pk}/')
        self.assertEqual(balances.status_code, 200)
        self.assertEqual(balances.data['total_buy_amount'], values[Trade.BUY])
        self.assertEqual(balances.data['total_sell_amount'], values[Trade.SELL])

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

    def test_project_contribution_report_groups_capital_and_reinvestments(self):
        Investment.objects.create(
            project=self.project, investor=self.users[0], amount='500.00',
            is_reinvestment=True, authorized_by=self.admin,
        )
        other_project = Project.objects.create(project_title='Other', created_by=self.admin)
        Investment.objects.create(
            project=other_project, investor=self.users[0], amount='3000.00', authorized_by=self.admin,
        )
        self.project.project_active_status = False
        self.project.save(update_fields=['project_active_status'])
        endpoint = f'/api/stock/investor/contrib/percent/{self.project.pk}/'
        response = self.client.get(endpoint)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual({
            row['investor']['id']: (row['contribute_amount'], row['contribution_percentage'])
            for row in response.data
        }, {
            self.users[0].pk: ('8500.00', '42.50'),
            self.users[1].pk: ('6500.00', '32.50'),
            self.users[2].pk: ('5000.00', '25.00'),
        })
        self.client.force_authenticate(self.users[0])
        self.assertEqual(self.client.get(endpoint).status_code, 403)

    def test_disbursement_report_uses_recorded_rates_and_amounts(self):
        endpoint = f'/api/stock/profit/disbursement-details/{self.project.pk}/'
        self.assertEqual(self.client.get(endpoint).data['investor_rows'], [])
        self.assertEqual(self.disburse().status_code, 200)
        FinancialAdvisor.objects.filter(project=self.project).update(com_percentage=20)
        Investment.objects.filter(project=self.project, investor=self.users[0]).update(amount=12000)
        date = timezone.localdate().isoformat()

        response = self.client.get(endpoint, {'from_dt': date, 'to_dt': date})
        self.assertEqual(response.status_code, 200, response.data)
        advisor = response.data['advisor_rows'][0]
        self.assertEqual(advisor['user']['id'], self.users[3].pk)
        self.assertEqual((advisor['percentage'], advisor['amount']), (Decimal('10.00'), Decimal('253.76')))
        investor = next(row for row in response.data['investor_rows'] if row['user']['id'] == self.users[0].pk)
        self.assertEqual(
            (investor['contribution'], investor['percentage'], investor['amount']),
            (Decimal('8000.00'), Decimal('41.03'), Decimal('937.06')),
        )
        self.assertEqual(self.client.get(endpoint, {'to_dt': '2000-01-01'}).data['advisor_rows'], [])
        self.assertEqual(self.client.get(endpoint, {'from_dt': date, 'to_dt': '2000-01-01'}).status_code, 400)
        self.client.force_authenticate(self.users[0])
        self.assertEqual(self.client.get(endpoint).status_code, 403)

    def test_allocation_status_and_personal_scope_cover_investors_and_advisors(self):
        endpoint = '/api/stock/profit/allocation-report/'
        other_project = Project.objects.create(project_title='Other project', created_by=self.admin)
        other_trade = Trade.objects.create(
            project=other_project, instrument=self.profit.trade.instrument, trns_type='sell',
            qty=10, unit_price=100, authorized_by=self.admin,
        )
        Investment.objects.create(project=other_project, investor=self.users[1], amount=100, authorized_by=self.admin)
        Profit.objects.create(project=other_project, trade=other_trade, amount=500)

        admin_pending = self.client.get(endpoint, {'status': 'pending'}).data
        self.assertCountEqual([project['project'] for project in admin_pending['projects']], [self.project.pk, other_project.pk])
        self.assertEqual(self.client.get(endpoint, {'status': 'disbursed'}).data['projects'], [])

        self.client.force_authenticate(self.users[0])
        personal = self.client.get(endpoint).data
        self.assertEqual(personal['scope'], 'personal')
        self.assertEqual([project['project'] for project in personal['projects']], [self.project.pk])
        self.assertEqual([row['user']['id'] for row in personal['projects'][0]['investor_rows']], [self.users[0].pk])
        self.assertEqual(personal['projects'][0]['investor_total'], '937.06')
        self.assertEqual(personal['projects'][0]['advisor_rows'], [])
        self.assertEqual(self.client.get(endpoint, {'project_id': other_project.pk}).data['projects'], [])
        options = self.client.get(endpoint, {'projects_only': 'true'}).data['projects']
        self.assertEqual([project['project_id'] for project in options], [self.project.pk])

        self.client.force_authenticate(self.users[3])
        advisor_pending = self.client.get(endpoint, {'status': 'pending'}).data['projects'][0]
        self.assertEqual(advisor_pending['investor_rows'], [])
        self.assertEqual(advisor_pending['advisor_total'], '253.76')

        self.client.force_authenticate(self.admin)
        self.assertEqual(self.disburse().status_code, 200)
        self.assertEqual([project['project'] for project in self.client.get(endpoint).data['projects']], [other_project.pk])

        self.client.force_authenticate(self.users[3])
        self.assertEqual(self.client.get(endpoint).data['projects'], [])
        paid = self.client.get(endpoint, {'status': 'disbursed'}).data['projects']
        self.assertEqual(len(paid), 1)
        self.assertEqual(paid[0]['investor_rows'], [])
        self.assertEqual([row['user']['id'] for row in paid[0]['advisor_rows']], [self.users[3].pk])
        self.assertEqual(paid[0]['advisor_total'], '253.76')
        self.assertEqual(self.client.get(endpoint, {'status': 'invalid'}).status_code, 400)

    def test_allocation_search_returns_both_statuses_for_the_same_earnings_dates(self):
        self.assertEqual(self.disburse().status_code, 200)
        later_payout = timezone.now() + timedelta(days=1)
        InvestorProfit.objects.filter(project=self.project).update(disburse_dt=later_payout)
        FinAdvisorCommission.objects.filter(project=self.project).update(disburse_dt=later_payout)
        Profit.objects.create(project=self.project, trade=self.profit.trade, amount=200)
        endpoint = '/api/stock/profit/allocation-report/'
        self.client.force_authenticate(self.users[0])
        response = self.client.get(endpoint, {**self.payload, 'status': 'all'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], 'all')
        for status in ('pending', 'disbursed'):
            project = response.data[status][0]
            self.assertEqual(project['project'], self.project.pk)
            self.assertEqual([row['user']['id'] for row in project['investor_rows']], [self.users[0].pk])
            self.assertEqual(project['advisor_rows'], [])
        self.assertEqual(response.data['disbursed'][0]['investor_total'], '937.06')

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

    def test_reinvests_one_recipients_combined_payout_and_credits_other_wallets(self):
        recipient = self.users[0]
        FinancialAdvisor.objects.filter(project=self.project).update(advisor=recipient)
        endpoint = '/api/stock/profit/disburse/'
        preview = self.client.get(endpoint, self.payload)
        row = next(row for row in preview.data['recipients'] if row['user']['id'] == recipient.pk)
        self.assertEqual(row['advisor_amount'], Decimal('253.76'))
        self.assertEqual(row['investor_amount'], Decimal('937.06'))

        self.payload['reinvest_recipient_ids'] = [recipient.pk]
        response = self.disburse()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['reinvested_total'], Decimal('1190.82'))
        self.assertEqual(response.data['wallet_total'], Decimal('1346.78'))
        investment = Investment.objects.get(project=self.project, investor=recipient, is_reinvestment=True)
        self.assertEqual(investment.amount, Decimal('1190.82'))
        self.assertEqual(self.balances()[0], Decimal('2000.00'))
        self.assertEqual(
            list(Transaction.objects.filter(user=recipient).order_by('pk').values_list('transaction_type', 'amount')),
            [('deposit', Decimal('1190.82')), ('payment', Decimal('1190.82'))],
        )
        self.assertEqual(InvestorProfit.objects.get(investor=recipient).reinvestment, investment)
        self.assertEqual(FinAdvisorCommission.objects.get(advisor=recipient).reinvestment, investment)
        self.assertEqual(self.disburse().status_code, 404)
        self.assertEqual(Investment.objects.filter(is_reinvestment=True).count(), 1)

    def test_advisor_reinvestment_is_eligible_only_for_future_earnings(self):
        advisor = self.users[3]
        original_trade = self.profit.trade
        older_profit = Profit.objects.create(project=self.project, trade=original_trade, amount='1000')
        older_profit.disburse_st = True
        older_profit.save(update_fields=['disburse_st'])
        self.payload['reinvest_recipient_ids'] = [advisor.pk]
        self.assertEqual(self.disburse().status_code, 200)

        older_profit.disburse_st = False
        older_profit.save(update_fields=['disburse_st'])

        new_trade = Trade.objects.create(
            project=self.project, instrument=original_trade.instrument, trns_type='sell',
            qty=10, unit_price='100.00', authorized_by=self.admin,
        )
        Profit.objects.create(project=self.project, trade=new_trade, amount='1000')
        preview = self.client.get('/api/stock/profit/disburse/', {
            key: self.payload[key] for key in ('project_id', 'from_dt', 'to_dt')
        })
        allocations = [row for row in preview.data['investor_rows'] if row['user']['id'] == advisor.pk]
        self.assertEqual([row['trade'] for row in allocations], [str(new_trade.pk)])
        self.payload.pop('reinvest_recipient_ids')
        self.assertEqual(self.disburse().status_code, 200)
        self.assertFalse(InvestorProfit.objects.filter(investor=advisor, trade=original_trade).exists())
        self.assertTrue(InvestorProfit.objects.filter(investor=advisor, trade=new_trade).exists())

    def test_split_payout_reinvests_only_the_selected_amount_and_credits_the_remainder(self):
        recipient = self.users[0]
        Investment.objects.filter(project=self.project).exclude(investor=recipient).delete()
        FinancialAdvisor.objects.filter(project=self.project).update(advisor=recipient)
        self.profit.amount = Decimal('199.00')
        self.profit.save(update_fields=['amount'])
        self.payload['reinvest_splits'] = [{'recipient_id': recipient.pk, 'amount': '99.00'}]

        response = self.disburse()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['reinvested_total'], Decimal('99.00'))
        self.assertEqual(response.data['wallet_total'], Decimal('100.00'))
        self.assertEqual(self.balances()[0], Decimal('2100.00'))
        investment = Investment.objects.get(project=self.project, investor=recipient, is_reinvestment=True)
        self.assertEqual(investment.amount, Decimal('99.00'))
        self.assertEqual(
            list(Transaction.objects.filter(user=recipient).order_by('pk').values_list('transaction_type', 'amount')),
            [('deposit', Decimal('199.00')), ('payment', Decimal('99.00'))],
        )
        self.assertEqual(InvestorProfit.objects.get(investor=recipient).reinvestment, investment)
        self.assertEqual(FinAdvisorCommission.objects.get(advisor=recipient).reinvestment, investment)
        self.assertEqual(self.disburse().status_code, 404)
        self.assertEqual(Transaction.objects.count(), 2)

    def test_invalid_split_cannot_create_investments_or_wallet_credits(self):
        recipient_id = self.users[0].pk
        for amount in ('0', '-1', '10.001', '937.06', '938.00'):
            with self.subTest(amount=amount):
                self.payload['reinvest_splits'] = [{'recipient_id': recipient_id, 'amount': amount}]
                self.assertEqual(self.disburse().status_code, 400)
        self.payload['reinvest_splits'] = [{'recipient_id': recipient_id, 'amount': '10.00'}]
        self.payload['reinvest_recipient_ids'] = [recipient_id]
        self.assertEqual(self.disburse().status_code, 400)
        self.assertFalse(Investment.objects.filter(is_reinvestment=True).exists())
        self.assertFalse(Transaction.objects.exists())

    def test_rejects_invalid_or_closed_project_reinvestments_before_writing(self):
        self.payload['reinvest_recipient_ids'] = [self.admin.pk]
        self.assertEqual(self.disburse().status_code, 400)
        self.project.project_active_status = False
        self.project.save(update_fields=['project_active_status'])
        self.payload['reinvest_recipient_ids'] = [self.users[0].pk]
        self.assertEqual(self.disburse().status_code, 400)
        self.assertFalse(Investment.objects.filter(is_reinvestment=True).exists())
        self.assertFalse(Transaction.objects.exists())
        self.profit.refresh_from_db()
        self.assertFalse(self.profit.disburse_st)
        self.payload.pop('reinvest_recipient_ids')
        self.assertEqual(self.disburse().status_code, 200)

    def test_reinvestment_rolls_back_if_a_wallet_payout_fails(self):
        self.payload['reinvest_recipient_ids'] = [self.users[0].pk]
        with patch.object(Account, 'deposit', side_effect=RuntimeError('Simulated credit failure')):
            self.assertEqual(self.disburse().status_code, 500)
        self.assertFalse(Investment.objects.filter(is_reinvestment=True).exists())
        self.assertFalse(Transaction.objects.exists())
        self.profit.refresh_from_db()
        self.assertFalse(self.profit.disburse_st)

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


class InvestmentCycleTests(TestCase):
    def test_investment_history_scopes_staff_to_the_project_and_users_to_themselves(self):
        User = get_user_model()
        staff = User.objects.create_user('history-staff@example.test', is_staff=True)
        owner = User.objects.create_user('history-owner@example.test')
        other = User.objects.create_user('history-other@example.test')
        project = Project.objects.create(project_title='Project history', created_by=staff, project_active_status=False)
        another = Project.objects.create(project_title='Another project', created_by=staff)
        contribution = Investment.objects.create(project=project, investor=owner, amount='5000.00', authorized_by=staff)
        reinvestment = Investment.objects.create(
            project=project, investor=other, amount='50.00', authorized_by=staff, is_reinvestment=True,
        )
        unrelated = Investment.objects.create(project=another, investor=owner, amount='100.00', authorized_by=staff)

        client = APIClient()
        endpoint = f'/api/stock/project/investment-history/{project.pk}/'
        client.force_authenticate(staff)
        response = client.get(endpoint)
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in response.data], [reinvestment.pk, contribution.pk])
        self.assertEqual(response.data[0]['investor']['id'], other.pk)
        self.assertEqual(response.data[0]['project_title'], project.project_title)
        self.assertTrue(response.data[0]['is_reinvestment'])

        client.force_authenticate(owner)
        self.assertEqual(client.get(endpoint).status_code, 403)
        own_history = client.get('/api/stock/investor/investment-details/')
        self.assertEqual(own_history.status_code, 200)
        self.assertEqual([row['id'] for row in own_history.data], [unrelated.pk, contribution.pk])
        self.assertFalse(own_history.data[1]['is_reinvestment'])

    def test_funding_trades_split_dividend_and_close_reconcile_the_wallet(self):
        User = get_user_model()
        staff = User.objects.create_user('cycle-staff@example.test', is_staff=True)
        investor = User.objects.create_user('user3@example.test', name='User 3')
        project = Project.objects.create(project_title='Cycle test', created_by=staff)
        instrument = Instrument.objects.create(name='Cycle instrument')
        client = APIClient()
        client.force_authenticate(staff)

        def post(endpoint, payload):
            response = client.post(endpoint, payload, format='json')
            self.assertEqual(response.status_code, 201, response.data)
            return response.data

        def trade(kind, qty, price):
            return post('/api/stock/create/trade/', {
                'project': project.pk, 'instrument': instrument.pk,
                'trns_type': kind, 'qty': qty, 'unit_price': price,
            })

        post('/api/acc/user/create-transaction/', {
            'user': investor.pk, 'amount': '10000.00', 'transaction_type': 'deposit', 'trans_mode': 'cash',
        })
        post('/api/stock/add/investment/', {'project': project.pk, 'investor': investor.pk, 'amount': '5000.00'})
        self.assertEqual(trade('buy', 100, '30.00')['total_commission'], '12.00')
        dividend = post('/api/stock/dividends/', {
            'project': project.pk, 'instrument': instrument.pk, 'dividend_type': 'cash', 'amount': '200.00',
        })
        response = client.post('/api/stock/profit/disburse/', {
            'project_id': project.pk, 'from_dt': dividend['received_date'], 'to_dt': dividend['received_date'],
            'reinvest_splits': [{'recipient_id': investor.pk, 'amount': '50.00'}],
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['wallet_total'], Decimal('150.00'))
        self.assertEqual(Account.objects.get(user=investor).balance, Decimal('5150.00'))
        self.assertEqual(Investment.objects.get(investor=investor, is_reinvestment=True).amount, Decimal('50.00'))
        self.assertEqual(trade('buy', 50, '20.00')['total_commission'], '10.00')
        sale = trade('sell', 150, '26.00')
        self.assertEqual(sale['total_commission'], '15.60')
        post('/api/stock/create/acc/recvable/', {
            'project': project.pk, 'trade': sale['id'], 'gain_lose': '-137.60',
        })
        self.assertEqual(client.get(f'/api/stock/sellable/instruments/{project.pk}/').data, [])
        result = client.get(f'/api/stock/project/balance/details/{project.pk}/')
        self.assertEqual(result.status_code, 200, result.data)
        balances = result.data
        self.assertEqual(balances['total_investment'], '5050.00')
        self.assertEqual(balances['available_balance'], '4912.40')
        close = client.patch(f'/api/stock/close/project/{project.pk}/', {
            'total_investment': balances['total_investment'],
            'total_buy': balances['total_buy_amount'],
            'total_sell': balances['total_sell_amount'],
            'total_sell_profit': balances['accrued_profit'],
            'closing_balance': balances['available_balance'],
        }, format='json')
        self.assertEqual(close.status_code, 200, close.data)

        client.force_authenticate(investor)
        history = client.get('/api/acc/user/transaction-details/').data
        self.assertEqual(
            [(row['transaction_type'], row['amount']) for row in reversed(history)],
            [('deposit', '10000.00'), ('payment', '5000.00'), ('deposit', '200.00'),
             ('payment', '50.00'), ('deposit', '4912.40')],
        )
        self.assertIn('Reinvestment', history[1]['narration'])
        self.assertEqual(client.get(f'/api/acc/user/{investor.pk}/balance/').data['balance'], '10062.40')
