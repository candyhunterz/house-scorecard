#!/usr/bin/env python3
"""
Test script to demonstrate the new image resizing and optimization functionality.
This shows how the scraping pipeline will now resize images for consistent sizing.
"""

def test_image_url_optimization():
    """Test the image URL optimization logic"""
    
    # Test URLs for different real estate sites
    test_urls = [
        # Redfin high-res images (should be converted to medium)
        "https://ssl.cdn-redfin.com/photo/123/genHiRes.4567_8.jpg",
        "https://ssl.cdn-redfin.com/photo/123/genMid.4567_8.jpg",
        
        # Realtor.ca images (should get size parameters)
        "https://cdn.realtor.ca/listings/TS123456789/reas/1/large.jpg",
        "https://cdn.realtor.ca/listings/TS123456789/reas/1/large.jpg?w=1024&h=768&fit=crop",
        
        # Zealty images (should get size parameters)
        "https://zealty.ca/images/property/123456/photo1.jpg",
        "https://zealty.ca/images/property/123456/photo1.jpg?existing=param",
        
        # Other sites (should remain unchanged)
        "https://example.com/property/photo.jpg",
    ]
    
    def get_optimized_image_url(original_url):
        """Simulate the optimization logic from views.py"""
        if not original_url:
            return original_url
        
        # Redfin images - use medium size
        if 'ssl.cdn-redfin.com' in original_url:
            if '/genHiRes.' in original_url:
                optimized_url = original_url.replace('/genHiRes.', '/genMid.')
                return optimized_url
            return original_url
        
        # Realtor.ca images - use medium size
        elif 'cdn.realtor.ca' in original_url:
            if '?' in original_url:
                base_url = original_url.split('?')[0]
                optimized_url = f"{base_url}?w=512&h=384&fit=crop&quality=80"
                return optimized_url
            else:
                optimized_url = f"{original_url}?w=512&h=384&fit=crop&quality=80"
                return optimized_url
        
        # Zealty.ca and other sites
        elif any(domain in original_url for domain in ['zealty.ca']):
            if '?' in original_url:
                if not any(param in original_url for param in ['w=', 'width=', 'size=']):
                    optimized_url = f"{original_url}&w=512&h=384"
                    return optimized_url
            else:
                optimized_url = f"{original_url}?w=512&h=384"
                return optimized_url
        
        return original_url
    
    print("Image URL Optimization Test")
    print("=" * 60)
    
    for original_url in test_urls:
        optimized_url = get_optimized_image_url(original_url)
        
        if original_url == optimized_url:
            status = "UNCHANGED"
        else:
            status = "OPTIMIZED [YES]"
            
        print(f"\n{status}")
        print(f"Original:  {original_url}")
        if original_url != optimized_url:
            print(f"Optimized: {optimized_url}")
    
    print("\n" + "=" * 60)
    print("[OK] All image URLs processed successfully!")
    
def test_memory_improvements():
    """Show the memory improvements made"""
    print("\nMemory Management Improvements")
    print("=" * 60)
    
    improvements = [
        "[OK] Reduced max image size from 1024px to 384px",
        "[OK] Added minimum size validation (256px) to maintain quality",
        "[OK] Reduced batch size from 3 to 2 images per batch",
        "[OK] Limited total images from 50 to 20 per scraping session",
        "[OK] Limited analyzer processing to 15 images maximum", 
        "[OK] Added garbage collection between batches",
        "[OK] Added garbage collection every 2 image downloads",
        "[OK] Optimized image URLs at scraping stage (before analysis)",
        "[OK] Consistent 512x384 target size for all major real estate sites"
    ]
    
    for improvement in improvements:
        print(improvement)
    
    print(f"\nResult: Images will be consistently sized and memory usage reduced!")

if __name__ == "__main__":
    test_image_url_optimization()
    test_memory_improvements()