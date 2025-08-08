from rest_framework import viewsets, permissions, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.contrib.auth.models import User
import csv
import io
import re
import json
import requests
from curl_cffi import requests as cf_requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import time
import random
import logging
from decimal import Decimal, InvalidOperation
from datetime import datetime
from django.core.cache import cache
from django.utils import timezone
from .models import Property, Criterion, Rating
from .serializers import PropertySerializer, CriterionSerializer, RatingSerializer, UserSerializer
from .health import get_health_status
from .services.gemini_analyzer import get_ai_analyzer

# Geocoding service using OpenStreetMap Nominatim API
def geocode_address(address):
    try:
        # Use curl_cffi for geocoding as well to maintain consistency
        response = cf_requests.get(
            f'https://nominatim.openstreetmap.org/search',
            params={
                'format': 'json',
                'q': address,
                'limit': 1,
                'countrycodes': 'ca,us'
            },
            timeout=10,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'},
            impersonate="chrome120"
        )
        data = response.json()
        
        if data and len(data) > 0:
            result = data[0]
            return {
                'latitude': float(result['lat']),
                'longitude': float(result['lon'])
            }
        return None
    except Exception as e:
        logger.error(f'Geocoding failed for address "{address}": {str(e)}')
        return None

# Configure logger for scraping operations
logger = logging.getLogger(__name__)

