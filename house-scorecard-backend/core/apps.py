from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    
    def ready(self):
        """
        Called when the Django app is ready.
        Perform startup validations here.
        """
        # Only run validations once during startup, not during migrations
        import os
        import sys
        
        # Skip validation during migrations, tests, or management commands
        if (
            'migrate' in sys.argv or 
            'makemigrations' in sys.argv or 
            'collectstatic' in sys.argv or
            'test' in sys.argv or
            os.environ.get('SKIP_STARTUP_VALIDATION')
        ):
            logger.info("Skipping startup validation")
            return
        
        try:
            from .health import validate_startup_configuration
            validate_startup_configuration()
            logger.info("✅ Core app ready - all validations passed")
        except Exception as e:
            logger.error(f"❌ Core app startup validation failed: {e}")
            # Re-raise to prevent Django from starting with invalid configuration
            raise
