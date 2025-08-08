# Deployment Guide

This guide covers deploying the House Scorecard application with AI analysis capabilities.

## Prerequisites

### Required Environment Variables

```bash
# Critical - Application will not start without these
SECRET_KEY=your-django-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# Database (production)
DATABASE_URL=postgresql://user:password@host:port/database

# Redis for background tasks (production)
CELERY_BROKER_URL=redis://host:port/0
CELERY_RESULT_BACKEND=redis://host:port/0

# Optional - AI Configuration
AI_PROVIDER=gemini
GEMINI_MODEL_NAME=gemini-2.0-flash-exp
AI_MAX_IMAGES_PER_ANALYSIS=6
GEMINI_THINKING_BUDGET=-1

# Optional - Debug (default: False)
DEBUG=False

# Optional - Monitoring
SENTRY_DSN=your-sentry-dsn-here
```

### System Dependencies

1. **Python 3.11+**
2. **PostgreSQL** (for production)
3. **Redis** (for background tasks)

## Deployment Steps

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file or set environment variables in your deployment platform:

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Database Setup

```bash
# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

### 4. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

### 5. Start Background Worker (Production)

In a separate process, start the Celery worker:

```bash
# Start Celery worker
celery -A scorecard_project worker --loglevel=info

# Optional: Start Celery beat for periodic tasks
celery -A scorecard_project beat --loglevel=info
```

### 6. Start Web Server

```bash
# Development
python manage.py runserver

# Production (with Gunicorn)
gunicorn scorecard_project.wsgi:application --bind 0.0.0.0:8000
```

## Health Checks

The application provides a health check endpoint:

```bash
curl http://your-domain.com/api/health/
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00",
  "checks": {
    "ai_provider": {"status": "ok", "value": "gemini"},
    "gemini_api_key": {"status": "ok", "message": "Gemini API key configured"},
    "celery_broker": {"status": "ok", "message": "Celery broker configured"},
    "redis_connection": {"status": "ok", "message": "Redis connection successful"}
  }
}
```

## Platform-Specific Deployment

### Render.com

1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Add Redis addon or external Redis service
4. Use the following settings:
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Start Command**: `gunicorn scorecard_project.wsgi:application`
   - **Environment**: Set all required variables

### Railway

1. Connect your GitHub repository  
2. Set environment variables in Railway dashboard
3. Add Redis service from Railway marketplace
4. Railway will auto-detect Django and use appropriate commands

### Docker (Optional)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN python manage.py collectstatic --noinput

CMD ["gunicorn", "scorecard_project.wsgi:application"]
```

## Background Tasks Setup

### Without Celery (Simple Deployment)

If you can't set up Redis/Celery, the app will still work but AI analysis will be synchronous:

1. Set `SKIP_CELERY=True` in environment
2. AI analysis will run during property creation (slower response times)

### With Celery (Recommended)

1. Set up Redis instance
2. Start Celery worker process
3. AI analysis runs in background (faster response times)

## Monitoring and Maintenance

### Log Monitoring

Monitor these log messages:
- `✅ Core app ready - all validations passed` - Startup successful
- `AI analysis queued for property X` - Background task started
- `AI analysis completed successfully` - Analysis finished

### Cost Monitoring

Track Gemini API usage:
- Monitor logs for API call frequency
- Set up billing alerts in Google Cloud Console
- Consider rate limiting for high-traffic scenarios

### Performance Monitoring

- Use `/api/health/` endpoint for uptime monitoring
- Monitor Celery task queue length
- Track AI analysis completion rates

## Troubleshooting

### Common Issues

1. **"SECRET_KEY environment variable must be set"**
   - Set the SECRET_KEY environment variable
   - Generate a new key: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`

2. **"GEMINI_API_KEY environment variable must be set"**
   - Get API key from Google AI Studio
   - Set GEMINI_API_KEY environment variable

3. **AI analysis not working**
   - Check health endpoint: `/api/health/`
   - Verify Gemini API key is valid
   - Check Celery worker logs

4. **Redis connection failed**
   - Verify Redis is running
   - Check CELERY_BROKER_URL format
   - Test Redis connection manually

### Debug Mode

For debugging, set:
```bash
DEBUG=True
SKIP_STARTUP_VALIDATION=True  # Skip strict validation
```

⚠️ **Never use DEBUG=True in production!**

## Security Checklist

- ✅ SECRET_KEY is set and unique
- ✅ DEBUG=False in production  
- ✅ API keys are in environment variables, not code
- ✅ Database uses SSL in production
- ✅ ALLOWED_HOSTS is configured properly
- ✅ CORS settings are restrictive
- ✅ Sentry is configured for error monitoring

## Support

For deployment issues, check:
1. Application logs
2. Health check endpoint: `/api/health/`
3. Celery worker logs (if using background tasks)
4. Database connectivity
5. Redis connectivity (if using Celery)