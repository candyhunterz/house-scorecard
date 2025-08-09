import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/test-helpers.js';

test.describe('Criteria Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('Create, edit, and delete criteria', async ({ page }) => {
    await page.goto('/criteria');

    // Create new Must Have criterion
    await page.fill('[data-testid=criterion-text-mustHave]', 'Good schools nearby');
    await page.fill('[data-testid=criterion-category-mustHave]', 'Location');
    await page.selectOption('[data-testid=criterion-scale-mustHave]', 'scale10');
    await page.fill('[data-testid=criterion-weight-mustHave]', '8');
    await page.click('[data-testid=add-criterion-btn-mustHave]');

    // Verify criterion was added
    await page.waitForSelector('[data-testid=success-notification]');
    expect(await page.locator('[data-testid=criteria-list] .criterion-item').count()).toBeGreaterThan(0);
    expect(await page.locator('text=Good schools nearby').isVisible()).toBe(true);

    // Edit the criterion
    await page.click('[data-testid=edit-criterion-btn]:first-child');
    await page.fill('[data-testid=edit-criterion-text]', 'Excellent schools nearby');
    await page.fill('[data-testid=edit-criterion-weight]', '9');
    await page.click('[data-testid=save-criterion-btn]');

    // Verify criterion was updated
    await page.waitForSelector('[data-testid=success-notification]');
    expect(await page.locator('text=Excellent schools nearby').isVisible()).toBe(true);

    // Delete the criterion
    await page.click('[data-testid=delete-criterion-btn]:first-child');
    await page.click('[data-testid=confirm-delete-btn]');

    // Verify criterion was deleted
    await page.waitForSelector('[data-testid=success-notification]');
    expect(await page.locator('text=Excellent schools nearby').isVisible()).toBe(false);
  });

  test('Create Nice to Have criterion', async ({ page }) => {
    await page.goto('/criteria');

    // Add Nice to Have criterion
    await page.fill('[data-testid=criterion-text-niceToHave]', 'Swimming pool');
    await page.fill('[data-testid=criterion-category-niceToHave]', 'Amenities');
    await page.selectOption('[data-testid=criterion-scale-niceToHave]', 'boolean');
    await page.fill('[data-testid=criterion-weight-niceToHave]', '5');
    await page.click('[data-testid=add-criterion-btn-niceToHave]');

    // Verify criterion was added to Nice to Have section
    await page.waitForSelector('[data-testid=success-notification]');
    expect(await page.locator('[data-testid=nice-to-have-criteria] text=Swimming pool').isVisible()).toBe(true);
  });

  test('Create Deal Breaker criterion', async ({ page }) => {
    await page.goto('/criteria');

    // Add Deal Breaker criterion
    await page.fill('[data-testid=criterion-text-dealBreaker]', 'On a busy main road');
    await page.fill('[data-testid=criterion-category-dealBreaker]', 'Location');
    await page.click('[data-testid=add-criterion-btn-dealBreaker]');

    // Verify criterion was added to Deal Breakers section
    await page.waitForSelector('[data-testid=success-notification]');
    expect(await page.locator('[data-testid=deal-breaker-criteria] text=On a busy main road').isVisible()).toBe(true);
  });

  test('Weight adjustment validation', async ({ page }) => {
    await page.goto('/criteria');

    // Try to add criterion with invalid weight
    await page.fill('[data-testid=criterion-text-mustHave]', 'Test criterion');
    await page.fill('[data-testid=criterion-weight-mustHave]', '15'); // Invalid: > 10
    await page.click('[data-testid=add-criterion-btn-mustHave]');

    // Should show validation error
    await page.waitForSelector('[data-testid=validation-error]');
    expect(await page.locator('[data-testid=validation-error]').isVisible()).toBe(true);
  });

  test('Category management', async ({ page }) => {
    await page.goto('/criteria');

    // Add criterion with new category
    await page.fill('[data-testid=criterion-text-mustHave]', 'Test criterion');
    await page.fill('[data-testid=criterion-category-mustHave]', 'New Category');
    await page.fill('[data-testid=criterion-weight-mustHave]', '7');
    await page.click('[data-testid=add-criterion-btn-mustHave]');

    await page.waitForSelector('[data-testid=success-notification]');

    // Add another criterion and verify category appears in autocomplete
    await page.fill('[data-testid=criterion-text-mustHave]', 'Another test criterion');
    await page.click('[data-testid=criterion-category-mustHave]');
    
    // Category should appear in datalist
    expect(await page.locator('datalist option[value="New Category"]').isVisible()).toBe(true);
  });

  test('Criteria type changes', async ({ page }) => {
    await page.goto('/criteria');

    // Add a Must Have criterion
    await page.fill('[data-testid=criterion-text-mustHave]', 'Parking space');
    await page.fill('[data-testid=criterion-weight-mustHave]', '6');
    await page.click('[data-testid=add-criterion-btn-mustHave]');

    await page.waitForSelector('[data-testid=success-notification]');

    // Edit and change to Nice to Have
    await page.click('[data-testid=edit-criterion-btn]:first-child');
    await page.selectOption('[data-testid=edit-criterion-type]', 'niceToHave');
    await page.click('[data-testid=save-criterion-btn]');

    // Verify criterion moved to Nice to Have section
    await page.waitForSelector('[data-testid=success-notification]');
    expect(await page.locator('[data-testid=nice-to-have-criteria] text=Parking space').isVisible()).toBe(true);
    expect(await page.locator('[data-testid=must-have-criteria] text=Parking space').isVisible()).toBe(false);
  });

  test('Criteria reordering', async ({ page }) => {
    await page.goto('/criteria');

    // Add multiple criteria
    const criteria = ['First criterion', 'Second criterion', 'Third criterion'];
    
    for (let i = 0; i < criteria.length; i++) {
      await page.fill('[data-testid=criterion-text-mustHave]', criteria[i]);
      await page.fill('[data-testid=criterion-weight-mustHave]', String(5 + i));
      await page.click('[data-testid=add-criterion-btn-mustHave]');
      await page.waitForSelector('[data-testid=success-notification]');
    }

    // Drag and drop to reorder (if implemented)
    const firstItem = page.locator('[data-testid=criterion-item]:first-child');
    const secondItem = page.locator('[data-testid=criterion-item]:nth-child(2)');
    
    await firstItem.dragTo(secondItem);

    // Verify order changed
    const reorderedFirst = await page.locator('[data-testid=criterion-item]:first-child [data-testid=criterion-text]').textContent();
    expect(reorderedFirst).not.toBe('First criterion');
  });

  test('Export and import criteria', async ({ page }) => {
    await page.goto('/criteria');

    // Add some sample criteria
    await page.fill('[data-testid=criterion-text-mustHave]', 'Export test criterion');
    await page.fill('[data-testid=criterion-weight-mustHave]', '8');
    await page.click('[data-testid=add-criterion-btn-mustHave]');
    await page.waitForSelector('[data-testid=success-notification]');

    // Export criteria
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid=export-criteria-btn]')
    ]);

    expect(download.suggestedFilename()).toContain('criteria');

    // Test import button exists (actual file import would require file handling)
    expect(await page.locator('[data-testid=import-criteria-btn]').isVisible()).toBe(true);
  });
});