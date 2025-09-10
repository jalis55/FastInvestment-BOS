
from django.urls import path

from user_app.views import (CustomerListView, UpdateUserStatusView,
                            UserDetailsView, UserListView,
                            UserRegistrationView, UserStatusView)

urlpatterns = [
    path('user-register/',UserRegistrationView.as_view(),name='user_registration'),
    path('user-profile/',UserDetailsView.as_view(),name='user_profile'),
    path('user-status/',UserStatusView.as_view(),name='user_status'),
    path('admin/users/',UserListView.as_view(),name='user_list'),
    path('admin/users/<int:pk>/',UpdateUserStatusView.as_view(),name='user_list'),
    path('admin/customers/',CustomerListView.as_view(),name='customer-list'),
    
]