from django.db import models
from django.contrib.auth.models import User

class Property(models.Model):
    """Represents a property being evaluated."""
    # owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='properties') # Add when user auth is implemented
    address = models.CharField(max_length=255)
    listing_url = models.URLField(max_length=1024, blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    beds = models.PositiveSmallIntegerField(blank=True, null=True)
    baths = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    sqft = models.PositiveIntegerField(blank=True, null=True)
    notes = models.TextField(blank=True, default='')
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    image_urls = models.JSONField(default=list, blank=True)
    score = models.IntegerField(blank=True, null=True)
    
    # Status tracking fields
    STATUS_CHOICES = [
        ('interested', 'Interested'),
        ('viewing_scheduled', 'Viewing Scheduled'),
        ('viewed', 'Viewed'),
        ('offer_made', 'Offer Made'),
        ('under_contract', 'Under Contract'),
        ('closed', 'Closed'),
        ('passed', 'Passed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, blank=True, null=True, help_text="Current status in the house hunting pipeline")
    status_history = models.JSONField(default=list, blank=True, help_text="History of status changes with timestamps")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_score(self):
        """
        Calculates the property's score based on its associated Rating objects.
        The score is normalized to a 0-100 scale.
        """
        ratings = self.ratings.all()
        
        total_weight = 0
        weighted_score_sum = 0

        # --- Handle Deal Breakers and Must-Haves First ---
        for rating in ratings:
            if rating.criterion.type == 'dealBreaker' and rating.value == 'yes':
                self.score = 0
                return
            if rating.criterion.type == 'mustHave' and rating.value == 'no':
                self.score = 0
                return

        # --- Calculate Score for Nice-to-Haves ---
        for rating in ratings.filter(criterion__type='niceToHave'):
            criterion = rating.criterion
            rating_value = rating.value

            if rating_value is None:
                continue

            # Normalize the rating to a 0-10 scale
            normalized_rating = 0
            if criterion.rating_type == 'stars': # 1-5 stars
                normalized_rating = (float(rating_value) - 1) * 2.5 
            elif criterion.rating_type == 'yesNo': # yes/no
                normalized_rating = 10 if rating_value == 'yes' else 0
            elif criterion.rating_type == 'scale10': # 1-10 scale
                normalized_rating = float(rating_value)

            # Add to totals
            weighted_score_sum += normalized_rating * criterion.weight
            total_weight += criterion.weight

        if total_weight == 0:
            # If there are no weighted criteria, check if all must-haves are met
            all_must_haves_met = all(
                r.value == 'yes' for r in ratings.filter(criterion__type='mustHave')
            )
            self.score = 100 if all_must_haves_met else 0
        else:
            # Normalize the final score to be out of 100
            final_score = (weighted_score_sum / (total_weight * 10)) * 100
            self.score = int(round(final_score))

    def save(self, *args, **kwargs):
        """Override save to calculate score automatically."""
        # Score is now calculated when a Rating is saved, not when a Property is saved.
        # We can remove the automatic calculation from here to avoid circular updates.
        # self.calculate_score() 
        super().save(*args, **kwargs)

    def __str__(self):
        return self.address

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Properties"

class Criterion(models.Model):
    """Represents a user-defined criterion for scoring properties."""
    # owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='criteria') # Add when user auth is implemented
    text = models.CharField(max_length=255)
    TYPE_CHOICES = [
        ('mustHave', 'Must-Have'),
        ('niceToHave', 'Nice-to-Have'),
        ('dealBreaker', 'Deal Breaker'),
    ]
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    weight = models.PositiveSmallIntegerField(default=5, help_text="Importance from 1-10 for Nice-to-Haves")
    category = models.CharField(max_length=100, blank=True, null=True)
    RATING_TYPE_CHOICES = [
        ('stars', 'Stars (1-5)'),
        ('yesNo', 'Yes/No'),
        ('scale10', 'Scale (1-10)'),
    ]
    rating_type = models.CharField(max_length=20, choices=RATING_TYPE_CHOICES, default='stars', help_text="Only for Nice-to-Haves")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_type_display()}: {self.text}"

    class Meta:
        ordering = ['type', 'text']

class Rating(models.Model):
    """Represents a rating for a specific criterion on a property."""
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='ratings')
    criterion = models.ForeignKey(Criterion, on_delete=models.CASCADE, related_name='ratings')
    value = models.CharField(max_length=20, blank=True, null=True, help_text="The rating value (e.g., '4', 'yes', '8')")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """Override save to trigger score recalculation on the related property."""
        super().save(*args, **kwargs)
        self.property.calculate_score()
        self.property.save()

    def __str__(self):
        return f"{self.property.address} - {self.criterion.text}: {self.value}"

    class Meta:
        unique_together = ('property', 'criterion') # Ensures one rating per criterion per property
