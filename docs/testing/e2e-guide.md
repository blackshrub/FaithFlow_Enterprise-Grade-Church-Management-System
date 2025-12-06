# 🎭 E2E Testing Guide - Playwright

Complete guide for running and writing end-to-end tests for FaithFlow using Playwright.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Writing Tests](#writing-tests)
5. [Best Practices](#best-practices)
6. [Debugging](#debugging)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

```bash
cd frontend

# Install dependencies (includes Playwright)
yarn install

# Install Playwright browsers
npx playwright install
```

### Run Your First Test

```bash
# Run all E2E tests (headless)
yarn test:e2e

# Run tests with UI (interactive)
yarn test:e2e:ui

# Run tests in headed mode (see browser)
yarn test:e2e:headed
```

---

## 🏃 Running Tests

### Basic Commands

```bash
# Run all tests (headless, all browsers)
yarn test:e2e

# Run with interactive UI
yarn test:e2e:ui

# Run in headed mode (watch browser)
yarn test:e2e:headed

# Debug mode (step through tests)
yarn test:e2e:debug
```

### Browser-Specific

```bash
# Chromium only
yarn test:e2e:chromium

# Firefox only
yarn test:e2e:firefox

# Safari/WebKit only
yarn test:e2e:webkit

# Mobile viewports only
yarn test:e2e:mobile
```

### Test Selection

```bash
# Run specific test file
npx playwright test e2e/01-kiosk-registration.spec.js

# Run specific test by name
npx playwright test -g "should register new member"

# Run tests matching pattern
npx playwright test e2e/*-admin-*.spec.js
```

### View Reports

```bash
# View HTML report after test run
yarn test:e2e:report

# Report is auto-generated at: playwright-report/index.html
```

---

## 📁 Test Structure

### Directory Layout

```
frontend/
├── e2e/
│   ├── fixtures/
│   │   └── test-helpers.js          # Reusable utilities
│   ├── 01-kiosk-registration.spec.js # Kiosk flow (5 tests)
│   ├── 02-admin-login.spec.js        # Authentication (7 tests)
│   ├── 03-member-management.spec.js  # CRUD operations (11 tests)
│   ├── 04-event-rsvp.spec.js         # Events & RSVP (9 tests)
│   └── 05-prayer-requests.spec.js    # Prayer management (10 tests)
├── playwright.config.js              # Playwright configuration
└── package.json                      # E2E scripts
```

### Test File Naming Convention

- **Priority-based naming:** `01-`, `02-`, `03-` (execution order)
- **Module-based naming:** `kiosk`, `admin`, `member`, `event`, `prayer`
- **Extension:** `.spec.js` (Playwright convention)

**Example:** `03-member-management.spec.js`

---

## ✍️ Writing Tests

### Basic Test Template

```javascript
const { test, expect } = require('@playwright/test');
const { loginAsAdmin, waitForToast } = require('./fixtures/test-helpers');

test.describe('Module Name', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/module-path');
  });

  test('should perform action successfully', async ({ page }) => {
    // Arrange
    const testData = { name: 'Test Name' };

    // Act
    await page.fill('[data-testid="name-input"]', testData.name);
    await page.click('[data-testid="submit-button"]');

    // Assert
    await waitForToast(page, 'Success message');
    await expect(page.locator(`text=${testData.name}`)).toBeVisible();
  });
});
```

### Using Test Helpers

```javascript
const {
  loginAsAdmin,
  loginAsStaff,
  logout,
  waitForToast,
  generateTestData,
  fillField,
  clickButton,
  waitForApiResponse,
  takeScreenshot
} = require('./fixtures/test-helpers');

test('example test', async ({ page }) => {
  // Login
  await loginAsAdmin(page);

  // Generate unique data
  const data = generateTestData();

  // Fill form
  await fillField(page, 'email-input', data.email);
  await clickButton(page, 'submit-button');

  // Wait for API
  await waitForApiResponse(page, '/api/members');

  // Verify toast
  await waitForToast(page, 'Member created successfully');

  // Take screenshot for documentation
  await takeScreenshot(page, 'member-created');
});
```

### Best Practices for Selectors

**✅ Recommended:**

```javascript
// Use data-testid (most stable)
await page.click('[data-testid="submit-button"]');

// Use role-based selectors
await page.getByRole('button', { name: 'Submit' }).click();

// Use label text
await page.getByLabel('Email').fill('test@example.com');
```

**❌ Avoid:**

```javascript
// Don't use CSS classes (fragile)
await page.click('.btn-primary');

// Don't use complex XPath
await page.click('//div[@class="container"]/button[1]');
```

### Handling Async Operations

```javascript
// Wait for navigation
await page.click('[data-testid="login-button"]');
await page.waitForURL('/dashboard');

// Wait for element
await page.waitForSelector('[data-testid="member-list"]');

// Wait for API response
const responsePromise = page.waitForResponse(resp =>
  resp.url().includes('/api/members') && resp.status() === 200
);
await page.click('[data-testid="load-more"]');
await responsePromise;

// Wait for toast notification
await waitForToast(page, 'Success');
```

### Form Testing

```javascript
test('should validate form fields', async ({ page }) => {
  // Submit empty form
  await page.click('[data-testid="submit-button"]');

  // Check validation errors
  await expect(page.locator('[data-testid="name-error"]'))
    .toContainText('Name is required');

  // Fill valid data
  await page.fill('[data-testid="name-input"]', 'John Doe');
  await page.fill('[data-testid="email-input"]', 'john@example.com');

  // Select dropdown
  await page.selectOption('[data-testid="gender-select"]', 'Male');

  // Check checkbox
  await page.check('[data-testid="terms-checkbox"]');

  // Submit
  await page.click('[data-testid="submit-button"]');

  // Verify success
  await waitForToast(page, 'Saved successfully');
});
```

### File Upload Testing

```javascript
test('should upload member photo', async ({ page }) => {
  await page.goto('/members/new');

  // Upload file
  const filePath = path.join(__dirname, 'fixtures', 'test-photo.jpg');
  await page.setInputFiles('[data-testid="photo-input"]', filePath);

  // Verify preview
  await expect(page.locator('[data-testid="photo-preview"]')).toBeVisible();

  // Submit
  await page.click('[data-testid="submit-button"]');

  await waitForToast(page, 'Member created');
});
```

---

## 🎯 Best Practices

### 1. **Independent Tests**

Each test should be completely independent:

```javascript
test.beforeEach(async ({ page }) => {
  // Fresh state for each test
  await loginAsAdmin(page);
  await page.goto('/members');
});

test('test 1', async ({ page }) => {
  // Don't depend on test 2
});

test('test 2', async ({ page }) => {
  // Don't depend on test 1
});
```

### 2. **Use Descriptive Test Names**

```javascript
// ✅ Good
test('should create new member with valid data', async ({ page }) => {});
test('should prevent duplicate email addresses', async ({ page }) => {});

// ❌ Bad
test('test 1', async ({ page }) => {});
test('member creation', async ({ page }) => {});
```

### 3. **Explicit Waits**

```javascript
// ✅ Good - explicit wait
await page.waitForSelector('[data-testid="member-list"]');
await expect(page.locator('[data-testid="member-card"]').first()).toBeVisible();

// ❌ Bad - arbitrary timeout
await page.waitForTimeout(3000);
```

### 4. **Clean Test Data**

```javascript
test('should create member', async ({ page }) => {
  // Use generateTestData() for unique data
  const testData = generateTestData();

  await page.fill('[data-testid="email-input"]', testData.email);
  // ... test continues

  // Clean up if needed
  await page.click('[data-testid="delete-button"]');
});
```

### 5. **Mobile Testing**

Tests automatically run on mobile viewports. Ensure responsive behavior:

```javascript
test('should display mobile menu', async ({ page, isMobile }) => {
  if (isMobile) {
    // Verify hamburger menu
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
  } else {
    // Verify desktop nav
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
  }
});
```

---

## 🐛 Debugging

### Debug Mode

```bash
# Run in debug mode (pauses at each action)
yarn test:e2e:debug

# Debug specific test
npx playwright test e2e/03-member-management.spec.js --debug
```

### Screenshots & Videos

```javascript
// Manual screenshot
await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });

// Automatic screenshots on failure (configured in playwright.config.js)
// Check: test-results/{test-name}/test-failed-1.png
```

Videos are recorded on failure (see `test-results/` folder).

### Console Logs

```javascript
// Listen to console messages
page.on('console', msg => console.log('Browser console:', msg.text()));

// Check for errors
page.on('pageerror', error => console.error('Page error:', error));
```

### Playwright Inspector

```bash
# Open Playwright Inspector
npx playwright test --debug

# Use the UI to:
# - Step through test actions
# - Inspect locators
# - View timeline
# - Check network requests
```

### Trace Viewer

```bash
# Enable trace (already configured on first retry)
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: yarn install

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: yarn test:e2e

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Environment Variables

Set `PLAYWRIGHT_BASE_URL` to test against different environments:

```bash
# Test against staging
PLAYWRIGHT_BASE_URL=https://staging.faithflow.com yarn test:e2e

# Test against production
PLAYWRIGHT_BASE_URL=https://faithflow.com yarn test:e2e
```

---

## 🔧 Troubleshooting

### Issue: "Browser not installed"

**Solution:**
```bash
npx playwright install
```

### Issue: "Timeout waiting for element"

**Causes:**
- Element selector is incorrect
- Element takes longer to load
- Network request is slow

**Solutions:**
```javascript
// Increase timeout for specific action
await page.click('[data-testid="button"]', { timeout: 10000 });

// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Check if element exists first
const exists = await page.locator('[data-testid="button"]').count() > 0;
```

### Issue: "Flaky tests (pass sometimes, fail other times)"

**Solutions:**
1. Use explicit waits instead of `waitForTimeout`
2. Wait for API responses before assertions
3. Enable retries (already configured in `playwright.config.js`)
4. Check for race conditions

```javascript
// ❌ Flaky
await page.click('[data-testid="load-button"]');
await expect(page.locator('[data-testid="data"]')).toBeVisible();

// ✅ Stable
await page.click('[data-testid="load-button"]');
await waitForApiResponse(page, '/api/data');
await expect(page.locator('[data-testid="data"]')).toBeVisible();
```

### Issue: "Tests fail in CI but pass locally"

**Common causes:**
- Different screen resolution → Use configured viewport in `playwright.config.js`
- Missing environment variables → Set in CI config
- Race conditions → Add explicit waits
- Browser differences → Test on all browsers locally first

**Debug CI failures:**
```bash
# Download artifacts from CI
# View HTML report
# Check screenshots/videos in test-results/
```

---

## 📊 Coverage & Reporting

### Current E2E Coverage

**42 E2E tests across 5 critical user flows:**

| Module | Tests | Coverage |
|--------|-------|----------|
| Kiosk Registration | 5 | Registration, OTP, check-in, validation |
| Admin Login | 7 | Auth, logout, session, redirects |
| Member Management | 11 | CRUD, search, filter, export, QR |
| Event & RSVP | 9 | Create, RSVP, attendance, capacity |
| Prayer Requests | 10 | Create, filter, assign, notes, export |
| **Total** | **42** | **70% critical flow coverage** |

### Reports Generated

After running tests:

```bash
# View HTML report
yarn test:e2e:report

# Reports available at:
# - playwright-report/index.html (interactive)
# - test-results/ (screenshots, videos, traces)
```

---

## 🎓 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices Guide](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)

---

## 📝 Next Steps

1. **Run the tests:**
   ```bash
   cd frontend
   yarn install
   npx playwright install
   yarn test:e2e:ui
   ```

2. **Review test coverage:** Check which user flows are tested

3. **Write additional tests:** Follow the patterns in existing test files

4. **Integrate with CI:** Add E2E tests to your CI/CD pipeline

---

**Last Updated:** 2025-01-23
**Test Coverage:** 42 E2E tests (70% critical flows)
**Status:** ✅ Production-Ready
