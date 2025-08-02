from rest_framework import viewsets, permissions, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
import csv
import io
import re
from decimal import Decimal, InvalidOperation
from datetime import datetime
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

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """
        Bulk import properties from CSV file.
        Optimized for Canadian real estate platforms (Realtor.ca, MLS systems).
        """
        try:
            csv_file = request.FILES.get('file')
            field_mapping = request.data.get('mapping', {})
            
            if not csv_file:
                return Response(
                    {'error': 'No CSV file provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate file type
            if not csv_file.name.endswith('.csv'):
                return Response(
                    {'error': 'File must be a CSV'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Read and process CSV
            csv_data = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_data))
            
            created_count = 0
            updated_count = 0
            errors = []
            
            with transaction.atomic():
                for row_num, row in enumerate(csv_reader, start=2):
                    try:
                        property_data = self._map_csv_row(row, field_mapping)
                        
                        # Skip rows with no address
                        if not property_data.get('address'):
                            continue
                        
                        # Check if property exists (by address)
                        existing_property = Property.objects.filter(
                            address__iexact=property_data['address']
                        ).first()
                        
                        if existing_property:
                            # Update existing property
                            for key, value in property_data.items():
                                if value is not None:
                                    setattr(existing_property, key, value)
                            existing_property.save()
                            updated_count += 1
                        else:
                            # Create new property
                            Property.objects.create(**property_data)
                            created_count += 1
                            
                    except Exception as e:
                        errors.append({
                            'row': row_num,
                            'error': str(e),
                            'data': dict(row)
                        })
            
            return Response({
                'success': True,
                'created': created_count,
                'updated': updated_count,
                'errors': errors
            })
        
        except Exception as e:
            return Response(
                {'error': f'Import failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def preview_csv(self, request):
        """Preview CSV file and suggest field mappings."""
        try:
            csv_file = request.FILES.get('file')
            
            if not csv_file:
                return Response(
                    {'error': 'No CSV file provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Read first few rows for preview
            csv_data = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_data))
            
            headers = csv_reader.fieldnames
            preview_rows = []
            
            for i, row in enumerate(csv_reader):
                if i >= 5:  # Only preview first 5 rows
                    break
                preview_rows.append(row)
            
            # Generate suggested mappings
            suggested_mapping = self._suggest_field_mappings(headers)
            
            return Response({
                'headers': headers,
                'preview_rows': preview_rows,
                'suggested_mapping': suggested_mapping
            })
        
        except Exception as e:
            return Response(
                {'error': f'Preview failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _suggest_field_mappings(self, headers):
        """
        Suggest field mappings based on header names.
        Optimized for Canadian real estate CSV formats.
        """
        # Canadian-specific field mappings
        canadian_mappings = {
            'address': [
                'address', 'property address', 'street address', 'full address',
                'unparsedaddress', 'property_address', 'street_address'
            ],
            'price': [
                'price', 'list price', 'listing price', 'current price', 'asking price',
                'listing_price', 'list_price', 'current_price', 'asking_price'
            ],
            'beds': [
                'beds', 'bedrooms', 'br', 'number of bedrooms', 'bedroom',
                'bedrooms_total', 'total_bedrooms', 'bed'
            ],
            'baths': [
                'baths', 'bathrooms', 'ba', 'full baths', 'bathroom',
                'bathrooms_full', 'total_bathrooms', 'bath'
            ],
            'sqft': [
                'square feet', 'sqft', 'sq ft', 'size (sqft)', 'living area',
                'square_feet', 'sq_ft', 'total_area', 'floor_area'
            ],
            'listing_url': [
                'url', 'link', 'listing url', 'property url', 'mls url',
                'listing_url', 'property_url', 'mls_url', 'web_link'
            ]
        }
        
        suggested = {}
        headers_lower = [h.lower().strip() for h in headers]
        
        for our_field, possible_names in canadian_mappings.items():
            for header_idx, header in enumerate(headers_lower):
                if header in possible_names:
                    suggested[headers[header_idx]] = our_field
                    break
        
        return suggested

    def _map_csv_row(self, row, field_mapping):
        """Map CSV row to Property model fields with Canadian formatting."""
        mapped_data = {}
        
        for csv_field, our_field in field_mapping.items():
            value = row.get(csv_field, '').strip()
            
            if not value or value.lower() in ['n/a', 'null', '--', '']:
                continue
            
            try:
                if our_field == 'address':
                    mapped_data['address'] = value
                
                elif our_field == 'price':
                    # Handle Canadian currency formatting
                    price_value = self._parse_canadian_price(value)
                    if price_value:
                        mapped_data['price'] = price_value
                
                elif our_field == 'beds':
                    # Parse bedrooms (0-50)
                    numeric_value = self._parse_integer(value)
                    if numeric_value is not None:
                        mapped_data[our_field] = numeric_value
                
                elif our_field == 'sqft':
                    # Parse square footage (different validation)
                    sqft_value = self._parse_sqft(value)
                    if sqft_value is not None:
                        mapped_data[our_field] = sqft_value
                
                elif our_field == 'baths':
                    # Parse decimal for bathrooms
                    bath_value = self._parse_decimal(value)
                    if bath_value is not None:
                        mapped_data['baths'] = bath_value
                
                elif our_field == 'listing_url':
                    if value.startswith(('http://', 'https://')):
                        mapped_data['listing_url'] = value
                
                else:
                    # Store as-is for other fields
                    mapped_data[our_field] = value
            
            except Exception:
                # Skip invalid values
                continue
        
        return mapped_data

    def _parse_canadian_price(self, value):
        """Parse Canadian currency values."""
        try:
            # Remove currency symbols, CAD, commas, spaces
            cleaned = re.sub(r'[CAD$,\s]', '', value.upper())
            if not cleaned:
                return None
            price = Decimal(cleaned)
            # Validate reasonable price range (Canadian real estate)
            if price < 10000 or price > 50000000:  # $10K to $50M CAD
                return None
            return price
        except (ValueError, InvalidOperation):
            return None

    def _parse_integer(self, value):
        """Parse integer values."""
        try:
            # Remove non-digit characters except decimal point
            cleaned = re.sub(r'[^\d.]', '', value)
            if not cleaned:
                return None
            result = int(float(cleaned))
            # Validate reasonable ranges
            if result < 0 or result > 50:  # 0-50 bedrooms/baths, 0-50K sqft
                return None
            return result
        except (ValueError, TypeError):
            return None

    def _parse_sqft(self, value):
        """Parse square footage values."""
        try:
            # Remove non-digit characters except decimal point
            cleaned = re.sub(r'[^\d.]', '', value)
            if not cleaned:
                return None
            result = int(float(cleaned))
            # Validate reasonable sqft range (100 to 50,000 sqft)
            if result < 100 or result > 50000:
                return None
            return result
        except (ValueError, TypeError):
            return None

    def _parse_decimal(self, value):
        """Parse decimal values (for bathrooms)."""
        try:
            cleaned = re.sub(r'[^\d.]', '', value)
            if not cleaned:
                return None
            result = Decimal(cleaned)
            # Validate reasonable bathroom range (0.5 to 20 baths)
            if result < Decimal('0.5') or result > Decimal('20'):
                return None
            return result
        except (ValueError, InvalidOperation, TypeError):
            return None

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