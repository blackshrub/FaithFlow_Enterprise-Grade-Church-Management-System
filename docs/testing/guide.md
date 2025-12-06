# 🧪 FaithFlow Testing Guide

**Quick Start Guide for Backend & Frontend Unit Testing**

> **Note:** For E2E testing with Playwright, see [E2E_TESTING_GUIDE.md](E2E_TESTING_GUIDE.md)

---

## 📚 Table of Contents

1. [Getting Started](#getting-started)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Best Practices](#best-practices)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Test Coverage Overview

| Test Type | Status | Coverage | Guide |
|-----------|--------|----------|-------|
| Backend Integration | ✅ 156 tests | 60%+ | This guide |
| Frontend Unit | ✅ Infrastructure | 70% target | This guide |
| E2E (Playwright) | ✅ 42 tests | 70%+ | [E2E_TESTING_GUIDE.md](E2E_TESTING_GUIDE.md) |

---

## 🚀 Getting Started

### Backend Testing Setup

```bash
cd backend

# Install test dependencies
pip install -r requirements.txt

# Start test database
docker-compose -f ../docker-compose.test.yml up -d

# Run tests
pytest
```

### Frontend Testing Setup

```bash
cd frontend

# Install dependencies (includes test libraries)
yarn install

# Run tests
yarn test
```

---

## 🏃 Running Tests

### Backend Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov

# Run only unit tests (fast)
pytest -m unit

# Run only integration tests
pytest -m integration

# Run specific test file
pytest tests/integration/test_members_api.py

# Run tests matching pattern
pytest -k "test_member"

# Run in parallel (faster)
pytest -n auto

# Verbose output
pytest -v -s
```

### Frontend Tests

```bash
# Run all tests
yarn test

# Run tests once (no watch mode)
yarn test --watchAll=false

# Run with coverage
yarn test --coverage --watchAll=false

# Run specific test file
yarn test MemberAvatar.test.js

# Run tests matching pattern
yarn test --testNamePattern="displays members"

# Update snapshots
yarn test -u
```

---

## ✍️ Writing Tests

### Backend Test Example

```python
import pytest
from httpx import AsyncClient
from tests.fixtures.factories import MemberFactory

@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_member(test_client, auth_headers, church_data):
    """Test creating a member."""
    member_data = {
        "church_id": church_data["id"],
        "full_name": "John Doe",
        "email": "john@example.com"
    }

    response = await test_client.post(
        "/api/members/",
        json=member_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "John Doe"
```

### Frontend Component Test Example

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MemberAvatar from './MemberAvatar';

test('renders member initials', () => {
  render(<MemberAvatar name="John Doe" size="md" />);

  expect(screen.getByText('JD')).toBeInTheDocument();
});

test('handles click events', async () => {
  const user = userEvent.setup();
  const handleClick = jest.fn();

  render(<MemberAvatar name="John Doe" onClick={handleClick} />);

  await user.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Frontend Hook Test Example

```javascript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useMembers } from './useMembers';

test('fetches members successfully', async () => {
  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useMembers(), { wrapper });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toHaveLength(2);
});
```

---

## 📋 Best Practices

### General Principles

**F.I.R.S.T. Tests:**
- **Fast**: Tests should run quickly
- **Independent**: Tests should not depend on each other
- **Repeatable**: Same results every time
- **Self-Validating**: Clear pass/fail
- **Timely**: Written with the code

**AAA Pattern:**
```python
def test_example():
    # Arrange - Setup test data
    member = MemberFactory.create(full_name="John")

    # Act - Execute the action
    result = process_member(member)

    # Assert - Verify the outcome
    assert result.status == "processed"
