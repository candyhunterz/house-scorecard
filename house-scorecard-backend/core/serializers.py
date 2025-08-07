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
    ratings = serializers.SerializerMethodField()
    imageUrls = serializers.JSONField(source='image_urls', required=False)
    statusHistory = serializers.JSONField(source='status_history', required=False)

    class Meta:
        model = Property
        fields = ('id', 'address', 'listingUrl', 'price', 'beds', 'baths', 'sqft', 'notes', 'latitude', 'longitude', 'imageUrls', 'ratings', 'score', 'status', 'statusHistory', 'created_at', 'updated_at')
        extra_kwargs = {'listing_url': {'write_only': True}} # Make original field write-only if needed
    
    def get_ratings(self, obj):
        """Convert Rating objects to a dictionary format expected by frontend."""
        from .models import Criterion
        ratings_dict = {}
        
        # Get all existing ratings for this property
        existing_ratings = {r.criterion.id: r.value for r in obj.ratings.all()}
        
        # Include only criteria owned by the same user as the property
        for criterion in Criterion.objects.filter(owner=obj.owner):
            value = existing_ratings.get(criterion.id)
            
            if value is not None:
                # Convert backend value format to frontend format
                if value == 'yes':
                    value = True
                elif value == 'no':
                    value = False
                elif value and value.isdigit():
                    value = int(value)
                ratings_dict[criterion.id] = value
            # For unrated criteria, don't include them in the dict (undefined means unrated)
            
        return ratings_dict

class CriterionSerializer(serializers.ModelSerializer):
    ratingType = serializers.CharField(source='rating_type', required=False, allow_null=True)
    
    class Meta:
        model = Criterion
        fields = ('id', 'text', 'type', 'weight', 'category', 'ratingType', 'created_at', 'updated_at')
        extra_kwargs = {'rating_type': {'write_only': True}}

class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = '__all__'
