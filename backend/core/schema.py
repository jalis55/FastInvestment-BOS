"""Shared OpenAPI conventions. These affect documentation only."""
from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.openapi import AutoSchema


class AppAutoSchema(AutoSchema):
    def get_tags(self):
        return [self.view.__class__.__module__.split('.')[0]]

    def get_description(self):
        description = super().get_description()
        permissions = {permission.__class__.__name__ for permission in self.view.get_permissions()}
        if 'IsSuperUser' in permissions:
            access = 'Superuser only (`is_superuser=true`).'
        elif 'IsAdminUser' in permissions:
            access = 'Staff only (`is_staff=true`).'
        elif 'AllowAny' in permissions:
            access = 'Public endpoint (no permission requirement).'
        else:
            access = 'Authenticated user required.'
        return f'{description}\n\n**Access:** {access}'.strip()


class CookieJWTScheme(OpenApiAuthenticationExtension):
    target_class = 'user_app.authentication.CookieJWTAuthentication'
    name = ['bearerAuth', 'cookieAuth']

    def get_security_requirement(self, auto_schema):
        return [{'bearerAuth': []}, {'cookieAuth': []}]

    def get_security_definition(self, auto_schema):
        return [
            {'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT'},
            {'type': 'apiKey', 'in': 'cookie', 'name': settings.AUTH_COOKIE_ACCESS,
             'description': 'Set by login. Unsafe cookie-authenticated requests also require X-CSRFToken.'},
        ]
