from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


class RefreshCookieTests(TestCase):
    def test_invalid_refresh_cookie_is_rejected_and_cleared(self):
        client = APIClient()
        client.cookies[settings.AUTH_COOKIE_REFRESH] = 'not-a-valid-jwt'
        response = client.post('/api/token/refresh/', {}, format='json')
        self.assertEqual(response.status_code, 401)
        for name in (settings.AUTH_COOKIE_ACCESS, settings.AUTH_COOKIE_REFRESH):
            self.assertEqual(response.cookies[name]['max-age'], 0)

    def test_missing_refresh_cookie_returns_unauthorized(self):
        response = APIClient().post('/api/token/refresh/', {}, format='json')
        self.assertEqual(response.status_code, 401)


class ChangePasswordTests(TestCase):
    endpoint = '/api/user-profile/password/'
    current_password = 'Current-slate-82!'
    new_password = 'New-ember-57!Vale'

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            'profile@example.test', self.current_password,
        )
        self.client = APIClient()

    def test_current_password_is_required_and_profile_patch_cannot_bypass_it(self):
        payload = {'current_password': 'incorrect', 'new_password': self.new_password}
        self.assertEqual(self.client.post(self.endpoint, payload, format='json').status_code, 401)

        self.client.force_authenticate(self.user)
        for data in ({'new_password': self.new_password}, payload):
            response = self.client.post(self.endpoint, data, format='json')
            self.assertEqual(response.status_code, 400)
            self.assertIn('current_password', response.data)

        response = self.client.patch('/api/user-profile/', {'password': self.new_password}, format='json')
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.current_password))

    def test_correct_current_password_allows_change(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(self.endpoint, {
            'current_password': self.current_password,
            'new_password': self.new_password,
        }, format='json')
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b'')
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))
        self.assertFalse(self.user.check_password(self.current_password))


class FinancialPermissionTests(TestCase):
    endpoints = (
        ('post', '/api/user-register/'),
        ('post', '/api/acc/user/create-transaction/'),
        ('post', '/api/stock/profit/disburse/'),
        ('patch', '/api/stock/close/project/12345678/'),
    )

    def test_anonymous_cannot_create_accounts_or_change_financial_records(self):
        client = APIClient()
        for method, path in self.endpoints:
            with self.subTest(path=path):
                self.assertEqual(getattr(client, method)(path, {}, format='json').status_code, 401)

    def test_regular_user_cannot_perform_admin_financial_actions(self):
        from unittest.mock import patch
        from django.contrib.auth import get_user_model
        with patch('user_app.signals.cache.delete_pattern'):
            user = get_user_model().objects.create_user('client@example.test')
        client = APIClient()
        client.force_authenticate(user)
        for method, path in self.endpoints:
            with self.subTest(path=path):
                self.assertEqual(getattr(client, method)(path, {}, format='json').status_code, 403)
