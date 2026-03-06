import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Events from './Events';

const mocks = vi.hoisted(() => ({
  authState: {
    org: {
      id: 'org-1',
      name: 'Test Org',
      role: 'member',
      isActive: true,
    },
  },
  useEvents: vi.fn(),
}));

vi.mock('@/components/auth/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: typeof mocks.authState) => unknown) =>
    selector(mocks.authState),
}));

vi.mock('@/hooks/useEvents', () => ({
  useEvents: (...args: unknown[]) => mocks.useEvents(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <Events />
    </MemoryRouter>,
  );
}

describe('Events page access', () => {
  beforeEach(() => {
    mocks.useEvents.mockReturnValue({
      data: {
        data: [
          {
            id: 'event-1',
            name: 'Sunset Session',
            description: null,
            start_time: '2030-06-15T18:00:00Z',
            end_time: '2030-06-16T02:00:00Z',
            venue_name: 'Main Hall',
            capacity: 500,
            status: 'upcoming',
            tickets_sold: 120,
            ticket_types: [],
          },
        ],
        meta: {
          page: 1,
          limit: 12,
          total: 1,
          totalPages: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('shows create event controls for members', () => {
    mocks.authState.org.role = 'member';

    renderPage();

    expect(
      screen.getByRole('button', { name: /create event/i }),
    ).toBeInTheDocument();
  });

  it('shows a read-only notice for viewer roles', () => {
    mocks.authState.org.role = 'viewer';

    renderPage();

    expect(
      screen.queryByRole('button', { name: /create event/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/read-only for event management/i),
    ).toBeInTheDocument();
  });
});
