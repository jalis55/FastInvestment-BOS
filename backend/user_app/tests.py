from django.conf import settings
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
