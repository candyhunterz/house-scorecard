# core/health.py
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
import logging

logger = logging.getLogger(__name__)

def check_ai_configuration():
    """
    Validate AI configuration at startup
    
    Returns:
        dict: Health check results
    """
    checks = {}
    
    # Check AI provider settings
    ai_provider = getattr(settings, 'AI_PROVIDER', None)
    checks['ai_provider'] = {
        'status': 'ok' if ai_provider else 'error',
        'value': ai_provider,
        'message': f"AI provider: {ai_provider}" if ai_provider else "AI_PROVIDER not set"
    }
    
    # Check Gemini API key if using Gemini
    if ai_provider == 'gemini':
        gemini_api_key = getattr(settings, 'GEMINI_API_KEY', None)
        checks['gemini_api_key'] = {
            'status': 'ok' if gemini_api_key else 'error',
            'value': f"{'*' * 20}{gemini_api_key[-4:]}" if gemini_api_key else None,
            'message': "Gemini API key configured" if gemini_api_key else "GEMINI_API_KEY not set"
        }
        
        # Test Gemini connection
        try:
            from .services.gemini_analyzer import get_ai_analyzer
            analyzer = get_ai_analyzer()
            checks['gemini_connection'] = {
                'status': 'ok',
                'message': "Gemini analyzer initialized successfully"
            }
        except Exception as e:
            checks['gemini_connection'] = {
                'status': 'error',
                'message': f"Failed to initialize Gemini analyzer: {str(e)}"
            }
    
    # Check Celery configuration
    celery_broker = getattr(settings, 'CELERY_BROKER_URL', None)
    checks['celery_broker'] = {
        'status': 'ok' if celery_broker else 'warning',
        'value': celery_broker,
        'message': "Celery broker configured" if celery_broker else "CELERY_BROKER_URL not set - background tasks disabled"
    }
    
    # Redis connection check disabled - using separated analysis approach instead of background tasks
    # if celery_broker and 'redis://' in celery_broker:
    #     try:
    #         import redis
    #         import urllib.parse
    #         
    #         parsed_url = urllib.parse.urlparse(celery_broker)
    #         r = redis.Redis(
    #             host=parsed_url.hostname or 'localhost',
    #             port=parsed_url.port or 6379,
    #             db=int(parsed_url.path.lstrip('/')) if parsed_url.path else 0
    #         )
    #         r.ping()
    #         checks['redis_connection'] = {
    #             'status': 'ok',
    #             'message': "Redis connection successful"
    #         }
    #     except Exception as e:
    #         checks['redis_connection'] = {
    #             'status': 'error',
    #             'message': f"Redis connection failed: {str(e)}"
    #         }
    
    # Check required environment variables
    required_vars = ['SECRET_KEY']
    for var in required_vars:
        value = getattr(settings, var, None)
        checks[f'env_{var.lower()}'] = {
            'status': 'ok' if value else 'error',
            'message': f"{var} is set" if value else f"{var} not set"
        }
    
    # Check AI settings validation
    try:
        max_images = getattr(settings, 'AI_MAX_IMAGES_PER_ANALYSIS', 6)
        if not (1 <= max_images <= 20):
            raise ValueError(f"AI_MAX_IMAGES_PER_ANALYSIS must be between 1 and 20, got {max_images}")
        checks['ai_max_images'] = {
            'status': 'ok',
            'value': max_images,
            'message': f"AI max images per analysis: {max_images}"
        }
    except Exception as e:
        checks['ai_max_images'] = {
            'status': 'error',
            'message': f"Invalid AI_MAX_IMAGES_PER_ANALYSIS: {str(e)}"
        }
    
    return checks

def validate_startup_configuration():
    """
    Validate critical configuration at Django startup
    Raises ImproperlyConfigured for critical errors
    """
    logger.info("Validating startup configuration...")
    
    checks = check_ai_configuration()
    errors = []
    warnings = []
    
    for check_name, check_result in checks.items():
        if check_result['status'] == 'error':
            errors.append(f"{check_name}: {check_result['message']}")
        elif check_result['status'] == 'warning':
            warnings.append(f"{check_name}: {check_result['message']}")
    
    # Log warnings
    for warning in warnings:
        logger.warning(f"Configuration warning: {warning}")
    
    # Raise errors for critical issues
    if errors:
        error_message = "Critical configuration errors found:\n" + "\n".join(f"- {error}" for error in errors)
        logger.error(error_message)
        raise ImproperlyConfigured(error_message)
    
    logger.info("Startup configuration validation passed")
    return True

# Health check endpoint data
def get_health_status():
    """
    Get current health status for health check endpoints
    
    Returns:
        dict: Comprehensive health status
    """
    checks = check_ai_configuration()
    
    overall_status = 'healthy'
    if any(check['status'] == 'error' for check in checks.values()):
        overall_status = 'unhealthy'
    elif any(check['status'] == 'warning' for check in checks.values()):
        overall_status = 'degraded'
    
    return {
        'status': overall_status,
        'timestamp': __import__('datetime').datetime.now().isoformat(),
        'checks': checks,
        'version': getattr(settings, 'APP_VERSION', 'unknown')
    }