#!/bin/bash
set -e  # Exit on any error

echo "=== Starting build process ==="
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Setting Playwright browser path..."
export PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright
mkdir -p /opt/render/.cache/ms-playwright

echo "Installing Playwright browsers..."
python -m playwright install chromium --with-deps

echo "Verifying Playwright installation..."
python -c "from playwright.sync_api import sync_playwright; print('Playwright import successful')"

echo "=== Build complete! ==="
