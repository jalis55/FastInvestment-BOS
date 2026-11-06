
import os
from datetime import timedelta
from pathlib import Path

import environ


# ============================================================
# BASE DIRECTORY & ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
)

# Vercel provides environment variables directly.
# These files are used for local development only.
local_env = BASE_DIR / ".env.local"
default_env = BASE_DIR / ".env"

if local_env.exists():
    environ.Env.read_env(local_env, overwrite=False)
elif default_env.exists():
    environ.Env.read_env(default_env, overwrite=False)


# ============================================================
# SECURITY
# ============================================================

SECRET_KEY = env("DJANGO_SECRET_KEY")

DEBUG = env.bool("DEBUG", default=False)

ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["*"],
)

# Keep the production domain allowed even when local hosts are set in the environment.
PRODUCTION_HOST = "fast-investment-bos.vercel.app"
if PRODUCTION_HOST not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(PRODUCTION_HOST)

SECURE_PROXY_SSL_HEADER = (
    "HTTP_X_FORWARDED_PROTO",
    "https",
)

SESSION_COOKIE_SECURE = env.bool(
    "SESSION_COOKIE_SECURE",
    default=not DEBUG,
)

CSRF_COOKIE_SECURE = env.bool(
    "CSRF_COOKIE_SECURE",
    default=not DEBUG,
)


# ============================================================
# INSTALLED APPLICATIONS
# ============================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Project apps
    "user_app",
    "accounting",
    "stock_app",

    # Django REST Framework
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",

    # Third-party apps
    "corsheaders",
    "schema_viewer",
    "drf_spectacular",
]


# ============================================================
# MIDDLEWARE
# ============================================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ============================================================
# URLS, TEMPLATES & WSGI
# ============================================================

ROOT_URLCONF = "core.urls"

WSGI_APPLICATION = "core.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ============================================================
# CUSTOM USER MODEL
# ============================================================

AUTH_USER_MODEL = "user_app.CustomUser"


# ============================================================
# DJANGO REST FRAMEWORK
# ============================================================

REST_FRAMEWORK = {
    "NON_FIELD_ERRORS_KEY": "error",

    "DEFAULT_AUTHENTICATION_CLASSES": (
        "user_app.authentication.CookieJWTAuthentication",
    ),

    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],

    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],

    "DEFAULT_SCHEMA_CLASS": "core.schema.AppAutoSchema",
}


# ============================================================
# JWT AUTHENTICATION
# ============================================================

SIMPLE_JWT = {
    "TOKEN_OBTAIN_SERIALIZER": (
        "user_app.serializers.CustomTokenObtainPairSerializer"
    ),

    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),

    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}


# ============================================================
# AUTHENTICATION COOKIES
# ============================================================

AUTH_COOKIE_ACCESS = env(
    "AUTH_COOKIE_ACCESS",
    default="access_token",
)

AUTH_COOKIE_REFRESH = env(
    "AUTH_COOKIE_REFRESH",
    default="refresh_token",
)

AUTH_COOKIE_SECURE = env.bool(
    "AUTH_COOKIE_SECURE",
    default=not DEBUG,
)

AUTH_COOKIE_HTTP_ONLY = env.bool(
    "AUTH_COOKIE_HTTP_ONLY",
    default=True,
)

AUTH_COOKIE_SAMESITE = env(
    "AUTH_COOKIE_SAMESITE",
    default="Lax",
)

AUTH_COOKIE_DOMAIN = env(
    "AUTH_COOKIE_DOMAIN",
    default=None,
)


# ============================================================
# NEON POSTGRESQL DATABASE
# ============================================================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",

        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST"),
        "PORT": env("DB_PORT", default="5432"),

        "OPTIONS": {
            "sslmode": "require",
        },

        # Recommended for serverless database connections
        "CONN_MAX_AGE": 0,
    }
}


# ============================================================
# PASSWORD VALIDATION
# ============================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


# ============================================================
# INTERNATIONALIZATION
# ============================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# ============================================================
# STATIC FILES
# ============================================================

STATIC_URL = "/static/"

STATIC_ROOT = BASE_DIR / "staticfiles"


# ============================================================
# MEDIA FILES
# ============================================================

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"