```

### Backend Best Practices

1. **Use Factories, Not Hardcoded Data**
   ```python
   # Bad
   member = {"id": "123", "name": "Test"}

   # Good
   member = MemberFactory.create(name="Test")
   ```

2. **Always Test Multi-Tenant Isolation**
   ```python
   @pytest.mark.multi_tenant
   async def test_church_isolation(test_client, church_a, church_b):
       # Verify Church A cannot access Church B's data
       ...
   ```

3. **Test Both Success and Failure Cases**
   ```python
   async def test_create_member_success(...):
       ...

   async def test_create_member_validation_error(...):
       ...
   ```

### Frontend Best Practices

1. **Test User Behavior, Not Implementation**
   ```javascript
   // Bad - testing implementation
   expect(component.state.count).toBe(1);

   // Good - testing user-visible behavior
   expect(screen.getByText('Count: 1')).toBeInTheDocument();
   ```

2. **Use React Testing Library Queries**
   ```javascript
   // Preferred order:
   screen.getByRole('button', { name: 'Submit' })
   screen.getByLabelText('Email')
   screen.getByText('Welcome')
   screen.getByTestId('submit-button') // Last resort
   ```

3. **Mock API Calls with MSW**
   ```javascript
   import { server } from '../mocks/server';
   import { http, HttpResponse } from 'msw';

   test('handles API error', async () => {
     server.use(
       http.get('/api/members/', () => {
         return HttpResponse.json(null, { status: 500 });
       })
     );

     render(<MembersList />);

     expect(await screen.findByText(/error/i)).toBeInTheDocument();
   });
   ```

4. **Use userEvent, Not fireEvent**
   ```javascript
   import userEvent from '@testing-library/user-event';

   // Good - simulates real user interaction
   const user = userEvent.setup();
   await user.click(button);
   await user.type(input, 'text');
   ```

---

## 🔧 Troubleshooting

### Backend Issues

**Issue: Tests fail with MongoDB connection error**
```bash
# Solution: Start test database
docker-compose -f docker-compose.test.yml up -d
```

**Issue: Module not found errors**
```bash
# Solution: Ensure you're in venv and dependencies are installed
cd backend
source venv/bin/activate  # or venv/Scripts/activate on Windows
pip install -r requirements.txt
```

**Issue: Tests pass locally but fail in CI**
```bash
# Solution: Check test database is running and env vars are set
export TEST_MONGO_URL=mongodb://localhost:27018
export TEST_DB_NAME=faithflow_test
```

### Frontend Issues

**Issue: Tests fail with "matchMedia is not defined"**
```javascript
// Solution: Already handled in setupTests.js
// Check that setupTests.js is being loaded
```

**Issue: Tests timeout waiting for async operations**
```javascript
// Solution: Increase timeout or check waitFor usage
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
}, { timeout: 5000 });
```

**Issue: MSW handlers not working**
```javascript
// Solution: Verify server is started in setupTests.js
import { server } from './mocks/server';

// Check server.listen() is called in beforeAll()
```

---

## 📊 Coverage Reports

### Backend Coverage

```bash
# Generate HTML coverage report
pytest --cov --cov-report=html

# Open report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
```

### Frontend Coverage

```bash
# Generate coverage report
yarn test --coverage --watchAll=false

# Open report
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
```

---

## 🎯 Coverage Targets

| Module | Backend API | Frontend | E2E |
|--------|-------------|----------|-----|
| Kiosk | 90% | 85% | 100% |
| Members | 85% | 75% | 80% |
| Events | 85% | 75% | 80% |
| Accounting | 80% | 70% | 60% |
| Overall | 82% | 72% | 70% |

---

## 🆘 Getting Help

- **Backend Tests**: See `AUTOMATED_TESTING_PROPOSAL.md` - Backend Testing section
- **Frontend Tests**: See `AUTOMATED_TESTING_PROPOSAL.md` - Frontend Testing section
- **E2E Tests**: See `AUTOMATED_TESTING_PROPOSAL.md` - E2E Testing section
- **Ask Team**: Reach out in #engineering channel

---

## ✅ Testing Checklist

Before submitting a PR, ensure:

- [ ] All new code has tests
- [ ] All tests pass (`pytest` and `yarn test`)
- [ ] Coverage thresholds are met
- [ ] Multi-tenant isolation is tested (backend)
- [ ] No console errors or warnings in tests
- [ ] Test names are descriptive
- [ ] Tests follow AAA pattern

**Happy Testing! 🎉**
