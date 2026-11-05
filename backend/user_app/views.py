from .schema import SessionSerializer, LoginResponseSerializer, MessageSerializer, DetailSerializer
from drf_spectacular.utils import extend_schema
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
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
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from user_app.models import CustomUser
from user_app.authentication import CookieJWTAuthentication
from user_app.permissions import IsSuperUser
from user_app.serializers import (CustomTokenObtainPairSerializer,
                                  UserListSerializer, UserSerializer,
                                  UserStatusSerializer)

# Create your views here.

@extend_schema(summary='Register a user', description='Create a user with email and name. Password is optional in the current serializer; when supplied it must contain at least eight characters. Use multipart/form-data for profile_image.')
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


@method_decorator(ensure_csrf_cookie, name='dispatch')
@extend_schema(summary='Log in', description='Authenticate with email and password. Sets access and refresh JWT cookies and a CSRF cookie. Returns session details; JWT strings are not included in JSON.')
@extend_schema(responses={200: LoginResponseSerializer, 401: DetailSerializer})
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


@method_decorator(ensure_csrf_cookie, name='dispatch')
@extend_schema(summary='Refresh the session', description='Reads the refresh JWT from its HttpOnly cookie, rotates it, and sets new authentication cookies. No JSON body is required.')
@extend_schema(request=None, responses={200: MessageSerializer, 401: DetailSerializer})
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


@extend_schema(summary='Log out', description='Clears authentication cookies. Attempts to blacklist a refresh token only when that cookie is received; its default path is /api/token/refresh/.')
@extend_schema(request=None, responses={200: MessageSerializer})
class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass

        response = Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
        _clear_auth_cookies(response)
        return response


@method_decorator(ensure_csrf_cookie, name='dispatch')
@extend_schema(summary='Get the current session', description='Returns authenticated=false and user=null for missing or invalid authentication. Also sets a CSRF cookie. Always returns HTTP 200.')
@extend_schema(responses={200: SessionSerializer})
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

@extend_schema(summary='Read or update your profile', description='Acts on the current user. PATCH updates selected fields; PUT uses full serializer validation. Password is write-only. Use multipart/form-data for profile_image.')
class UserDetailsView(RetrieveUpdateAPIView):
    serializer_class=UserSerializer
    permission_classes=[IsAuthenticated]
    
    #currently logged in user
    def get_object(self):
        return self.request.user



@extend_schema(summary='Read or update role status', description='GET returns status: superadmin, admin, or user. PUT/PATCH are exposed by the view, but updating status is unsupported by the serializer and currently fails.')
class UserStatusView(RetrieveUpdateAPIView):
    serializer_class = UserStatusSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """Determine and return the user's status."""
        user = self.request.user
        status = _user_role(user)
        return {"status": status}

@extend_schema(summary='List non-superusers', description='Returns all users with is_superuser=false.')
class UserListView(ListAPIView):
    queryset = CustomUser.objects.filter(is_superuser=False)
    serializer_class = UserListSerializer
    permission_classes = [IsSuperUser]  # Only allow superusers to access this view

@extend_schema(summary='List customers', description='Returns non-staff, non-superuser accounts, cached for 15 minutes.')
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
@extend_schema(summary='Manage a non-superuser', description='Retrieve, update, or delete a non-superuser by user ID. Email is read-only. Staff and active flags are writable.')
class UpdateUserStatusView(RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.filter(is_superuser=False)
    serializer_class=UserListSerializer
    permission_classes=[IsSuperUser]
