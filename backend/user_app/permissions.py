# permissions.py
from rest_framework.permissions import BasePermission


class IsSuperUser(BasePermission):
    """
    Custom permission to only allow access to superusers.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser
    
class IsAdminUser(BasePermission):
    """
    Custom permission to only allow access to superusers.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_staff