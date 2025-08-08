# core/services/base_ai_analyzer.py
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import json
import logging

logger = logging.getLogger(__name__)

class BaseAIAnalyzer(ABC):
    """
    Abstract base class for AI property analyzers.
    Makes it easy to switch between different AI providers (Gemini, OpenAI, etc.)
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.model_name = self.get_model_name()
    
    @abstractmethod
    def get_model_name(self) -> str:
        """Return the model name for this AI provider"""
        pass
    
    @abstractmethod
    def analyze_property_comprehensive(self, property_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform comprehensive property analysis using images and text data.
        
        Args:
            property_data: Dictionary containing:
                - address: str
                - price: float
                - description: str (optional)
                - imageUrls: List[str]
                - days_on_market: int (optional)
                - beds: int (optional)
                - baths: float (optional)
                - sqft: int (optional)
        
        Returns:
            Dictionary containing:
                - overall_grade: str (A-F)
                - red_flags: List[Dict] with issue, severity, explanation
                - positive_indicators: List[str]
                - price_assessment: str (fair/high/low)
                - buyer_recommendation: str
                - confidence_score: float (0-1)
                - analysis_summary: str
        """
        pass
    
    def format_property_prompt(self, property_data: Dict[str, Any]) -> str:
        """Generate standardized prompt for property analysis"""
        address = property_data.get('address', 'Unknown')
        price = property_data.get('price')
        description = property_data.get('description', 'No description provided')
        days_on_market = property_data.get('days_on_market')
        beds = property_data.get('beds')
        baths = property_data.get('baths')
        sqft = property_data.get('sqft')
        
        price_str = f"${price:,}" if price else "Price not available"
        
        prompt = f"""Complete property assessment for: {address}

PROPERTY DETAILS:
- Address: {address}
- Price: {price_str}
- Bedrooms: {beds if beds else 'Not specified'}
- Bathrooms: {baths if baths else 'Not specified'}
- Square Feet: {f"{sqft:,} sqft" if sqft else 'Not specified'}
- Days on Market: {days_on_market if days_on_market else 'Unknown'}
- Description: {description}

ANALYSIS INSTRUCTIONS:
Analyze both the provided images AND the property description comprehensively. Cross-reference what the description claims against what you see in the images. Look across ALL images for:

RED FLAGS (assign severity: low/medium/high):
- Water damage (stains, discoloration, warping, mold signs)
- Structural issues (cracks, settling, foundation problems)
- Poor maintenance (peeling paint, damaged fixtures, worn surfaces)
- Safety concerns (exposed wiring, missing railings, trip hazards)
- Outdated systems (old electrical panels, HVAC, plumbing)
- Staging tricks hiding problems
- Quality inconsistencies between rooms
- DESCRIPTION MISMATCHES: Claims not supported by images (e.g., "renovated" but photos show outdated finishes)
- Marketing red flags in description ("cozy"=small, "potential"=needs work, "as-is"=problems, "handyman special"=major repairs)

POSITIVE INDICATORS:
- Recent renovations/updates visible in images
- Quality materials and finishes confirmed by photos
- Good maintenance throughout verified visually
- Energy efficiency features (new windows, appliances)
- Ample natural light confirmed in photos
- Good storage solutions visible
- Modern appliances/fixtures matching description claims
- DESCRIPTION CONFIRMATIONS: Claims verified by images (e.g., "hardwood floors" actually visible, "updated kitchen" confirmed)

PRICING ASSESSMENT:
- Does the condition justify the asking price?
- Are there hidden costs (major repairs needed)?
- Compare quality vs. price point
- Does description accuracy affect value? (overselling or underselling)

DESCRIPTION ANALYSIS:
- Cross-reference description claims with visual evidence
- Identify marketing language vs reality
- Note any features mentioned but not visible in photos
- Flag any discrepancies between text and images

Provide analysis in this EXACT JSON format:
{{
  "overall_grade": "A/B/C/D/F",
  "red_flags": [
    {{
      "issue": "specific problem description",
      "severity": "low/medium/high", 
      "explanation": "why this matters and potential cost",
      "rooms_affected": ["kitchen", "bathroom"]
    }}
  ],
  "positive_indicators": [
    "specific positive features noted"
  ],
  "price_assessment": "fair/high/low",
  "price_assessment_explanation": "reasoning for price assessment including description accuracy",
  "buyer_recommendation": "buy/negotiate/avoid with brief reasoning",
  "confidence_score": 0.85,
  "description_accuracy": "accurate/oversold/undersold",
  "description_verification": "key claims verified/disputed by images",
  "analysis_summary": "2-3 sentence overall assessment including description vs reality"
}}"""
        
        return prompt
    
    def validate_analysis_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize AI response"""
        default_response = {
            "overall_grade": "C",
            "red_flags": [],
            "positive_indicators": [],
            "price_assessment": "fair",
            "price_assessment_explanation": "Unable to assess",
            "buyer_recommendation": "inspect carefully",
            "confidence_score": 0.5,
            "analysis_summary": "Analysis completed with limited confidence"
        }
        
        # Ensure required fields exist
        for key, default_value in default_response.items():
            if key not in response:
                response[key] = default_value
        
        # Validate grade
        if response["overall_grade"] not in ["A", "B", "C", "D", "F"]:
            response["overall_grade"] = "C"
        
        # Ensure confidence is between 0 and 1
        try:
            confidence = float(response["confidence_score"])
            response["confidence_score"] = max(0.0, min(1.0, confidence))
        except (ValueError, TypeError):
            response["confidence_score"] = 0.5
        
        # Ensure red_flags is a list
        if not isinstance(response["red_flags"], list):
            response["red_flags"] = []
        
        # Ensure positive_indicators is a list  
        if not isinstance(response["positive_indicators"], list):
            response["positive_indicators"] = []
            
        return response
    
    def safe_parse_json_response(self, text_response: str) -> Dict[str, Any]:
        """Safely parse JSON response from AI model"""
        try:
            # Try to extract JSON from response (in case there's extra text)
            start_idx = text_response.find('{')
            end_idx = text_response.rfind('}') + 1
            
            if start_idx >= 0 and end_idx > start_idx:
                json_str = text_response[start_idx:end_idx]
                parsed = json.loads(json_str)
                return self.validate_analysis_response(parsed)
            else:
                logger.warning("No JSON found in AI response")
                return self.validate_analysis_response({})
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"Response text: {text_response}")
            return self.validate_analysis_response({})
        except Exception as e:
            logger.error(f"Unexpected error parsing AI response: {e}")
            return self.validate_analysis_response({})