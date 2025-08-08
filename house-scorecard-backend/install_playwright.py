#!/usr/bin/env python3
"""
Playwright browser installation script for Render deployment
"""
import os
import subprocess
import sys

def install_playwright_browsers():
    """Install Playwright browsers if not already installed"""
    try:
        # Set browser path for Render - use project directory
        browser_path = '/opt/render/project/src/browsers'
        os.environ['PLAYWRIGHT_BROWSERS_PATH'] = browser_path
        
        # Create browsers directory if it doesn't exist
        os.makedirs(browser_path, exist_ok=True)
        
        print(f"Installing Playwright browsers to {browser_path}...")
        result = subprocess.run([
            sys.executable, '-m', 'playwright', 'install', '--with-deps', 'chromium'
        ], check=True, capture_output=True, text=True)
        
        print("Playwright browsers installed successfully!")
        print(result.stdout)
        
    except subprocess.CalledProcessError as e:
        print(f"Failed to install Playwright browsers: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error installing Playwright browsers: {e}")
        sys.exit(1)

if __name__ == '__main__':
    install_playwright_browsers()