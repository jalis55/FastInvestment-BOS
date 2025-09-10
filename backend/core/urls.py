
from django.conf import settings
from django.contrib import admin
from django.contrib.staticfiles.urls import static, staticfiles_urlpatterns
from django.urls import include, path
from drf_spectacular.views import (SpectacularAPIView, SpectacularRedocView,
                                   SpectacularSwaggerView)
from rest_framework_simplejwt.views import (TokenObtainPairView,
                                            TokenRefreshView)

from core.views import SendEmailView

urlpatterns = [
     path('api/mail/send-email/', SendEmailView.as_view(), name='send-email'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('silk/', include('silk.urls', namespace='silk')),
    path('schema-viewer/', include('schema_viewer.urls')),
    # api docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
 
    # Optional UI:
    # path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),




    path('admin/', admin.site.urls),
    path('api/',include('user_app.urls')),
    path('api/acc/',include('accounting.urls'),name="accounting"),
    path('api/stock/',include('stock_app.urls')),

    
    
    
]

urlpatterns +=staticfiles_urlpatterns()

urlpatterns +=static(settings.MEDIA_URL,document_root=settings.MEDIA_ROOT)
