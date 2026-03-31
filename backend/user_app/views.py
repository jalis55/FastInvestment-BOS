from django.core.cache import cache
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import (CreateAPIView, ListAPIView,
                                     RetrieveAPIView, RetrieveUpdateAPIView,
                                     RetrieveUpdateDestroyAPIView)
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from user_app.models import CustomUser
from user_app.authentication import CookieJWTAuthentication
from user_app.permissions import IsSuperUser
from user_app.serializers import (CustomTokenObtainPairSerializer,
                                  UserListSerializer, UserSerializer,
                                  UserStatusSerializer)

# Create your views here.

class UserRegistrationView(CreateAPIView):
    serializer_class=UserSerializer
    permission_classes=[AllowAny]


def _user_role(user):
    return "superadmin" if user.is_superuser else "admin" if user.is_staff else "user"


def _session_payload(user):
    role = _user_role(user)
    serialized_user = UserSerializer(user).data
    return {
        'authenticated': True,
        'user': {
            **serialized_user,
            'is_admin': user.is_staff,
            'is_super_admin': user.is_superuser,
            'role': role,
        },
    }


def _set_auth_cookies(response, access_token=None, refresh_token=None):
    cookie_settings = {
        'httponly': settings.AUTH_COOKIE_HTTP_ONLY,
        'secure': settings.AUTH_COOKIE_SECURE,
        'samesite': settings.AUTH_COOKIE_SAMESITE,
        'domain': settings.AUTH_COOKIE_DOMAIN,
    }

    if access_token:
        response.set_cookie(
            settings.AUTH_COOKIE_ACCESS,
            access_token,
            max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
            path='/',
            **cookie_settings,
        )

    if refresh_token:
        response.set_cookie(
            settings.AUTH_COOKIE_REFRESH,
            refresh_token,
            max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            path='/api/token/refresh/',
            **cookie_settings,
        )


def _clear_auth_cookies(response):
    response.delete_cookie(
        settings.AUTH_COOKIE_ACCESS,
        path='/',
        domain=settings.AUTH_COOKIE_DOMAIN,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.AUTH_COOKIE_REFRESH,
        path='/api/token/refresh/',
        domain=settings.AUTH_COOKIE_DOMAIN,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )


class CookieTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access_token = serializer.validated_data['access']
        refresh_token = serializer.validated_data['refresh']
        user = serializer.user

        response = Response(
            {
                'message': 'Login successful',
                **_session_payload(user),
            },
            status=status.HTTP_200_OK,
        )
        _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = TokenRefreshSerializer(
            data={'refresh': request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)}
        )
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError:
            response = Response({'detail': 'Invalid refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)
            _clear_auth_cookies(response)
            return response

        access_token = serializer.validated_data['access']
        refresh_token = serializer.validated_data.get('refresh')
        response = Response({'message': 'Token refreshed'}, status=status.HTTP_200_OK)
        _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
        _clear_auth_cookies(response)
        return response


class CurrentSessionView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        authenticator = CookieJWTAuthentication()
        try:
            auth_result = authenticator.authenticate(request)
        except Exception:
            auth_result = None

        if auth_result is None:
            return Response({'authenticated': False, 'user': None}, status=status.HTTP_200_OK)

        user, _ = auth_result
        return Response(_session_payload(user), status=status.HTTP_200_OK)

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
        status = _user_role(user)
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
