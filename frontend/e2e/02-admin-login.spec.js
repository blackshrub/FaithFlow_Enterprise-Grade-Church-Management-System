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
const { loginAsAdmin, logout } = require('./fixtures/test-helpers');

test.describe('Admin Login', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('[data-testid="email-input"]', 'admin@test.org');
    await page.fill('[data-testid="password-input"]', 'TestAdmin123!');

    // Click login button
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Should show welcome message or user name
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill with wrong password
    await page.fill('[data-testid="email-input"]', 'admin@test.org');
    await page.fill('[data-testid="password-input"]', 'WrongPassword123!');

    await page.click('[data-testid="login-button"]');

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login');

    // Try to login without filling fields
    await page.click('[data-testid="login-button"]');

    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await loginAsAdmin(page);

    // Click user menu
    await page.click('[data-testid="user-menu-trigger"]');

    // Click logout
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Try to access protected route
    await page.goto('/members');

    // Should redirect back to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should remember me option persist session', async ({ page, context }) => {
    await page.goto('/login');

    // Fill login form with remember me
    await page.fill('[data-testid="email-input"]', 'admin@test.org');
    await page.fill('[data-testid="password-input"]', 'TestAdmin123!');
    await page.check('[data-testid="remember-me-checkbox"]');

    await page.click('[data-testid="login-button"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Close and reopen browser
    await page.close();
    const newPage = await context.newPage();

    // Should still be logged in
    await newPage.goto('/dashboard');
    await expect(newPage).toHaveURL(/\/dashboard/);
    await expect(newPage.locator('[data-testid="user-name"]')).toBeVisible();
  });

  test('should redirect to intended page after login', async ({ page }) => {
    // Try to access members page while logged out
    await page.goto('/members');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Login
    await page.fill('[data-testid="email-input"]', 'admin@test.org');
    await page.fill('[data-testid="password-input"]', 'TestAdmin123!');
    await page.click('[data-testid="login-button"]');

    // Should redirect to originally intended page (members)
    await expect(page).toHaveURL(/\/members/);
  });

  test('should handle session expiration', async ({ page }) => {
    await loginAsAdmin(page);

    // Simulate session expiration by clearing localStorage
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    // Try to perform an action
    await page.goto('/members');
    await page.click('[data-testid="add-member-button"]');

    // Should redirect to login or show session expired message
    await expect(page.locator('text=Session expired')).toBeVisible({ timeout: 5000 });
  });
});
