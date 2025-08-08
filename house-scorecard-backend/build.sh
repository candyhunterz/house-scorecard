#!/bin/bash
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Setting Playwright browser path..."
export PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright

echo "Installing Playwright browsers..."
python -m playwright install chromium

echo "Build complete!"
