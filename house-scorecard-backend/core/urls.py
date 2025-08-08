from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PropertyViewSet, CriterionViewSet, RatingViewSet, UserCreate, HealthCheckView, cors_test

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'properties', PropertyViewSet, basename='property')
router.register(r'criteria', CriterionViewSet, basename='criterion')
router.register(r'ratings', RatingViewSet, basename='rating')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
    path('register/', UserCreate.as_view(), name='register'),
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('cors-test/', cors_test, name='cors-test'),
]
