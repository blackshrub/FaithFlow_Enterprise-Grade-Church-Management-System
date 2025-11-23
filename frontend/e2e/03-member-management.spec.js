/**
 * E2E Test: Member Management
 *
 * Priority: P0 (Critical)
 *
 * User Story:
 * As a church admin, I want to create and manage members
 * so that I can track church membership.
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin, generateTestData, waitForToast } = require('./fixtures/test-helpers');

test.describe('Member Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/members');
  });

  test('should create new member', async ({ page }) => {
    const testData = generateTestData();

    // Click add member button
    await page.click('[data-testid="add-member-button"]');

    // Wait for modal or new page
    await expect(page.locator('h2:has-text("Add Member")')).toBeVisible();

    // Fill member form
    await page.fill('[data-testid="fullname-input"]', testData.fullName);
    await page.fill('[data-testid="email-input"]', testData.email);
    await page.fill('[data-testid="phone-input"]', testData.phone);

    // Select gender
    await page.selectOption('[data-testid="gender-select"]', 'Male');

    // Fill date of birth
    await page.fill('[data-testid="dob-input"]', '1990-05-15');

    // Submit form
    await page.click('[data-testid="submit-member-button"]');

    // Wait for success message
    await waitForToast(page, 'Member created successfully');

    // Should redirect to members list or show new member
    await expect(page.locator(`text=${testData.fullName}`)).toBeVisible({ timeout: 5000 });
  });

  test('should search for members', async ({ page }) => {
    // Type in search box
    await page.fill('[data-testid="search-input"]', 'John');

    // Wait for search results
    await page.waitForTimeout(500); // Debounce delay

    // Should show only matching members
    const results = page.locator('[data-testid="member-row"]');
    await expect(results.first()).toBeVisible();

    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    await page.waitForTimeout(500);
  });

  test('should filter members by status', async ({ page }) => {
    // Open filter dropdown
    await page.click('[data-testid="filter-button"]');

    // Select status filter
    await page.click('[data-testid="filter-status-active"]');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify filtered results shown
    await expect(page.locator('[data-testid="active-badge"]').first()).toBeVisible();
  });

  test('should view member details', async ({ page }) => {
    // Click on first member
    await page.click('[data-testid="member-row"]');

    // Should show member detail page/modal
    await expect(page.locator('[data-testid="member-detail"]')).toBeVisible();

    // Should show member information
    await expect(page.locator('[data-testid="member-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="member-email"]')).toBeVisible();
  });

  test('should edit member information', async ({ page }) => {
    // Click on first member
    await page.click('[data-testid="member-row"]');

    // Click edit button
    await page.click('[data-testid="edit-member-button"]');

    // Wait for edit form
    await expect(page.locator('h2:has-text("Edit Member")')).toBeVisible();

    // Update member info
    const newPhone = '+6289876543210';
    await page.fill('[data-testid="phone-input"]', newPhone);

    // Save changes
    await page.click('[data-testid="save-member-button"]');

    // Wait for success
    await waitForToast(page, 'Member updated successfully');

    // Verify changes saved
    await expect(page.locator(`text=${newPhone}`)).toBeVisible();
  });

  test('should delete member', async ({ page }) => {
    const testData = generateTestData();

    // Create a member to delete
    await page.click('[data-testid="add-member-button"]');
    await page.fill('[data-testid="fullname-input"]', testData.fullName);
    await page.fill('[data-testid="email-input"]', testData.email);
    await page.selectOption('[data-testid="gender-select"]', 'Male');
    await page.click('[data-testid="submit-member-button"]');

    await waitForToast(page, 'Member created successfully');

    // Find and click on the member
    await page.click(`[data-testid="member-row"]:has-text("${testData.fullName}")`);

    // Click delete button
    await page.click('[data-testid="delete-member-button"]');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');

    // Wait for success
    await waitForToast(page, 'Member deleted successfully');

    // Member should be removed from list
    await expect(page.locator(`text=${testData.fullName}`)).not.toBeVisible();
  });

  test('should paginate member list', async ({ page }) => {
    // Verify pagination controls exist
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();

    // Click next page
    await page.click('[data-testid="next-page-button"]');

    // URL should update
    await expect(page).toHaveURL(/page=2/);

    // Click previous page
    await page.click('[data-testid="previous-page-button"]');

    await expect(page).toHaveURL(/page=1/);
  });

  test('should export members to CSV', async ({ page }) => {
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-members-button"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('members');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should validate member form', async ({ page }) => {
    await page.click('[data-testid="add-member-button"]');

    // Try to submit empty form
    await page.click('[data-testid="submit-member-button"]');

    // Should show validation errors
    await expect(page.locator('text=Full name is required')).toBeVisible();
    await expect(page.locator('text=Gender is required')).toBeVisible();
  });

  test('should show member QR code', async ({ page }) => {
    // Click on first member
    await page.click('[data-testid="member-row"]');

    // Click show QR code button
    await page.click('[data-testid="show-qr-button"]');

    // QR code should be displayed
    await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible();

    // Can download QR code
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-qr-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });
});
