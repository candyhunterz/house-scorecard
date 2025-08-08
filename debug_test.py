#!/usr/bin/env python3
"""
Debug test to check if AI analysis is working in scraping
"""
import os
import sys
import django

# Add the project directory to the path
project_path = r'C:\Users\nkngu\Desktop\apps\house-scorecard\house-scorecard-backend'
sys.path.insert(0, project_path)

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'scorecard_project.settings')

# Setup Django
django.setup()

from core.views import PropertyViewSet

def test_scraping():
    """Test the scraping functionality"""
    viewset = PropertyViewSet()
    
    # Test URL - use a simple real estate URL
    test_url = "https://zealty.ca/mls-R3034722/210-15150-29A-AVENUE-Surrey-BC/"  # Example from previous conversation
    
    print(f"Testing scraping for URL: {test_url}")
    
    try:
        result = viewset._scrape_property_listing(test_url)
        print("Scraping result:")
        print(f"- Address: {result.get('address')}")
        print(f"- Price: {result.get('price')}")
        print(f"- Images: {len(result.get('images', []))} found")
        print(f"- AI Analysis: {'YES' if result.get('ai_analysis') else 'NO'}")
        
        if result.get('ai_analysis'):
            ai_analysis = result['ai_analysis']
            print(f"- AI Grade: {ai_analysis.get('overall_grade')}")
            print(f"- Red Flags: {len(ai_analysis.get('red_flags', []))}")
            print(f"- Confidence: {ai_analysis.get('confidence_score')}")
        
        return result
        
    except Exception as e:
        print(f"Scraping failed: {e}")
        return None

if __name__ == "__main__":
    test_scraping()