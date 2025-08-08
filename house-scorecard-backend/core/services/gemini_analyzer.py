# core/services/gemini_analyzer.py
from google import genai
from google.genai import types
from typing import Dict, List, Any
import requests
from PIL import Image
import io
import logging
from django.conf import settings
from .base_ai_analyzer import BaseAIAnalyzer

logger = logging.getLogger(__name__)

class GeminiPropertyAnalyzer(BaseAIAnalyzer):
    """
    Google Gemini implementation of property AI analysis
    """
    
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.api_key = api_key or getattr(settings, 'GEMINI_API_KEY', None)
        
        if not self.api_key:
            raise ValueError("Gemini API key is required. Set GEMINI_API_KEY in settings.")
        
        # Initialize the client with API key
        self.client = genai.Client(api_key=self.api_key)
    
    def get_model_name(self) -> str:
        """Return Gemini model name"""
        return getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash-lite')
    
    def download_image(self, image_url: str) -> Image.Image:
        """Download and prepare image for Gemini analysis"""
        try:
            response = requests.get(image_url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()
            
            # Open image with PIL
            image = Image.open(io.BytesIO(response.content))
            
            # Convert to RGB if needed (Gemini works best with RGB)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize if too large (Gemini has size limits) - use smaller size for memory efficiency
            max_size = 384  # Reduced from 512 to save even more memory
            if image.width > max_size or image.height > max_size:
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # Ensure minimum size to maintain quality for analysis
            min_size = 256
            if image.width < min_size and image.height < min_size:
                # If image is too small, resize it to minimum size
                image = image.resize((min_size, min_size), Image.Resampling.LANCZOS)
            
            return image
            
        except Exception as e:
            logger.error(f"Failed to download image from {image_url}: {e}")
            return None
    
    def analyze_property_comprehensive(self, property_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze property using Gemini with ALL images processed in batches
        """
        try:
            image_urls = property_data.get('imageUrls', [])
            
            # Process ALL images in batches for comprehensive analysis
            max_images_per_batch = getattr(settings, 'AI_MAX_IMAGES_PER_ANALYSIS', 2)  # Reduced from 3 to 2
            
            # Limit total images processed to prevent memory issues
            if len(image_urls) > 25:
                logger.warning(f"Too many images ({len(image_urls)}), limiting to first 15")
                image_urls = image_urls[:25]
            
            if len(image_urls) <= max_images_per_batch:
                # Single batch - use existing logic
                return self._analyze_single_batch(property_data, image_urls)
            else:
                # Multiple batches - use new batched analysis
                logger.info(f"Processing {len(image_urls)} images in batches of {max_images_per_batch}")
                return self._analyze_multiple_batches(property_data, image_urls, max_images_per_batch)
                
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            return self.validate_analysis_response({
                "analysis_summary": f"Analysis failed: {str(e)}"
            })
    
    def _analyze_single_batch(self, property_data: Dict[str, Any], image_urls: list) -> Dict[str, Any]:
        """
        Analyze property using a single batch of images (existing logic)
        """
        try:
            # Get thinking budget from settings
            thinking_budget = getattr(settings, 'GEMINI_THINKING_BUDGET', -1)
            
            if not image_urls:
                logger.warning("No images provided for AI analysis")
                return self.validate_analysis_response({
                    "analysis_summary": "No images available for analysis"
                })
            
            # Download and prepare images
            images = []
            successful_downloads = 0
            
            for url in image_urls:
                image = self.download_image(url)
                if image:
                    images.append(image)
                    successful_downloads += 1
                
                # Force cleanup after each image to manage memory
                if successful_downloads % 2 == 0:  # Every 2 images
                    import gc
                    gc.collect()
            
            if len(images) == 0:
                logger.error("Failed to download any images for analysis")
                return self.validate_analysis_response({
                    "analysis_summary": "Could not download images for analysis"
                })
            elif len(images) < len(image_urls) * 0.5:  # If more than 50% failed to download
                logger.warning(f"Only downloaded {len(images)}/{len(image_urls)} images successfully")
                # Continue with analysis but note the issue
            
            # Generate comprehensive prompt
            prompt = self.format_property_prompt(property_data)
            
            # Prepare content for Gemini (text + images)
            content = [prompt] + images
            
            # Make API call to Gemini with configurable thinking
            logger.info(f"Analyzing property with {len(images)} images using {self.model_name} (thinking_budget={thinking_budget})")
            
            # Create generation config with thinking if enabled
            config_params = {
                'temperature': 0.1,  # Low temperature for consistent analysis
                'top_p': 0.8,
                'top_k': 40,
                'max_output_tokens': 1000,
            }
            
            # Add thinking config if enabled
            if thinking_budget != 0:
                if thinking_budget == -1:
                    # Dynamic thinking - let model decide
                    config_params['thinking_config'] = types.ThinkingConfig()
                else:
                    # Fixed thinking budget
                    config_params['thinking_config'] = types.ThinkingConfig(steps=thinking_budget)
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=content,
                config=types.GenerateContentConfig(**config_params)
            )
            
            # Parse response
            if response.text:
                analysis_result = self.safe_parse_json_response(response.text)
                logger.info(f"AI analysis completed with confidence: {analysis_result.get('confidence_score', 0)}")
                return analysis_result
            else:
                logger.error("Empty response from Gemini API")
                return self.validate_analysis_response({})
                
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            return self.validate_analysis_response({
                "analysis_summary": f"Analysis failed: {str(e)}"
            })
    
    def _analyze_multiple_batches(self, property_data: Dict[str, Any], image_urls: list, batch_size: int) -> Dict[str, Any]:
        """
        Analyze property using multiple batches of images for comprehensive analysis
        """
        try:
            batch_results = []
            total_batches = (len(image_urls) + batch_size - 1) // batch_size  # Ceiling division
            
            logger.info(f"Processing {len(image_urls)} images in {total_batches} batches")
            
            for batch_num in range(total_batches):
                start_idx = batch_num * batch_size
                end_idx = min(start_idx + batch_size, len(image_urls))
                batch_urls = image_urls[start_idx:end_idx]
                
                logger.info(f"Processing batch {batch_num + 1}/{total_batches} with {len(batch_urls)} images")
                
                # Analyze this batch
                batch_result = self._analyze_single_batch(property_data, batch_urls)
                
                if batch_result and not batch_result.get('error'):
                    batch_results.append(batch_result)
                    logger.info(f"Batch {batch_num + 1} completed successfully")
                else:
                    logger.warning(f"Batch {batch_num + 1} failed or had errors")
                
                # Force garbage collection between batches to free memory
                import gc
                gc.collect()
            
            if not batch_results:
                logger.error("All batches failed")
                return self.validate_analysis_response({
                    "analysis_summary": "All image analysis batches failed"
                })
            
            # Combine batch results into comprehensive analysis
            return self._combine_batch_results(batch_results, len(image_urls))
            
        except Exception as e:
            logger.error(f"Multi-batch analysis failed: {e}")
            return self.validate_analysis_response({
                "analysis_summary": f"Multi-batch analysis failed: {str(e)}"
            })
    
    def _combine_batch_results(self, batch_results: list, total_images: int) -> Dict[str, Any]:
        """
        Combine multiple batch analysis results into a single comprehensive analysis
        """
        try:
            # Collect all red flags and positive indicators
            all_red_flags = []
            all_positive_indicators = []
            all_grades = []
            all_confidence_scores = []
            all_summaries = []
            
            for result in batch_results:
                if result.get('red_flags'):
                    all_red_flags.extend(result['red_flags'])
                if result.get('positive_indicators'):
                    all_positive_indicators.extend(result['positive_indicators'])
                if result.get('overall_grade'):
                    all_grades.append(result['overall_grade'])
                if result.get('confidence_score'):
                    all_confidence_scores.append(result['confidence_score'])
                if result.get('analysis_summary'):
                    all_summaries.append(result['analysis_summary'])
            
            # Determine overall grade (take the most conservative/worst grade)
            grade_priority = {'F': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4}
            overall_grade = 'C'  # Default
            if all_grades:
                worst_grade = min(all_grades, key=lambda g: grade_priority.get(g, 2))
                overall_grade = worst_grade
            
            # Average confidence scores
            avg_confidence = sum(all_confidence_scores) / len(all_confidence_scores) if all_confidence_scores else 0.7
            
            # Deduplicate and prioritize red flags
            unique_red_flags = []
            seen_issues = set()
            for flag in all_red_flags:
                issue_key = flag.get('issue', '').lower()
                if issue_key not in seen_issues:
                    seen_issues.add(issue_key)
                    unique_red_flags.append(flag)
            
            # Deduplicate positive indicators
            unique_positives = list(set(all_positive_indicators))
            
            # Create comprehensive summary
            comprehensive_summary = f"Comprehensive analysis of {total_images} images across {len(batch_results)} batches. "
            if unique_red_flags:
                comprehensive_summary += f"Found {len(unique_red_flags)} potential issues. "
            if unique_positives:
                comprehensive_summary += f"Identified {len(unique_positives)} positive aspects. "
            comprehensive_summary += f"Overall assessment: {overall_grade} grade."
            
            # Determine price assessment and recommendation based on combined results
            price_assessment = "fair"  # Default
            buyer_recommendation = "proceed with thorough inspection"
            
            # If significant red flags, recommend caution
            high_severity_flags = [f for f in unique_red_flags if f.get('severity') == 'high']
            if len(high_severity_flags) >= 2:
                price_assessment = "high"
                buyer_recommendation = "proceed with extreme caution - multiple serious concerns"
            elif len(unique_red_flags) >= 5:
                buyer_recommendation = "proceed with caution - multiple concerns identified"
            elif len(unique_positives) > len(unique_red_flags):
                buyer_recommendation = "good property with noted strengths"
            
            return self.validate_analysis_response({
                "overall_grade": overall_grade,
                "red_flags": unique_red_flags[:10],  # Limit to top 10 most important
                "positive_indicators": unique_positives[:10],  # Limit to top 10
                "price_assessment": price_assessment,
                "buyer_recommendation": buyer_recommendation,
                "confidence_score": min(avg_confidence, 0.95),  # Cap confidence for batch analysis
                "analysis_summary": comprehensive_summary
            })
            
        except Exception as e:
            logger.error(f"Failed to combine batch results: {e}")
            return self.validate_analysis_response({
                "analysis_summary": f"Failed to combine batch analysis results: {str(e)}"
            })
    
    def analyze_listing_text_only(self, property_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fallback analysis using only text data (when images fail)
        """
        try:
            address = property_data.get('address', 'Unknown')
            price = property_data.get('price')
            description = property_data.get('description', '')
            days_on_market = property_data.get('days_on_market')
            
            # Get thinking budget from settings
            thinking_budget = getattr(settings, 'GEMINI_THINKING_BUDGET', -1)
            
            prompt = f"""Property listing text analysis for: {address}

Price: ${price:,} if price else 'Unknown'
Description: {description}
Days on Market: {days_on_market if days_on_market else 'Unknown'}

Analyze the listing text for red flags and insights:

RED FLAGS to look for:
- "As-is" or "cash only" (potential issues)
- "Investor special" or "handyman special" (needs work)
- "Bring your imagination" (major renovation needed)
- Multiple price drops mentioned
- Vague descriptions avoiding details
- "Motivated seller" (may indicate problems)

POSITIVE INDICATORS:
- Recent updates mentioned
- Quality materials specified
- Energy efficiency features
- Detailed, confident descriptions

Return JSON analysis focusing on text-based insights:
{{
  "overall_grade": "B",
  "red_flags": [{{
    "issue": "text-based red flag",
    "severity": "medium",
    "explanation": "what this suggests"
  }}],
  "positive_indicators": ["positive aspects from description"],
  "price_assessment": "fair",
  "buyer_recommendation": "review carefully - text-only analysis",
  "confidence_score": 0.6,
  "analysis_summary": "Analysis based on listing text only"
}}"""
            
            # Create generation config with thinking if enabled
            config_params = {
                'temperature': 0.1,
                'max_output_tokens': 500,
            }
            
            # Add thinking config if enabled
            if thinking_budget != 0:
                if thinking_budget == -1:
                    # Dynamic thinking - let model decide
                    config_params['thinking_config'] = types.ThinkingConfig()
                else:
                    # Fixed thinking budget
                    config_params['thinking_config'] = types.ThinkingConfig(steps=thinking_budget)
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(**config_params)
            )
            
            if response.text:
                return self.safe_parse_json_response(response.text)
            else:
                return self.validate_analysis_response({})
                
        except Exception as e:
            logger.error(f"Text-only analysis failed: {e}")
            return self.validate_analysis_response({})

# Factory function to get the appropriate AI analyzer
def get_ai_analyzer() -> BaseAIAnalyzer:
    """
    Factory function to get AI analyzer based on settings.
    Makes it easy to switch between different AI providers.
    """
    ai_provider = getattr(settings, 'AI_PROVIDER', 'gemini').lower()
    
    if ai_provider == 'gemini':
        return GeminiPropertyAnalyzer()
    elif ai_provider == 'openai':
        # Future: from .openai_analyzer import OpenAIPropertyAnalyzer
        # return OpenAIPropertyAnalyzer()
        raise NotImplementedError("OpenAI analyzer not yet implemented")
    else:
        raise ValueError(f"Unknown AI provider: {ai_provider}")