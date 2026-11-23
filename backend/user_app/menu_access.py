"""Per-user feature restrictions layered on top of existing permissions."""

from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission


COMMON_MENUS = (
    '/allocation-details', '/investment-history', '/profit-details',
    '/project-details', '/live-share-update',
)
ADMIN_MENUS = (
    '/transaction', '/fund-transfer', '/project-list', '/create-project',
    '/add-advisor', '/add-investments', '/close-project', '/buy-instruments',
    '/sell-instruments', '/dividends', '/disburse-profit',
    '/project-investment-summary', '/disbursement-details', '/acc-rec-details',
    '/trade-details',
)
INVESTOR_MENUS = ('/trans-history',)
PROJECT_PICKER_MENUS = (
    '/project-list', '/buy-instruments', '/sell-instruments', '/add-advisor',
    '/add-investments', '/close-project', '/dividends', '/disburse-profit',
    '/allocation-details', '/project-investment-summary', '/disbursement-details',
    '/trade-details', '/investment-history', '/profit-details',
    '/project-details', '/live-share-update',
)


def role_menus(user):
    return (*COMMON_MENUS, *(ADMIN_MENUS if user.is_staff else INVESTOR_MENUS))


def effective_menu_access(user):
    if user.is_superuser or user.menu_access is None:
        return None
    return [route for route in role_menus(user) if route in user.menu_access]


def has_menu_access(user, *routes):
    if not user.is_authenticated:
        return False
    access = effective_menu_access(user)
    return access is None or any(route in access for route in routes)


def require_menu_access(user, *routes):
    if not has_menu_access(user, *routes):
        raise PermissionDenied('Your account does not have access to this feature.')


def menu_api(view, *routes):
    """Allow shared APIs when any dependent menu is enabled.

    Endpoints with no menu stay available to accounts using their role defaults.
    """

    class MenuPermission(BasePermission):
        message = 'Your account does not have access to this feature.'

        def has_permission(self, request, view):
            return has_menu_access(request.user, *routes)

    return view.as_view(permission_classes=[*view.permission_classes, MenuPermission])
