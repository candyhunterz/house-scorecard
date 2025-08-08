FROM python:3.11-slim

# Install system dependencies required for Playwright
RUN apt-get update && apt-get install -y     wget     ca-certificates     fonts-liberation     libappindicator3-1     libasound2     libatk-bridge2.0-0     libatk1.0-0     libcairo-gobject2     libdrm2     libgbm1     libgtk-3-0     libnspr4     libnss3     libxcomposite1     libxdamage1     libxrandr2     libxss1     libxtst6     xdg-utils     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright and browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/app/browsers
RUN python -m playwright install --with-deps chromium

# Copy application code
COPY . .

# Run migrations and start server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
