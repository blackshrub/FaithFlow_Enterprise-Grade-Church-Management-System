/**
 * Jest setup file for FaithFlow frontend tests.
 *
 * This file runs before all tests and provides:
 * - Custom Jest matchers from @testing-library/jest-dom
 * - Mock implementations for browser APIs
 * - Global test utilities and helpers
 */

// Import jest-dom matchers
import '@testing-library/jest-dom';

// Mock window.matchMedia (required for responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
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

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

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

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock HTMLElement.prototype.scrollTo
HTMLElement.prototype.scrollTo = jest.fn();

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Suppress console errors in tests (optional, uncomment if needed)
// global.console.error = jest.fn();

// Suppress console warnings in tests (optional, uncomment if needed)
// global.console.warn = jest.fn();
