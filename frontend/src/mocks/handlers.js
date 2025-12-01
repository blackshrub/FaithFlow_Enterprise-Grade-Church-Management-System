/**
 * MSW (Mock Service Worker) request handlers for frontend tests.
 *
 * These handlers intercept API requests during tests and return mock data.
 * This allows us to test components in isolation without a real backend.
 *
 * Usage in tests:
 *   - Default handlers are used automatically
 *   - Override with: server.use(http.get('/api/members/', () => ...))
 */

import { http, HttpResponse } from 'msw';

const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

export const handlers = [
  // ==================== Auth API ====================
  http.post(`${API_BASE}/api/auth/login`, async ({ request }) => {
    const body = await request.json();

    if (body.email === 'admin@test.org' && body.password === 'test123') {
      return HttpResponse.json({
        access_token: 'mock-jwt-token-123',
        user: {
          id: 'user-001',
          email: 'admin@test.org',
          full_name: 'Test Admin',
          role: 'admin',
          church_id: 'church-001'
        }
      });
    }

    return HttpResponse.json(
      { detail: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // ==================== Members API ====================
  http.get(`${API_BASE}/api/members/`, () => {
    return HttpResponse.json([
      {
        id: 'member-001',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone_whatsapp: '+6281234567890',
        gender: 'Male',
        member_status: 'Active',
        personal_qr_code: 'QR_CODE_BASE64',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'member-002',
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        phone_whatsapp: '+6289876543210',
        gender: 'Female',
        member_status: 'Active',
        personal_qr_code: 'QR_CODE_BASE64',
        created_at: '2024-01-02T00:00:00Z'
      }
    ]);
  }),

  http.get(`${API_BASE}/api/members/:id`, ({ params }) => {
    const { id } = params;

    const members = {
      'member-001': {
        id: 'member-001',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone_whatsapp: '+6281234567890',
        gender: 'Male',
        member_status: 'Active',
        personal_qr_code: 'QR_CODE_BASE64',
        created_at: '2024-01-01T00:00:00Z'
      }
    };

    if (members[id]) {
      return HttpResponse.json(members[id]);
    }

    return HttpResponse.json(
      { detail: 'Member not found' },
      { status: 404 }
    );
  }),

  http.post(`${API_BASE}/api/members/`, async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json({
      id: 'new-member-001',
      ...body,
      personal_qr_code: 'QR_CODE_BASE64',
      created_at: new Date().toISOString()
    }, { status: 201 });
  }),

  // ==================== Events API ====================
  http.get(`${API_BASE}/api/events/`, () => {
    return HttpResponse.json([
      {
        id: 'event-001',
        name: 'Sunday Service',
        event_date: '2024-12-15T10:00:00Z',
        location: 'Main Sanctuary',
        max_participants: 200,
        requires_rsvp: true
      },
      {
        id: 'event-002',
        name: 'Youth Conference',
        event_date: '2024-12-20T14:00:00Z',
        location: 'Youth Hall',
        max_participants: 100,
        requires_rsvp: true
      }
    ]);
  }),

  // ==================== Settings API ====================
  http.get(`${API_BASE}/api/settings/church-settings`, () => {
    return HttpResponse.json({
      church_name: 'Test Church',
      timezone: 'Asia/Jakarta',
      locale: 'id',
      email: 'test@church.org'
    });
  }),

  http.get(`${API_BASE}/api/settings/member-statuses`, () => {
    return HttpResponse.json([
      {
        id: 'status-001',
        name: 'Visitor',
        slug: 'visitor',
        color: '#6B7280',
        is_active: true
      },
      {
        id: 'status-002',
        name: 'Active',
        slug: 'active',
        color: '#10B981',
        is_active: true
      }
    ]);
  }),

  // ==================== Counseling API ====================
  http.get(`${API_BASE}/api/v1/counseling/appointments`, () => {
    return HttpResponse.json([
      {
        id: 'appointment-001',
        member_name: 'John Doe',
        counselor_name: 'Pastor Smith',
        date: '2024-12-10',
        start_time: '10:00',
        end_time: '11:00',
        status: 'approved',
        type: 'counseling',
        urgency: 'normal'
      }
    ]);
  }),

  // ==================== Catch-all for unhandled requests ====================
  http.get('*', () => {
    console.warn('Unhandled GET request');
    return HttpResponse.json(
      { detail: 'Not found' },
      { status: 404 }
    );
  }),

  http.post('*', () => {
    console.warn('Unhandled POST request');
    return HttpResponse.json(
      { detail: 'Not found' },
      { status: 404 }
    );
  }),
];
