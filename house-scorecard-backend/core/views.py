from rest_framework import viewsets, permissions, generics
from .models import Property, Criterion, Rating
from .serializers import PropertySerializer, CriterionSerializer, RatingSerializer, UserSerializer

class UserCreate(generics.CreateAPIView):
    queryset = Rating.objects.all()
    serializer_class = UserSerializer
    permission_classes = (permissions.AllowAny,)

class PropertyViewSet(viewsets.ModelViewSet):
    """API endpoint for properties."""
    queryset = Property.objects.all().order_by('-created_at')
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]

class CriterionViewSet(viewsets.ModelViewSet):
    """API endpoint for criteria."""
    queryset = Criterion.objects.all().order_by('type', 'text')
    serializer_class = CriterionSerializer
    permission_classes = [permissions.IsAuthenticated]

class RatingViewSet(viewsets.ModelViewSet):
    """API endpoint for ratings."""
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]