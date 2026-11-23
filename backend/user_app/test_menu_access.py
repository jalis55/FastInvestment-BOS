from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from stock_app.models import Instrument, Project, Trade


def authenticated_client(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {AccessToken.for_user(user)}')
    return client


class MenuAccessTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        users = get_user_model().objects
        cls.admin = users.create_superuser('menu-admin@example.test', 'Test-password-57!')
        cls.investor = users.create_user('menu-investor@example.test', name='Investor')
        cls.staff = users.create_user('menu-staff@example.test', name='Staff', is_staff=True)

    def menu_url(self, user):
        return f'/api/admin/users/{user.pk}/menu-access/'

    def test_only_super_admin_can_edit_and_choices_are_role_bounded(self):
        url = self.menu_url(self.investor)
        staff = authenticated_client(self.staff)
        self.assertEqual(staff.get(url).status_code, 403)
        self.assertEqual(staff.put(url, {'allowed_menus': []}, format='json').status_code, 403)
        admin = authenticated_client(self.admin)
        self.assertEqual(admin.get(self.menu_url(self.admin)).status_code, 404)
        self.assertNotIn('/trade-details', admin.get(url).data['available_menus'])
        self.assertEqual(admin.put(url, {'allowed_menus': ['/trade-details']}, format='json').status_code, 400)
        self.assertIsNone(admin.get(url).data['allowed_menus'])

    def test_existing_token_observes_access_changes_and_role_reset(self):
        investor = authenticated_client(self.investor)
        admin = authenticated_client(self.admin)
        url = self.menu_url(self.investor)
        report = '/api/stock/profit/allocation-report/'
        picker = f'{report}?projects_only=true'
        self.assertEqual(investor.get(report).status_code, 200)

        allowed = ['/live-share-update']
        self.assertEqual(admin.put(url, {'allowed_menus': allowed}, format='json').status_code, 200)
        self.assertEqual(investor.get('/api/session/').data['user']['menu_access'], allowed)
        self.assertEqual(investor.get(picker).status_code, 200)
        self.assertEqual(investor.get(report).status_code, 403)
        self.assertEqual(investor.get('/api/stock/instruments/close/price/').status_code, 403)

        self.assertEqual(admin.put(url, {'allowed_menus': []}, format='json').data['allowed_menus'], [])
        self.assertEqual(investor.get(picker).status_code, 403)
        self.assertEqual(investor.get('/api/user-profile/').status_code, 200)

        self.assertEqual(admin.put(url, {'allowed_menus': None}, format='json').status_code, 200)
        self.assertEqual(investor.get(report).status_code, 200)

    def test_allowed_menu_retains_dependencies_without_unlocking_mutations(self):
        admin = authenticated_client(self.admin)
        response = admin.put(self.menu_url(self.staff), {'allowed_menus': ['/trade-details']}, format='json')
        self.assertEqual(response.status_code, 200)
        staff = authenticated_client(self.staff)
        self.assertEqual(staff.get('/api/stock/trade/details/').status_code, 200)
        self.assertEqual(staff.get('/api/stock/project/list/').status_code, 200)
        self.assertEqual(staff.post('/api/stock/create/trade/', {}, format='json').status_code, 403)
        self.assertEqual(staff.post('/api/acc/user/fund-transfer/', {}, format='json').status_code, 403)

    def test_buy_and_sell_permissions_are_distinct_on_the_shared_trade_api(self):
        admin = authenticated_client(self.admin)
        admin.put(self.menu_url(self.staff), {'allowed_menus': ['/buy-instruments']}, format='json')
        staff = authenticated_client(self.staff)
        project = Project.objects.create(
            project_title='Menu access', project_responsible_mail=self.staff.email, created_by=self.staff,
        )
        instrument = Instrument.objects.create(name='MENU')
        payload = {
            'project': project.pk, 'instrument': instrument.pk,
            'qty': 1, 'unit_price': '100.00', 'trns_type': Trade.SELL,
        }

        self.assertEqual(staff.post('/api/stock/create/trade/', payload, format='json').status_code, 403)
        payload['trns_type'] = Trade.BUY
        response = staff.post('/api/stock/create/trade/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)

        admin.put(self.menu_url(self.staff), {'allowed_menus': ['/sell-instruments']}, format='json')
        self.assertEqual(staff.post('/api/stock/create/trade/', payload, format='json').status_code, 403)
        self.assertEqual(staff.delete(f"/api/stock/delete/trade/{response.data['id']}/").status_code, 403)
