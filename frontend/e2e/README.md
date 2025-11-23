# 🎭 E2E Tests - Quick Reference

End-to-end tests for FaithFlow using Playwright.

## 📊 Test Coverage (42 tests)

| Test Suite | Tests | Description |
|------------|-------|-------------|
| [01-kiosk-registration.spec.js](01-kiosk-registration.spec.js) | 5 | Member registration & check-in |
| [02-admin-login.spec.js](02-admin-login.spec.js) | 7 | Authentication & sessions |
| [03-member-management.spec.js](03-member-management.spec.js) | 11 | CRUD, search, filter, export |
| [04-event-rsvp.spec.js](04-event-rsvp.spec.js) | 9 | Events, RSVP, attendance |
| [05-prayer-requests.spec.js](05-prayer-requests.spec.js) | 10 | Prayer management & workflow |

## 🚀 Quick Start

```bash
# Install dependencies
yarn install

# Install Playwright browsers (first time only)
npx playwright install

# Run all tests (headless)
yarn test:e2e

# Run with interactive UI
yarn test:e2e:ui
```

## 🏃 Running Tests

### All Tests

```bash
# Headless mode (CI-ready)
yarn test:e2e

# Interactive UI mode
yarn test:e2e:ui

# Headed mode (watch browser)
yarn test:e2e:headed

# Debug mode (step through)
yarn test:e2e:debug
```

### Specific Browser

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

### Specific Test File

```bash
# Run one test file
npx playwright test e2e/01-kiosk-registration.spec.js

# Run specific test by name
npx playwright test -g "should register new member"

# Run tests matching pattern
npx playwright test e2e/*-admin-*.spec.js
```

## 📋 Test Reports

```bash
# View HTML report (auto-generated after tests)
yarn test:e2e:report

# Report location
open playwright-report/index.html
```

## 🐛 Debugging

### Debug Mode

```bash
# Run in debug mode
yarn test:e2e:debug

# Debug specific test
npx playwright test e2e/03-member-management.spec.js --debug
```

### Screenshots & Videos

- Screenshots on failure: `test-results/{test-name}/test-failed-1.png`
- Videos on failure: `test-results/{test-name}/video.webm`
- Full trace: `test-results/{test-name}/trace.zip`

### View Trace

```bash
# View trace file
npx playwright show-trace test-results/path/to/trace.zip
```

## 🛠️ Test Helpers

The [fixtures/test-helpers.js](fixtures/test-helpers.js) file provides:

```javascript
// Authentication
await loginAsAdmin(page);
await loginAsStaff(page);
await logout(page);

// Form interactions
await fillField(page, 'email-input', 'test@example.com');
await clickButton(page, 'submit-button');

// Verifications
await waitForToast(page, 'Success message');
await waitForApiResponse(page, '/api/members');

// Test data
const data = generateTestData(); // Unique data

// Utilities
await takeScreenshot(page, 'my-screenshot');
const exists = await elementExists(page, 'element-testid');
```

## ✅ Best Practices

1. **Use data-testid selectors:**
   ```javascript
   await page.click('[data-testid="submit-button"]');
   ```

2. **Wait for explicit conditions:**
   ```javascript
   await page.waitForSelector('[data-testid="member-list"]');
   await waitForToast(page, 'Member created successfully');
   ```

3. **Generate unique test data:**
   ```javascript
   const testData = generateTestData();
   await page.fill('[data-testid="email-input"]', testData.email);
   ```

4. **Clean up after tests:**
   ```javascript
   test.beforeEach(async ({ page }) => {
     await loginAsAdmin(page);
     await page.goto('/members');
   });
   ```

## 📖 Full Documentation

For complete documentation, see [E2E_TESTING_GUIDE.md](../../E2E_TESTING_GUIDE.md)

## 🔧 Configuration

Test configuration is in [../playwright.config.js](../playwright.config.js):

- Cross-browser testing (Chromium, Firefox, WebKit)
- Mobile viewports (Pixel 5, iPhone 12)
- Screenshot/video on failure
- 30-second timeout per test
- Retry logic (2 retries in CI)

## 🚨 Troubleshooting

### "Browser not installed"

```bash
npx playwright install
```

### "Timeout waiting for element"

- Check selector: `await page.locator('[data-testid="button"]').count()`
- Increase timeout: `await page.click('[data-testid="button"]', { timeout: 10000 })`
- Wait for API: `await waitForApiResponse(page, '/api/endpoint')`

### Flaky tests

- Use explicit waits instead of `waitForTimeout`
- Wait for API responses before assertions
- Enable retries (already configured)

## 📞 Support

For issues or questions:
- Check [E2E_TESTING_GUIDE.md](../../E2E_TESTING_GUIDE.md)
- Review [Playwright Documentation](https://playwright.dev/)
- Check test-results/ for failure details

---

**Last Updated:** 2025-01-23
**Total Tests:** 42
**Status:** ✅ Production-Ready
