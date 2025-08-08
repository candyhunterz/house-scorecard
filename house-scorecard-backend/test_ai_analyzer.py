# test_ai_analyzer.py
import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'scorecard_project.settings')
django.setup()

def test_ai_analyzer():
    """Test the AI analyzer with mock data"""
    try:
        from core.services.gemini_analyzer import get_ai_analyzer
        
        print("Testing AI Analyzer...")
        
        # Mock property data for testing
        test_property_data = {
            'address': '123 Test Street, Toronto, ON',
            'price': 450000,
            'beds': 3,
            'baths': 2.5,
            'sqft': 1800,
            'imageUrls': [
                'https://via.placeholder.com/800x600/FF0000/FFFFFF?text=Kitchen',
                'https://via.placeholder.com/800x600/00FF00/FFFFFF?text=Living+Room',
                'https://via.placeholder.com/800x600/0000FF/FFFFFF?text=Bedroom'
            ],
            'description': 'Beautiful 3-bedroom home in great neighborhood'
        }
        
        print(f"Test Data:")
        print(f"  Address: {test_property_data['address']}")
        print(f"  Price: ${test_property_data['price']:,}")
        print(f"  Images: {len(test_property_data['imageUrls'])} test images")
        
        # Test analyzer creation
        print("\nCreating AI analyzer...")
        analyzer = get_ai_analyzer()
        print(f"  Created {type(analyzer).__name__}")
        print(f"  Model: {analyzer.model_name}")
        
        # Check if API key is configured
        if not analyzer.api_key:
            print("  WARNING: No GEMINI_API_KEY found in environment")
            print("  TIP: Set GEMINI_API_KEY environment variable to test with real API")
            return
        
        print("  API key configured")
        
        # Test analysis (will only work with real API key)
        print("\nRunning AI analysis...")
        analysis_result = analyzer.analyze_property_comprehensive(test_property_data)
        
        print(f"  Analysis completed!")
        print(f"  Overall Grade: {analysis_result.get('overall_grade', 'Unknown')}")
        print(f"  Confidence: {analysis_result.get('confidence_score', 0):.2f}")
        print(f"  Price Assessment: {analysis_result.get('price_assessment', 'Unknown')}")
        print(f"  Red Flags: {len(analysis_result.get('red_flags', []))}")
        print(f"  Positive Indicators: {len(analysis_result.get('positive_indicators', []))}")
        
        if analysis_result.get('analysis_summary'):
            print(f"  Summary: {analysis_result['analysis_summary']}")
            
        return True
        
    except Exception as e:
        print(f"ERROR: Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("House Scorecard AI Analyzer Test\n")
    
    success = test_ai_analyzer()
    
    if success:
        print("\nSUCCESS: AI Analyzer test completed successfully!")
    else:
        print("\nFAILED: AI Analyzer test failed!")
        
    print("\nNext steps:")
    print("  1. Set GEMINI_API_KEY environment variable")  
    print("  2. Test with real property listing images")
    print("  3. Try the web scraping + AI analysis endpoint")