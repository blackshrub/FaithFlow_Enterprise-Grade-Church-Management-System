/**
 * E2E Test: Event RSVP Flow
 *
 * Priority: P0 (Critical)
 *
 * User Story:
 * As a church admin, I want to create events and manage RSVPs
 * so that I can track event attendance.
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin, generateTestData, waitForToast } = require('./fixtures/test-helpers');

test.describe('Event RSVP', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/events');
  });

  test('should create new event', async ({ page }) => {
    const testData = generateTestData();

    await page.click('[data-testid="add-event-button"]');

    // Fill event form
    await page.fill('[data-testid="event-name-input"]', testData.title);
    await page.fill('[data-testid="event-description-input"]', testData.description);

    // Set event date (future date)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.fill('[data-testid="event-date-input"]', futureDate.toISOString().split('T')[0]);

    // Set time
    await page.fill('[data-testid="start-time-input"]', '10:00');
    await page.fill('[data-testid="end-time-input"]', '12:00');

    // Set location
    await page.fill('[data-testid="location-input"]', 'Main Sanctuary');

    // Set max participants
    await page.fill('[data-testid="max-participants-input"]', '100');

    // Enable RSVP
    await page.check('[data-testid="requires-rsvp-checkbox"]');

    // Submit
    await page.click('[data-testid="submit-event-button"]');

    await waitForToast(page, 'Event created successfully');

    // Should show in events list
    await expect(page.locator(`text=${testData.title}`)).toBeVisible();
  });

  test('should view event details', async ({ page }) => {
    // Click on first event
    await page.click('[data-testid="event-card"]');

    // Should show event details
    await expect(page.locator('[data-testid="event-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-location"]')).toBeVisible();
  });

  test('should create RSVP for member', async ({ page }) => {
    // Click on event
    await page.click('[data-testid="event-card"]');

    // Click add RSVP button
    await page.click('[data-testid="add-rsvp-button"]');

    // Search for member
    await page.fill('[data-testid="member-search-input"]', 'John');
    await page.waitForTimeout(500);

    // Select member from results
    await page.click('[data-testid="member-result"]');

    // Set guest count
    await page.fill('[data-testid="guest-count-input"]', '2');

    // Submit RSVP
    await page.click('[data-testid="submit-rsvp-button"]');

    await waitForToast(page, 'RSVP created successfully');

    // Should show in RSVP list
    await expect(page.locator('[data-testid="rsvp-list"]')).toContainText('John');
  });

  test('should prevent RSVP when event is full', async ({ page }) => {
    // Create event with max 1 participant
    const testData = generateTestData();
    await page.click('[data-testid="add-event-button"]');
    await page.fill('[data-testid="event-name-input"]', testData.title);
    await page.fill('[data-testid="max-participants-input"]', '1');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.fill('[data-testid="event-date-input"]', futureDate.toISOString().split('T')[0]);
    await page.fill('[data-testid="start-time-input"]', '10:00');
    await page.check('[data-testid="requires-rsvp-checkbox"]');
    await page.click('[data-testid="submit-event-button"]');

    await waitForToast(page, 'Event created successfully');

    // Click on the event
    await page.click(`[data-testid="event-card"]:has-text("${testData.title}")`);

    // Create first RSVP
    await page.click('[data-testid="add-rsvp-button"]');
    await page.fill('[data-testid="member-search-input"]', 'John');
    await page.waitForTimeout(500);
    await page.click('[data-testid="member-result"]');
    await page.click('[data-testid="submit-rsvp-button"]');

    // Try to create second RSVP (should fail)
    await page.click('[data-testid="add-rsvp-button"]');
    await page.fill('[data-testid="member-search-input"]', 'Jane');
    await page.waitForTimeout(500);
    await page.click('[data-testid="member-result"]');
    await page.click('[data-testid="submit-rsvp-button"]');

    // Should show error
    await expect(page.locator('text=Event is full')).toBeVisible();
  });

  test('should cancel RSVP', async ({ page }) => {
    // Click on event with RSVPs
    await page.click('[data-testid="event-card"]');

    // Find RSVP row
    const rsvpRow = page.locator('[data-testid="rsvp-row"]').first();
    await expect(rsvpRow).toBeVisible();

    // Click cancel RSVP
    await rsvpRow.locator('[data-testid="cancel-rsvp-button"]').click();

    // Confirm cancellation
    await page.click('[data-testid="confirm-cancel-button"]');

    await waitForToast(page, 'RSVP cancelled');

    // RSVP should be removed or marked as cancelled
    await expect(rsvpRow.locator('text=Cancelled')).toBeVisible();
  });

  test('should record event attendance', async ({ page }) => {
    // Click on event
    await page.click('[data-testid="event-card"]');

    // Click record attendance button
    await page.click('[data-testid="record-attendance-button"]');

    // Search for member
    await page.fill('[data-testid="member-search-input"]', 'John');
    await page.waitForTimeout(500);

    // Select member
    await page.click('[data-testid="member-result"]');

    // Submit attendance
    await page.click('[data-testid="submit-attendance-button"]');

    await waitForToast(page, 'Attendance recorded');

    // Should show in attendance list
    await expect(page.locator('[data-testid="attendance-list"]')).toContainText('John');
  });

  test('should filter events by date', async ({ page }) => {
    // Open filter
    await page.click('[data-testid="filter-button"]');

    // Select upcoming events
    await page.click('[data-testid="filter-upcoming"]');

    // Should show only upcoming events
    const today = new Date();
    const eventCards = page.locator('[data-testid="event-card"]');
    await expect(eventCards.first()).toBeVisible();
  });

  test('should edit event', async ({ page }) => {
    // Click on event
    await page.click('[data-testid="event-card"]');

    // Click edit button
    await page.click('[data-testid="edit-event-button"]');

    // Update event name
    const newName = 'Updated Event Name';
    await page.fill('[data-testid="event-name-input"]', newName);

    // Save
    await page.click('[data-testid="save-event-button"]');

    await waitForToast(page, 'Event updated successfully');

    // Should show updated name
    await expect(page.locator(`text=${newName}`)).toBeVisible();
  });

  test('should delete event', async ({ page }) => {
    const testData = generateTestData();

    // Create event to delete
    await page.click('[data-testid="add-event-button"]');
    await page.fill('[data-testid="event-name-input"]', testData.title);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.fill('[data-testid="event-date-input"]', futureDate.toISOString().split('T')[0]);
    await page.fill('[data-testid="start-time-input"]', '10:00');
    await page.click('[data-testid="submit-event-button"]');

    await waitForToast(page, 'Event created successfully');

    // Click on the event
    await page.click(`[data-testid="event-card"]:has-text("${testData.title}")`);

    // Delete event
    await page.click('[data-testid="delete-event-button"]');
    await page.click('[data-testid="confirm-delete-button"]');

    await waitForToast(page, 'Event deleted successfully');

    // Should not appear in list
    await expect(page.locator(`text=${testData.title}`)).not.toBeVisible();
  });
});
