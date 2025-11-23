# 🧪 FaithFlow - Automated Testing Proposal

**Version:** 1.0
**Date:** January 2025
**Status:** Proposal - Awaiting Implementation

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Testing Strategy Overview](#testing-strategy-overview)
4. [Backend Testing (pytest)](#backend-testing-pytest)
5. [Frontend Testing (Jest + React Testing Library)](#frontend-testing-jest--react-testing-library)
6. [E2E Testing (Playwright)](#e2e-testing-playwright)
7. [Testing Infrastructure](#testing-infrastructure)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Best Practices & Conventions](#best-practices--conventions)
10. [CI/CD Integration](#cicd-integration)
11. [Cost-Benefit Analysis](#cost-benefit-analysis)

---

## 🎯 Executive Summary

### Why Automated Testing?

1. **Prevent Regressions** - Catch bugs before they reach production
2. **Faster Development** - Confidence to refactor and add features without fear
3. **Living Documentation** - Tests serve as executable specifications
4. **Multi-Tenant Safety** - Critical for ensuring church data isolation
5. **Quality Assurance** - Enterprise-grade systems demand enterprise-grade testing

### Goals

- **Backend API Coverage**: 80%+ line coverage for critical modules
- **Frontend Component Coverage**: 70%+ line coverage for shared components
- **E2E Critical Paths**: 100% coverage of critical user flows (kiosk, login, member management)
- **Test Execution Time**: &lt;5 minutes for full test suite in CI/CD
- **Regression Prevention**: Zero critical bugs reaching production

### Three-Layer Testing Pyramid

```
       /\
      /  \     E2E Tests (Playwright)
     /____\    - 20 critical flows
    /      \
   /  UNIT  \  Frontend Tests (Jest + RTL)
  / INTEGR. \ - 150+ component/hook tests
 /____________\
   Backend Tests (pytest)
   - 300+ API/service tests
```

---

## 📊 Current State Analysis

### Backend Testing (Existing)

#### ✅ What Exists

- **3 test files** covering accounting, articles, and prayer requests
  - `backend/backend_test.py` (987 lines) - Accounting module
  - `backend/articles_test.py` (857 lines) - CMS module
  - `backend/prayer_requests_test.py` (479 lines) - Prayer requests
- **Custom test framework** using `requests` library
- **Live API testing** against production URL
- **Multi-tenant validation** built into tests

#### ❌ Critical Gaps

| Issue | Impact | Priority |
|-------|--------|----------|
| **Not using pytest framework** | No fixtures, no parallel execution, no proper discovery | 🔴 High |
| **Hardcoded production URL** | Tests hit live database, no local testing | 🔴 High |
| **No test database separation** | Tests modify production data | 🔴 Critical |
| **Wrong file naming** (`*_test.py` instead of `test_*.py`) | pytest cannot discover tests | 🔴 High |
| **No mocking/fixtures** | Slow tests, external dependencies | 🟡 Medium |
| **No coverage reporting** | Cannot measure test effectiveness | 🟡 Medium |
| **No CI/CD integration** | Tests run manually only | 🟡 Medium |

#### 📈 Test Coverage Estimate

- **Covered modules**: Accounting (45+ endpoints), Articles (33 endpoints), Prayer Requests (5 endpoints)
- **Uncovered modules**: Members, Events, Devotions, Counseling, Giving, Attendance, etc.
- **Estimated coverage**: ~15% of total backend codebase

### Frontend Testing (Non-Existent)

#### ❌ Current State

- **0 test files** found in `frontend/src/`
- **0 testing libraries** explicitly installed
- `react-scripts` includes Jest but no configuration
- No React Testing Library
- No test setup files

#### 📊 Coverage

- **Current coverage**: 0%
- **Components**: ~150+ components (pages, UI, modals, forms)
- **Custom hooks**: ~20+ hooks
- **Services**: ~15+ API service files

### E2E Testing (Non-Existent)

#### ❌ Current State

- **No E2E framework** installed
- **No test scenarios** defined
- **No browser automation** setup

#### 🎯 Critical Flows Needing E2E Coverage

1. **Kiosk Member Registration** - New member registration with OTP
2. **Kiosk Event Registration** - Existing member event RSVP
3. **Admin Login & Church Switching** - Super admin switching churches
4. **Member Management** - Create, update, delete members
5. **Counseling Appointments** - Create and approve appointments
6. **Event Management** - Create events with seat selection
7. **Financial Reports** - Generate trial balance, income statement
8. **Attendance Tracking** - QR code check-in flow

---

## 🧩 Testing Strategy Overview

### Testing Pyramid Philosophy

```
E2E (Few, Slow, Expensive)
├─ Critical user journeys only
├─ Browser automation
└─ Full stack integration

Integration (Some, Medium Speed)
├─ API endpoint tests
├─ Database integration
└─ Service layer tests

Unit (Many, Fast, Cheap)
├─ Component tests
├─ Hook tests
└─ Utility function tests
```

### Coverage Goals

| Layer | Goal | Rationale |
|-------|------|-----------|
| **Backend Unit** | 85% line coverage | Critical business logic |
| **Backend Integration** | 90% endpoint coverage | All API routes tested |
| **Frontend Components** | 70% line coverage | UI components + hooks |
| **Frontend Integration** | 80% API integration | All API calls covered |
| **E2E Critical Paths** | 100% flow coverage | All critical flows |

### Test Environment Strategy

```
┌─────────────────────────────────────────────┐
│  Local Development                          │
│  ├─ Docker Compose: MongoDB test instance  │
│  ├─ Backend: uvicorn with test DB          │
│  ├─ Frontend: React dev server              │
│  └─ Tests: Run against localhost            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  CI/CD (GitHub Actions)                     │
│  ├─ MongoDB: Service container              │
│  ├─ Backend: Ephemeral test server          │
│  ├─ Frontend: Production build              │
│  └─ Tests: Parallel execution               │
└─────────────────────────────────────────────┘
```

---

## 🐍 Backend Testing (pytest)

### Architecture Overview

```
backend/
├── tests/                          # New test directory
│   ├── __init__.py
│   ├── conftest.py                # pytest fixtures
│   ├── fixtures/                  # Test data factories
│   │   ├── __init__.py
│   │   ├── user_fixtures.py
│   │   ├── church_fixtures.py
│   │   ├── member_fixtures.py
│   │   └── event_fixtures.py
│   ├── unit/                      # Unit tests (services, utils)
│   │   ├── test_auth.py
│   │   ├── test_tenant_utils.py
│   │   └── test_validators.py
│   ├── integration/               # API endpoint tests
│   │   ├── test_members_api.py
│   │   ├── test_events_api.py
│   │   ├── test_accounting_api.py
│   │   ├── test_articles_api.py
│   │   ├── test_counseling_api.py
│   │   └── test_kiosk_api.py
│   └── e2e/                       # Backend e2e (full workflows)
│       ├── test_member_lifecycle.py
│       └── test_event_lifecycle.py
├── pytest.ini                     # pytest configuration
└── .coveragerc                    # coverage configuration
```

### Core Testing Libraries

```bash
# Install testing dependencies
pip install pytest pytest-asyncio pytest-cov pytest-mock httpx faker
```

| Library | Purpose |
|---------|---------|
| **pytest** | Test framework and runner |
| **pytest-asyncio** | Async test support for FastAPI |
| **pytest-cov** | Code coverage reporting |
| **pytest-mock** | Mocking and stubbing |
| **httpx** | Async HTTP client for FastAPI testing |
| **faker** | Generate realistic test data |

### pytest Configuration (`backend/pytest.ini`)

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --strict-markers
    --cov=.
    --cov-report=html:htmlcov
    --cov-report=term-missing
    --cov-fail-under=80
    --asyncio-mode=auto
    --tb=short
markers =
    unit: Unit tests (fast, no DB)
    integration: Integration tests (require DB)
    e2e: End-to-end tests (slow, full stack)
    slow: Slow tests (skip in quick runs)
    multi_tenant: Multi-tenant isolation tests
asyncio_mode = auto
```

### Sample Test Structure (`tests/conftest.py`)

```python
import pytest
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from httpx import AsyncClient
from server import app
from utils.dependencies import get_db
from datetime import datetime

# Test database configuration
TEST_MONGO_URL = "mongodb://localhost:27017"
TEST_DB_NAME = "faithflow_test"

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def test_db():
    """Create fresh test database for each test"""
    client = AsyncIOMotorClient(TEST_MONGO_URL)
    db = client[TEST_DB_NAME]

    # Clean database before test
    await cleanup_test_db(db)

    yield db

    # Clean database after test
    await cleanup_test_db(db)
    client.close()

async def cleanup_test_db(db):
    """Drop all collections in test database"""
    collections = await db.list_collection_names()
    for collection in collections:
        await db[collection].delete_many({})

@pytest.fixture
async def test_client(test_db):
    """Create test client with test database"""
    app.dependency_overrides[get_db] = lambda: test_db

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()

@pytest.fixture
async def church_data(test_db):
    """Create test church"""
    church = {
        "id": "test-church-001",
        "name": "Test Church",
        "email": "test@church.org",
        "timezone": "Asia/Jakarta",
        "locale": "id",
        "created_at": datetime.utcnow()
    }
    await test_db.churches.insert_one(church)
    return church

@pytest.fixture
async def admin_user(test_db, church_data):
    """Create test admin user"""
    from utils.auth import get_password_hash

    user = {
        "id": "test-admin-001",
        "email": "admin@test.org",
        "password_hash": get_password_hash("test123"),
        "full_name": "Test Admin",
        "role": "admin",
        "church_id": church_data["id"],
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    await test_db.users.insert_one(user)
    return user

@pytest.fixture
async def auth_headers(test_client, admin_user):
    """Get authentication headers for admin user"""
    response = await test_client.post("/api/auth/login", json={
        "email": admin_user["email"],
        "password": "test123"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def member_factory(test_db, church_data):
    """Factory for creating test members"""
    from faker import Faker
    fake = Faker()

    async def create_member(**kwargs):
        member = {
            "id": kwargs.get("id", f"member-{fake.uuid4()}"),
            "church_id": kwargs.get("church_id", church_data["id"]),
            "full_name": kwargs.get("full_name", fake.name()),
            "email": kwargs.get("email", fake.email()),
            "phone_whatsapp": kwargs.get("phone", fake.phone_number()),
            "gender": kwargs.get("gender", "Male"),
            "member_status": kwargs.get("status", "Active"),
            "is_active": kwargs.get("is_active", True),
            "created_at": datetime.utcnow()
        }
        await test_db.members.insert_one(member)
        return member

    return create_member
```

### Sample Integration Test (`tests/integration/test_members_api.py`)

```python
import pytest
from httpx import AsyncClient

@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_member_success(test_client: AsyncClient, auth_headers, church_data):
    """Test creating a member with valid data"""
    member_data = {
        "church_id": church_data["id"],
        "full_name": "John Doe",
        "email": "john@example.com",
        "phone_whatsapp": "+6281234567890",
        "gender": "Male",
        "member_status": "Active"
    }

    response = await test_client.post(
        "/api/members/",
        json=member_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "John Doe"
    assert data["email"] == "john@example.com"
    assert "id" in data
    assert "personal_qr_code" in data  # QR code should be generated

@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_members_pagination(test_client, auth_headers, member_factory):
    """Test member listing with pagination"""
    # Create 15 test members
    for i in range(15):
        await member_factory(full_name=f"Member {i}")

    # Get first page (10 items)
    response = await test_client.get(
        "/api/members/?limit=10&offset=0",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 10

    # Get second page (5 items)
    response = await test_client.get(
        "/api/members/?limit=10&offset=10",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5

@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_multi_tenant_isolation(test_client, test_db, auth_headers, church_data, member_factory):
    """Test that members are isolated by church_id"""
    # Create member for test church
    member1 = await member_factory(church_id=church_data["id"])

    # Create member for different church
    other_church = {
        "id": "other-church-001",
        "name": "Other Church",
        "email": "other@church.org"
    }
    await test_db.churches.insert_one(other_church)
    member2 = await member_factory(church_id=other_church["id"])

    # List members with auth for test church
    response = await test_client.get("/api/members/", headers=auth_headers)

    assert response.status_code == 200
    members = response.json()

    # Should only see member from test church
    assert len(members) == 1
    assert members[0]["id"] == member1["id"]
    assert member2["id"] not in [m["id"] for m in members]

@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_member_validation_errors(test_client, auth_headers, church_data):
    """Test member creation with invalid data"""
    # Missing required field (full_name)
    response = await test_client.post(
        "/api/members/",
        json={"church_id": church_data["id"]},
        headers=auth_headers
    )
    assert response.status_code == 422

    # Invalid email format
    response = await test_client.post(
        "/api/members/",
        json={
            "church_id": church_data["id"],
            "full_name": "John Doe",
            "email": "invalid-email"
        },
        headers=auth_headers
    )
    assert response.status_code == 422
```

### Sample Unit Test (`tests/unit/test_tenant_utils.py`)

```python
import pytest
from utils.tenant_utils import get_session_church_id_from_user

@pytest.mark.unit
def test_get_session_church_id_regular_user():
    """Test getting church_id for regular user"""
    user = {
        "id": "user-001",
        "role": "admin",
        "church_id": "church-001"
    }

    church_id = get_session_church_id_from_user(user)
    assert church_id == "church-001"

@pytest.mark.unit
def test_get_session_church_id_super_admin():
    """Test getting church_id for super admin from JWT"""
    user = {
        "id": "super-001",
        "role": "super_admin",
        "church_id": None,
        "session_church_id": "selected-church-001"
    }

    church_id = get_session_church_id_from_user(user)
    assert church_id == "selected-church-001"

@pytest.mark.unit
def test_get_session_church_id_super_admin_no_selection():
    """Test super admin without selected church raises error"""
    user = {
        "id": "super-001",
        "role": "super_admin",
        "church_id": None
    }

    with pytest.raises(ValueError, match="No church selected"):
        get_session_church_id_from_user(user)
```

### Running Backend Tests

```bash
# Run all tests
pytest

# Run only unit tests (fast)
pytest -m unit

# Run only integration tests
pytest -m integration

# Run with coverage report
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/integration/test_members_api.py

# Run tests matching pattern
pytest -k "test_member"

# Run tests in parallel (faster)
pytest -n auto

# Run tests with live output
pytest -v -s
```

### Migration Plan for Existing Tests

**Step 1: Rename Files**
```bash
mv backend_test.py tests/integration/test_accounting_api.py
mv articles_test.py tests/integration/test_articles_api.py
mv prayer_requests_test.py tests/integration/test_prayer_requests_api.py
```

**Step 2: Refactor to pytest**

Before (requests-based):
```python
class AccountingAPITester:
    def test_coa_endpoints(self):
        response = requests.get(f"{self.base_url}/api/v1/accounting/coa/")
        assert response.status_code == 200
```

After (pytest + httpx):
```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_coa_accounts(test_client, auth_headers):
    response = await test_client.get("/api/v1/accounting/coa/", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

---

## ⚛️ Frontend Testing (Jest + React Testing Library)

### Architecture Overview

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.js
│   │   │   └── Button.test.js        # Component tests
│   │   ├── MemberAvatar.js
│   │   └── MemberAvatar.test.js
│   ├── pages/
│   │   ├── Members/
│   │   │   ├── MembersList.js
│   │   │   └── MembersList.test.js   # Page tests
│   ├── hooks/
│   │   ├── useMembers.js
│   │   └── useMembers.test.js        # Hook tests
│   ├── services/
│   │   ├── membersApi.js
│   │   └── membersApi.test.js        # API service tests
│   └── utils/
│       ├── validators.js
│       └── validators.test.js        # Utility tests
├── setupTests.js                      # Jest setup
└── jest.config.js                     # Jest configuration (if needed)
```

### Required Dependencies

```bash
cd frontend
yarn add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
```

| Library | Purpose |
|---------|---------|
| **@testing-library/react** | React component testing utilities |
| **@testing-library/jest-dom** | Custom Jest matchers for DOM |
| **@testing-library/user-event** | Simulate user interactions |
| **msw** (Mock Service Worker) | Mock API responses |

### Jest Setup (`frontend/src/setupTests.js`)

```javascript
// jest-dom adds custom jest matchers for asserting on DOM nodes
import '@testing-library/jest-dom';

// Mock window.matchMedia (required for responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};
```

### Sample Component Test (`src/components/MemberAvatar.test.js`)

```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import MemberAvatar from './MemberAvatar';

describe('MemberAvatar', () => {
  it('renders member initials when no photo provided', () => {
    render(<MemberAvatar name="John Doe" size="md" />);

    const avatar = screen.getByText('JD');
    expect(avatar).toBeInTheDocument();
  });

  it('renders photo when URL provided', () => {
    render(<MemberAvatar name="John Doe" photo="/photo.jpg" size="md" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/photo.jpg');
    expect(img).toHaveAttribute('alt', 'John Doe');
  });

  it('applies correct size classes', () => {
    const { container } = render(<MemberAvatar name="John Doe" size="lg" />);

    const avatar = container.querySelector('.h-12.w-12'); // lg size classes
    expect(avatar).toBeInTheDocument();
  });

  it('shows fallback when image fails to load', () => {
    render(<MemberAvatar name="John Doe" photo="/broken.jpg" />);

    const img = screen.getByRole('img');

    // Simulate image error
    img.dispatchEvent(new Event('error'));

    // Should show initials fallback
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
```

### Sample Page Test (`src/pages/Members/MembersList.test.js`)

```javascript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import MembersList from './MembersList';
import { server } from '../../mocks/server';
import { rest } from 'msw';

// Helper to render with providers
const renderWithProviders = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('MembersList', () => {
  it('displays loading state initially', () => {
    renderWithProviders(<MembersList />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays members after successful fetch', async () => {
    renderWithProviders(<MembersList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('displays error message when fetch fails', async () => {
    server.use(
      rest.get('/api/members/', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: 'Server error' }));
      })
    );

    renderWithProviders(<MembersList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('filters members by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('navigates to member detail when row clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const row = screen.getByText('John Doe').closest('tr');
    await user.click(row);

    // Check navigation occurred
    expect(window.location.pathname).toContain('/members/');
  });
});
```

### Sample Hook Test (`src/hooks/useMembers.test.js`)

```javascript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMembers } from './useMembers';
import { server } from '../mocks/server';
import { rest } from 'msw';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useMembers', () => {
  it('fetches members successfully', async () => {
    const { result } = renderHook(() => useMembers(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].full_name).toBe('John Doe');
  });

  it('handles fetch errors', async () => {
    server.use(
      rest.get('/api/members/', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const { result } = renderHook(() => useMembers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('applies filters correctly', async () => {
    const { result } = renderHook(
      () => useMembers({ status: 'Active', search: 'John' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify query params sent to API
    const lastRequest = server.requests.find(r => r.url.includes('/api/members/'));
    expect(lastRequest.url.searchParams.get('status')).toBe('Active');
    expect(lastRequest.url.searchParams.get('search')).toBe('John');
  });
});
```

### MSW Setup (`src/mocks/handlers.js`)

```javascript
import { rest } from 'msw';

export const handlers = [
  // Members API
  rest.get('/api/members/', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'member-001',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone_whatsapp: '+628123456789',
          member_status: 'Active',
          personal_qr_code: 'QR_CODE_BASE64'
        },
        {
          id: 'member-002',
          full_name: 'Jane Smith',
          email: 'jane@example.com',
          phone_whatsapp: '+628987654321',
          member_status: 'Active',
          personal_qr_code: 'QR_CODE_BASE64'
        }
      ])
    );
  }),

  rest.post('/api/members/', (req, res, ctx) => {
    const member = req.body;
    return res(
      ctx.status(201),
      ctx.json({
        id: 'new-member-001',
        ...member,
        personal_qr_code: 'QR_CODE_BASE64',
        created_at: new Date().toISOString()
      })
    );
  }),

  // Auth API
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'test-token-123',
        user: {
          id: 'user-001',
          email: 'admin@test.org',
          role: 'admin',
          church_id: 'church-001'
        }
      })
    );
  })
];
```

`src/mocks/server.js`:
```javascript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// Setup before all tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Cleanup after all tests
afterAll(() => server.close());
```

### Running Frontend Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode (default)
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

### Coverage Goals

| Category | Goal | Files |
|----------|------|-------|
| **Shared UI Components** | 90% | button, input, dialog, card, etc. |
| **Business Components** | 75% | MemberAvatar, EventCard, etc. |
| **Pages** | 60% | MembersList, EventsPage, etc. |
| **Custom Hooks** | 85% | useMembers, useEvents, etc. |
| **Utilities** | 95% | validators, formatters, etc. |
| **API Services** | 70% | membersApi, eventsApi, etc. |

---

## 🎭 E2E Testing (Playwright)

### Why Playwright?

| Feature | Playwright | Cypress |
|---------|-----------|---------|
| **Multi-browser** | ✅ Chrome, Firefox, Safari | ❌ Chrome only (default) |
| **Speed** | ⚡ Faster (parallel execution) | Slower (serial) |
| **Auto-wait** | ✅ Built-in | ✅ Built-in |
| **Network mocking** | ✅ Native | ✅ Via intercept |
| **Mobile testing** | ✅ Device emulation | ✅ Viewport only |
| **TypeScript** | ✅ First-class | ✅ Supported |
| **Video/Screenshots** | ✅ Built-in | ✅ Built-in |
| **CI/CD friendly** | ✅ Excellent | ✅ Good |

### Installation

```bash
# Install Playwright
yarn add -D @playwright/test

# Install browsers
npx playwright install
```

### Project Structure

```
e2e/
├── tests/
│   ├── kiosk/
│   │   ├── new-member-registration.spec.ts
│   │   ├── event-registration.spec.ts
│   │   └── counseling-appointment.spec.ts
│   ├── admin/
│   │   ├── login.spec.ts
│   │   ├── church-switching.spec.ts
│   │   ├── member-management.spec.ts
│   │   └── event-management.spec.ts
│   ├── accounting/
│   │   ├── coa-management.spec.ts
│   │   ├── journal-entry.spec.ts
│   │   └── financial-reports.spec.ts
│   └── counseling/
│       ├── appointment-creation.spec.ts
│       └── appointment-approval.spec.ts
├── fixtures/
│   ├── test-data.ts
│   └── auth.ts
├── page-objects/
│   ├── LoginPage.ts
│   ├── MembersPage.ts
│   └── EventsPage.ts
├── playwright.config.ts
└── README.md
```

### Playwright Configuration (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'cd frontend && yarn start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Page Object Pattern (`e2e/page-objects/LoginPage.ts`)

```typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### Sample E2E Test (`e2e/tests/kiosk/new-member-registration.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Kiosk - New Member Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to kiosk
    await page.goto('/kiosk');
  });

  test('successfully registers new member with OTP verification', async ({ page }) => {
    // Step 1: Enter phone number
    await page.getByLabel('Phone Number').fill('+628123456789');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Select "New Member"
    await page.getByRole('button', { name: 'New Member' }).click();

    // Step 3: Fill registration form
    await page.getByLabel('Full Name').fill('John Doe Test');
    await page.getByLabel('Gender').selectOption('Male');
    await page.getByLabel('Date of Birth').fill('1990-01-15');

    // Step 4: Take photo (mock camera)
    const cameraButton = page.getByRole('button', { name: 'Take Photo' });
    await cameraButton.click();

    await page.waitForTimeout(500); // Wait for camera

    const captureButton = page.getByRole('button', { name: 'Capture' });
    await captureButton.click();

    // Step 5: Verify OTP is sent
    await expect(page.getByText(/OTP sent/i)).toBeVisible();

    // Step 6: Enter OTP (in real test, we'd mock backend OTP)
    const otpInputs = page.getByRole('textbox', { name: /otp digit/i });
    await otpInputs.nth(0).fill('1');
    await otpInputs.nth(1).fill('2');
    await otpInputs.nth(2).fill('3');
    await otpInputs.nth(3).fill('4');

    // Step 7: Verify success message
    await expect(page.getByText(/registration successful/i)).toBeVisible({ timeout: 10000 });

    // Step 8: Verify redirect to success page
    await expect(page.url()).toContain('/kiosk/success');
  });

  test('shows error when OTP is incorrect', async ({ page }) => {
    await page.getByLabel('Phone Number').fill('+628123456789');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'New Member' }).click();

    // Fill form
    await page.getByLabel('Full Name').fill('Jane Doe');
    await page.getByLabel('Gender').selectOption('Female');

    // Enter wrong OTP
    const otpInputs = page.getByRole('textbox', { name: /otp digit/i });
    await otpInputs.nth(0).fill('9');
    await otpInputs.nth(1).fill('9');
    await otpInputs.nth(2).fill('9');
    await otpInputs.nth(3).fill('9');

    // Should show error
    await expect(page.getByText(/invalid otp/i)).toBeVisible();
  });

  test('allows resending OTP after cooldown', async ({ page }) => {
    await page.getByLabel('Phone Number').fill('+628123456789');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'New Member' }).click();

    // Fill minimal form
    await page.getByLabel('Full Name').fill('Test User');

    // Resend button should be disabled initially
    const resendButton = page.getByRole('button', { name: /resend/i });
    await expect(resendButton).toBeDisabled();

    // Wait for cooldown (60 seconds in real app, but we'd mock this)
    // In test environment, we'd configure a shorter cooldown

    // After cooldown, button should be enabled
    await page.waitForTimeout(2000); // Mock shorter cooldown
    await expect(resendButton).toBeEnabled();

    // Click resend
    await resendButton.click();

    // Verify new OTP sent message
    await expect(page.getByText(/otp sent/i)).toBeVisible();
  });
});
```

### Sample E2E Test (`e2e/tests/admin/member-management.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';

test.describe('Member Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@test.org', 'admin123');

    // Wait for dashboard
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Navigate to members
    await page.getByRole('link', { name: 'Members' }).click();
  });

  test('creates new member successfully', async ({ page }) => {
    // Click create button
    await page.getByRole('button', { name: 'Create Member' }).click();

    // Fill form
    await page.getByLabel('Full Name').fill('Test Member E2E');
    await page.getByLabel('Email').fill('test-e2e@example.com');
    await page.getByLabel('Phone').fill('+628123456789');
    await page.getByLabel('Gender').selectOption('Male');
    await page.getByLabel('Member Status').selectOption('Active');

    // Submit
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify success toast
    await expect(page.getByText(/member created/i)).toBeVisible();

    // Verify member appears in list
    await expect(page.getByText('Test Member E2E')).toBeVisible();
  });

  test('searches for members', async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder(/search/i).fill('John');

    // Verify filtered results
    await expect(page.getByText('John Doe')).toBeVisible();

    // Verify other members not shown
    await expect(page.getByText('Jane Smith')).not.toBeVisible();
  });

  test('exports members to CSV', async ({ page }) => {
    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('menuitem', { name: 'Export as CSV' }).click();

    // Wait for download
    const download = await downloadPromise;

    // Verify filename
    expect(download.suggestedFilename()).toMatch(/members.*\.csv/);
  });

  test('deletes member with confirmation', async ({ page }) => {
    // Find member row
    const memberRow = page.getByText('Test Member E2E').locator('..');

    // Click delete button
    await memberRow.getByRole('button', { name: 'Delete' }).click();

    // Confirm deletion
    await page.getByRole('button', { name: 'Confirm' }).click();

    // Verify success message
    await expect(page.getByText(/member deleted/i)).toBeVisible();

    // Verify member removed from list
    await expect(page.getByText('Test Member E2E')).not.toBeVisible();
  });
});
```

### Running E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test kiosk/new-member-registration.spec.ts

# Run in specific browser
npx playwright test --project=firefox

# Debug mode (step through tests)
npx playwright test --debug

# Show HTML report
npx playwright show-report

# Run tests in parallel
npx playwright test --workers=4

# Run only failed tests
npx playwright test --last-failed
```

### Critical E2E Test Scenarios

| Priority | Scenario | Estimated Tests |
|----------|----------|-----------------|
| 🔴 P0 | Kiosk member registration | 5 tests |
| 🔴 P0 | Kiosk event RSVP | 4 tests |
| 🔴 P0 | Admin login & auth | 3 tests |
| 🔴 P0 | Member CRUD operations | 6 tests |
| 🟡 P1 | Event creation & management | 5 tests |
| 🟡 P1 | Counseling appointment flow | 4 tests |
| 🟡 P1 | Attendance check-in | 3 tests |
| 🟡 P1 | Financial reports | 4 tests |
| 🟢 P2 | Church settings | 3 tests |
| 🟢 P2 | User management | 4 tests |
| **Total** | **10 scenarios** | **~40 tests** |

---

## 🏗️ Testing Infrastructure

### Test Database Strategy

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  mongodb-test:
    image: mongo:7.0
    container_name: faithflow-test-db
    ports:
      - "27018:27017"  # Different port from production
    environment:
      MONGO_INITDB_DATABASE: faithflow_test
    volumes:
      - ./test-db-init:/docker-entrypoint-initdb.d
    command: mongod --quiet --logpath /dev/null
```

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run backend tests
cd backend
pytest

# Stop test database
docker-compose -f docker-compose.test.yml down -v
```

### Environment Configuration

**`.env.test` (Backend)**:
```bash
MONGO_URL=mongodb://localhost:27018
DB_NAME=faithflow_test
JWT_SECRET=test-secret-key-do-not-use-in-production
JWT_ALGORITHM=HS256
ENVIRONMENT=test
```

**`.env.test.local` (Frontend)**:
```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=test
```

### Test Data Management

#### Approach 1: Database Seeding

```python
# backend/tests/seed_test_data.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from utils.auth import get_password_hash

async def seed_test_database():
    client = AsyncIOMotorClient("mongodb://localhost:27018")
    db = client.faithflow_test

    # Clear existing data
    await db.churches.delete_many({})
    await db.users.delete_many({})
    await db.members.delete_many({})

    # Seed church
    church = {
        "id": "test-church-001",
        "name": "Test Church",
        "email": "test@church.org",
        "timezone": "Asia/Jakarta",
        "created_at": datetime.utcnow()
    }
    await db.churches.insert_one(church)

    # Seed admin user
    admin = {
        "id": "test-admin-001",
        "email": "admin@test.org",
        "password_hash": get_password_hash("admin123"),
        "role": "admin",
        "church_id": church["id"],
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(admin)

    print("✅ Test database seeded")

if __name__ == "__main__":
    asyncio.run(seed_test_database())
```

#### Approach 2: Factories (Recommended)

```python
# backend/tests/factories.py
from faker import Faker
from datetime import datetime

fake = Faker()

class ChurchFactory:
    @staticmethod
    def create(**kwargs):
        return {
            "id": kwargs.get("id", f"church-{fake.uuid4()}"),
            "name": kwargs.get("name", fake.company()),
            "email": kwargs.get("email", fake.email()),
            "timezone": kwargs.get("timezone", "Asia/Jakarta"),
            "created_at": kwargs.get("created_at", datetime.utcnow())
        }

class UserFactory:
    @staticmethod
    def create(**kwargs):
        return {
            "id": kwargs.get("id", f"user-{fake.uuid4()}"),
            "email": kwargs.get("email", fake.email()),
            "full_name": kwargs.get("full_name", fake.name()),
            "role": kwargs.get("role", "admin"),
            "church_id": kwargs.get("church_id"),
            "created_at": kwargs.get("created_at", datetime.utcnow())
        }

class MemberFactory:
    @staticmethod
    def create(**kwargs):
        return {
            "id": kwargs.get("id", f"member-{fake.uuid4()}"),
            "church_id": kwargs.get("church_id"),
            "full_name": kwargs.get("full_name", fake.name()),
            "email": kwargs.get("email", fake.email()),
            "phone_whatsapp": kwargs.get("phone", fake.phone_number()),
            "gender": kwargs.get("gender", "Male"),
            "member_status": kwargs.get("status", "Active"),
            "created_at": kwargs.get("created_at", datetime.utcnow())
        }
```

---

## 📅 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Week 1: Backend Testing Setup**
- [ ] Install pytest, pytest-asyncio, pytest-cov, httpx
- [ ] Create `tests/` directory structure
- [ ] Write `conftest.py` with core fixtures
- [ ] Configure pytest.ini and .coveragerc
- [ ] Setup test database (Docker Compose)
- [ ] Create factory classes for test data
- [ ] Write 5 sample integration tests
- [ ] Setup coverage reporting

**Week 2: Frontend Testing Setup**
- [ ] Install @testing-library/react, jest-dom, user-event, msw
- [ ] Create `setupTests.js`
- [ ] Setup MSW with sample handlers
- [ ] Write 5 sample component tests
- [ ] Write 2 sample hook tests
- [ ] Configure coverage thresholds
- [ ] Document testing patterns

### Phase 2: Core Module Testing (Week 3-6)

**Week 3: Members Module**
- [ ] Backend: 20 integration tests for members API
- [ ] Backend: 10 unit tests for member services
- [ ] Frontend: 15 component tests (MembersList, MemberForm, MemberDetail)
- [ ] Frontend: 5 hook tests (useMembers, useMemberStats)
- [ ] Coverage: 75%+ for members module

**Week 4: Events & Attendance**
- [ ] Backend: 25 integration tests for events API
- [ ] Backend: 15 tests for RSVP and attendance
- [ ] Frontend: 20 component tests (EventsList, EventForm, RSVPModal)
- [ ] Frontend: 8 hook tests
- [ ] Coverage: 75%+ for events module

**Week 5: Kiosk Module (Critical)**
- [ ] Backend: 15 integration tests for kiosk API
- [ ] Backend: 10 tests for OTP verification
- [ ] Frontend: 25 component tests (NewMemberRegistration, EventRegistration)
- [ ] Frontend: Test OTP flow thoroughly
- [ ] E2E: 5 critical kiosk flows
- [ ] Coverage: 85%+ for kiosk module

**Week 6: Counseling & Prayer**
- [ ] Backend: 20 integration tests for counseling API
- [ ] Backend: 15 tests for prayer requests
- [ ] Frontend: 18 component tests
- [ ] Frontend: 6 hook tests
- [ ] Coverage: 70%+ for counseling module

### Phase 3: Financial & Advanced (Week 7-10)

**Week 7-8: Accounting Module**
- [ ] Backend: 40 integration tests for accounting API
- [ ] Backend: 25 tests for journal entries, COA, fiscal periods
- [ ] Frontend: 30 component tests (COA, Journals, Reports)
- [ ] Frontend: 10 hook tests
- [ ] Coverage: 80%+ for accounting module

**Week 9: Articles & CMS**
- [ ] Backend: 30 integration tests for articles API
- [ ] Backend: 15 tests for categories, tags, comments
- [ ] Frontend: 25 component tests
- [ ] Frontend: 8 hook tests
- [ ] Coverage: 75%+ for CMS module

**Week 10: Settings & Admin**
- [ ] Backend: 20 integration tests for settings API
- [ ] Backend: 15 tests for user management
- [ ] Frontend: 20 component tests (Settings pages)
- [ ] Frontend: 5 hook tests
- [ ] Coverage: 70%+ for admin module

### Phase 4: E2E Testing (Week 11-12)

**Week 11: Setup & Critical Paths**
- [ ] Install Playwright
- [ ] Configure playwright.config.ts
- [ ] Create page objects for key pages
- [ ] Write 8 P0 critical E2E tests
- [ ] Setup CI/CD E2E execution

**Week 12: Complete E2E Coverage**
- [ ] Write 12 P1 E2E tests
- [ ] Write 8 P2 E2E tests
- [ ] Cross-browser testing
- [ ] Mobile viewport testing
- [ ] Performance testing with Playwright
- [ ] Document E2E best practices

### Phase 5: CI/CD Integration (Week 13-14)

**Week 13: GitHub Actions Setup**
- [ ] Create `.github/workflows/backend-tests.yml`
- [ ] Create `.github/workflows/frontend-tests.yml`
- [ ] Create `.github/workflows/e2e-tests.yml`
- [ ] Setup test result reporting
- [ ] Configure coverage uploads (Codecov/Coveralls)
- [ ] Setup test failure notifications

**Week 14: Optimization & Documentation**
- [ ] Optimize test execution time
- [ ] Parallel test execution
- [ ] Test flakiness detection
- [ ] Complete test documentation
- [ ] Developer onboarding guide
- [ ] CI/CD monitoring dashboard

---

## 📚 Best Practices & Conventions

### Testing Principles

**F.I.R.S.T.**
- **Fast**: Tests should run quickly (&lt;5 min for full suite)
- **Independent**: Tests should not depend on each other
- **Repeatable**: Tests should produce same results every time
- **Self-Validating**: Tests should clearly pass or fail
- **Timely**: Tests should be written alongside code

**AAA Pattern**
```python
def test_create_member():
    # Arrange - Setup test data
    member_data = {"full_name": "John Doe", "email": "john@example.com"}

    # Act - Execute the action
    response = await client.post("/api/members/", json=member_data)

    # Assert - Verify the outcome
    assert response.status_code == 201
    assert response.json()["full_name"] == "John Doe"
```

### Naming Conventions

**Backend (pytest)**:
- Files: `test_<module>.py` (e.g., `test_members_api.py`)
- Functions: `test_<action>_<expected_result>` (e.g., `test_create_member_success`)
- Fixtures: Descriptive nouns (e.g., `auth_headers`, `test_db`)

**Frontend (Jest)**:
- Files: `<Component>.test.js` (e.g., `MemberAvatar.test.js`)
- Describe blocks: Component/function name (e.g., `describe('MemberAvatar', ...)`)
- Test cases: User-centric (e.g., `it('renders member initials when no photo', ...)`)

**E2E (Playwright)**:
- Files: `<feature>.spec.ts` (e.g., `new-member-registration.spec.ts`)
- Describe blocks: Feature name (e.g., `test.describe('Kiosk - New Member', ...)`)
- Test cases: User journey (e.g., `test('successfully registers new member', ...)`)

### What to Test

**DO Test:**
- ✅ Critical business logic
- ✅ API endpoints (success + error cases)
- ✅ Multi-tenant isolation
- ✅ Authentication & authorization
- ✅ Data validation
- ✅ Edge cases (empty states, null values, etc.)
- ✅ User interactions (clicks, form submissions)
- ✅ Error handling

**DON'T Test:**
- ❌ External library internals (React, FastAPI)
- ❌ CSS styling (unless critical functional styling)
- ❌ Third-party API responses (mock them)
- ❌ Trivial getters/setters

### Test Data Management

**Use Factories, Not Hardcoded Data:**

Bad:
```python
member = {
    "id": "12345",
    "full_name": "John Doe",
    "email": "john@test.com"
}
```

Good:
```python
member = MemberFactory.create(full_name="John Doe")
```

**Isolate Test Data:**
- Each test should create its own data
- Use database transactions/rollback when possible
- Clean up after tests

**Use Realistic Data:**
- Use Faker for names, emails, phone numbers
- Avoid "test123" or "aaa" - use realistic values

### Multi-Tenant Testing

**Always Test Tenant Isolation:**

```python
@pytest.mark.multi_tenant
async def test_members_isolated_by_church(test_client, church_a, church_b):
    # Create member for church A
    member_a = await create_member(church_id=church_a["id"])

    # Login as user from church B
    auth_b = await login_as(church_id=church_b["id"])

    # Attempt to get member from church A
    response = await test_client.get(
        f"/api/members/{member_a['id']}",
        headers=auth_b
    )

    # Should return 404 (not 403, to prevent info leak)
    assert response.status_code == 404
```

### Mocking Guidelines

**Backend: Mock External Services Only**
```python
from unittest.mock import patch

@patch('services.whatsapp.send_message')
async def test_send_otp(mock_whatsapp, test_client):
    mock_whatsapp.return_value = {"success": True}

    response = await test_client.post("/api/kiosk/send-otp", json={
        "phone": "+628123456789"
    })

    assert response.status_code == 200
    mock_whatsapp.assert_called_once()
```

**Frontend: Mock API Calls with MSW**
```javascript
import { server } from '../mocks/server';
import { rest } from 'msw';

test('handles API error gracefully', async () => {
  server.use(
    rest.get('/api/members/', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );

  render(<MembersList />);

  expect(await screen.findByText(/error/i)).toBeInTheDocument();
});
```

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow

#### Backend Tests (`.github/workflows/backend-tests.yml`)

```yaml
name: Backend Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        working-directory: ./backend
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov httpx

      - name: Run tests with coverage
        working-directory: ./backend
        env:
          MONGO_URL: mongodb://localhost:27017
          DB_NAME: faithflow_test
          JWT_SECRET: test-secret-key
        run: |
          pytest --cov=. --cov-report=xml --cov-report=term-missing

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./backend/coverage.xml
          flags: backend
          name: backend-coverage

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pytest-results
          path: ./backend/htmlcov
```

#### Frontend Tests (`.github/workflows/frontend-tests.yml`)

```yaml
name: Frontend Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'frontend/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
          cache-dependency-path: './frontend/yarn.lock'

      - name: Install dependencies
        working-directory: ./frontend
        run: yarn install --frozen-lockfile

      - name: Run tests with coverage
        working-directory: ./frontend
        run: yarn test --coverage --watchAll=false

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./frontend/coverage/coverage-final.json
          flags: frontend
          name: frontend-coverage

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: frontend-coverage
          path: ./frontend/coverage
```

#### E2E Tests (`.github/workflows/e2e-tests.yml`)

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Run daily at 2 AM

jobs:
  e2e:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install backend dependencies
        working-directory: ./backend
        run: |
          pip install -r requirements.txt

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: yarn install --frozen-lockfile

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start backend server
        working-directory: ./backend
        env:
          MONGO_URL: mongodb://localhost:27017
          DB_NAME: faithflow_test
        run: |
          uvicorn server:app --host 0.0.0.0 --port 8000 &
          sleep 10

      - name: Build frontend
        working-directory: ./frontend
        run: yarn build

      - name: Serve frontend
        working-directory: ./frontend
        run: |
          npx serve -s build -p 3000 &
          sleep 5

      - name: Run Playwright tests
        working-directory: ./e2e
        run: npx playwright test

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: e2e/playwright-report/
          retention-days: 30
```

### Pre-commit Hooks

**`.pre-commit-config.yaml`**:
```yaml
repos:
  - repo: local
    hooks:
      - id: backend-unit-tests
        name: Backend Unit Tests
        entry: bash -c 'cd backend && pytest -m unit --tb=short'
        language: system
        pass_filenames: false
        stages: [commit]

      - id: frontend-tests
        name: Frontend Tests
        entry: bash -c 'cd frontend && yarn test --watchAll=false --bail'
        language: system
        pass_filenames: false
        stages: [commit]
```

### Branch Protection Rules

Configure in GitHub repository settings:

**For `main` branch:**
- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass:
  - `backend-tests / test`
  - `frontend-tests / test`
  - `e2e-tests / e2e` (for releases only)
- ✅ Require branches to be up to date
- ✅ Include administrators

---

## 💰 Cost-Benefit Analysis

### Time Investment

| Phase | Duration | Effort (dev-days) |
|-------|----------|-------------------|
| Phase 1: Foundation | 2 weeks | 8 days |
| Phase 2: Core modules | 4 weeks | 16 days |
| Phase 3: Advanced | 4 weeks | 16 days |
| Phase 4: E2E | 2 weeks | 8 days |
| Phase 5: CI/CD | 2 weeks | 6 days |
| **Total** | **14 weeks** | **54 days** |

### Cost Estimate

**Development Cost:**
- 54 dev-days × $300/day (mid-level developer) = **$16,200**

**Infrastructure Cost (Annual):**
- CI/CD minutes: Free tier (GitHub Actions 2,000 min/month) = **$0**
- Test database: Local/Docker = **$0**
- Code coverage tools: Free tier (Codecov) = **$0**

**Total First Year:** ~$16,200

### Benefits (ROI)

**Quantifiable Benefits:**

1. **Bug Prevention**
   - Estimate: 10 critical bugs prevented per year
   - Cost per critical bug: $2,000 (2 dev-days × $1,000/day)
   - Annual savings: **$20,000**

2. **Faster Development**
   - Confidence to refactor: 20% faster feature development
   - Annual development cost: $100,000
   - Savings: **$20,000**

3. **Reduced Manual Testing**
   - QA time saved: 10 hours/week × $50/hour × 52 weeks
   - Annual savings: **$26,000**

4. **Faster Onboarding**
   - Tests as documentation reduce onboarding time by 30%
   - New developer onboarding: 2 weeks → 1.4 weeks
   - Savings per developer: **$3,000**

**Total Annual Benefit:** $69,000+

**ROI Calculation:**
```
ROI = (Benefit - Cost) / Cost × 100%
ROI = ($69,000 - $16,200) / $16,200 × 100%
ROI = 326%
```

**Break-even:** ~3 months after full implementation

**Intangible Benefits:**
- 📈 Increased developer confidence
- 🏆 Higher code quality
- 🚀 Faster release cycles
- 😊 Improved developer experience
- 🔒 Enterprise-grade reliability
- 📚 Living documentation

---

## 🎯 Success Metrics

### Coverage Targets

| Module | Backend API | Frontend Components | E2E Flows |
|--------|-------------|---------------------|-----------|
| **Kiosk** | 90% | 85% | 100% |
| **Members** | 85% | 75% | 80% |
| **Events** | 85% | 75% | 80% |
| **Accounting** | 80% | 70% | 60% |
| **Counseling** | 80% | 70% | 60% |
| **Articles** | 75% | 70% | 40% |
| **Admin** | 80% | 65% | 60% |
| **Overall** | **82%** | **72%** | **70%** |

### Quality Metrics

**Defect Density:**
- Target: &lt;0.5 defects per 1,000 lines of code
- Measurement: Track bugs found in production vs. caught by tests

**Test Reliability:**
- Target: &lt;1% flaky test rate
- Measurement: Track test failures that pass on retry

**Test Execution Time:**
- Backend unit tests: &lt;1 minute
- Backend integration tests: &lt;3 minutes
- Frontend tests: &lt;2 minutes
- E2E tests: &lt;10 minutes
- **Total CI/CD pipeline: &lt;15 minutes**

**Code Review Efficiency:**
- PRs with tests: 30% faster review time
- Target: 90%+ of PRs include relevant tests

---

## 📝 Documentation Requirements

### Test Documentation

1. **README.md** in each test directory explaining:
   - How to run tests locally
   - Test organization structure
   - Common testing patterns
   - Troubleshooting guide

2. **Inline Comments** for complex test scenarios:
   ```python
   # Test multi-tenant isolation by creating members in different churches
   # and verifying that Church A cannot access Church B's members
   async def test_member_isolation():
       ...
   ```

3. **Test Coverage Reports:**
   - Generate HTML reports locally
   - Publish to Codecov in CI/CD
   - Review coverage in PRs

4. **Developer Guide:**
   - Testing philosophy
   - How to write a good test
   - TDD workflow
   - Debugging failed tests

---

## 🚀 Next Steps

### Immediate Actions (This Week)

1. **Review & Approve Proposal**
   - Discuss scope and timeline
   - Allocate resources
   - Set priority order

2. **Setup Development Environment**
   - Install pytest, RTL, Playwright
   - Configure test databases
   - Setup coverage tools

3. **Pilot Testing (Week 1)**
   - Choose one module (e.g., Members)
   - Write 10 backend tests
   - Write 5 frontend tests
   - Measure time and effort

### Decision Points

Before full implementation, please decide:

1. **Scope:**
   - [ ] Full 14-week implementation
   - [ ] Phased approach (Phases 1-2 first)
   - [ ] Critical modules only (Kiosk, Members, Events)

2. **Resources:**
   - [ ] Dedicated QA engineer
   - [ ] Developers write tests
   - [ ] Mix of both

3. **Timeline:**
   - [ ] Start immediately
   - [ ] Start after current sprint
   - [ ] Parallel with feature development

4. **Coverage Goals:**
   - [ ] Aggressive (85%+ backend, 75%+ frontend)
   - [ ] Moderate (75%+ backend, 65%+ frontend)
   - [ ] Minimal (60%+ backend, 50%+ frontend)

---

## 📞 Questions?

For any questions about this proposal or testing implementation:

1. Review the [Testing Best Practices](#best-practices--conventions) section
2. Check the [Implementation Roadmap](#implementation-roadmap)
3. Consult the backend/frontend/E2E testing sections for specific technical details

**Ready to build a bulletproof FaithFlow? Let's start testing! 🧪✨**
