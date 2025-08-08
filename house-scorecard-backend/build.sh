#!/usr/bin/env bash
set -o errexit

# Update pip first
pip install --upgrade pip

# Install Python dependencies
pip install -r requirements.txt

# Install system dependencies for Playwright
apt-get update
apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0

# Install Playwright browsers without sudo requirement
export PLAYWRIGHT_BROWSERS_PATH=/opt/render/project/src/browsers
mkdir -p $PLAYWRIGHT_BROWSERS_PATH
python -m playwright install --with-deps chromium

# Run migrations
python manage.py migrate
