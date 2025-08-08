# scorecard_project/__init__.py
# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
# Temporarily disabled - using separated scraping/analysis instead of background tasks
# from .celery import app as celery_app

# __all__ = ('celery_app',)