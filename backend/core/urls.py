
from django.contrib import admin
from django.urls import path,include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from core.views import SendEmailView

from django.conf import settings
from django.contrib.staticfiles.urls import static,staticfiles_urlpatterns



urlpatterns = [
     path('api/mail/send-email/', SendEmailView.as_view(), name='send-email'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('admin/', admin.site.urls),
    path('api/',include('user_app.urls')),
    path('api/acc/',include('accounting.urls')),
    path('api/stock/',include('stock_app.urls')),
    
    
    
]

urlpatterns +=staticfiles_urlpatterns()

urlpatterns +=static(settings.MEDIA_URL,document_root=settings.MEDIA_ROOT)
