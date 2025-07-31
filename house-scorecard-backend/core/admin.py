from django.contrib import admin
from .models import Property, Criterion, Rating

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('address', 'price', 'score', 'created_at')
    list_filter = ('beds', 'baths')
    search_fields = ('address', 'notes')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Criterion)
class CriterionAdmin(admin.ModelAdmin):
    list_display = ('text', 'type', 'category', 'weight', 'rating_type')
    list_filter = ('type', 'category')
    search_fields = ('text',)

@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('property', 'criterion', 'value', 'updated_at')
    list_filter = ('property', 'criterion')
    search_fields = ('property__address', 'criterion__text')