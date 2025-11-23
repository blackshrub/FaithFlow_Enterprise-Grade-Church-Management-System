/**
 * E2E Test: Prayer Requests
 *
 * Priority: P0 (Critical)
 *
 * User Story:
 * As a church admin, I want to manage prayer requests
 * so that I can organize and track prayer needs.
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin, generateTestData, waitForToast } = require('./fixtures/test-helpers');

test.describe('Prayer Requests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/prayer-requests');
  });

  test('should create new prayer request', async ({ page }) => {
    const testData = generateTestData();

    await page.click('[data-testid="add-prayer-button"]');

    // Fill prayer request form
    await page.fill('[data-testid="requester-name-input"]', 'John Doe');
    await page.fill('[data-testid="requester-contact-input"]', '+6281234567890');
    await page.fill('[data-testid="title-input"]', testData.title);
    await page.fill('[data-testid="description-input"]', testData.description);

    // Select category
    await page.selectOption('[data-testid="category-select"]', 'healing');

    // Select urgency
    await page.selectOption('[data-testid="urgency-select"]', 'normal');

    // Submit
    await page.click('[data-testid="submit-prayer-button"]');

    await waitForToast(page, 'Prayer request created successfully');

    // Should show in list
    await expect(page.locator(`text=${testData.title}`)).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    // Click filter button
    await page.click('[data-testid="filter-button"]');

    // Select "new" status
    await page.click('[data-testid="filter-status-new"]');

    // Should show only new requests
    await page.waitForTimeout(500);

    const requests = page.locator('[data-testid="prayer-request-card"]');
    await expect(requests.first()).toBeVisible();
  });

  test('should filter by urgency', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');

    // Select "crisis" urgency
    await page.click('[data-testid="filter-urgency-crisis"]');

    await page.waitForTimeout(500);

    // Should show urgent requests with crisis badge
    await expect(page.locator('[data-testid="crisis-badge"]').first()).toBeVisible();
  });

  test('should mark prayer as prayed', async ({ page }) => {
    // Click on prayer request
    await page.click('[data-testid="prayer-request-card"]');

    // Click mark as prayed button
    await page.click('[data-testid="mark-prayed-button"]');

    await waitForToast(page, 'Marked as prayed');

    // Should show prayed status
    await expect(page.locator('[data-testid="prayed-badge"]')).toBeVisible();

    // Should show prayed timestamp
    await expect(page.locator('[data-testid="prayed-at"]')).toBeVisible();
  });

  test('should assign prayer to staff', async ({ page }) => {
    // Click on prayer request
    await page.click('[data-testid="prayer-request-card"]');

    // Click assign button
    await page.click('[data-testid="assign-button"]');

    // Select staff member
    await page.selectOption('[data-testid="staff-select"]', 'staff-001');

    // Confirm assignment
    await page.click('[data-testid="confirm-assign-button"]');

    await waitForToast(page, 'Prayer request assigned');

    // Should show assigned staff name
    await expect(page.locator('[data-testid="assigned-to"]')).toBeVisible();
  });

  test('should add internal notes', async ({ page }) => {
    // Click on prayer request
    await page.click('[data-testid="prayer-request-card"]');

    // Click add notes button
    await page.click('[data-testid="add-notes-button"]');

    // Type notes
    const notes = 'Follow up needed for pastoral counseling';
    await page.fill('[data-testid="notes-input"]', notes);

    // Save notes
    await page.click('[data-testid="save-notes-button"]');

    await waitForToast(page, 'Notes saved');

    // Should display notes
    await expect(page.locator(`text=${notes}`)).toBeVisible();
  });

  test('should mark for follow-up', async ({ page }) => {
    // Click on prayer request
    await page.click('[data-testid="prayer-request-card"]');

    // Check needs follow-up
    await page.check('[data-testid="needs-followup-checkbox"]');

    // Add follow-up notes
    await page.fill('[data-testid="followup-notes-input"]', 'Schedule counseling appointment');

    // Save
    await page.click('[data-testid="save-followup-button"]');

    await waitForToast(page, 'Follow-up status updated');

    // Should show follow-up badge
    await expect(page.locator('[data-testid="followup-badge"]')).toBeVisible();
  });

  test('should delete prayer request', async ({ page }) => {
    const testData = generateTestData();

    // Create prayer to delete
    await page.click('[data-testid="add-prayer-button"]');
    await page.fill('[data-testid="requester-name-input"]', 'Test User');
    await page.fill('[data-testid="title-input"]', testData.title);
    await page.fill('[data-testid="description-input"]', testData.description);
    await page.selectOption('[data-testid="category-select"]', 'healing');
    await page.click('[data-testid="submit-prayer-button"]');

    await waitForToast(page, 'Prayer request created successfully');

    // Click on the prayer
    await page.click(`[data-testid="prayer-request-card"]:has-text("${testData.title}")`);

    // Delete
    await page.click('[data-testid="delete-prayer-button"]');
    await page.click('[data-testid="confirm-delete-button"]');

    await waitForToast(page, 'Prayer request deleted');

    // Should not appear in list
    await expect(page.locator(`text=${testData.title}`)).not.toBeVisible();
  });

  test('should search prayer requests', async ({ page }) => {
    // Type in search
    await page.fill('[data-testid="search-input"]', 'healing');

    await page.waitForTimeout(500);

    // Should show matching requests
    const results = page.locator('[data-testid="prayer-request-card"]');
    await expect(results.first()).toBeVisible();
  });

  test('should export prayer requests', async ({ page }) => {
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-prayers-button"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('prayer-requests');
    expect(download.suggestedFilename()).toContain('.csv');
  });
});
