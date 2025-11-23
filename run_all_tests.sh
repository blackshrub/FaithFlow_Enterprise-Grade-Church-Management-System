#!/bin/bash

# FaithFlow - Run All Tests Script
# This script runs all automated tests (Backend, Frontend, E2E)

set -e  # Exit on error

echo "=========================================="
echo "🧪 FaithFlow - Complete Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists python3; then
    print_error "Python3 is not installed. Please install Python3 first."
    exit 1
fi

if ! command_exists yarn; then
    print_error "Yarn is not installed. Please install Yarn first."
    exit 1
fi

print_success "All prerequisites found!"
echo ""

# Parse command line arguments
SKIP_BACKEND=false
SKIP_FRONTEND=false
SKIP_E2E=false
COVERAGE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backend)
            SKIP_BACKEND=true
            shift
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --skip-e2e)
            SKIP_E2E=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --skip-backend    Skip backend tests"
            echo "  --skip-frontend   Skip frontend unit tests"
            echo "  --skip-e2e        Skip E2E tests"
            echo "  --coverage        Generate coverage reports"
            echo "  --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                              # Run all tests"
            echo "  $0 --coverage                   # Run all tests with coverage"
            echo "  $0 --skip-e2e                   # Run backend and frontend only"
            echo "  $0 --skip-backend --skip-frontend  # Run E2E tests only"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Track test results
BACKEND_PASSED=false
FRONTEND_PASSED=false
E2E_PASSED=false

# Start test database
if [ "$SKIP_BACKEND" = false ]; then
    print_status "Starting test database..."
    docker-compose -f docker-compose.test.yml up -d

    # Wait for MongoDB to be ready
    print_status "Waiting for MongoDB to be ready..."
    sleep 5

    print_success "Test database is running!"
    echo ""
fi

# ==========================================
# 1. Backend Integration Tests
# ==========================================
if [ "$SKIP_BACKEND" = false ]; then
    echo "=========================================="
    echo "🐍 Backend Integration Tests (156 tests)"
    echo "=========================================="
    echo ""

    cd backend

    print_status "Installing Python dependencies..."
    pip install -q -r requirements.txt

    if [ "$COVERAGE" = true ]; then
        print_status "Running backend tests with coverage..."
        if pytest --cov --cov-report=html:htmlcov --cov-report=term -v; then
            BACKEND_PASSED=true
            print_success "Backend tests PASSED with coverage!"
            print_status "Coverage report: backend/htmlcov/index.html"
        else
            print_error "Backend tests FAILED!"
        fi
    else
        print_status "Running backend tests..."
        if pytest -v; then
            BACKEND_PASSED=true
            print_success "Backend tests PASSED!"
        else
            print_error "Backend tests FAILED!"
        fi
    fi

    cd ..
    echo ""
fi

# ==========================================
# 2. Frontend Unit Tests
# ==========================================
if [ "$SKIP_FRONTEND" = false ]; then
    echo "=========================================="
    echo "⚛️  Frontend Unit Tests"
    echo "=========================================="
    echo ""

    cd frontend

    print_status "Installing Node dependencies..."
    yarn install --silent

    if [ "$COVERAGE" = true ]; then
        print_status "Running frontend tests with coverage..."
        if yarn test:ci; then
            FRONTEND_PASSED=true
            print_success "Frontend tests PASSED with coverage!"
            print_status "Coverage report: frontend/coverage/lcov-report/index.html"
        else
            print_error "Frontend tests FAILED!"
        fi
    else
        print_status "Running frontend tests..."
        if yarn test --watchAll=false; then
            FRONTEND_PASSED=true
            print_success "Frontend tests PASSED!"
        else
            print_error "Frontend tests FAILED!"
        fi
    fi

    cd ..
    echo ""
fi

# ==========================================
# 3. E2E Tests with Playwright
# ==========================================
if [ "$SKIP_E2E" = false ]; then
    echo "=========================================="
    echo "🎭 E2E Tests with Playwright (42 tests)"
    echo "=========================================="
    echo ""

    cd frontend

    print_status "Checking Playwright installation..."
    if ! npx playwright --version >/dev/null 2>&1; then
        print_status "Installing Playwright browsers..."
        npx playwright install --with-deps
    fi

    print_status "Running E2E tests..."
    print_warning "Make sure the backend server is running on http://localhost:8000"
    print_warning "Make sure the frontend dev server is running on http://localhost:3000"

    # Give user time to start servers if needed
    read -p "Press Enter to continue when servers are ready, or Ctrl+C to cancel..."

    if yarn test:e2e; then
        E2E_PASSED=true
        print_success "E2E tests PASSED!"
        print_status "View report: yarn test:e2e:report"
    else
        print_error "E2E tests FAILED!"
        print_status "Check playwright-report/ for details"
    fi

    cd ..
    echo ""
fi

# ==========================================
# Cleanup
# ==========================================
if [ "$SKIP_BACKEND" = false ]; then
    print_status "Stopping test database..."
    docker-compose -f docker-compose.test.yml down
    print_success "Test database stopped!"
    echo ""
fi

# ==========================================
# Final Summary
# ==========================================
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""

if [ "$SKIP_BACKEND" = false ]; then
    if [ "$BACKEND_PASSED" = true ]; then
        echo -e "${GREEN}✅ Backend Tests: PASSED (156 tests)${NC}"
    else
        echo -e "${RED}❌ Backend Tests: FAILED${NC}"
    fi
fi

if [ "$SKIP_FRONTEND" = false ]; then
    if [ "$FRONTEND_PASSED" = true ]; then
        echo -e "${GREEN}✅ Frontend Tests: PASSED${NC}"
    else
        echo -e "${RED}❌ Frontend Tests: FAILED${NC}"
    fi
fi

if [ "$SKIP_E2E" = false ]; then
    if [ "$E2E_PASSED" = true ]; then
        echo -e "${GREEN}✅ E2E Tests: PASSED (42 tests)${NC}"
    else
        echo -e "${RED}❌ E2E Tests: FAILED${NC}"
    fi
fi

echo ""
echo "=========================================="

# Exit with error if any test failed
if [ "$SKIP_BACKEND" = false ] && [ "$BACKEND_PASSED" = false ]; then
    exit 1
fi

if [ "$SKIP_FRONTEND" = false ] && [ "$FRONTEND_PASSED" = false ]; then
    exit 1
fi

if [ "$SKIP_E2E" = false ] && [ "$E2E_PASSED" = false ]; then
    exit 1
fi

print_success "All tests completed successfully! 🎉"
exit 0
