import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import quote

import environ




# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


env = environ.Env(DEBUG=(bool, False))
# Environment variables set by the host take priority over local files.
env.read_env(BASE_DIR / '.env.local')
env.read_env(BASE_DIR / '.env')
MEDIA_DIR = BASE_DIR / 'media'
SECRET_KEY = env('DJANGO_SECRET_KEY', default=env('SECRET_KEY', default=''))
if not SECRET_KEY:
    raise ValueError('Set DJANGO_SECRET_KEY before starting Django.')
DEBUG = env.bool('DEBUG', default=False)
_vercel_hosts = [os.environ.get(name, '') for name in
                 ('VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_BRANCH_URL')]
ALLOWED_HOSTS = list(dict.fromkeys([
    *env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1']),
    *[host for host in _vercel_hosts if host],
]))
SESSION_COOKIE_SECURE = env.bool('SESSION_COOKIE_SECURE', default=not DEBUG)
CSRF_COOKIE_SECURE = env.bool('CSRF_COOKIE_SECURE', default=not DEBUG)
# Vercel terminates TLS before forwarding requests to Django.
if os.environ.get('VERCEL'):
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'user_app',
    'accounting', 
    'stock_app',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'silk',
    'schema_viewer',
    'drf_spectacular',

]


# jwt configuration
REST_FRAMEWORK = {
    'NON_FIELD_ERRORS_KEY': 'error',
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "user_app.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],

    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser', 
    ],
    'DEFAULT_SCHEMA_CLASS': 'core.schema.AppAutoSchema',
}

SIMPLE_JWT = {
    'TOKEN_OBTAIN_SERIALIZER': 'user_app.serializers.CustomTokenObtainPairSerializer',
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

AUTH_COOKIE_ACCESS = env('AUTH_COOKIE_ACCESS', default='access_token')
AUTH_COOKIE_REFRESH = env('AUTH_COOKIE_REFRESH', default='refresh_token')
AUTH_COOKIE_SECURE = env.bool('AUTH_COOKIE_SECURE', default=not DEBUG)
AUTH_COOKIE_HTTP_ONLY = env.bool('AUTH_COOKIE_HTTP_ONLY', default=True)
AUTH_COOKIE_SAMESITE = env('AUTH_COOKIE_SAMESITE', default='Lax')
AUTH_COOKIE_DOMAIN = env('AUTH_COOKIE_DOMAIN', default=None)



MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'silk.middleware.SilkyMiddleware',
]

AUTH_USER_MODEL = 'user_app.CustomUser'

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

# Debug mode always uses a local database without requiring hosted credentials.
if DEBUG:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
elif env("DATABASE_URL", default=""):
    DATABASES = {"default": env.db_url("DATABASE_URL")}
else:
    # Supabase / PostgreSQL configuration used by existing deployments.
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("DB_NAME"),
            "USER": env("DB_USER"),
            "PASSWORD": env("DB_PASSWORD"),
            "HOST": env("DB_HOST"),
            "PORT": env("DB_PORT", default="5432"),
            "OPTIONS": {"sslmode": "require"},
            "CONN_MAX_AGE": 0,
            "DISABLE_SERVER_SIDE_CURSORS": True,
        }
    }

if DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql":
    DATABASES["default"].setdefault("OPTIONS", {}).setdefault("sslmode", "require")
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True



# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/



STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / "staticfiles"

EMAIL_BACKEND = env(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.smtp.EmailBackend',
)
EMAIL_HOST = env('EMAIL_HOST', default='smtp.mailersend.net')
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_USE_SSL = env.bool('EMAIL_USE_SSL', default=False)
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default=EMAIL_HOST_USER)
EMAIL_TIMEOUT = env.int('EMAIL_TIMEOUT', default=30)

# media files
# MEDIA_ROO=[MEDIA_DIR,]
# MEDIA_URL="/media/"


MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=False)
CORS_ALLOW_CREDENTIALS = env.bool('CORS_ALLOW_CREDENTIALS', default=True)
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],
)
CSRF_TRUSTED_ORIGINS = env.list(
    'CSRF_TRUSTED_ORIGINS',
    default=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],
)



SPECTACULAR_SETTINGS = {
    'TITLE': 'Fast Investment Backoffice API',
    'DESCRIPTION': (
        'API reference grouped by Django app: users and authentication, accounting, '
        'and stock investments. Login sets HttpOnly JWT cookies; it does not return '
        'tokens in JSON. Use browser credentials and X-CSRFToken for unsafe '
        'cookie-authenticated requests, or supply an existing Bearer JWT. '
        'Amounts are serialized as decimal strings. Dates use YYYY-MM-DD.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'TAGS': [
        {'name': 'user_app', 'description': 'Authentication, sessions, profiles, and user administration.'},
        {'name': 'accounting', 'description': 'Balances, transactions, approvals, and fund transfers.'},
        {'name': 'stock_app', 'description': 'Instruments, trades, projects, investments, advisors, and profits.'},
    ],
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'displayOperationId': True,
        'docExpansion': 'none',
        'filter': True,
    },
}


REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = os.environ.get('REDIS_PORT', 6379)
REDIS_USERNAME=os.environ.get('REDIS_USERNAME', '')
REDIS_PASSWORD=os.environ.get('REDIS_PASSWORD', '')
REDIS_URL = os.environ.get('REDIS_URL') or (
    f"redis://{quote(REDIS_USERNAME, safe='')}:{quote(REDIS_PASSWORD, safe='')}"
    f"@{REDIS_HOST}:{REDIS_PORT}/0"
)



CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "SOCKET_CONNECT_TIMEOUT": 5,
            "SOCKET_TIMEOUT": 5,
        }
    }
}
