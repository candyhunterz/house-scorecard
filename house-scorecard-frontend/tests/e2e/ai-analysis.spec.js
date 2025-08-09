import { test, expect } from '@playwright/test';
import { loginAs, addPropertyWithAutoFill, waitForAutoFillComplete, waitForAIAnalysisComplete, goToAddProperty } from '../utils/test-helpers.js';

test.describe('AI Property Analysis Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAs(page);
  });

  test('Runs AI analysis after auto-fill with expected results', async ({ page }) => {
    await goToAddProperty(page);
    
    // Use the same successful auto-fill workflow from the analysis document
    const zealtyUrl = 'https://www.zealty.ca/mls-R3034077/18-3303-ROSEMARY-HEIGHTS-CRESCENT-Surrey-BC/';
    await page.fill('[data-testid=listing-url]', zealtyUrl);
    await page.click('[data-testid=auto-fill-btn]');
    await waitForAutoFillComplete(page);
    
    // Run AI analysis - this was successfully tested manually per the document
    await page.click('[data-testid=run-ai-analysis]');
    await waitForAIAnalysisComplete(page);
    
    // Verify analysis results display as documented in the analysis
    expect(await page.textContent('[data-testid=ai-grade]')).toBe('B');
    expect(await page.textContent('[data-testid=ai-confidence]')).toContain('86%');
    expect(await page.textContent('[data-testid=price-assessment]')).toBe('fair');
  });

  test('AI analysis handles property without auto-fill', async ({ page }) => {
    await goToAddProperty(page);
    
    // Manually fill basic property data
    await page.fill('[data-testid=address]', '123 Test Street, Vancouver');
    await page.fill('[data-testid=price]', '800000');
    await page.fill('[data-testid=beds]', '2');
    await page.fill('[data-testid=baths]', '2');
    await page.fill('[data-testid=sqft]', '1200');
    
    // Add some dummy image URLs for AI analysis
    await page.fill('#imageUrlsString', 'https://example.com/image1.jpg\nhttps://example.com/image2.jpg');
    
    // Run AI analysis on manually entered data
    await page.click('[data-testid=run-ai-analysis]');
    await waitForAIAnalysisComplete(page);
    
    // Verify analysis completed successfully
    const aiGrade = await page.locator('[data-testid=ai-grade]');
    expect(await aiGrade.isVisible()).toBe(true);
    
    const aiConfidence = await page.locator('[data-testid=ai-confidence]');
    expect(await aiConfidence.isVisible()).toBe(true);
    
    const priceAssessment = await page.locator('[data-testid=price-assessment]');
    expect(await priceAssessment.isVisible()).toBe(true);
  });

  test('AI analysis shows loading state during processing', async ({ page }) => {
    await goToAddProperty(page);
    
    // Fill basic property data
    await page.fill('[data-testid=address]', '456 Analysis Lane, Burnaby');
    await page.fill('[data-testid=price]', '950000');
    await page.fill('[data-testid=beds]', '3');
    await page.fill('[data-testid=baths]', '2');
    await page.fill('[data-testid=sqft]', '1500');
    
    // Add image URLs for AI analysis
    await page.fill('#imageUrlsString', 'https://example.com/image1.jpg\nhttps://example.com/image2.jpg');
    
    // Start AI analysis
    await page.click('[data-testid=run-ai-analysis]');
    
    // Verify loading state appears
    await page.waitForSelector('[data-testid=ai-analysis-loading]');
    expect(await page.locator('[data-testid=ai-analysis-loading]').isVisible()).toBe(true);
    
    // Wait for completion
    await waitForAIAnalysisComplete(page);
    
    // Verify loading state disappears
    expect(await page.locator('[data-testid=ai-analysis-loading]').isVisible()).toBe(false);
  });

  test('AI analysis handles network errors gracefully', async ({ page }) => {
    await goToAddProperty(page);
    
    // Fill property data
    await page.fill('[data-testid=address]', '789 Error Test Ave, Richmond');
    await page.fill('[data-testid=price]', '1200000');
    
    // Add image URLs for AI analysis
    await page.fill('#imageUrlsString', 'https://example.com/image1.jpg');
    
    // Simulate network failure by intercepting the AI analysis request
    await page.route('**/api/properties/analyze/', route => {
      route.abort();
    });
    
    // Attempt AI analysis
    await page.click('[data-testid=run-ai-analysis]');
    
    // Should show error message
    await page.waitForSelector('[data-testid=ai-analysis-error]', { timeout: 10000 });
    expect(await page.locator('[data-testid=ai-analysis-error]').isVisible()).toBe(true);
  });

  test('AI analysis requires minimum property data', async ({ page }) => {
    await goToAddProperty(page);
    
    // Try to run analysis without sufficient data
    await page.click('[data-testid=run-ai-analysis]');
    
    // Should show validation error
    await page.waitForSelector('[data-testid=ai-analysis-validation-error]', { timeout: 5000 });
    expect(await page.locator('[data-testid=ai-analysis-validation-error]').isVisible()).toBe(true);
  });

  test('AI analysis results can be cleared and re-run', async ({ page }) => {
    await goToAddProperty(page);
    
    // Fill and analyze property
    await page.fill('[data-testid=address]', '321 Re-analysis Road, Coquitlam');
    await page.fill('[data-testid=price]', '750000');
    await page.fill('[data-testid=beds]', '4');
    await page.fill('[data-testid=baths]', '3');
    
    await page.click('[data-testid=run-ai-analysis]');
    await waitForAIAnalysisComplete(page);
    
    // Clear analysis results
    await page.click('[data-testid=clear-ai-analysis]');
    
    // Verify results are cleared
    expect(await page.locator('[data-testid=ai-grade]').isVisible()).toBe(false);
    
    // Re-run analysis
    await page.click('[data-testid=run-ai-analysis]');
    await waitForAIAnalysisComplete(page);
    
    // Verify new results appear
    expect(await page.locator('[data-testid=ai-grade]').isVisible()).toBe(true);
  });

  test('AI analysis integrates with property saving', async ({ page }) => {
    await goToAddProperty(page);
    
    // Complete property with AI analysis
    const zealtyUrl = 'https://www.zealty.ca/mls-R3034077/18-3303-ROSEMARY-HEIGHTS-CRESCENT-Surrey-BC/';
    await page.fill('[data-testid=listing-url]', zealtyUrl);
    await page.click('[data-testid=auto-fill-btn]');
    await waitForAutoFillComplete(page);
    
    await page.click('[data-testid=run-ai-analysis]');
    await waitForAIAnalysisComplete(page);
    
    // Save property with AI analysis data
    await page.click('[data-testid=save-property-btn]');
    await page.waitForSelector('[data-testid=success-notification]');
    
    // Verify property was saved with AI data
    await page.goto('/properties');
    await page.click('[data-testid=property-item]:first-child');
    
    // AI analysis should be preserved
    expect(await page.locator('[data-testid=ai-grade]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid=ai-confidence]').isVisible()).toBe(true);
  });
});