# IMPORTANT:
# Vercel does not provide persistent local file storage.
# Use S3, Cloudinary, or another external storage provider
# for production user uploads.


# ============================================================
# DEFAULT PRIMARY KEY
# ============================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ============================================================
# CORS CONFIGURATION
# ============================================================

CORS_ALLOW_ALL_ORIGINS = env.bool(
    "CORS_ALLOW_ALL_ORIGINS",
    default=False,
)

CORS_ALLOW_CREDENTIALS = env.bool(
    "CORS_ALLOW_CREDENTIALS",
    default=True,
)

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)


# The local and deployed clients use cookie authentication against this backend.
FRONTEND_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://fast-investment-bos-ppdu.vercel.app",
    "https://fastinv.netlify.app",
)
for origin in FRONTEND_ORIGINS:
    if origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(origin)


# ============================================================
# CSRF CONFIGURATION
# ============================================================

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)
for origin in FRONTEND_ORIGINS:
    if origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(origin)



# ============================================================
# EMAIL CONFIGURATION
# ============================================================

EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.smtp.EmailBackend",
)

EMAIL_HOST = env(
    "EMAIL_HOST",
    default="smtp.mailersend.net",
)

EMAIL_USE_TLS = env.bool(
    "EMAIL_USE_TLS",
    default=True,
)

EMAIL_USE_SSL = env.bool(
    "EMAIL_USE_SSL",
    default=False,
)

EMAIL_PORT = env.int(
    "EMAIL_PORT",
    default=587,
)

EMAIL_HOST_USER = env(
    "EMAIL_HOST_USER",
    default="",
)

EMAIL_HOST_PASSWORD = env(
    "EMAIL_HOST_PASSWORD",
    default="",
)

DEFAULT_FROM_EMAIL = env(
    "DEFAULT_FROM_EMAIL",
    default=EMAIL_HOST_USER,
)

EMAIL_TIMEOUT = env.int(
    "EMAIL_TIMEOUT",
    default=30,
)


# ============================================================
# DRF SPECTACULAR / SWAGGER
# ============================================================

SPECTACULAR_SETTINGS = {
    "TITLE": "Fast Investment Backoffice API",

    "DESCRIPTION": (
        "API reference grouped by Django app: "
        "users and authentication, accounting, "
        "and stock investments. "
        "Login sets HttpOnly JWT cookies; "
        "it does not return tokens in JSON. "
        "Use browser credentials and X-CSRFToken "
        "for unsafe cookie-authenticated requests, "
        "or supply an existing Bearer JWT. "
        "Amounts are serialized as decimal strings. "
        "Dates use YYYY-MM-DD."
    ),

    "VERSION": "1.0.0",

    "SERVE_INCLUDE_SCHEMA": False,

    "TAGS": [
        {
            "name": "user_app",
            "description": (
                "Authentication, sessions, profiles, "
                "and user administration."
            ),
        },
        {
            "name": "accounting",
            "description": (
                "Balances, transactions, approvals, "
                "and fund transfers."
            ),
        },
        {
            "name": "stock_app",
            "description": (
                "Instruments, trades, projects, "
                "investments, advisors, and profits."
            ),
        },
    ],

    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "displayOperationId": True,
        "docExpansion": "none",
        "filter": True,
    },
}


# ============================================================
# UPSTASH REDIS CACHE
# ============================================================

# Upstash TCP Redis requires a TLS connection.
# Use a rediss:// URL in your environment variables.

REDIS_URL = env(
    "REDIS_URL",
    default="redis://127.0.0.1:6379/0",
)

if not DEBUG and not REDIS_URL.startswith("rediss://"):
    raise ValueError(
        "Production REDIS_URL must use rediss:// "
        "for an encrypted Upstash connection."
    )

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",

        "LOCATION": REDIS_URL,

        "OPTIONS": {
            "CLIENT_CLASS": (
                "django_redis.client.DefaultClient"
            ),

            "SOCKET_CONNECT_TIMEOUT": 5,
            "SOCKET_TIMEOUT": 5,

            "IGNORE_EXCEPTIONS": False,
        },

        "TIMEOUT": 300,
    }
}
