import { test, expect } from '@playwright/test';
import { loginAs, goToAddProperty, saveProperty, fillPropertyDetails } from '../utils/test-helpers.js';

test.describe('Property Comparison Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    
    // Create sample properties for comparison
    const sampleProperties = [
      {
        address: '123 Comparison Test St A',
        price: '650000',
        beds: '3',
        baths: '2',
        sqft: '1400',
      },
      {
        address: '456 Comparison Test St B', 
        price: '750000',
        beds: '4',
        baths: '3',
        sqft: '1800',
      },
      {
        address: '789 Comparison Test St C',
        price: '850000',
        beds: '2',
        baths: '2',
        sqft: '1200',
      },
    ];

    for (const property of sampleProperties) {
      await goToAddProperty(page);
      await fillPropertyDetails(page, property);
      await saveProperty(page);
    }
  });

  test('Select multiple properties for comparison', async ({ page }) => {
    await page.goto('/properties');

    // Select properties for comparison
    await page.click('[data-testid=property-item]:nth-child(1) [data-testid=select-checkbox]');
    await page.click('[data-testid=property-item]:nth-child(2) [data-testid=select-checkbox]');

    // Start comparison
    await page.click('[data-testid=compare-selected-btn]');

    // Should navigate to comparison page
    await page.waitForURL('/comparison');
    expect(page.url()).toContain('/comparison');

    // Verify selected properties appear in comparison
    expect(await page.locator('[data-testid=comparison-property]:nth-child(1)').isVisible()).toBe(true);
    expect(await page.locator('[data-testid=comparison-property]:nth-child(2)').isVisible()).toBe(true);
  });

  test('Side-by-side comparison view', async ({ page }) => {
    await page.goto('/comparison');

    // Manually add properties to comparison if needed
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(1)');
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(2)');

    // Verify side-by-side layout
    const comparisonTable = page.locator('[data-testid=comparison-table]');
    expect(await comparisonTable.isVisible()).toBe(true);

    // Check that property details are displayed side by side
    expect(await page.locator('[data-testid=comparison-address-1]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid=comparison-address-2]').isVisible()).toBe(true);
    
    expect(await page.locator('[data-testid=comparison-price-1]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid=comparison-price-2]').isVisible()).toBe(true);

    expect(await page.locator('[data-testid=comparison-beds-1]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid=comparison-beds-2]').isVisible()).toBe(true);
  });

  test('Export comparison results', async ({ page }) => {
    await page.goto('/comparison');

    // Add properties to comparison
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(1)');
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(2)');

    // Export comparison
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid=export-comparison-btn]')
    ]);

    expect(download.suggestedFilename()).toContain('comparison');
    expect(download.suggestedFilename()).toMatch(/\.(pdf|csv|xlsx)$/);
  });

  test('AI-powered comparison insights', async ({ page }) => {
    await page.goto('/comparison');

    // Add properties to comparison
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(1)');
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(2)');

    // Generate AI insights
    await page.click('[data-testid=generate-ai-insights-btn]');

    // Wait for AI insights to load
    await page.waitForSelector('[data-testid=ai-insights-section]', { timeout: 30000 });

    // Verify AI insights are displayed
    expect(await page.locator('[data-testid=ai-insights-section]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid=ai-recommendation]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid=ai-pros-cons]').isVisible()).toBe(true);
  });

  test('Comparison criteria highlighting', async ({ page }) => {
    await page.goto('/comparison');

    // Add properties to comparison
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(1)');
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(2)');

    // Check for criteria-based highlighting
    expect(await page.locator('[data-testid=criteria-comparison-section]').isVisible()).toBe(true);

    // Verify properties are scored against criteria
    expect(await page.locator('[data-testid=criteria-score-property-1]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid=criteria-score-property-2]').isVisible()).toBe(true);

    // Check for winner highlighting
    const winners = page.locator('[data-testid=comparison-winner]');
    expect(await winners.count()).toBeGreaterThan(0);
  });

  test('Remove property from comparison', async ({ page }) => {
    await page.goto('/comparison');

    // Add properties to comparison
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(1)');
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(2)');
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(3)');

    // Verify 3 properties in comparison
    expect(await page.locator('[data-testid=comparison-property]').count()).toBe(3);

    // Remove one property
    await page.click('[data-testid=comparison-property]:nth-child(2) [data-testid=remove-from-comparison-btn]');

    // Verify property was removed
    expect(await page.locator('[data-testid=comparison-property]').count()).toBe(2);
  });

  test('Comparison with different property types', async ({ page }) => {
    // Add different property types first
    await goToAddProperty(page);
    await fillPropertyDetails(page, {
      address: '100 Condo Test Street',
      price: '500000',
      beds: '2',
      baths: '2',
      sqft: '900',
    });
    await page.selectOption('[data-testid=property-type-select]', 'Condo');
    await saveProperty(page);

    await goToAddProperty(page);
    await fillPropertyDetails(page, {
      address: '200 Townhouse Test Avenue',
      price: '700000',
      beds: '3',
      baths: '2',
      sqft: '1300',
    });
    await page.selectOption('[data-testid=property-type-select]', 'Townhouse');
    await saveProperty(page);

    await page.goto('/comparison');

    // Add different property types to comparison
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:has-text("Condo")');
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:has-text("Townhouse")');

    // Verify property types are displayed in comparison
    expect(await page.locator('[data-testid=comparison-property-type-1]').textContent()).toContain('Condo');
    expect(await page.locator('[data-testid=comparison-property-type-2]').textContent()).toContain('Townhouse');

    // Verify type-specific insights if available
    expect(await page.locator('[data-testid=property-type-comparison]').isVisible()).toBe(true);
  });

  test('Save comparison for later', async ({ page }) => {
    await page.goto('/comparison');

    // Add properties to comparison
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(1)');
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(2)');

    // Save comparison
    await page.click('[data-testid=save-comparison-btn]');
    await page.fill('[data-testid=comparison-name-input]', 'Test Comparison 1');
    await page.click('[data-testid=save-comparison-confirm-btn]');

    // Verify comparison was saved
    await page.waitForSelector('[data-testid=success-notification]');

    // Check saved comparisons list
    await page.click('[data-testid=saved-comparisons-btn]');
    expect(await page.locator('[data-testid=saved-comparison-item]:has-text("Test Comparison 1")').isVisible()).toBe(true);
  });

  test('Load saved comparison', async ({ page }) => {
    await page.goto('/comparison');

    // First save a comparison
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(1)');
    await page.click('[data-testid=add-to-comparison-btn]');
    await page.click('[data-testid=property-selector-item]:nth-child(2)');

    await page.click('[data-testid=save-comparison-btn]');
    await page.fill('[data-testid=comparison-name-input]', 'Load Test Comparison');
    await page.click('[data-testid=save-comparison-confirm-btn]');
    await page.waitForSelector('[data-testid=success-notification]');

    // Clear comparison
    await page.click('[data-testid=clear-comparison-btn]');
    expect(await page.locator('[data-testid=comparison-property]').count()).toBe(0);

    // Load saved comparison
    await page.click('[data-testid=saved-comparisons-btn]');
    await page.click('[data-testid=saved-comparison-item]:has-text("Load Test Comparison") [data-testid=load-comparison-btn]');

    // Verify comparison was loaded
    expect(await page.locator('[data-testid=comparison-property]').count()).toBe(2);
  });
});