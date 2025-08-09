import { test, expect } from '@playwright/test';
import { 
  loginAs, 
  waitForAutoFillComplete, 
  waitForAIAnalysisComplete, 
  goToAddProperty,
  verifyPropertyCount,
  saveProperty 
} from '../utils/test-helpers.js';

test.describe('Complete Property Addition Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAs(page);
  });

  test('Full workflow: login → add property → auto-fill → AI analysis → save', async ({ page }) => {
    // This complete workflow was successfully tested manually per the analysis document!
    
    // Navigate to properties and start adding a property
    await page.goto('/properties');
    await page.click('[data-testid=add-property-btn]');
    await page.waitForURL('/add-property');
    
    // Auto-fill workflow with the verified Zealty URL
    const zealtyUrl = 'https://www.zealty.ca/mls-R3034077/18-3303-ROSEMARY-HEIGHTS-CRESCENT-Surrey-BC/';
    await page.fill('[data-testid=listing-url]', zealtyUrl);
    await page.click('[data-testid=auto-fill-btn]');
    await waitForAutoFillComplete(page);
    
    // Verify auto-filled data
    expect(await page.inputValue('[data-testid=address]')).toBe('#18 3303 ROSEMARY HEIGHTS CRESCENT, Surrey');
    expect(await page.inputValue('[data-testid=price]')).toBe('1075000');
    expect(await page.inputValue('[data-testid=beds]')).toBe('3');
    expect(await page.inputValue('[data-testid=baths]')).toBe('3');
    expect(await page.inputValue('[data-testid=sqft]')).toBe('1807');
    
    // AI Analysis workflow
    await page.click('[data-testid=run-ai-analysis]');
    await waitForAIAnalysisComplete(page);
    
    // Verify AI analysis results
    expect(await page.textContent('[data-testid=ai-grade]')).toBe('B');
    expect(await page.textContent('[data-testid=ai-confidence]')).toContain('86%');
    expect(await page.textContent('[data-testid=price-assessment]')).toBe('fair');
    
    // Save property
    await saveProperty(page);
    
    // Verify property appears in list with updated count
    await page.goto('/properties');
    const propertyCount = await page.textContent('[data-testid=property-count]');
    expect(propertyCount).toContain('properties');
    
    // Verify the new property appears in the list
    const firstProperty = await page.locator('[data-testid=property-item]:first-child');
    expect(await firstProperty.locator('[data-testid=property-address]').textContent()).toContain('ROSEMARY HEIGHTS');
  });

  test('Manual property entry workflow', async ({ page }) => {
    await goToAddProperty(page);
    
    // Fill property details manually
    await page.fill('[data-testid=address]', '456 Manual Entry Street, Vancouver, BC');
    await page.fill('[data-testid=price]', '850000');
    await page.fill('[data-testid=beds]', '2');
    await page.fill('[data-testid=baths]', '2');
    await page.fill('[data-testid=sqft]', '1100');
    await page.fill('[data-testid=lot-size]', '0.15');
    await page.fill('[data-testid=year-built]', '2010');
    
    // Add property details
    await page.fill('[data-testid=property-type]', 'Townhouse');
    await page.selectOption('[data-testid=status-select]', 'active');
    
    // Save without AI analysis
    await saveProperty(page);
    
    // Verify success
    await page.goto('/properties');
    expect(await page.locator('[data-testid=property-item]').filter({ hasText: 'Manual Entry Street' }).isVisible()).toBe(true);
  });

  test('Property addition with validation errors', async ({ page }) => {
    await goToAddProperty(page);
    
    // Try to save without required fields
    await page.click('[data-testid=save-property-btn]');
    
    // Should show validation errors
    await page.waitForSelector('[data-testid=validation-error]');
    expect(await page.locator('[data-testid=validation-error]').isVisible()).toBe(true);
    
    // Fill minimum required fields
    await page.fill('[data-testid=address]', '123 Validation Test St');
    await page.fill('[data-testid=price]', '600000');
    
    // Now save should work
    await saveProperty(page);
  });

  test('Property editing workflow', async ({ page }) => {
    // First create a property
    await goToAddProperty(page);
    await page.fill('[data-testid=address]', '789 Edit Test Avenue, Burnaby');
    await page.fill('[data-testid=price]', '700000');
    await page.fill('[data-testid=beds]', '3');
    await saveProperty(page);
    
    // Go to property list and edit
    await page.goto('/properties');
    await page.click('[data-testid=property-item]:first-child [data-testid=edit-property-btn]');
    
    // Edit property details
    await page.fill('[data-testid=price]', '725000');
    await page.fill('[data-testid=beds]', '4');
    
    // Save changes
    await page.click('[data-testid=save-property-btn]');
    await page.waitForSelector('[data-testid=success-notification]');
    
    // Verify changes were saved
    await page.goto('/properties');
    const propertyItem = page.locator('[data-testid=property-item]:first-child');
    expect(await propertyItem.locator('[data-testid=property-price]').textContent()).toContain('$725,000');
    expect(await propertyItem.locator('[data-testid=property-beds]').textContent()).toContain('4');
  });

  test('Property deletion workflow', async ({ page }) => {
    // Create a property to delete
    await goToAddProperty(page);
    await page.fill('[data-testid=address]', '999 Delete Me Street, Surrey');
    await page.fill('[data-testid=price]', '500000');
    await saveProperty(page);
    
    // Go to properties list
    await page.goto('/properties');
    const initialCount = await page.locator('[data-testid=property-item]').count();
    
    // Delete the property
    await page.click('[data-testid=property-item]:first-child [data-testid=delete-property-btn]');
    
    // Confirm deletion
    await page.click('[data-testid=confirm-delete-btn]');
    await page.waitForSelector('[data-testid=success-notification]');
    
    // Verify property count decreased
    const finalCount = await page.locator('[data-testid=property-item]').count();
    expect(finalCount).toBe(initialCount - 1);
  });

  test('Property status updates workflow', async ({ page }) => {
    // Create a property
    await goToAddProperty(page);
    await page.fill('[data-testid=address]', '111 Status Test Road, Coquitlam');
    await page.fill('[data-testid=price]', '800000');
    await page.selectOption('[data-testid=status-select]', 'active');
    await saveProperty(page);
    
    // Go to properties list and change status
    await page.goto('/properties');
    await page.click('[data-testid=property-item]:first-child [data-testid=status-dropdown]');
    await page.selectOption('[data-testid=property-item]:first-child [data-testid=status-dropdown]', 'viewed');
    
    // Verify status change
    await page.waitForSelector('[data-testid=success-notification]');
    const statusBadge = page.locator('[data-testid=property-item]:first-child [data-testid=status-badge]');
    expect(await statusBadge.textContent()).toContain('Viewed');
  });

  test('Bulk property operations', async ({ page }) => {
    // Create multiple properties for bulk operations
    const properties = [
      { address: '100 Bulk Test St A', price: '600000' },
      { address: '200 Bulk Test St B', price: '700000' },
      { address: '300 Bulk Test St C', price: '800000' }
    ];
    
    for (const property of properties) {
      await goToAddProperty(page);
      await page.fill('[data-testid=address]', property.address);
      await page.fill('[data-testid=price]', property.price);
      await saveProperty(page);
    }
    
    // Go to properties list and select multiple properties
    await page.goto('/properties');
    await page.click('[data-testid=property-item]:nth-child(1) [data-testid=select-checkbox]');
    await page.click('[data-testid=property-item]:nth-child(2) [data-testid=select-checkbox]');
    
    // Perform bulk status update
    await page.click('[data-testid=bulk-actions-btn]');
    await page.selectOption('[data-testid=bulk-status-select]', 'archived');
    await page.click('[data-testid=apply-bulk-action-btn]');
    
    // Verify bulk update success
    await page.waitForSelector('[data-testid=success-notification]');
    expect(await page.locator('[data-testid=property-item]:nth-child(1) [data-testid=status-badge]').textContent()).toContain('Archived');
    expect(await page.locator('[data-testid=property-item]:nth-child(2) [data-testid=status-badge]').textContent()).toContain('Archived');
  });
});