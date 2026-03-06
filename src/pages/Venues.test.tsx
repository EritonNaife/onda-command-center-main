import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Venues from './Venues';

const mocks = vi.hoisted(() => ({
  authState: {
    org: {
      id: 'org-1',
      name: 'Test Org',
      role: 'member',
      isActive: true,
    },
  },
  useVenues: vi.fn(),
}));

vi.mock('@/components/auth/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/venues/VenueDialog', () => ({
  VenueDialog: () => null,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: typeof mocks.authState) => unknown) =>
    selector(mocks.authState),
}));

vi.mock('@/hooks/useVenues', () => ({
  useVenues: (...args: unknown[]) => mocks.useVenues(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <Venues />
    </MemoryRouter>,
  );
}

describe('Venues page access', () => {
  beforeEach(() => {
    mocks.useVenues.mockReturnValue({
      data: {
        data: [
          {
            id: 'venue-1',
            name: 'Main Hall',
            capacity: 500,
            description: 'Downtown venue',
            event_count: 2,
            address: {
              city: 'Maputo',
              country: 'Mozambique',
            },
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

  it('shows venue management controls for members', () => {
    mocks.authState.org.role = 'member';

    renderPage();

    expect(
      screen.getByRole('button', { name: /add venue/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('shows read-only venue access for viewer roles', () => {
    mocks.authState.org.role = 'viewer';

    renderPage();

    expect(
      screen.queryByRole('button', { name: /add venue/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(/cannot create or edit the venue directory/i),
    ).toBeInTheDocument();
  });
});
