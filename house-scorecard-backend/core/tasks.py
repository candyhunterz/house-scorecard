# core/tasks.py
from celery import shared_task
from django.core.exceptions import ObjectDoesNotExist
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def analyze_property_with_ai_async(self, property_id):
    """
    Background task to analyze a property with AI
    
    Args:
        property_id: ID of the property to analyze
        
    Returns:
        dict: Analysis result with success status and property data
    """
    try:
        from .models import Property
        from .services.gemini_analyzer import get_ai_analyzer
        from datetime import datetime
        
        logger.info(f"Starting AI analysis for property {property_id}")
        
        # Get the property
        try:
            property_instance = Property.objects.get(id=property_id)
        except ObjectDoesNotExist:
            logger.error(f"Property {property_id} not found")
            return {'success': False, 'error': 'Property not found'}
        
        # Check if property needs AI analysis
        if not property_instance.needs_ai_analysis():
            logger.info(f"Property {property_id} already has AI analysis")
            return {'success': True, 'message': 'Property already analyzed', 'property_id': property_id}
        
        # Prepare AI input data
        ai_input_data = {
            'address': property_instance.address,
            'price': property_instance.price,
            'description': getattr(property_instance, 'description', ''),
            'imageUrls': property_instance.image_urls or [],
            'days_on_market': getattr(property_instance, 'days_on_market', None),
            'beds': property_instance.beds,
            'baths': property_instance.baths,
            'sqft': property_instance.sqft,
        }
        
        # Run AI analysis
        analyzer = get_ai_analyzer()
        ai_analysis = analyzer.analyze_property_comprehensive(ai_input_data)
        
        # Update property with AI analysis results
        property_instance.ai_analysis = ai_analysis
        property_instance.ai_overall_grade = ai_analysis.get('overall_grade')
        property_instance.ai_red_flags = ai_analysis.get('red_flags', [])
        property_instance.ai_positive_indicators = ai_analysis.get('positive_indicators', [])
        property_instance.ai_price_assessment = ai_analysis.get('price_assessment')
        property_instance.ai_buyer_recommendation = ai_analysis.get('buyer_recommendation')
        property_instance.ai_confidence_score = ai_analysis.get('confidence_score')
        property_instance.ai_analysis_summary = ai_analysis.get('analysis_summary')
        property_instance.ai_analysis_date = datetime.now()
        
        property_instance.save()
        
        logger.info(f"AI analysis completed successfully for property {property_id}")
        return {
            'success': True, 
            'property_id': property_id,
            'grade': ai_analysis.get('overall_grade'),
            'confidence': ai_analysis.get('confidence_score'),
            'red_flags_count': len(ai_analysis.get('red_flags', []))
        }
        
    except Exception as exc:
        logger.error(f"AI analysis failed for property {property_id}: {str(exc)}")
        # Celery will handle retries automatically
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying AI analysis for property {property_id} (attempt {self.request.retries + 1})")
            raise self.retry(exc=exc)
        else:
            logger.error(f"Max retries exceeded for property {property_id}")
            return {'success': False, 'error': str(exc), 'property_id': property_id}

@shared_task
def batch_analyze_properties(property_ids):
    """
    Background task to analyze multiple properties with AI
    
    Args:
        property_ids: List of property IDs to analyze
        
    Returns:
        dict: Batch analysis results
    """
    results = []
    logger.info(f"Starting batch AI analysis for {len(property_ids)} properties")
    
    for property_id in property_ids:
        try:
            result = analyze_property_with_ai_async.delay(property_id)
            results.append({'property_id': property_id, 'task_id': result.id})
        except Exception as e:
            logger.error(f"Failed to queue AI analysis for property {property_id}: {str(e)}")
            results.append({'property_id': property_id, 'error': str(e)})
    
    logger.info(f"Queued {len(results)} AI analysis tasks")
    return {'success': True, 'queued_tasks': len(results), 'results': results}

@shared_task
def cleanup_old_ai_analyses():
    """
    Background task to clean up old AI analyses if needed
    This can be run periodically to manage storage
    """
    from .models import Property
    from datetime import datetime, timedelta
    
    # Example: Remove AI analysis older than 1 year
    cutoff_date = datetime.now() - timedelta(days=365)
    
    old_analyses = Property.objects.filter(
        ai_analysis_date__lt=cutoff_date,
        ai_analysis__isnull=False
    )
    
    count = old_analyses.count()
    if count > 0:
        logger.info(f"Found {count} old AI analyses to clean up")
        # Could implement selective cleanup here
        # For now, just log the count
    
    return {'cleaned_count': 0, 'found_old_count': count}