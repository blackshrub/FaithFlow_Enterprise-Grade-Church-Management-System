/**
 * Tests for useMembers hook.
 *
 * Tests cover:
 * - Fetching members successfully
 * - Handling fetch errors
 * - Applying filters
 * - Loading and error states
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMembers } from './useMembers';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
        cacheTime: 0, // Disable caching for tests
      },
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

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Check data
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].full_name).toBe('John Doe');
    expect(result.current.data[1].full_name).toBe('Jane Smith');
  });

  it('handles fetch errors', async () => {
    // Override handler to return error
    server.use(
      http.get('*/api/members/', () => {
        return HttpResponse.json(
          { detail: 'Server error' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useMembers(), {
      wrapper: createWrapper(),
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('applies filters correctly', async () => {
    // Override handler to check params
    let receivedParams = null;

    server.use(
      http.get('*/api/members/', ({ request }) => {
        const url = new URL(request.url);
        receivedParams = {
          status: url.searchParams.get('status'),
          search: url.searchParams.get('search'),
        };

        return HttpResponse.json([
          {
            id: 'member-001',
            full_name: 'John Doe',
            member_status: 'Active'
          }
        ]);
      })
    );

    const { result } = renderHook(
      () => useMembers({ status: 'Active', search: 'John' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify query params were sent
    expect(receivedParams).toEqual({
      status: 'Active',
      search: 'John'
    });
  });

  it('returns empty array when no members', async () => {
    server.use(
      http.get('*/api/members/', () => {
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(() => useMembers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('has correct loading state transitions', async () => {
    const { result } = renderHook(() => useMembers(), {
      wrapper: createWrapper(),
    });

    // Should start loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);

    // Wait for completion
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should no longer be loading
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});
