/**
 * E2E Test: Kiosk Member Registration Flow
 *
 * Priority: P0 (Critical)
 *
 * User Story:
 * As a first-time visitor, I want to register at the kiosk
 * so that I can check in and receive a QR code.
 */

const { test, expect } = require('@playwright/test');
const { generateTestData } = require('./fixtures/test-helpers');

test.describe('Kiosk Member Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to kiosk page
    await page.goto('/kiosk');

    // Verify kiosk page loaded
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should register new member successfully', async ({ page }) => {
    const testData = generateTestData();

    // Step 1: Enter phone number
    await page.fill('[data-testid="phone-input"]', testData.phone);
    await page.click('[data-testid="send-otp-button"]');

    // Wait for OTP sent confirmation
    await expect(page.locator('[role="status"]')).toContainText('OTP sent');

    // Step 2: Enter OTP (use test OTP in development)
    await page.fill('[data-testid="otp-input"]', '000000');
    await page.click('[data-testid="verify-otp-button"]');

    // Step 3: Fill registration form
    await page.fill('[data-testid="fullname-input"]', testData.fullName);
    await page.selectOption('[data-testid="gender-select"]', 'Male');

    // Fill date of birth
    await page.fill('[data-testid="dob-input"]', '1990-01-15');

    // Optional: Take photo (skip in test)
    await page.click('[data-testid="skip-photo-button"]');

    // Step 4: Submit registration
    await page.click('[data-testid="submit-registration-button"]');

    // Wait for success and QR code
    await expect(page.locator('[data-testid="qr-code"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Registration successful')).toBeVisible();

    // Verify member can download QR code
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-qr-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.png');
  });

  test('should handle existing member phone number', async ({ page }) => {
    // Use pre-existing test member phone
    const existingPhone = '+6281234567890';

    await page.fill('[data-testid="phone-input"]', existingPhone);
    await page.click('[data-testid="send-otp-button"]');

    // Verify OTP sent
    await expect(page.locator('[role="status"]')).toContainText('OTP sent');

    // Enter OTP
    await page.fill('[data-testid="otp-input"]', '000000');
    await page.click('[data-testid="verify-otp-button"]');

    // Should show existing member information
    await expect(page.locator('[data-testid="existing-member-info"]')).toBeVisible();
    await expect(page.locator('text=Welcome back')).toBeVisible();

    // Can proceed to check-in
    await page.click('[data-testid="checkin-button"]');
    await expect(page.locator('text=Checked in successfully')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    const testData = generateTestData();

    // Complete phone verification
    await page.fill('[data-testid="phone-input"]', testData.phone);
    await page.click('[data-testid="send-otp-button"]');
    await page.fill('[data-testid="otp-input"]', '000000');
    await page.click('[data-testid="verify-otp-button"]');

    // Try to submit without filling required fields
    await page.click('[data-testid="submit-registration-button"]');

    // Should show validation errors
    await expect(page.locator('text=Full name is required')).toBeVisible();
    await expect(page.locator('text=Gender is required')).toBeVisible();
  });

  test('should handle incorrect OTP', async ({ page }) => {
    const testData = generateTestData();

    await page.fill('[data-testid="phone-input"]', testData.phone);
    await page.click('[data-testid="send-otp-button"]');

    // Enter wrong OTP
    await page.fill('[data-testid="otp-input"]', '999999');
    await page.click('[data-testid="verify-otp-button"]');

    // Should show error
    await expect(page.locator('text=Invalid OTP')).toBeVisible();
  });

  test('should allow retrying OTP', async ({ page }) => {
    const testData = generateTestData();

    await page.fill('[data-testid="phone-input"]', testData.phone);
    await page.click('[data-testid="send-otp-button"]');

    // Wait a moment
    await page.waitForTimeout(2000);

    // Click resend
    await page.click('[data-testid="resend-otp-button"]');

    // Should show OTP resent message
    await expect(page.locator('text=OTP resent')).toBeVisible();
  });
});
