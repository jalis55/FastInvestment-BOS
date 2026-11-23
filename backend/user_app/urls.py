
from django.urls import path

from user_app.menu_access import menu_api
from user_app.views import (AdminUserNidScanView, ChangePasswordView, CurrentSessionView, CustomerListView, UpdateUserStatusView,
                            ProfilePhotoView, UserDetailsView, UserListView, UserNidScanView,
                            UserMenuAccessView, UserRegistrationView, UserStatusView)

urlpatterns = [
    path('user-register/',menu_api(UserRegistrationView),name='user_registration'),
    path('session/',CurrentSessionView.as_view(),name='current_session'),
    path('user-profile/',UserDetailsView.as_view(),name='user_profile'),
    path('profile-photos/<uuid:photo_id>/', ProfilePhotoView.as_view(), name='profile-photo'),
    path('user-profile/password/', ChangePasswordView.as_view(), name='user-change-password'),
    path('user-profile/nid-scan/', UserNidScanView.as_view(), name='user-nid-scan'),
    path('user-status/',UserStatusView.as_view(),name='user_status'),
    path('admin/users/',UserListView.as_view(),name='user_list'),
    path('admin/users/<int:pk>/',UpdateUserStatusView.as_view(),name='user_list'),
    path('admin/users/<int:pk>/menu-access/', UserMenuAccessView.as_view(), name='user-menu-access'),
    path('admin/users/<int:pk>/nid-scan/', AdminUserNidScanView.as_view(), name='admin-user-nid-scan'),
    path('admin/customers/',menu_api(CustomerListView, '/transaction', '/fund-transfer', '/add-advisor', '/add-investments'),name='customer-list'),
    
]