class UserCreate(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (permissions.AllowAny,)

class PropertyViewSet(viewsets.ModelViewSet):
    """API endpoint for properties."""
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return only properties owned by the current user."""
        return Property.objects.filter(owner=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        """Set the owner to the current user when creating a property and geocode if needed."""
        # Get the property data before saving
        property_data = serializer.validated_data
        logger.info(f"Property creation - validated_data: {property_data}")
        logger.info(f"Property creation - request.data: {self.request.data}")
        
        # Try to geocode if no coordinates provided
        if not property_data.get('latitude') or not property_data.get('longitude'):
            address = property_data.get('address')
            if address:
                logger.info(f"Attempting to geocode address: {address}")
                coordinates = geocode_address(address)
                if coordinates:
                    logger.info(f"Successfully geocoded {address}: {coordinates}")
                    property_data['latitude'] = coordinates['latitude']
                    property_data['longitude'] = coordinates['longitude']
                else:
                    logger.warning(f"Failed to geocode address: {address}")
        
        # Save the property first
        property_instance = serializer.save(owner=self.request.user, **property_data)
        
        # If no AI analysis provided but property has images, trigger analysis
        # Check both the property instance and if AI data was provided in the request
        ai_data_provided = bool(
            property_instance.ai_analysis or 
            property_instance.ai_analysis_date or
            property_instance.ai_overall_grade
        )
        
        should_run_ai_analysis = (
            property_instance.needs_ai_analysis() and 
            not ai_data_provided
        )
        
        logger.info(f"Should run AI analysis: {should_run_ai_analysis}, ai_analysis: {property_instance.ai_analysis}, ai_analysis_date: {property_instance.ai_analysis_date}")
        
        if should_run_ai_analysis:
            try:
                from .tasks import analyze_property_with_ai_async
                logger.info(f"Queuing AI analysis for new property {property_instance.id}")
                
                # Queue AI analysis as background task
                task = analyze_property_with_ai_async.delay(property_instance.id)
                logger.info(f"AI analysis queued for property {property_instance.id}, task_id: {task.id}")
                
                # Optionally store task ID for tracking
                # You could add a task_id field to track the background task
                
            except Exception as e:
                logger.error(f"Failed to queue AI analysis for new property: {e}")
                # Don't fail property creation if AI queueing fails

    @action(detail=False, methods=['post'])
    def geocode_properties(self, request):
        """Geocode properties that don't have coordinates."""
        try:
            properties_without_coords = Property.objects.filter(
                owner=self.request.user,
                latitude__isnull=True
            ) | Property.objects.filter(
                owner=self.request.user,
                longitude__isnull=True
            )
            
            geocoded_count = 0
            for property_obj in properties_without_coords:
                if property_obj.address:
                    coordinates = geocode_address(property_obj.address)
                    if coordinates:
                        property_obj.latitude = coordinates['latitude']
                        property_obj.longitude = coordinates['longitude']
                        property_obj.save()
                        geocoded_count += 1
                        logger.info(f"Geocoded property {property_obj.id}: {property_obj.address}")
                        # Add a small delay to be respectful to the API
                        time.sleep(1)
            
            return Response({
                'success': True,
                'geocoded_count': geocoded_count,
                'message': f'Successfully geocoded {geocoded_count} properties'
            })
            
        except Exception as e:
            logger.error(f"Geocoding error: {str(e)}")
            return Response(
                {'error': f'Geocoding failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """
        Bulk import properties from CSV file.
        Optimized for Canadian real estate platforms (Realtor.ca, MLS systems).
        """
        try:
            csv_file = request.FILES.get('file')
            field_mapping_str = request.data.get('mapping', '{}')
            field_mapping = json.loads(field_mapping_str)
            
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
                        
                        # Check if property exists (by address and owner)
                        existing_property = Property.objects.filter(
                            address__iexact=property_data['address'],
                            owner=request.user
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
                            Property.objects.create(owner=request.user, **property_data)
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

    def _extract_description(self, soup):
        """Extract property description from various selectors."""
        description_selectors = [
            # Realtor.ca specific
            '.listingDetailDescription',
            '.listingDescription',
            '.property-description',
            # Generic selectors
            '.description',
            '.listing-description', 
            '.property-details',
            '.remarks',
            '.public-remarks',
            '.mls-remarks',
            '[data-testid="listing-description"]',
            '[class*="description"]',
            # Meta description fallback
            'meta[name="description"]',
        ]
        
        for selector in description_selectors:
            element = soup.select_one(selector)
            if element:
                if element.name == 'meta':
                    description = element.get('content', '').strip()
                else:
                    description = element.get_text(strip=True)
                
                # Clean and validate description
                if description and len(description) > 20:  # Must be meaningful length
                    # Clean up extra whitespace and formatting
                    cleaned_description = ' '.join(description.split())
                    
                    # Remove common junk patterns
                    junk_patterns = [
                        r'^\s*Description\s*:?\s*',  # "Description:" prefix
                        r'^\s*Remarks\s*:?\s*',     # "Remarks:" prefix
                        r'\s*Click here.*$',         # Footer links
                        r'\s*For more.*$',           # Footer text
                        r'\s*Contact.*$',            # Contact info
                    ]
                    
                    for pattern in junk_patterns:
                        cleaned_description = re.sub(pattern, '', cleaned_description, flags=re.IGNORECASE)
                    
                    if len(cleaned_description) > 20:  # Still meaningful after cleaning
                        logger.info(f"Extracted description ({len(cleaned_description)} chars)")
                        return cleaned_description
        
        # Fallback: try to extract from page text with keywords
        page_text = soup.get_text()
        
        # Look for description sections in page text
        description_patterns = [
            r'(?i)description[:\s]*(.{50,500}?)(?:\n\n|\n[A-Z]|\s{3,})',
            r'(?i)remarks[:\s]*(.{50,500}?)(?:\n\n|\n[A-Z]|\s{3,})',
            r'(?i)details[:\s]*(.{50,500}?)(?:\n\n|\n[A-Z]|\s{3,})',
        ]
        
        for pattern in description_patterns:
            match = re.search(pattern, page_text)
            if match:
                description = match.group(1).strip()
                cleaned_description = ' '.join(description.split())
                if len(cleaned_description) > 50:
                    logger.info(f"Extracted description from page text ({len(cleaned_description)} chars)")
                    return cleaned_description
        
        return None

    @action(detail=False, methods=['post'])
    def scrape_listing(self, request):
        """
        Scrape property data from a listing URL.
        Supports common Canadian real estate sites.
        """
        try:
            url = request.data.get('url')
            if not url:
                return Response(
                    {'error': 'URL is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate URL format
            parsed_url = urlparse(url)
            if not parsed_url.scheme or not parsed_url.netloc:
                return Response(
                    {'error': 'Invalid URL format'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Rate limiting - especially important for Realtor.ca
            domain = parsed_url.netloc.lower()
            user_ip = request.META.get('REMOTE_ADDR', 'unknown')
            rate_limit_key = f'scrape_rate_limit_{domain}_{user_ip}'
            
            # Check if user has scraped this domain recently
            last_scrape = cache.get(rate_limit_key)
            if last_scrape:
                # Enforce minimum interval between requests
                if 'realtor.ca' in domain:
                    min_interval = 60  # 60s for Realtor.ca
                elif 'housesigma.com' in domain:
                    min_interval = 30  # 30s for HouseSigma (though scraping won't work)
                elif 'zealty.ca' in domain:
                    min_interval = 20  # 20s for Zealty.ca (lighter rate limiting)
                else:
                    min_interval = 30  # 30s for other sites
                time_since_last = time.time() - last_scrape
                if time_since_last < min_interval:
                    wait_time = int(min_interval - time_since_last)
                    return Response(
                        {'error': f'Rate limit: Please wait {wait_time} seconds before scraping {domain} again. This helps avoid being blocked by anti-bot systems.'}, 
                        status=status.HTTP_429_TOO_MANY_REQUESTS
                    )
            
            # Set rate limit for this request
            cache.set(rate_limit_key, time.time(), timeout=300)  # 5 minute cache

            # Scrape the listing
            scraped_data = self._scrape_property_listing(url)
            
            # Add metadata about analysis readiness
            scraped_data['analysis_ready'] = bool(scraped_data.get('images'))
            scraped_data['image_count'] = len(scraped_data.get('images', []))
            
            # Add helpful message about next steps
            if scraped_data.get('images'):
                scraped_data['next_steps'] = f"Property data scraped successfully with {len(scraped_data['images'])} images. You can now run AI analysis."
            else:
                scraped_data['next_steps'] = "Property data scraped but no images found. AI analysis requires images."
            
            return Response(scraped_data)

        except Exception as e:
            logger.error(f"Scraping error: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Scraping failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _scrape_property_listing(self, url):
        """
        Scrape property data from various real estate websites with advanced anti-bot protection workarounds.
        """
        # Extended list of realistic user agents with more recent versions
        # Note: curl_cffi handles User-Agent automatically based on impersonation, but we keep these for header variation
        user_agents = [
            # Chrome on Windows (most common)
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            # Chrome on Mac
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            # Firefox
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
            # Safari
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            # Edge
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        ]
        
        # More sophisticated header variations
        base_headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8,fr-CA;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Cache-Control': 'max-age=0',
            'Upgrade-Insecure-Requests': '1',
            'Connection': 'keep-alive',
            'DNT': '1',  # Do Not Track
            'Pragma': 'no-cache',
        }
        
        # More realistic header variations to try
        header_variations = [
            {
                **base_headers,
                'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Sec-Purpose': 'prefetch',
            },
            {
                **base_headers,
                'Referer': 'https://www.google.ca/',
                'Sec-Fetch-Site': 'cross-site',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Dest': 'document',
            },
            {
                **base_headers,
                'Referer': 'https://www.realtor.ca/',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Dest': 'document',
            },
            {
                **base_headers,
                'Referer': 'https://www.bing.com/',
                'X-Forwarded-For': f'{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}',
            },
            base_headers  # Minimal headers as fallback
        ]
        
        # Single attempt - users don't want to wait
        max_attempts = 1
        session = None
        response = None
        
        # Detect if this is Realtor.ca for special handling
        is_realtor_ca = 'realtor.ca' in url.lower()
        
        # Detect if this is HouseSigma.com for special handling
        is_housesigma = 'housesigma.com' in url.lower()
        
        # Detect if this is Zealty.ca for special handling
        is_zealty = 'zealty.ca' in url.lower()
        
        # Handle HouseSigma.com specifically
        if is_housesigma:
            # HouseSigma is a JavaScript SPA that can't be scraped with traditional methods
            raise Exception(f'HouseSigma.com uses JavaScript rendering and cannot be scraped automatically.\n\n💡 Manual workaround:\n1. Open the listing URL in your browser: {url}\n2. Copy the address, price, beds, baths, and sq ft\n3. Paste the details into the form manually\n4. For images, right-click on property photos and copy image URLs\n\nNote: HouseSigma requires a browser to load the property data.')
        
        # Handle Zealty.ca specifically - extract from JavaScript gData variable
        if is_zealty:
            return self._scrape_zealty(url, session or cf_requests.Session(impersonate="chrome120"))
        
        for attempt in range(max_attempts):
            try:
                logger.info(f"Scraping attempt {attempt + 1}/{max_attempts} for URL: {url}")
                logger.info("Using curl_cffi with Chrome120 impersonation to bypass anti-bot protection")
                
                # Use curl_cffi session with browser impersonation to bypass anti-bot protection
                # Try different browser fingerprints for better success rate
                browser_types = ["chrome120", "chrome110", "safari15_5", "edge99"]
                selected_browser = random.choice(browser_types)
                logger.info(f"Using browser impersonation: {selected_browser}")
                session = cf_requests.Session(impersonate=selected_browser)
                
                # Add cookie persistence and session management
                session.cookies.clear()  # Start fresh
                
                # Enable automatic cookie handling and redirect following
                session.verify = True  # Enable SSL verification
                session.allow_redirects = True
                
                # Configure session with more realistic settings (curl_cffi style)
                # Note: curl_cffi doesn't use HTTPAdapter, it handles TLS/HTTP2 automatically
                
                # Rotate user agent and headers for each attempt
                selected_user_agent = random.choice(user_agents)
                selected_headers = random.choice(header_variations).copy()
                selected_headers['User-Agent'] = selected_user_agent
                
                # No pre-browsing simulation - go straight to target for speed
                # Users don't want to wait for multiple page visits
                
                # Two-step approach for better success: first visit main site, then specific listing
                if is_realtor_ca:
                    try:
                        # Step 1: Visit main realtor.ca page to establish session and get cookies
                        logger.info("Step 1: Visiting realtor.ca homepage to establish session")
                        home_headers = {
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Cache-Control': 'max-age=0',
                            'Upgrade-Insecure-Requests': '1',
                            'Sec-Fetch-Dest': 'document',
                            'Sec-Fetch-Mode': 'navigate',
                            'Sec-Fetch-Site': 'none',
                            'Sec-Fetch-User': '?1'
                        }
                        
                        # Visit homepage first with minimal delay
                        home_response = session.get('https://www.realtor.ca/', headers=home_headers, timeout=15)
                        logger.info(f"Homepage visit: {home_response.status_code}, cookies: {len(session.cookies)}")
                        
                        # Small delay between requests
                        time.sleep(random.uniform(1.0, 2.0))
                        
                    except Exception as e:
                        logger.warning(f"Homepage visit failed: {e}, proceeding with direct request")

                # Make the actual request to target URL
                target_url = url
                
                # Add longer delay to appear more human-like and avoid rate limiting
                delay = random.uniform(3.0, 6.0)  # Even longer delay for Incapsula bypass
                logger.info(f"Adding {delay:.1f} second delay to avoid rate limiting")
                time.sleep(delay)
                
                # Update headers for the actual listing request
                listing_headers = selected_headers.copy()
                if is_realtor_ca:
                    # Add proper referrer for listing pages
                    listing_headers['Referer'] = 'https://www.realtor.ca/'
                    listing_headers['Sec-Fetch-Site'] = 'same-origin'
                    listing_headers['Sec-Fetch-Mode'] = 'navigate'
                    listing_headers['Sec-Fetch-Dest'] = 'document'
                
                session.headers.update(listing_headers)
                response = session.get(target_url, timeout=20, allow_redirects=True)  # Increased timeout
                response.raise_for_status()
                
                logger.info(f"Successfully fetched page, status: {response.status_code}, content length: {len(response.content)} bytes")
                
                # Check for JavaScript challenge pages and common blocks
                content_lower = response.text.lower()
                if any(indicator in content_lower for indicator in ['incapsula', 'blocked', 'security check', 'please wait', 'checking your browser']):
                    # Try to handle simple JavaScript challenges
                    if 'please wait' in content_lower and len(response.text) < 2000:
                        logger.info("Detected JavaScript challenge, waiting and retrying...")
                        time.sleep(5)  # Wait for JS challenge timeout
                        
                        # Retry the request with challenge cookies
                        retry_response = session.get(target_url, timeout=20, allow_redirects=True)
                        if retry_response.status_code == 200 and len(retry_response.text) > 2000:
                            logger.info("Successfully passed JavaScript challenge")
                            response = retry_response
                        else:
                            logger.warning("JavaScript challenge retry failed")
                
                break  # Success, exit retry loop
                
            except requests.RequestException as e:
                logger.warning(f"Scraping attempt failed: {str(e)}")
                # Single attempt failed - provide immediate guidance
                if is_realtor_ca:
                    raise Exception(f'Realtor.ca is blocking automated requests. This is common due to their anti-bot protection.\n\nTry these alternatives:\n1. Copy the property details manually from your browser\n2. Try again in 30-60 minutes\n3. Use the mobile version: m.realtor.ca\n4. Use a different internet connection')
                else:
                    raise Exception(f'Unable to access the listing URL. The website may be temporarily unavailable or blocking automated requests. Please try again later or manually enter the property details.')
        
        # If we get here, we have a successful response
        if not response:
            raise Exception(f'Unable to access the listing URL. Please try again later or manually enter the property details.')
        
        # Quick validation - if response is suspiciously small, it's likely blocked
        content_size = len(response.content)
        if is_realtor_ca and content_size < 10000:  # Lowered threshold for faster failure
            logger.warning(f"Realtor.ca response too small ({content_size} bytes) - likely blocked")
            raise Exception(f"Realtor.ca blocked this request (response: {content_size} bytes).\n\n💡 Manual workaround:\n1. Open the listing URL in your browser\n2. Copy the address, price, beds, baths, sqft\n3. Manually paste the details into the form")
        elif not is_realtor_ca and content_size < 3000:  # Lowered threshold
            logger.warning(f"Response too small ({content_size} bytes) - likely blocked")
            raise Exception(f"The website blocked this request (response: {content_size} bytes). Please manually enter the property details.")
            
        soup = BeautifulSoup(response.content, 'lxml')
        logger.info(f"Successfully parsed HTML content ({len(response.content)} bytes)")
        
        # Debug: Check if we got blocked by anti-bot protection
        page_text = soup.get_text().lower()
        blocking_keywords = ['blocked', 'incapsula', 'access denied', 'cloudflare', 'captcha', 'robot', 'automated', 'request unsuccessful', 'incident id']
        
        for keyword in blocking_keywords:
            if keyword in page_text:
                logger.warning(f"Detected bot blocking keyword '{keyword}' in page content")
                
                # Provide specific error messages based on blocking type
                if 'incapsula' in page_text:
                    raise Exception(f"Realtor.ca is currently blocking automated requests with Incapsula protection. This is common for security reasons. Please wait 10-15 minutes and try again, or manually copy the property details from your browser.")
                elif 'cloudflare' in page_text:
                    raise Exception(f"The website is protected by Cloudflare security. Please wait a few minutes and try again, or manually enter the property details.")
                elif 'captcha' in page_text:
                    raise Exception(f"The website requires CAPTCHA verification. Please visit the listing in your browser first, then manually enter the property details.")
                else:
                    raise Exception(f"The website's security system is currently blocking automated requests. This is common with real estate websites to prevent bot traffic. Please try again in 10-15 minutes, or manually enter the property details.")
        
        # Extract data based on common selectors with error handling
        scraped_data = {}
        
        try:
            scraped_data['images'] = self._extract_images(soup, url)
        except Exception as e:
            print(f"Error extracting images: {e}")
            scraped_data['images'] = None
            
        try:
            scraped_data['address'] = self._extract_address(soup)
        except Exception as e:
            print(f"Error extracting address: {e}")
            scraped_data['address'] = None
            
        try:
            scraped_data['price'] = self._extract_price(soup)
        except Exception as e:
            print(f"Error extracting price: {e}")
            scraped_data['price'] = None
            
        try:
            scraped_data['beds'] = self._extract_beds(soup)
        except Exception as e:
            print(f"Error extracting beds: {e}")
            scraped_data['beds'] = None
            
        try:
            scraped_data['baths'] = self._extract_baths(soup)
        except Exception as e:
            print(f"Error extracting baths: {e}")
            scraped_data['baths'] = None
            
        try:
            scraped_data['sqft'] = self._extract_sqft(soup)
        except Exception as e:
            print(f"Error extracting sqft: {e}")
            scraped_data['sqft'] = None
            
        try:
            scraped_data['description'] = self._extract_description(soup)
        except Exception as e:
            print(f"Error extracting description: {e}")
            scraped_data['description'] = None
        
        # Remove None values
        scraped_data = {k: v for k, v in scraped_data.items() if v is not None}
        
        # AI analysis is now handled separately via /analyze endpoint
        # This keeps scraping fast and reliable
        disable_ai_during_scraping = True
        
        if False:  # Disabled - AI analysis moved to separate endpoint
            try:
                logger.info("Starting AI analysis of scraped property data")
                analyzer = get_ai_analyzer()
                
                # Limit images for memory efficiency
                images = scraped_data.get('images', [])[:3]  # Only use first 3 images
                
                # Prepare data for AI analysis
                ai_input_data = {
                    'address': scraped_data.get('address', 'Unknown address'),
                    'price': scraped_data.get('price'),
                    'beds': scraped_data.get('beds'),
                    'baths': scraped_data.get('baths'),
                    'sqft': scraped_data.get('sqft'),
                    'imageUrls': images,
                    'description': scraped_data.get('description', 'No description extracted from listing')
                }
                
                # Perform AI analysis
                ai_analysis = analyzer.analyze_property_comprehensive(ai_input_data)
                
                # Add AI analysis to scraped data
                scraped_data['ai_analysis'] = ai_analysis
                
                logger.info(f"AI analysis completed with grade: {ai_analysis.get('overall_grade', 'Unknown')}")
                
            except Exception as e:
                logger.error(f"AI analysis failed during scraping: {e}")
                # Don't fail the scraping if AI analysis fails
                scraped_data['ai_analysis'] = {
                    'error': f"AI analysis failed: {str(e)}",
                    'analysis_summary': 'AI analysis could not be completed'
                }
        else:
            if disable_ai_during_scraping:
                logger.info("AI analysis disabled during scraping to prevent memory issues")
            else:
                logger.info("No images available for AI analysis")
        
        return scraped_data

    def _scrape_zealty(self, url, session):
        """Special scraping method for Zealty.ca listings that extract data from JavaScript variables."""
        import re
        from bs4 import BeautifulSoup
        
        try:
            logger.info(f"Scraping Zealty.ca listing: {url}")
            
            # Configure session with realistic headers
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
            
            session.headers.update(headers)
            response = session.get(url, timeout=15, allow_redirects=True)
            response.raise_for_status()
            
            logger.info(f"Successfully fetched Zealty.ca page, content length: {len(response.content)} bytes")
            
            content = response.text
            
            # Extract gData variable which contains tab-delimited property data
            gdata_pattern = r'var gData = "([^"]+)"'
            gdata_match = re.search(gdata_pattern, content)
            
            if not gdata_match:
                raise Exception("Could not find property data in Zealty.ca listing. The page structure may have changed.")
            
            gdata = gdata_match.group(1)
            fields = gdata.split('\t')
            
            if len(fields) < 15:
                raise Exception("Zealty.ca property data format appears to have changed.")
            
            logger.info(f"Successfully extracted Zealty.ca data with {len(fields)} fields")
            
            # Extract data from known field positions
            scraped_data = {}
            
            # Address (Field 5) - combine with building name if available
            address = fields[5] if len(fields) > 5 else None
            building = fields[4] if len(fields) > 4 and fields[4] else None
            if address:
                # Add city from field 36 if available
                city = fields[36] if len(fields) > 36 and fields[36] else None
                if city:
                    full_address = f"{address}, {city}"
                else:
                    full_address = address
                scraped_data['address'] = full_address
                logger.info(f"Extracted address: {full_address}")
            
            # Price (Field 7) - multiply by 1000 since it's in thousands
            price_str = fields[7] if len(fields) > 7 else None
            if price_str:
                try:
                    price = float(price_str) * 1000  # Convert from thousands to actual price
                    scraped_data['price'] = int(price)
                    logger.info(f"Extracted price: ${int(price):,}")
                except ValueError:
                    pass
            
            # Bedrooms (Field 12)
            beds_str = fields[12] if len(fields) > 12 else None
            if beds_str and beds_str.isdigit():
                scraped_data['beds'] = int(beds_str)
                logger.info(f"Extracted bedrooms: {beds_str}")
            
            # Bathrooms (Field 13) 
            baths_str = fields[13] if len(fields) > 13 else None
            if baths_str and baths_str.replace('.', '').isdigit():
                scraped_data['baths'] = float(baths_str)
                logger.info(f"Extracted bathrooms: {baths_str}")
            
            # Square footage (Field 14)
            sqft_str = fields[14] if len(fields) > 14 else None
            if sqft_str and sqft_str.isdigit():
                scraped_data['sqft'] = int(sqft_str)
                logger.info(f"Extracted square footage: {sqft_str}")
            
            # Description (Field 8) - the long description text
            description_str = fields[8] if len(fields) > 8 else None
            if description_str and len(description_str.strip()) > 20:
                # Clean up the description text
                cleaned_description = ' '.join(description_str.split())
                scraped_data['description'] = cleaned_description
                logger.info(f"Extracted description: {len(cleaned_description)} characters")
            
            # Images (Field 138) - pipe-delimited URLs
            if len(fields) > 138 and fields[138]:
                raw_image_urls = [url.strip() for url in fields[138].split('|') if url.strip()]
                if raw_image_urls:
                    # Validate and optimize images for consistent sizing
                    optimized_images = self._validate_and_optimize_images(raw_image_urls)
                    scraped_data['images'] = optimized_images
                    logger.info(f"Extracted {len(raw_image_urls)} images, optimized {len(optimized_images)}")
            
            # AI analysis is now handled separately via /analyze endpoint
            if False:  # Disabled - moved to separate endpoint
                try:
                    logger.info("Starting AI analysis of scraped Zealty.ca property data")
                    analyzer = get_ai_analyzer()
                    
                    # Prepare data for AI analysis
                    ai_input_data = {
                        'address': scraped_data.get('address', 'Unknown address'),
                        'price': scraped_data.get('price'),
                        'beds': scraped_data.get('beds'),
                        'baths': scraped_data.get('baths'),
                        'sqft': scraped_data.get('sqft'),
                        'imageUrls': scraped_data.get('images', []),
                        'description': scraped_data.get('description', 'No description available')
                    }
                    
                    # Run AI analysis with batching support for all images
                    ai_result = analyzer.analyze_property_comprehensive(ai_input_data)
                    
                    if ai_result and not ai_result.get('error'):
                        logger.info("AI analysis completed successfully for Zealty.ca listing")
                        # Add AI analysis fields to scraped_data
                        scraped_data['ai_analysis'] = ai_result
                    else:
                        logger.warning(f"AI analysis failed: {ai_result.get('error', 'Unknown error') if ai_result else 'No result returned'}")
                        
                except Exception as e:
                    logger.error(f"AI analysis error: {str(e)}")
                    # Continue without AI analysis
                    scraped_data.update({
                        'error': f"AI analysis failed: {str(e)}",
                        'analysis_summary': 'AI analysis could not be completed'
                    })
            else:
                logger.info("No images available for AI analysis")
            
            logger.info(f"Zealty.ca scraping completed successfully with {len(scraped_data)} data fields")
            return scraped_data
            
        except Exception as e:
            logger.error(f"Zealty.ca scraping failed: {str(e)}")
            raise Exception(f'Failed to extract data from Zealty.ca listing: {str(e)}\n\n💡 Manual workaround:\n1. Open the listing URL in your browser: {url}\n2. Copy the address, price, beds, baths, and sq ft\n3. Paste the details into the form manually\n4. For images, right-click on property photos and copy image URLs')

    def _extract_images(self, soup, base_url):
        """Extract property images from various selectors with size validation."""
        image_urls = []
        
        # Check if this is a Redfin listing
        is_redfin = 'redfin.ca' in base_url or 'redfin.com' in base_url
        
        if is_redfin:
            # Redfin-specific extraction using meta tags (most reliable)
            logger.info("Detected Redfin listing, using meta tag extraction")
            meta_images = self._extract_redfin_images_from_meta(soup)
            if meta_images:
                # Validate and potentially resize Redfin images
                validated_images = self._validate_and_optimize_images(meta_images)
                image_urls.extend(validated_images)
                logger.info(f"Found {len(validated_images)} validated Redfin images")
                # If we have a good number of meta images, return them
                if len(validated_images) >= 10:
                    logger.info(f"Got {len(validated_images)} images, sufficient for analysis")
                    return validated_images[:20] if validated_images else None  # Reduced from 50 to 20
                else:
                    logger.info(f"Only got {len(validated_images)} images, will try additional methods")
        
        # Common selectors for property images
        selectors = [
            # Redfin selectors
            'img[src*="ssl.cdn-redfin.com"]',
            'img[src*="photo"]',
            # Realtor.ca selectors (most specific first)
            '.gridViewListingImage',
            '.topGridViewListingImage', 
            '#heroImage',
            '.imageGridCon img',
            '.carousel img',
            '.photo-carousel img',
            '.listing-photos img',
            # Generic selectors
            '.property-photos img',
            '.listing-gallery img',
            '.image-gallery img',
            '.photos img',
            '.gallery img',
            # MLS selectors
            '.mls-photos img',
            '.property-images img',
            # Fallback selectors
            'img[src*="cdn.realtor.ca"]',
            'img[src*="image"]',
            'img[alt*="property"]',
            'img[alt*="listing"]',
        ]
        
        raw_urls = []
        for selector in selectors:
            images = soup.select(selector)
            if images:
                for img in images:
                    src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
                    if src:
                        # Convert relative URLs to absolute
                        full_url = urljoin(base_url, src)
                        if self._is_valid_image_url(full_url):
                            if full_url not in raw_urls:
                                raw_urls.append(full_url)
        
        # Validate and optimize all found images
        validated_images = self._validate_and_optimize_images(raw_urls)
        image_urls.extend(validated_images)
        
        logger.info(f"Total images found: {len(raw_urls)}, validated: {len(validated_images)}")
        # Return up to 20 images for memory efficiency
        return image_urls[:20] if image_urls else None

    def _extract_redfin_images_from_meta(self, soup):
        """Extract Redfin images from meta tags - more reliable method."""
        image_urls = []
        
        # Redfin stores image URLs in twitter meta tags - check more thoroughly
        meta_selectors = []
        # Generate selectors for up to 50 images (some listings have 30+ images)
        for i in range(50):
            meta_selectors.append(f'meta[name="twitter:image:photo{i}"]')
        
        # Also check for other possible meta tag formats
        meta_selectors.extend([
            'meta[property="twitter:image:photo0"]',
            'meta[property="twitter:image:photo1"]',
            'meta[property="twitter:image:photo2"]',
            'meta[property="twitter:image:photo3"]',
            'meta[property="twitter:image:photo4"]',
            'meta[property="og:image"]'
        ])
        
        for selector in meta_selectors:
            meta_tag = soup.select_one(selector)
            if meta_tag:
                content = meta_tag.get('content')
                if content and self._is_valid_image_url(content):
                    # Use original URL from meta tags (guaranteed to work)
                    high_quality_url = self._get_best_redfin_image_url(content)
                    image_urls.append(high_quality_url)
        
        return image_urls

    def _get_best_redfin_image_url(self, original_url):
        """
        Get the best Redfin image URL. For now, use original URLs to avoid 404s.
        Redfin's meta tag URLs are already good quality.
        """
        if not original_url:
            return original_url
            
        # Use the original URL from meta tags - these are already decent quality and guaranteed to exist
        return original_url

    def _extract_address(self, soup):
        """Extract property address."""
        # Check if this is a Redfin listing - use meta tag extraction first
        street = soup.select_one('meta[name="twitter:text:street_address"]')
        city = soup.select_one('meta[name="twitter:text:city"]')
        state = soup.select_one('meta[name="twitter:text:state_code"]')
        
        if street and city:
            street_val = street.get('content', '').strip()
            city_val = city.get('content', '').strip()
            state_val = state.get('content', '').strip() if state else ''
            
            if street_val and city_val:
                # Build Redfin address
                address_parts = [street_val, city_val]
                if state_val:
                    address_parts.append(state_val)
                address = ', '.join(address_parts)
                logger.info(f"Extracted address from Redfin meta tags")
                return address
        
        # Fallback to HTML selectors
        selectors = [
            # Realtor.ca specific - often in h1 tag
            'h1',
            '.listing-address',
            '.property-address', 
            'h1.address',
            '.address',
            '[data-testid="property-address"]',
            '.listing-title',
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                address = element.get_text(strip=True)
                # Clean up address text (remove extra whitespace, postal codes for first line)
                if address and len(address) > 10:
                    # For Realtor.ca, take first line if multi-line address
                    address_lines = address.split('\n')
                    if len(address_lines) > 1:
                        # Take the first line (street address)
                        address = address_lines[0].strip()
                    return address
        return None

    def _extract_price(self, soup):
        """Extract property price."""
        # Check for Redfin meta tag first
        price_meta = soup.select_one('meta[name="twitter:text:price"]')
        if price_meta:
            price_text = price_meta.get('content', '').strip()
            if price_text:
                price = self._parse_canadian_price(price_text)
                if price:
                    logger.info("Extracted price from Redfin meta tags")
                    return price
        
        # Fallback to HTML selectors
        selectors = [
            # Realtor.ca specific
            '#listingPriceValue',
            '.listingPriceAlongSidePublicOffer',
            # Generic selectors
            '.price',
            '.listing-price',
            '.property-price',
            '[data-testid="property-price"]',
            '.price-value',
            '.current-price',
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                price_text = element.get_text(strip=True)
                price = self._parse_canadian_price(price_text)
                if price:
                    return price
        return None

    def _extract_beds(self, soup):
        """Extract number of bedrooms."""
        # Check for Redfin meta tag first
        beds_meta = soup.select_one('meta[name="twitter:text:beds"]')
        if beds_meta:
            beds_text = beds_meta.get('content', '').strip()
            if beds_text:
                beds = self._parse_integer(beds_text)
                if beds is not None:
                    return beds
        
        # For Realtor.ca, look for bed icon and extract number from container
        bed_img = soup.select_one('img[src*="bed-gray.svg"]')
        if bed_img:
            # Try parent element text - should contain the number
            parent = bed_img.parent
            if parent:
                beds_text = parent.get_text(strip=True)
                # Look for the first number in the text (before "Bedrooms")
                number_match = re.search(r'(\d+)', beds_text)
                if number_match:
                    beds = self._parse_integer(number_match.group(1))
                    if beds is not None:
                        return beds
            
            # Try getting next text node
            next_element = bed_img.next_sibling
            if next_element and hasattr(next_element, 'strip'):
                beds = self._parse_integer(next_element.strip())
                if beds is not None:
                    return beds
        
        # Fallback to generic selectors
        selectors = [
            '.beds',
            '.bedrooms',
            '[data-testid="property-beds"]',
            '.bed-count',
            '.bedroom-count',
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                beds_text = element.get_text(strip=True)
                beds = self._parse_integer(beds_text)
                if beds is not None:
                    return beds
        
        # Try text patterns
        text_patterns = [
            r'(\d+)\s*bed',
            r'(\d+)\s*br',
            r'(\d+)\s*bedroom',
        ]
        
        page_text = soup.get_text().lower()
        for pattern in text_patterns:
            match = re.search(pattern, page_text, re.IGNORECASE)
            if match:
                beds = self._parse_integer(match.group(1))
                if beds is not None:
                    return beds
        
        return None

    def _extract_baths(self, soup):
        """Extract number of bathrooms."""
        # Check for Redfin meta tag first
        baths_meta = soup.select_one('meta[name="twitter:text:baths"]')
        if baths_meta:
            baths_text = baths_meta.get('content', '').strip()
            if baths_text:
                baths = self._parse_decimal(baths_text)
                if baths is not None:
                    return baths
        
        # For Realtor.ca, look for bath icon and extract number from container
        bath_img = soup.select_one('img[src*="bath-gray.svg"]')
        if bath_img:
            # Try parent element text - should contain the number
            parent = bath_img.parent
            if parent:
                baths_text = parent.get_text(strip=True)
                # Look for the first number in the text (before "Bathrooms")
                number_match = re.search(r'(\d+(?:\.\d+)?)', baths_text)
                if number_match:
                    baths = self._parse_decimal(number_match.group(1))
                    if baths is not None:
                        return baths
            
            # Try getting next text node
            next_element = bath_img.next_sibling
            if next_element and hasattr(next_element, 'strip'):
                baths = self._parse_decimal(next_element.strip())
                if baths is not None:
                    return baths
        
        # Fallback to generic selectors
        selectors = [
            '.baths',
            '.bathrooms',
            '[data-testid="property-baths"]',
            '.bath-count',
            '.bathroom-count',
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                baths_text = element.get_text(strip=True)
                baths = self._parse_decimal(baths_text)
                if baths is not None:
                    return baths
        
        text_patterns = [
            r'(\d+(?:\.\d+)?)\s*bath',
            r'(\d+(?:\.\d+)?)\s*ba',
            r'(\d+(?:\.\d+)?)\s*bathroom',
        ]
        
        page_text = soup.get_text().lower()
        for pattern in text_patterns:
            match = re.search(pattern, page_text, re.IGNORECASE)
            if match:
                baths = self._parse_decimal(match.group(1))
                if baths is not None:
                    return baths
        
        return None

    def _extract_sqft(self, soup):
        """Extract square footage."""
        # Check for Redfin meta tag first
        sqft_meta = soup.select_one('meta[name="twitter:text:sqft"]')
        if sqft_meta:
            sqft_text = sqft_meta.get('content', '').strip()
            if sqft_text:
                sqft = self._parse_sqft(sqft_text)
                if sqft is not None:
                    return sqft
        
        # For Realtor.ca, look for square footage icon and extract number from container
        sqft_img = soup.select_one('img[src*="square_footage-gray.svg"]')
        if sqft_img:
            # Try parent element text - should contain the number
            parent = sqft_img.parent
            if parent:
                sqft_text = parent.get_text(strip=True)
                # Look for the first number in the text (before any label)
                number_match = re.search(r'(\d+(?:,\d+)?)', sqft_text)
                if number_match:
                    sqft_value = number_match.group(1).replace(',', '')
                    sqft = self._parse_sqft(sqft_value)
                    if sqft is not None:
                        return sqft
            
            # Try getting next text node
            next_element = sqft_img.next_sibling
            if next_element and hasattr(next_element, 'strip'):
                sqft = self._parse_sqft(next_element.strip())
                if sqft is not None:
                    return sqft
        
        # Fallback to generic selectors
        selectors = [
            '.sqft',
            '.square-feet',
            '[data-testid="property-sqft"]',
            '.size',
            '.living-area',
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                sqft_text = element.get_text(strip=True)
                sqft = self._parse_sqft(sqft_text)
                if sqft is not None:
                    return sqft
        
        text_patterns = [
            r'(\d+(?:,\d+)?)\s*sq\.?\s*ft',
            r'(\d+(?:,\d+)?)\s*sqft',
            r'(\d+(?:,\d+)?)\s*square\s*feet',
        ]
        
        page_text = soup.get_text().lower()
        for pattern in text_patterns:
            match = re.search(pattern, page_text, re.IGNORECASE)
            if match:
                sqft_text = match.group(1).replace(',', '')
                sqft = self._parse_sqft(sqft_text)
                if sqft is not None:
                    return sqft
        
        return None

    def _is_valid_image_url(self, url):
        """Check if URL appears to be a valid image."""
        if not url:
            return False
            
        # Skip data URLs, very small images, thumbnails, icons, UI elements
        if (url.startswith('data:') or 
            'thumb' in url.lower() or 
            'icon' in url.lower() or
            'logo' in url.lower() or
            'arrow' in url.lower() or
            'profile' in url.lower() or
            'heart' in url.lower() or
            'search' in url.lower() or
            'badge' in url.lower() or  # App download badges
            'flag' in url.lower() or   # Country flags
            'footer' in url.lower() or # Footer images
            'header' in url.lower() or # Header images
            'button' in url.lower() or # Button images
            'vlatesT' in url or        # Redfin UI assets path
            url.endswith('.svg') or
            '50x50' in url or '100x100' in url or
            '284x84' in url):          # Common app badge size
            return False
            
        # Prioritize known real estate image CDNs
        cdn_domains = ['cdn.realtor.ca', 'photos.zillowstatic.com', 'ap.rdcpix.com', 'ssl.cdn-redfin.com']
        if any(domain in url.lower() for domain in cdn_domains):
            return True
            
        # Check for image extensions or image-related paths
        image_indicators = ['.jpg', '.jpeg', '.png', '.webp', '/photo/', '/image/', '/pic/']
        return any(indicator in url.lower() for indicator in image_indicators)
    
    def _validate_and_optimize_images(self, image_urls):
        """Validate image URLs and optimize them for consistent sizing to prevent memory issues."""
        if not image_urls:
            return []
        
        optimized_urls = []
        for url in image_urls:
            try:
                # For major real estate sites, try to get optimized/resized versions
                optimized_url = self._get_optimized_image_url(url)
                if optimized_url:
                    optimized_urls.append(optimized_url)
                else:
                    # Keep original if optimization fails
                    optimized_urls.append(url)
            except Exception as e:
                logger.warning(f"Failed to optimize image URL {url}: {e}")
                # Keep original URL if optimization fails
                optimized_urls.append(url)
        
        return optimized_urls
    
    def _get_optimized_image_url(self, original_url):
        """Get optimized/resized version of image URL for consistent sizing."""
        if not original_url:
            return original_url
        
        # Redfin images - use medium size (512px width)
        if 'ssl.cdn-redfin.com' in original_url:
            # Replace size parameters with medium size for consistency
            # Pattern: /genMid.1234_5.jpg -> /genMid.1234_5.jpg (already good size)
            # Pattern: /genHiRes.1234_5.jpg -> /genMid.1234_5.jpg
            if '/genHiRes.' in original_url:
                optimized_url = original_url.replace('/genHiRes.', '/genMid.')
                logger.debug(f"Optimized Redfin URL: {original_url} -> {optimized_url}")
                return optimized_url
            # Keep genMid and genLowRes as they are reasonable sizes
            return original_url
        
        # Realtor.ca images - use medium size
        elif 'cdn.realtor.ca' in original_url:
            # Realtor.ca uses size parameters like: ?w=1024&h=768&fit=crop
            # Replace with consistent medium size
            if '?' in original_url:
                base_url = original_url.split('?')[0]
                optimized_url = f"{base_url}?w=512&h=384&fit=crop&quality=80"
                logger.debug(f"Optimized Realtor.ca URL: {original_url} -> {optimized_url}")
                return optimized_url
            else:
                # Add size parameters if none exist
                optimized_url = f"{original_url}?w=512&h=384&fit=crop&quality=80"
                return optimized_url
        
        # Zealty.ca and other sites - try to append size parameters
        elif any(domain in original_url for domain in ['zealty.ca', 'housesigma.com']):
            # These sites might support size parameters
            if '?' in original_url:
                # Check if size params already exist
                if not any(param in original_url for param in ['w=', 'width=', 'size=']):
                    optimized_url = f"{original_url}&w=512&h=384"
                    return optimized_url
            else:
                optimized_url = f"{original_url}?w=512&h=384"
                return optimized_url
        
        # For other domains, return original URL
        # The analyzer will still resize during download if needed
        return original_url
    
    @action(detail=True, methods=['post'])
    def analyze_with_ai(self, request, pk=None):
        """
        Run AI analysis for a specific property (separated from scraping for better reliability)
        """
        try:
            property_instance = self.get_object()
            
            # Check if property has images
            if not property_instance.image_urls or len(property_instance.image_urls) == 0:
                return Response(
                    {'error': 'Property must have images for AI analysis'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"AI analysis triggered for property {property_instance.id} with {len(property_instance.image_urls)} images")
            
            # Get AI analyzer
            analyzer = get_ai_analyzer()
            
            # Prepare data for AI analysis
            ai_input_data = {
                'address': property_instance.address,
                'price': float(property_instance.price) if property_instance.price else None,
                'imageUrls': property_instance.image_urls,
                'description': property_instance.notes or '',
                'beds': property_instance.beds,
                'baths': property_instance.baths,
                'sqft': property_instance.sqft
            }
            
            # Run AI analysis with improved error handling
            ai_analysis = analyzer.analyze_property_comprehensive(ai_input_data)
            
            if ai_analysis and not ai_analysis.get('error'):
                # Save AI analysis to property
                property_instance.ai_analysis = ai_analysis
                property_instance.ai_overall_grade = ai_analysis.get('overall_grade')
                property_instance.ai_red_flags = ai_analysis.get('red_flags', [])
                property_instance.ai_positive_indicators = ai_analysis.get('positive_indicators', [])
                property_instance.ai_price_assessment = ai_analysis.get('price_assessment')
                property_instance.ai_buyer_recommendation = ai_analysis.get('buyer_recommendation')
                property_instance.ai_confidence_score = ai_analysis.get('confidence_score')
                property_instance.ai_analysis_summary = ai_analysis.get('analysis_summary')
                property_instance.ai_analysis_date = timezone.now()
                
                property_instance.save()
                
                logger.info(f"AI analysis completed and saved for property {property_instance.id} - Grade: {ai_analysis.get('overall_grade')}")
                
                # Return updated property data
                serializer = self.get_serializer(property_instance)
                return Response({
                    'success': True,
                    'message': f'AI analysis completed with grade {ai_analysis.get("overall_grade")}',
                    'analysis': {
                        'overall_grade': ai_analysis.get('overall_grade'),
                        'confidence_score': ai_analysis.get('confidence_score'),
                        'analysis_summary': ai_analysis.get('analysis_summary'),
                        'red_flags_count': len(ai_analysis.get('red_flags', [])),
                        'positive_indicators_count': len(ai_analysis.get('positive_indicators', []))
                    },
                    'property': serializer.data
                })
            else:
                logger.error(f"AI analysis failed for property {property_instance.id}: {ai_analysis}")
                return Response(
                    {
                        'error': 'AI analysis failed or returned empty results',
                        'details': ai_analysis.get('error') if ai_analysis else 'No analysis result returned'
                    }, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"AI analysis failed for property {pk}: {e}", exc_info=True)
            return Response(
                {'error': f'AI analysis failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def analyze_property_data(self, request):
        """
        Run AI analysis on property data without saving the property first.
        Used for preview analysis before saving.
        """
        try:
            # Get property data from request
            property_data = request.data
            
            # Validate required fields
            required_fields = ['address', 'imageUrls']
            for field in required_fields:
                if not property_data.get(field):
                    return Response(
                        {'error': f'{field} is required for AI analysis'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            image_urls = property_data.get('imageUrls', [])
            if not image_urls or len(image_urls) == 0:
                return Response(
                    {'error': 'Property must have images for AI analysis'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"AI analysis triggered for property data with {len(image_urls)} images")
            
            # Get AI analyzer
            analyzer = get_ai_analyzer()
            
            # Prepare data for AI analysis
            ai_input_data = {
                'address': property_data.get('address'),
                'price': float(property_data['price']) if property_data.get('price') else None,
                'imageUrls': image_urls,
                'description': property_data.get('notes', ''),
                'beds': int(property_data['beds']) if property_data.get('beds') else None,
                'baths': float(property_data['baths']) if property_data.get('baths') else None,
                'sqft': int(property_data['sqft']) if property_data.get('sqft') else None
            }
            
            # Run AI analysis
            ai_analysis = analyzer.analyze_property_comprehensive(ai_input_data)
            
            if ai_analysis and not ai_analysis.get('error'):
                logger.info(f"AI analysis completed with grade: {ai_analysis.get('overall_grade')}")
                
                # Return analysis results without saving
                return Response({
                    'success': True,
                    'message': f'AI analysis completed with grade {ai_analysis.get("overall_grade")}',
                    'analysis': ai_analysis
                })
            else:
                logger.error(f"AI analysis failed: {ai_analysis}")
                return Response(
                    {
                        'error': 'AI analysis failed or returned empty results',
                        'details': ai_analysis.get('error') if ai_analysis else 'No analysis result returned'
                    }, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"AI analysis failed: {e}", exc_info=True)
            return Response(
                {'error': f'AI analysis failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CriterionViewSet(viewsets.ModelViewSet):
    """API endpoint for criteria."""
    serializer_class = CriterionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return only criteria owned by the current user."""
        return Criterion.objects.filter(owner=self.request.user).order_by('type', 'text')

    def perform_create(self, serializer):
        """Set the owner to the current user when creating a criterion."""
        serializer.save(owner=self.request.user)

class RatingViewSet(viewsets.ModelViewSet):
    """API endpoint for ratings."""
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return only ratings for properties owned by the current user."""
        return Rating.objects.filter(property__owner=self.request.user)


# Health Check Views
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes

class HealthCheckView(APIView):
    """
    Health check endpoint for monitoring system status
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Return system health status"""
        try:
            health_data = get_health_status()
            status_code = status.HTTP_200_OK
            
            if health_data['status'] == 'unhealthy':
                status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            elif health_data['status'] == 'degraded':
                status_code = status.HTTP_200_OK  # Still operational
                
            return Response(health_data, status=status_code)
        except Exception as e:
            return Response({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': __import__('datetime').datetime.now().isoformat()
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

# Simple CORS test endpoint
@api_view(['GET', 'POST', 'OPTIONS'])
@permission_classes([AllowAny])
def cors_test(request):
    """Simple endpoint to test CORS configuration"""
    return Response({
        'message': 'CORS is working',
        'method': request.method,
        'origin': request.META.get('HTTP_ORIGIN', 'No origin header'),
        'user_agent': request.META.get('HTTP_USER_AGENT', 'No user agent')
    })