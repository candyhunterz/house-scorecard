import { expect } from '@playwright/test';

/**
 * Login helper function
 * @param {import('@playwright/test').Page} page - The page object
 * @param {string} username - Username (default: 'admin')  
 * @param {string} password - Password (default: 'password')
 */
export async function loginAs(page, username = 'admin', password = 'password') {
  await page.goto('/');
  await page.fill('[data-testid=username]', username);
  await page.fill('[data-testid=password]', password);
  await page.click('[data-testid=login-btn]');
  await page.waitForURL('/dashboard');
}

/**
 * Add property with auto-fill helper
 * @param {import('@playwright/test').Page} page - The page object
 * @param {string} url - Property listing URL
 */
export async function addPropertyWithAutoFill(page, url) {
  await page.goto('/add-property');
  await page.fill('[data-testid=listing-url]', url);
  await page.click('[data-testid=auto-fill-btn]');
  await page.waitForSelector('[data-testid=success-notification]', { timeout: 10000 });
}

/**
 * Wait for auto-fill to complete
 * @param {import('@playwright/test').Page} page - The page object
 */
export async function waitForAutoFillComplete(page) {
  await page.waitForSelector('[data-testid=success-notification]', { timeout: 15000 });
  // Wait for form fields to be populated
  await page.waitForFunction(() => {
    const address = document.querySelector('[data-testid=address]')?.value;
    return address && address.length > 0;
  });
}

/**
 * Wait for AI analysis to complete
 * @param {import('@playwright/test').Page} page - The page object
 */
export async function waitForAIAnalysisComplete(page) {
  await page.waitForSelector('[data-testid=analysis-complete]', { timeout: 30000 });
}

/**
 * Navigate to property list and verify count
 * @param {import('@playwright/test').Page} page - The page object
 * @param {number} expectedCount - Expected property count
 */
export async function verifyPropertyCount(page, expectedCount) {
  await page.goto('/properties');
  await page.waitForSelector('[data-testid=property-count]');
  const countText = await page.textContent('[data-testid=property-count]');
  expect(countText).toContain(`${expectedCount} properties`);
}

/**
 * Fill property details manually
 * @param {import('@playwright/test').Page} page - The page object
 * @param {Object} propertyData - Property data object
 */
export async function fillPropertyDetails(page, propertyData) {
  if (propertyData.address) {
    await page.fill('[data-testid=address]', propertyData.address);
  }
  if (propertyData.price) {
    await page.fill('[data-testid=price]', propertyData.price.toString());
  }
  if (propertyData.beds) {
    await page.fill('[data-testid=beds]', propertyData.beds.toString());
  }
  if (propertyData.baths) {
    await page.fill('[data-testid=baths]', propertyData.baths.toString());
  }
  if (propertyData.sqft) {
    await page.fill('[data-testid=sqft]', propertyData.sqft.toString());
  }
}

/**
 * Navigate to add property page
 * @param {import('@playwright/test').Page} page - The page object
 */
export async function goToAddProperty(page) {
  await page.goto('/properties');
  await page.click('[data-testid=add-property-btn]');
  await page.waitForURL('/add-property');
}

/**
 * Save property and verify success
 * @param {import('@playwright/test').Page} page - The page object
 */
export async function saveProperty(page) {
  await page.click('[data-testid=save-property-btn]');
  await page.waitForSelector('[data-testid=success-notification]');
}

/**
 * Wait for loading spinner to disappear
 * @param {import('@playwright/test').Page} page - The page object
 */
export async function waitForLoading(page) {
  await page.waitForSelector('[data-testid=loading-spinner]', { state: 'hidden' });
}