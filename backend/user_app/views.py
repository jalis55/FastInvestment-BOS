from django.shortcuts import render
from rest_framework.permissions import AllowAny,IsAuthenticated
from user_app.permissions import IsSuperUser,IsAdminUser
from rest_framework.generics import CreateAPIView,RetrieveUpdateAPIView,ListAPIView,RetrieveAPIView,RetrieveUpdateDestroyAPIView
from user_app.serializers import UserSerializer,UserListSerializer,UserStatusSerializer
from user_app.models import CustomUser
from rest_framework.response import Response
from rest_framework.documentation import include_docs_urls
from django.urls import path

# Create your views here.

class UserRegistrationView(CreateAPIView):
    serializer_class=UserSerializer
    permission_classes=[AllowAny]

class UserDetailsView(RetrieveUpdateAPIView):
    serializer_class=UserSerializer
    permission_classes=[IsAuthenticated]

    def get_object(self):
        return self.request.user

class UserStatusView(RetrieveAPIView):
    serializer_class=UserStatusSerializer
    permission_classes=[IsAuthenticated]

    def get(self,request,*args,**kwargs):
        user=request.user

        if user.is_superuser:
            status="superadmin"
        elif user.is_staff:
            status="admin"
        else:
            status="user"
        serializer=self.get_serializer({"status":status})
        return Response(serializer.data)

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


