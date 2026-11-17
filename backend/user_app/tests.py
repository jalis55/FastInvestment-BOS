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
