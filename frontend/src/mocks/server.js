/**
 * MSW server setup for Node.js test environment.
 *
 * This server intercepts HTTP requests during tests and returns mock responses
 * defined in handlers.js.
 *
 * Automatically imported in setupTests.js.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server with default handlers
export const server = setupServer(...handlers);

// Enable API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about requests not covered by handlers
  });
});

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});
