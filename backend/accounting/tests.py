from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Account, Transaction


class TransactionHistoryTests(TestCase):
    def test_history_includes_approved_withdrawals_for_only_the_account_owner(self):
        User = get_user_model()
        staff = User.objects.create_user('staff@example.test', is_staff=True)
        user = User.objects.create_user('owner@example.test')
        other = User.objects.create_user('other@example.test')
        Account.objects.filter(user=user).update(balance='100.00')

        for owner, kind, state, amount in (
            (user, 'deposit', 'completed', '100.00'),
            (user, 'payment', 'pending', '10.00'),
            (user, 'payment', 'declined', '15.00'),
            (other, 'payment', 'approved', '35.00'),
        ):
            Transaction.objects.create(
                user=owner, transaction_type=kind, status=state, amount=amount, issued_by=staff,
            )
        withdrawal = Transaction.objects.create(
            user=user, transaction_type='payment', status='pending', amount='25.00', issued_by=staff,
        )

        client = APIClient()
        client.force_authenticate(staff)
        response = client.patch(
            f'/api/acc/user/approve-transaction/{withdrawal.pk}/', {'status': 'approved'}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)

        client.force_authenticate(user)
        response = client.get('/api/acc/user/transaction-details/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [(row['transaction_type'], row['status'], row['amount']) for row in response.data],
            [('payment', 'approved', '25.00'), ('deposit', 'completed', '100.00')],
        )
        response = client.get(f'/api/acc/user/{user.pk}/balance/')
        self.assertEqual(response.data['balance'], '75.00')
