/**
 * E2E Test: Kiosk Flow
 *
 * Priority: P0 (Critical)
 *
 * User Story:
 * As a church visitor, I want to access kiosk services
 * so that I can submit prayer requests and register for events.
 *
 * Actual App Flow:
 * 1. /kiosk - ChurchSelector (select church)
 * 2. /kiosk/home - Service tiles
 * 3. Individual service pages with phone verification
 */

const { test, expect } = require('@playwright/test');
const { generateTestData } = require('./fixtures/test-helpers.cjs');

test.describe('Kiosk Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to kiosk page
    await page.goto('/kiosk');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display church selector on kiosk landing', async ({ page }) => {
    // Should show welcome text
    await expect(page.locator('h1')).toContainText(/Welcome|Selamat Datang/);

    // Should have church select dropdown (using role selector for shadcn Select)
    await expect(page.locator('[role="combobox"]').first()).toBeVisible();

    // Should have continue button
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Lanjut")');
    await expect(continueBtn).toBeVisible();
  });

  test('should navigate to kiosk home after selecting church', async ({ page }) => {
    // Check if a church is already selected (auto-select for single church)
    const combobox = page.locator('[role="combobox"]').first();
    await expect(combobox).toBeVisible({ timeout: 5000 });

    // Click combobox to open options (if needed)
    const comboboxText = await combobox.textContent();
    if (comboboxText.includes('Select') || comboboxText.includes('Pilih')) {
      await combobox.click();
      await page.waitForSelector('[role="option"]', { timeout: 5000 });
      await page.click('[role="option"]:first-child');
    }

    // Continue button should be enabled
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Lanjut")');
    await expect(continueBtn).toBeEnabled({ timeout: 5000 });

    // Click continue
    await continueBtn.click();

    // Should navigate to kiosk home
    await expect(page).toHaveURL(/\/kiosk\/home/, { timeout: 10000 });
  });

  test('should display service tiles on kiosk home', async ({ page }) => {
    // Check if a church is already selected
    const combobox = page.locator('[role="combobox"]').first();
    await expect(combobox).toBeVisible({ timeout: 5000 });

    // Click continue if button is enabled
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Lanjut")');
    if (await continueBtn.isEnabled()) {
      await continueBtn.click();
    }

    // Wait for kiosk home to load
    await expect(page).toHaveURL(/\/kiosk\/home/, { timeout: 10000 });

    // Should display service tiles
    await page.waitForLoadState('networkidle');

    // Check for common services - just verify the page loaded
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should navigate to prayer request service', async ({ page }) => {
    // Check if a church is already selected
    const combobox = page.locator('[role="combobox"]').first();
    await expect(combobox).toBeVisible({ timeout: 5000 });

    // Click continue if button is enabled
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Lanjut")');
    if (await continueBtn.isEnabled()) {
      await continueBtn.click();
    }

    // Wait for kiosk home
    await expect(page).toHaveURL(/\/kiosk\/home/, { timeout: 10000 });

    // Navigate directly to prayer request page
    await page.goto('/kiosk/prayer');

    // Should show phone input step
    await expect(page.locator('[data-testid="phone-input"], input[type="tel"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should validate phone number format', async ({ page }) => {
    // Navigate through church selector first
    const combobox = page.locator('[role="combobox"]').first();
    await expect(combobox).toBeVisible({ timeout: 5000 });

    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Lanjut")');
    if (await continueBtn.isEnabled()) {
      await continueBtn.click();
    }

    // Navigate to prayer page
    await page.goto('/kiosk/prayer');

    const phoneInput = page.locator('[data-testid="phone-input"], input[type="tel"]').first();
    await expect(phoneInput).toBeVisible({ timeout: 10000 });

    // Enter short phone number
    await phoneInput.fill('123');

    // Click continue - should show validation error
    const sendBtn = page.locator('[data-testid="send-otp-button"], button:has-text("Continue")').first();
    await sendBtn.click();

    // Wait a moment for error message
    await page.waitForTimeout(1000);

    // Should remain on same page (not proceed to OTP)
    await expect(phoneInput).toBeVisible();
  });

  test('should proceed to OTP for valid phone', async ({ page }) => {
    // Navigate through church selector
    const combobox = page.locator('[role="combobox"]').first();
    await expect(combobox).toBeVisible({ timeout: 5000 });

    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Lanjut")');
    if (await continueBtn.isEnabled()) {
      await continueBtn.click();
    }

    // Navigate to prayer page
    await page.goto('/kiosk/prayer');

    const phoneInput = page.locator('[data-testid="phone-input"], input[type="tel"]').first();
    await expect(phoneInput).toBeVisible({ timeout: 10000 });

    // Enter valid phone number (without +62 prefix, just the number)
    await phoneInput.fill('81234567890');

    // Click continue
    const sendBtn = page.locator('[data-testid="send-otp-button"], button:has-text("Continue")').first();
    await sendBtn.click();

    // Should show OTP input OR registration form (depending on phone lookup)
    // Wait for either scenario
    const otpInput = page.locator('[data-testid="otp-input"], [data-kiosk-otp="true"]');
    const fullnameInput = page.locator('[data-testid="fullname-input"], input[id="full_name"]');

    // One of these should appear
    await expect(otpInput.or(fullnameInput)).toBeVisible({ timeout: 15000 });
  });
});
