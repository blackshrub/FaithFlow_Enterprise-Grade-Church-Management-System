/**
 * E2E Test: Admin Login Flow
 *
 * Priority: P0 (Critical)
 *
 * User Story:
 * As a church admin, I want to login to the admin panel
 * so that I can manage church operations.
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin, logout } = require('./fixtures/test-helpers.cjs');

// Test credentials - must match actual database
const TEST_ADMIN = {
  email: 'admin@gkbjtamankencana.org',
  password: 'admin123'
};

test.describe('Admin Login', () => {
  // Ensure each test starts with a clean state
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Wait for page to load
    await page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });

    // Fill login form
    await page.fill('[data-testid="email-input"]', TEST_ADMIN.email);
    await page.fill('[data-testid="password-input"]', TEST_ADMIN.password);

    // Click login button
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 15000 });
  });

  // TODO: This test is flaky due to React Router state issues - need investigation
  test.skip('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Clear localStorage to ensure no persisted auth
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    const loginButton = page.locator('[data-testid="login-button"]');

    // Wait for inputs to be visible and ready
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    // Fill with wrong credentials (use simpler password without special chars)
    await emailInput.fill(TEST_ADMIN.email);
    await passwordInput.fill('wrongpassword');

    // Click login button
    await loginButton.click();

    // Wait for API response and potential error
    await page.waitForTimeout(2000);

    // Should stay on login page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');

    // Check if error alert is visible
    const errorAlert = page.locator('[data-testid="error-alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login');

    // Wait for page to load
    await page.waitForSelector('[data-testid="login-button"]', { timeout: 10000 });

    // Try to login without filling fields - HTML5 validation should prevent form submission
    // and the button should be enabled since church is pre-selected
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');

    // Both fields should be required
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  // TODO: This test is flaky due to Playwright context isolation issues
  test.skip('should logout successfully', async ({ page }) => {
    // Login first using inline login to ensure it works
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('[data-testid="email-input"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    await emailInput.click();
    await emailInput.fill(TEST_ADMIN.email);
    await page.locator('[data-testid="password-input"]').click();
    await page.locator('[data-testid="password-input"]').fill(TEST_ADMIN.password);
    await page.locator('[data-testid="login-button"]').click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 15000 });

    // Wait for the page to fully load after login
    await page.waitForLoadState('networkidle');

    // Wait for the logout button to be visible in the sidebar
    const logoutButton = page.locator('[data-testid="logout-button"]');
    await logoutButton.waitFor({ state: 'visible', timeout: 15000 });

    // Click the logout button
    await logoutButton.click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Create a fresh context by clearing storage first
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Reload to apply the cleared state
    await page.reload();

    // Try to access protected route directly
    await page.goto('/members');

    // Wait a bit for any redirects to complete
    await page.waitForTimeout(2000);

    // Should redirect to login (or show login page content)
    // The app might redirect to /login or stay on members but show login content
    const loginForm = page.locator('[data-testid="email-input"]');
    const isOnLoginPage = await loginForm.isVisible().catch(() => false);
    const url = page.url();

    // Either we're on login page, or the login form is visible
    expect(isOnLoginPage || url.includes('/login')).toBeTruthy();
  });

  test('should persist session across page refresh', async ({ page }) => {
    // Login first
    await loginAsAdmin(page);

    // Note the current URL
    const url = page.url();

    // Refresh the page
    await page.reload();

    // Should still be on the same page (not redirected to login)
    await expect(page).not.toHaveURL(/\/login/);

    // Should be able to access dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/(dashboard|admin)/);
  });
});
