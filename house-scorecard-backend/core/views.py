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
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import time
import random
import logging
from decimal import Decimal, InvalidOperation
from datetime import datetime
from .models import Property, Criterion, Rating
from .serializers import PropertySerializer, CriterionSerializer, RatingSerializer, UserSerializer

# Configure logger for scraping operations
logger = logging.getLogger(__name__)

class UserCreate(generics.CreateAPIView):
    queryset = User.objects.all()
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

            # Scrape the listing
            scraped_data = self._scrape_property_listing(url)
            
            return Response(scraped_data)

        except Exception as e:
            return Response(
                {'error': f'Scraping failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _scrape_property_listing(self, url):
        """
        Scrape property data from various real estate websites with advanced anti-bot protection workarounds.
        """
        # Extended list of realistic user agents from different browsers and versions
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0'
        ]
        
        base_headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'Upgrade-Insecure-Requests': '1',
            'Connection': 'keep-alive'
        }
        
        # Different header variations to try
        header_variations = [
            {
                **base_headers,
                'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
            },
            {
                **base_headers,
                'Referer': 'https://www.google.com/',
            },
            {
                **base_headers,
                'Referer': 'https://www.realtor.ca/',
            },
            base_headers  # Minimal headers
        ]
        
        # Add random delay to avoid being too predictable
        delay = random.uniform(3.0, 8.0)
        time.sleep(delay)
        
        # Advanced multi-strategy approach
        max_attempts = 5  # Increased attempts
        session = None
        response = None
        
        for attempt in range(max_attempts):
            try:
                logger.info(f"Scraping attempt {attempt + 1}/{max_attempts} for URL: {url}")
                
                # Use new session for each attempt to avoid session fingerprinting
                session = requests.Session()
                
                # Rotate user agent and headers for each attempt
                selected_user_agent = random.choice(user_agents)
                selected_headers = random.choice(header_variations).copy()
                selected_headers['User-Agent'] = selected_user_agent
                
                # Advanced browsing simulation
                if attempt >= 1:
                    # Visit homepage first to establish session
                    homepage_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}/"
                    try:
                        session.get(homepage_url, headers=selected_headers, timeout=15)
                        time.sleep(random.uniform(2.0, 4.0))
                    except:
                        logger.warning("Homepage visit failed, continuing...")
                
                if attempt >= 2:
                    # Try visiting a search page or property listings page
                    search_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}/property-search/"
                    try:
                        session.get(search_url, headers=selected_headers, timeout=15)
                        time.sleep(random.uniform(1.5, 3.0))
                    except:
                        logger.warning("Search page visit failed, continuing...")
                
                # Make the actual request
                session.headers.update(selected_headers)
                response = session.get(url, timeout=25, allow_redirects=True)
                response.raise_for_status()
                
                logger.info(f"Successfully fetched page, status: {response.status_code}, content length: {len(response.content)} bytes")
                
                # Quick check if we got meaningful content
                if len(response.content) > 10000:  # Real Realtor.ca pages are 50KB+
                    break
                else:
                    logger.warning(f"Response too small ({len(response.content)} bytes), might be blocked - retrying...")
                    if attempt < max_attempts - 1:
                        time.sleep(random.uniform(8.0, 15.0))  # Much longer wait for IP cooldown
                        continue
                
                break  # Success, exit retry loop
                
            except requests.RequestException as e:
                logger.warning(f"Scraping attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_attempts - 1:
                    wait_time = random.uniform(5.0, 12.0)  # Increased wait times
                    logger.info(f"Waiting {wait_time:.1f}s before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    # All attempts failed
                    raise Exception(f'Unable to access the listing URL after {max_attempts} attempts. The website may be temporarily unavailable or blocking automated requests. Please try again later or manually enter the property details.')
        
        # If we get here, we have a successful response
        if not response:
            raise Exception(f'Unable to access the listing URL. Please try again later or manually enter the property details.')
        
        # Final check - if all attempts resulted in small responses, we're likely blocked
        if len(response.content) < 10000:
            logger.warning(f"Final response still too small ({len(response.content)} bytes) - likely blocked by anti-bot protection")
            raise Exception(f"Realtor.ca is currently blocking automated requests. The page responses are too small ({len(response.content)} bytes), indicating anti-bot protection is active. Please wait 15-30 minutes and try again, or manually copy the property details from your browser.")
            
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
        
        # Remove None values
        scraped_data = {k: v for k, v in scraped_data.items() if v is not None}
        
        return scraped_data

    def _extract_images(self, soup, base_url):
        """Extract property images from various selectors."""
        image_urls = []
        
        # Check if this is a Redfin listing
        is_redfin = 'redfin.ca' in base_url or 'redfin.com' in base_url
        
        if is_redfin:
            # Redfin-specific extraction using meta tags (most reliable)
            logger.info("Detected Redfin listing, using meta tag extraction")
            meta_images = self._extract_redfin_images_from_meta(soup)
            if meta_images:
                image_urls.extend(meta_images)
                # For Redfin, if we got meta images, return early to avoid UI elements
                logger.info(f"Found {len(meta_images)} Redfin meta images, skipping generic selectors")
                return meta_images[:20] if meta_images else None
        
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
        
        for selector in selectors:
            images = soup.select(selector)
            if images:
                for img in images:
                    src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
                    if src:
                        # Convert relative URLs to absolute
                        full_url = urljoin(base_url, src)
                        if self._is_valid_image_url(full_url):
                            if full_url not in image_urls:
                                image_urls.append(full_url)
        
        logger.info(f"Total images found: {len(image_urls)}")
        # Limit to reasonable number of images
        return image_urls[:20] if image_urls else None

    def _extract_redfin_images_from_meta(self, soup):
        """Extract Redfin images from meta tags - more reliable method."""
        image_urls = []
        
        # Redfin stores image URLs in twitter meta tags
        meta_selectors = [
            'meta[name="twitter:image:photo0"]',
            'meta[name="twitter:image:photo1"]',
            'meta[name="twitter:image:photo2"]',
            'meta[name="twitter:image:photo3"]',
            'meta[name="twitter:image:photo4"]',
            'meta[name="twitter:image:photo5"]',
            'meta[name="twitter:image:photo6"]',
            'meta[name="twitter:image:photo7"]',
            'meta[name="twitter:image:photo8"]',
            'meta[name="twitter:image:photo9"]',
        ]
        
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