/**
 * E2E Test Helpers and Utilities
 *
 * Common functions for Playwright tests.
 */

/**
 * Login as admin user
 */
export async function loginAsAdmin(page) {
  await page.goto('/login');

  await page.fill('[data-testid="email-input"]', 'admin@test.org');
  await page.fill('[data-testid="password-input"]', 'TestAdmin123!');

  await page.click('[data-testid="login-button"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 5000 });
}

/**
 * Login as staff user
 */
export async function loginAsStaff(page) {
  await page.goto('/login');

  await page.fill('[data-testid="email-input"]', 'staff@test.org');
  await page.fill('[data-testid="password-input"]', 'TestStaff123!');

  await page.click('[data-testid="login-button"]');

  await page.waitForURL('/dashboard', { timeout: 5000 });
}

/**
 * Logout current user
 */
export async function logout(page) {
  await page.click('[data-testid="user-menu-trigger"]');
  await page.click('[data-testid="logout-button"]');

  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Navigate to a specific page
 */
export async function navigateTo(page, routeName) {
  const routes = {
    dashboard: '/dashboard',
    members: '/members',
    events: '/events',
    kiosk: '/kiosk',
    counseling: '/counseling',
    prayerRequests: '/prayer-requests',
    settings: '/settings',
  };

  const url = routes[routeName] || routeName;
  await page.goto(url);
}

/**
 * Fill form field by label
 */
export async function fillField(page, label, value) {
  const input = page.locator(`label:has-text("${label}") ~ input, label:has-text("${label}") ~ textarea, label:has-text("${label}") ~ select`).first();
  await input.fill(value);
}

/**
 * Click button by text
 */
export async function clickButton(page, text) {
  await page.click(`button:has-text("${text}")`);
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page, message) {
  const toast = page.locator('[role="status"]', { hasText: message });
  await toast.waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(page, urlPattern, method = 'GET') {
  return await page.waitForResponse(
    response => response.url().includes(urlPattern) && response.request().method() === method,
    { timeout: 10000 }
  );
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();

  return {
    email: `test${timestamp}@example.com`,
    fullName: `Test User ${timestamp}`,
    phone: `+628${timestamp.toString().slice(-9)}`,
    title: `Test Title ${timestamp}`,
    description: `Test description created at ${new Date().toISOString()}`,
  };
}

/**
 * Take screenshot with custom name
 */
export async function takeScreenshot(page, name) {
  await page.screenshot({
    path: `./test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Check if element exists
 */
export async function elementExists(page, selector) {
  return await page.locator(selector).count() > 0;
}

/**
 * Select option from dropdown
 */
export async function selectOption(page, label, value) {
  const select = page.locator(`label:has-text("${label}") ~ select`).first();
  await select.selectOption(value);
}

/**
 * Upload file
 */
export async function uploadFile(page, inputSelector, filePath) {
  const fileInput = page.locator(inputSelector);
  await fileInput.setInputFiles(filePath);
}

/**
 * Wait for loading to finish
 */
export async function waitForLoading(page) {
  // Wait for loading spinner to disappear
  const spinner = page.locator('[data-testid="loading-spinner"]');
  await spinner.waitFor({ state: 'hidden', timeout: 10000 });
}
