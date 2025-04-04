from django.shortcuts import render
from rest_framework.permissions import AllowAny,IsAuthenticated,IsAdminUser
from user_app.permissions import IsSuperUser
from rest_framework.generics import CreateAPIView,RetrieveUpdateAPIView,ListAPIView,RetrieveAPIView,RetrieveUpdateDestroyAPIView
from user_app.serializers import UserSerializer,UserListSerializer,UserStatusSerializer
from user_app.models import CustomUser
from rest_framework.response import Response
from rest_framework import status

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
        print(user.name)
        status = "superadmin" if user.is_superuser else "admin" if user.is_staff else "user"
        return {"status": status}

class UserListView(ListAPIView):
    queryset = CustomUser.objects.filter(is_superuser=False)
    serializer_class = UserListSerializer
    permission_classes = [IsSuperUser]  # Only allow superusers to access this view

class CustomerListView(ListAPIView):
    queryset=CustomUser.objects.filter(is_superuser=False,is_staff=False,is_active=True)
    serializer_class=UserListSerializer
    permission_classes=[IsAdminUser]

class UpdateUserStatusView(RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.filter(is_superuser=False)
    serializer_class=UserListSerializer
    permission_classes=[IsSuperUser]


