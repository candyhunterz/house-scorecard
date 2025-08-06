"""
URL configuration for scorecard_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse, HttpResponseRedirect
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

def api_status(request):
    """API status endpoint."""
    return JsonResponse({
        'message': 'House Scorecard API',
        'status': 'online',
        'version': '1.0',
        'frontend_url': 'https://house-scorecard.vercel.app',  # Update with your frontend URL
    })

def redirect_to_frontend(request):
    """Redirect to frontend application."""
    # Update this URL to match where your frontend is deployed
    frontend_url = 'https://house-scorecard.vercel.app'  # Change this to your actual frontend URL
    return HttpResponseRedirect(frontend_url)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('status/', api_status, name='api_status'),
    # Redirect root to frontend - update the URL in the function above
    path('', redirect_to_frontend, name='home'),
]
