from io import BytesIO
from unittest.mock import patch
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from PIL import Image
from rest_framework.test import APIClient

from .models import ProfilePhoto


class ProfilePhotoTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_superuser('photo-staff@example.test', 'Test-password-57!')
        self.other = User.objects.create_user('photo-other@example.test')
        self.client = APIClient()

    def photo(self, color):
        buffer = BytesIO()
        Image.new('RGB', (4, 4), color).save(buffer, format='PNG')
        content = buffer.getvalue()
        return SimpleUploadedFile('photo.png', content, content_type='image/png'), content

    def test_registration_serves_a_persistent_photo_to_owner_and_staff(self):
        self.client.force_authenticate(self.staff)
        upload, content = self.photo('red')
        response = self.client.post('/api/user-register/', {
            'name': 'Photo owner', 'email': 'photo-owner@example.test', 'password': 'Test-password-57!',
            'profile_image': upload,
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        url = urlsplit(response.data['profile_image']).path
        self.assertTrue(url.startswith('/api/profile-photos/'))
        self.assertEqual(bytes(ProfilePhoto.objects.get().content), content)
        self.assertEqual(self.client.get(url).content, content)

        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(url).status_code, 401)
        login = self.client.post('/api/token/', {
            'email': 'photo-owner@example.test', 'password': 'Test-password-57!',
        }, format='json')
        self.assertEqual(login.status_code, 200, login.data)
        self.assertEqual(urlsplit(login.data['user']['profile_image']).path, url)
        image = self.client.get(url, HTTP_ACCEPT='image/avif,image/webp,image/png,image/*,*/*;q=0.8')
        self.assertEqual(image.status_code, 200)
        self.assertEqual(image['Content-Type'], 'image/png')
        self.assertEqual(image.content, content)

    def test_photo_replacement_invalidates_old_url_and_rejects_oversized_files(self):
        self.client.force_authenticate(self.other)
        upload, _ = self.photo('red')
        original = self.client.patch('/api/user-profile/', {'profile_image': upload}, format='multipart')
        self.assertEqual(original.status_code, 200, original.data)
        upload, content = self.photo('blue')
        with patch('user_app.signals.cache.delete_pattern'), self.captureOnCommitCallbacks(execute=True):
            result = self.client.patch('/api/user-profile/', {'profile_image': upload}, format='multipart')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertNotEqual(result.data['profile_image'], original.data['profile_image'])
        self.assertEqual(self.client.get(urlsplit(original.data['profile_image']).path).status_code, 404)
        self.assertEqual(ProfilePhoto.objects.count(), 1)
        self.assertEqual(self.client.get(urlsplit(result.data['profile_image']).path).content, content)

        oversized = SimpleUploadedFile('oversized.png', content + b'\0' * (2 * 1024 * 1024), content_type='image/png')
        response = self.client.patch('/api/user-profile/', {'profile_image': oversized}, format='multipart')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn('2 MB', str(response.data['profile_image']))
        self.assertEqual(ProfilePhoto.objects.count(), 1)


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
