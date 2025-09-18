from django.core.cache import cache
from django.shortcuts import render
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.generics import (CreateAPIView, ListAPIView,
                                     RetrieveAPIView, RetrieveUpdateAPIView,
                                     RetrieveUpdateDestroyAPIView)
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from user_app.models import CustomUser
from user_app.permissions import IsSuperUser
from user_app.serializers import (UserListSerializer, UserSerializer,
                                  UserStatusSerializer)

# Create your views here.

class UserRegistrationView(CreateAPIView):
    serializer_class=UserSerializer
    permission_classes=[AllowAny]

class UserDetailsView(RetrieveUpdateAPIView):
    serializer_class=UserSerializer
    permission_classes=[IsAuthenticated]
    
    #currently logged in user
    def get_object(self):
        return self.request.user



class UserStatusView(RetrieveUpdateAPIView):
    serializer_class = UserStatusSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """Determine and return the user's status."""
        user = self.request.user
        status = "superadmin" if user.is_superuser else "admin" if user.is_staff else "user"
        return {"status": status}

class UserListView(ListAPIView):
    queryset = CustomUser.objects.filter(is_superuser=False)
    serializer_class = UserListSerializer
    permission_classes = [IsSuperUser]  # Only allow superusers to access this view

class CustomerListView(ListAPIView):
    serializer_class = UserListSerializer
    permission_classes = [IsAdminUser]
    

    def get_queryset(self):
        cache_key = 'user_cache'
        queryset = cache.get(cache_key)
        
        if queryset is None:  
            # print("storing data in cache")
            queryset = CustomUser.objects.filter(
                is_superuser=False, 
                is_staff=False
            )
            cache.set(cache_key, queryset, timeout=60*15)
        
        return queryset
class UpdateUserStatusView(RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.filter(is_superuser=False)
    serializer_class=UserListSerializer
    permission_classes=[IsSuperUser]


