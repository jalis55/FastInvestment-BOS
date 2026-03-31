
from django.conf import settings
from django.contrib import admin
from django.contrib.staticfiles.urls import static, staticfiles_urlpatterns
from django.urls import include, path
from drf_spectacular.views import (SpectacularAPIView, SpectacularRedocView,
                                   SpectacularSwaggerView)

from user_app.views import CookieTokenObtainPairView, CookieTokenRefreshView, LogoutView



urlpatterns = [

    path('api/token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
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
