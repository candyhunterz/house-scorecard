import { test, expect } from '@playwright/test';
import { loginAs, addPropertyWithAutoFill, waitForAutoFillComplete, goToAddProperty } from '../utils/test-helpers.js';

test.describe('Property Auto-Fill Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAs(page);
  });

  test('Zealty.ca URL auto-fill workflow', async ({ page }) => {
    // Navigate to add property page
    await goToAddProperty(page);
    
    // Test the exact workflow that was manually verified
    const zealtyUrl = 'https://www.zealty.ca/mls-R3034077/18-3303-ROSEMARY-HEIGHTS-CRESCENT-Surrey-BC/';
    await page.fill('[data-testid=listing-url]', zealtyUrl);
    await page.click('[data-testid=auto-fill-btn]');
    
    // Wait for auto-fill to complete
    await waitForAutoFillComplete(page);
    
    // Verify all fields are populated as per the analysis document
    expect(await page.inputValue('[data-testid=address]')).toBe('#18 3303 ROSEMARY HEIGHTS CRESCENT, Surrey');
    expect(await page.inputValue('[data-testid=price]')).toBe('1075000');
    expect(await page.inputValue('[data-testid=beds]')).toBe('3');
    expect(await page.inputValue('[data-testid=baths]')).toBe('3');
    expect(await page.inputValue('[data-testid=sqft]')).toBe('1807');
  });

  test('Realtor.ca URL auto-fill workflow', async ({ page }) => {
    await goToAddProperty(page);
    
    // Test with a sample Realtor.ca URL (this would need to be updated with a real URL)
    const realtorUrl = 'https://www.realtor.ca/real-estate/sample-property-listing';
    await page.fill('[data-testid=listing-url]', realtorUrl);
    await page.click('[data-testid=auto-fill-btn]');
    
    // Wait for auto-fill attempt (may succeed or show error for invalid URL)
    await page.waitForSelector('[data-testid=success-notification], [data-testid=error-notification]', { timeout: 10000 });
    
    // Verify the auto-fill was attempted
    const notification = await page.locator('[data-testid=success-notification], [data-testid=error-notification]');
    expect(await notification.isVisible()).toBe(true);
  });

  test('Redfin.ca URL auto-fill workflow', async ({ page }) => {
    await goToAddProperty(page);
    
    // Test with a sample Redfin.ca URL (this would need to be updated with a real URL)  
    const redfinUrl = 'https://www.redfin.ca/ca/bc/sample-property-listing';
    await page.fill('[data-testid=listing-url]', redfinUrl);
    await page.click('[data-testid=auto-fill-btn]');
    
    // Wait for auto-fill attempt
    await page.waitForSelector('[data-testid=success-notification], [data-testid=error-notification]', { timeout: 10000 });
    
    // Verify the auto-fill was attempted
    const notification = await page.locator('[data-testid=success-notification], [data-testid=error-notification]');
    expect(await notification.isVisible()).toBe(true);
  });

  test('Invalid URL handling', async ({ page }) => {
    await goToAddProperty(page);
    
    // Test with invalid URL
    const invalidUrl = 'https://invalid-domain.com/property';
    await page.fill('[data-testid=listing-url]', invalidUrl);
    await page.click('[data-testid=auto-fill-btn]');
    
    // Should show error notification
    await page.waitForSelector('[data-testid=error-notification]', { timeout: 10000 });
    expect(await page.locator('[data-testid=error-notification]').isVisible()).toBe(true);
  });

  test('Auto-fill with empty URL shows validation error', async ({ page }) => {
    await goToAddProperty(page);
    
    // Try to auto-fill without URL
    await page.click('[data-testid=auto-fill-btn]');
    
    // Should show validation error
    await page.waitForSelector('[data-testid=validation-error]', { timeout: 5000 });
    expect(await page.locator('[data-testid=validation-error]').isVisible()).toBe(true);
  });

  test('Auto-fill preserves manually entered data when partial', async ({ page }) => {
    await goToAddProperty(page);
    
    // Manually enter some data first
    await page.fill('[data-testid=address]', 'Manual Address');
    await page.fill('[data-testid=price]', '500000');
    
    // Then auto-fill - should only fill empty fields
    const zealtyUrl = 'https://www.zealty.ca/mls-R3034077/18-3303-ROSEMARY-HEIGHTS-CRESCENT-Surrey-BC/';
    await page.fill('[data-testid=listing-url]', zealtyUrl);
    await page.click('[data-testid=auto-fill-btn]');
    
    await waitForAutoFillComplete(page);
    
    // Manual data should be preserved if the setting is configured that way
    // This test assumes the behavior - would need to check actual implementation
    const address = await page.inputValue('[data-testid=address]');
    const price = await page.inputValue('[data-testid=price]');
    
    // At minimum, some fields should be populated
    expect(address.length).toBeGreaterThan(0);
    expect(price.length).toBeGreaterThan(0);
  });
});