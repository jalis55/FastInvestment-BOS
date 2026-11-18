from .schema import SessionSerializer, LoginResponseSerializer, MessageSerializer, DetailSerializer
from drf_spectacular.utils import extend_schema
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.core.cache import cache
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from django.views.decorators.cache import never_cache
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import (CreateAPIView, ListAPIView,
                                     RetrieveAPIView, RetrieveUpdateAPIView,
                                     RetrieveUpdateDestroyAPIView)
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from user_app.models import CustomUser, UserIdentityDocument
from user_app.authentication import CookieJWTAuthentication
from user_app.permissions import IsSuperUser
from user_app.serializers import (AdminUserDetailsSerializer, ChangePasswordSerializer,
                                  CustomTokenObtainPairSerializer, SelfUserProfileSerializer,
                                  UserListSerializer, UserRegistrationSerializer, UserSerializer,
                                  UserStatusSerializer)

# Create your views here.

@extend_schema(summary='Register a user', description='Create a user with email and name. An optional password must contain at least eight characters. Use multipart/form-data for profile_image or nid_scan_copy.')
class UserRegistrationView(CreateAPIView):
    serializer_class=UserRegistrationSerializer
    permission_classes=[IsAdminUser]


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
        except (ValidationError, TokenError):
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

@method_decorator(never_cache, name='dispatch')
@extend_schema(summary='Read or update your profile', description='Acts on the current user. Use multipart/form-data for profile_image or nid_scan_copy. Change your password through the dedicated password endpoint.')
class UserDetailsView(RetrieveUpdateAPIView):
    serializer_class=SelfUserProfileSerializer
    permission_classes=[IsAuthenticated]
    
    #currently logged in user
    def get_object(self):
        return self.request.user


@method_decorator(never_cache, name='dispatch')
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer, responses={204: None})
    @transaction.atomic
    def post(self, request):
        user = CustomUser.objects.select_for_update().get(pk=request.user.pk)
        serializer = ChangePasswordSerializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)



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
@method_decorator(never_cache, name='dispatch')
@extend_schema(summary='Manage a non-superuser', description='Retrieve, update, or delete a non-superuser by user ID. Use multipart/form-data to replace the profile image or NID scan. Password and scan bytes are write-only.')
class UpdateUserStatusView(RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.filter(is_superuser=False)
    serializer_class=AdminUserDetailsSerializer
    permission_classes=[IsSuperUser]


def nid_scan_download(documents):
    scan = documents.values_list('nid_scan_copy', flat=True).first()
    if scan is None:
        raise NotFound('No NID scan is available for this user.')

    scan = bytes(scan)
    if scan.startswith(b'%PDF-'):
        content_type, extension = 'application/pdf', 'pdf'
    elif scan.startswith(b'\x89PNG\r\n\x1a\n'):
        content_type, extension = 'image/png', 'png'
    else:
        content_type, extension = 'image/jpeg', 'jpg'
    return HttpResponse(scan, content_type=content_type, headers={
        'Content-Disposition': f'attachment; filename="nid-scan.{extension}"',
        'X-Content-Type-Options': 'nosniff',
    })


@method_decorator(never_cache, name='dispatch')
class UserNidScanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return nid_scan_download(UserIdentityDocument.objects.filter(user=request.user))


@method_decorator(never_cache, name='dispatch')
class AdminUserNidScanView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request, pk):
        return nid_scan_download(UserIdentityDocument.objects.filter(
            user_id=pk, user__is_superuser=False,
        ))
