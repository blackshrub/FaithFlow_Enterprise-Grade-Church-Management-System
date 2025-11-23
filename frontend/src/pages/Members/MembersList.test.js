/**
 * Tests for MembersList page.
 *
 * Tests cover:
 * - Loading state display
 * - Member list display after fetch
 * - Error handling
 * - Search functionality
 * - Navigation to member detail
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import userEvent from '@testing-library/user-event';
import MembersList from './MembersList';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import i18n from '../../i18n';

// Helper to render with all required providers
const renderWithProviders = (ui, { route = '/members' } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  window.history.pushState({}, 'Test page', route);

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          {ui}
        </I18nextProvider>
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

  it('displays member details in table', async () => {
    renderWithProviders(<MembersList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Check for email and phone
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('+6281234567890')).toBeInTheDocument();
  });

  it('displays error message when fetch fails', async () => {
    server.use(
      http.get('*/api/members/', () => {
        return HttpResponse.json(
          { message: 'Server error' },
          { status: 500 }
        );
      })
    );

    renderWithProviders(<MembersList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no members', async () => {
    server.use(
      http.get('*/api/members/', () => {
        return HttpResponse.json([]);
      })
    );

    renderWithProviders(<MembersList />);

    await waitFor(() => {
      expect(screen.getByText(/no members found/i)).toBeInTheDocument();
    });
  });

  it('filters members by search query', async () => {
    const user = userEvent.setup();

    // Mock search endpoint
    server.use(
      http.get('*/api/members/', ({ request }) => {
        const url = new URL(request.url);
        const search = url.searchParams.get('search');

        if (search === 'John') {
          return HttpResponse.json([
            {
              id: 'member-001',
              full_name: 'John Doe',
              email: 'john@example.com',
              member_status: 'Active'
            }
          ]);
        }

        return HttpResponse.json([
          { id: 'member-001', full_name: 'John Doe', email: 'john@example.com', member_status: 'Active' },
          { id: 'member-002', full_name: 'Jane Smith', email: 'jane@example.com', member_status: 'Active' }
        ]);
      })
    );

    renderWithProviders(<MembersList />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'John');

    // Wait for filtered results
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

    // Click on member row
    const memberRow = screen.getByText('John Doe').closest('tr');
    await user.click(memberRow);

    // Check URL changed (in real app, would use navigate mock)
    await waitFor(() => {
      expect(window.location.pathname).toContain('/members/');
    });
  });

  it('displays create member button', async () => {
    renderWithProviders(<MembersList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /create member/i })).toBeInTheDocument();
  });

  it('opens create modal when button clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<MembersList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create member/i });
    await user.click(createButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
