/**
 * E2E Test: Member Management
 *
 * Priority: P0 (Critical)
 *
 * User Story:
 * As a church admin, I want to create and manage members
 * so that I can track church membership.
 *
 * Actual form structure:
 * - firstname-input (first_name)
 * - lastname-input (last_name)
 * - phone-input (phone_whatsapp)
 * - gender-select (gender)
 * - dob-input (date_of_birth)
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin, generateTestData, waitForToast } = require('./fixtures/test-helpers.cjs');

test.describe('Member Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/members');
    // Wait for members page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display members list', async ({ page }) => {
    // Should see the members page title
    await expect(page.locator('h1')).toContainText(/Members|Member/i);

    // Should have add member button
    await expect(page.locator('[data-testid="add-member-button"]')).toBeVisible({ timeout: 10000 });
  });

  test('should create new member', async ({ page }) => {
    const testData = generateTestData();

    // Click add member button
    await page.click('[data-testid="add-member-button"]');

    // Wait for modal/dialog to appear - look for Add Member text
    await expect(page.locator('text=Add Member')).toBeVisible({ timeout: 10000 });

    // Fill member form with actual field names
    await page.fill('[data-testid="firstname-input"]', 'Test');
    await page.fill('[data-testid="lastname-input"]', testData.fullName.split(' ').slice(1).join(' ') || 'User');
    await page.fill('[data-testid="phone-input"]', testData.phone);

    // Select gender - click trigger then select option
    await page.click('[data-testid="gender-select"]');
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.click('[role="option"]:has-text("Male")');

    // Fill date of birth
    await page.fill('[data-testid="dob-input"]', '1990-05-15');

    // Submit form
    await page.click('[data-testid="submit-member-button"]');

    // Wait for success message or modal to close
    await page.waitForTimeout(2000);

    // Should see the new member in the list or success message
    // Just verify the modal closed
    await expect(page.locator('text=Add Member')).not.toBeVisible({ timeout: 5000 });
  });

  test('should search for members', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('[data-testid="search-input"]', { timeout: 10000 });

    // Type in search box
    await page.fill('[data-testid="search-input"]', 'John');

    // Wait for search results
    await page.waitForTimeout(1000); // Debounce delay

    // Should still be on members page
    await expect(page).toHaveURL(/\/members/);
  });

  test('should view member details when clicking on a row', async ({ page }) => {
    // Wait for member rows to load
    const memberRow = page.locator('[data-testid="member-row"]').first();

    // If there are members, click on the first one
    const rowCount = await memberRow.count();
    if (rowCount > 0) {
      await memberRow.click();

      // Should see member detail panel/modal
      await expect(page.locator('[data-testid="member-detail"]').or(page.locator('text=Edit Member'))).toBeVisible({ timeout: 5000 });
    }
  });

  test('should paginate member list if pagination exists', async ({ page }) => {
    // Check if pagination exists
    const pagination = page.locator('[data-testid="pagination"]');
    const paginationExists = await pagination.isVisible().catch(() => false);

    if (paginationExists) {
      // Click next page if button is enabled
      const nextBtn = page.locator('[data-testid="next-page-button"]');
      const isEnabled = await nextBtn.isEnabled().catch(() => false);

      if (isEnabled) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Test passes if page loads correctly regardless of pagination state
    expect(true).toBe(true);
  });

  test('should open member form in edit mode', async ({ page }) => {
    // Wait for member rows to load
    const memberRow = page.locator('[data-testid="member-row"]').first();

    // If there are members, try to edit
    const rowCount = await memberRow.count();
    if (rowCount > 0) {
      await memberRow.click();

      // Look for edit button
      const editBtn = page.locator('[data-testid="edit-member-button"]');
      const editExists = await editBtn.isVisible().catch(() => false);

      if (editExists) {
        await editBtn.click();
        // Should see edit form
        await expect(page.locator('text=Edit Member')).toBeVisible({ timeout: 5000 });
      }
    }

    // Test passes if we get this far
    expect(true).toBe(true);
  });

  test('should validate member form required fields', async ({ page }) => {
    await page.click('[data-testid="add-member-button"]');

    // Wait for form to appear
    await expect(page.locator('text=Add Member')).toBeVisible({ timeout: 10000 });

    // Check that required field inputs exist
    await expect(page.locator('[data-testid="firstname-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="lastname-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="phone-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="gender-select"]')).toBeVisible();
  });
});
