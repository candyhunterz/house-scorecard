#!/usr/bin/env bash
set -o errexit

# Update pip first
pip install --upgrade pip

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers to custom path (Render has Chromium dependencies pre-installed)
export PLAYWRIGHT_BROWSERS_PATH=/opt/render/project/src/browsers
mkdir -p $PLAYWRIGHT_BROWSERS_PATH
python -m playwright install chromium

# Run migrations
python manage.py migrate
