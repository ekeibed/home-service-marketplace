"""
Django settings for the HomeFix project.

All deployment-sensitive values (SECRET_KEY, DEBUG, DB credentials, CORS
origins) are read from environment variables — either from the shell or from
a local `.env` file. A starter template is provided in `backend/.env.example`.

For the full deployment checklist, see:
https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/
"""

import os
from datetime import timedelta
from pathlib import Path

# Load .env if python-dotenv is available. We don't hard-fail if it isn't —
# environment variables set by the shell / hosting platform still work.
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / '.env')
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent


# ─── Helpers ────────────────────────────────────────────────────────────────

def env_bool(name, default=False):
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in ('1', 'true', 'yes', 'on')


def env_list(name, default=None):
    val = os.environ.get(name)
    if not val:
        return list(default or [])
    return [item.strip() for item in val.split(',') if item.strip()]


# ─── Core security ──────────────────────────────────────────────────────────

# SECURITY WARNING: keep the secret key secret in production!
# The fallback is only for local dev — production MUST set SECRET_KEY.
SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-dev-only-do-not-use-in-production',
)

# SECURITY WARNING: never run with DEBUG=True in production!
DEBUG = env_bool('DEBUG', default=True)

ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])


# ─── Apps ───────────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'services',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


# ─── Database ───────────────────────────────────────────────────────────────
# Defaults match the local Docker Postgres in `database/docker-compose.yml`.

DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     os.environ.get('POSTGRES_DB',       'home_service_db'),
        'USER':     os.environ.get('POSTGRES_USER',     'postgres'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', ''),
        'HOST':     os.environ.get('DB_HOST',           'localhost'),
        'PORT':     os.environ.get('POSTGRES_PORT',     '5432'),
    }
}


# ─── Password validation ────────────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ─── i18n ───────────────────────────────────────────────────────────────────

LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'UTC'
USE_I18N      = True
USE_TZ        = True


# ─── Static files ───────────────────────────────────────────────────────────

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'


# ─── Auth / DRF / JWT ───────────────────────────────────────────────────────

AUTH_USER_MODEL = 'services.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}


# ─── CORS ───────────────────────────────────────────────────────────────────
# The frontend usually runs on a different port than the API. In production,
# set CORS_ALLOWED_ORIGINS explicitly. In dev (DEBUG=True) we allow all so
# teammates can use any local static server.

CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://localhost:5500',       # VS Code Live Server
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
])
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = DEBUG     # permissive only when DEBUG=True


# ─── Production hardening ───────────────────────────────────────────────────
# These only kick in when DEBUG is off.

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT     = env_bool('SECURE_SSL_REDIRECT', default=True)
    SESSION_COOKIE_SECURE   = True
    CSRF_COOKIE_SECURE      = True
    SECURE_HSTS_SECONDS     = int(os.environ.get('SECURE_HSTS_SECONDS', '3600'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF    = True

    if SECRET_KEY.startswith('django-insecure-'):
        raise RuntimeError(
            'Refusing to start with DEBUG=False and the development SECRET_KEY. '
            'Set SECRET_KEY in the environment.'
        )


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
