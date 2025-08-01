from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Property, Criterion, Rating

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user

class PropertySerializer(serializers.ModelSerializer):
    listingUrl = serializers.URLField(source='listing_url', allow_null=True, required=False)

    class Meta:
        model = Property
        fields = ('id', 'address', 'listingUrl', 'price', 'beds', 'baths', 'sqft', 'notes', 'latitude', 'longitude', 'image_urls', 'score', 'created_at', 'updated_at')
        extra_kwargs = {'listing_url': {'write_only': True}} # Make original field write-only if needed

class CriterionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Criterion
        fields = '__all__'

class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = '__all__'
