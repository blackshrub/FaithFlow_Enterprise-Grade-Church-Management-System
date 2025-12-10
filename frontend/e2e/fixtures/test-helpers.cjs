/**
 * E2E Test Helpers and Utilities
 *
 * Common functions for Playwright tests.
 */

const { expect } = require('@playwright/test');

/**
 * Test credentials - using actual admin account from demo
 * Note: These match the credentials shown on the login page
 */
const TEST_ADMIN = {
  email: 'admin@gkbjtamankencana.org',
  password: 'admin123'
};

const TEST_STAFF = {
  email: 'staff@gkbj.church',
  password: 'staff123'
};

/**
 * Login as admin user
 */
async function loginAsAdmin(page) {
  await page.goto('/login');

  // Wait for the login form to be ready
  await page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });

  // Wait for church selector to have a value (auto-selected after API loads)
  // The church select is a shadcn Select component with combobox role
  const churchSelect = page.locator('[data-testid="church-select"]');
  await churchSelect.waitFor({ state: 'visible', timeout: 10000 });

  // Wait for the church dropdown to be populated (not showing placeholder)
  // The select shows "GKBJ TAMAN KENCANA" when loaded
  await page.waitForFunction(() => {
    const select = document.querySelector('[data-testid="church-select"]');
    if (!select) return false;
    const text = select.textContent || '';
    // Should not be empty or just contain placeholder text
    return text.length > 0 && !text.includes('Select') && !text.includes('Pilih');
  }, { timeout: 10000 });

  // Fill login credentials
  await page.fill('[data-testid="email-input"]', TEST_ADMIN.email);
  await page.fill('[data-testid="password-input"]', TEST_ADMIN.password);

  // Ensure login button is enabled
  const loginButton = page.locator('[data-testid="login-button"]');
  await expect(loginButton).toBeEnabled({ timeout: 5000 });

  await loginButton.click();

  // Wait for redirect to dashboard (app redirects to /dashboard after login)
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 });
}

/**
 * Login as staff user
 */
async function loginAsStaff(page) {
  await page.goto('/login');

  // Wait for the login form to be ready
  await page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });

  await page.fill('[data-testid="email-input"]', TEST_STAFF.email);
  await page.fill('[data-testid="password-input"]', TEST_STAFF.password);

  await page.click('[data-testid="login-button"]');

  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 });
}

/**
 * Logout current user
 */
async function logout(page) {
  await page.click('[data-testid="user-menu-trigger"]');
  await page.click('[data-testid="logout-button"]');

  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Navigate to a specific page
 */
async function navigateTo(page, routeName) {
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
async function fillField(page, label, value) {
  const input = page.locator(`label:has-text("${label}") ~ input, label:has-text("${label}") ~ textarea, label:has-text("${label}") ~ select`).first();
  await input.fill(value);
}

/**
 * Click button by text
 */
async function clickButton(page, text) {
  await page.click(`button:has-text("${text}")`);
}

/**
 * Wait for toast notification
 */
async function waitForToast(page, message) {
  const toast = page.locator('[role="status"]', { hasText: message });
  await toast.waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Wait for API response
 */
async function waitForApiResponse(page, urlPattern, method = 'GET') {
  return await page.waitForResponse(
    response => response.url().includes(urlPattern) && response.request().method() === method,
    { timeout: 10000 }
  );
}

/**
 * Generate random test data
 */
function generateTestData() {
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
async function takeScreenshot(page, name) {
  await page.screenshot({
    path: `./test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Check if element exists
 */
async function elementExists(page, selector) {
  return await page.locator(selector).count() > 0;
}

/**
 * Select option from dropdown
 */
async function selectOption(page, label, value) {
  const select = page.locator(`label:has-text("${label}") ~ select`).first();
  await select.selectOption(value);
}

/**
 * Upload file
 */
async function uploadFile(page, inputSelector, filePath) {
  const fileInput = page.locator(inputSelector);
  await fileInput.setInputFiles(filePath);
}

/**
 * Wait for loading to finish
 */
async function waitForLoading(page) {
  // Wait for loading spinner to disappear
  const spinner = page.locator('[data-testid="loading-spinner"]');
  await spinner.waitFor({ state: 'hidden', timeout: 10000 });
}

// Export using CommonJS syntax
module.exports = {
  loginAsAdmin,
  loginAsStaff,
  logout,
  navigateTo,
  fillField,
  clickButton,
  waitForToast,
  waitForApiResponse,
  generateTestData,
  takeScreenshot,
  elementExists,
  selectOption,
  uploadFile,
  waitForLoading,
  TEST_ADMIN,
  TEST_STAFF
};
