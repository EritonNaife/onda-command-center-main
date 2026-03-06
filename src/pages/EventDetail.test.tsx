import type { ReactNode } from 'react';
import { screen } from '@testing-library/react';
import EventDetail from './EventDetail';
import { renderWithRoute } from '@/test/renderWithProviders';

const mocks = vi.hoisted(() => ({
  authState: {
    org: {
      id: 'org-1',
      name: 'Test Org',
      role: 'member',
      isActive: true,
    },
  },
  useEventDetail: vi.fn(),
  useTicketTypes: vi.fn(),
  useArtists: vi.fn(),
  useEventLineup: vi.fn(),
  createTicketTypeMutation: {
    isPending: false,
    mutateAsync: vi.fn(),
  },
  updateTicketTypeMutation: {
    isPending: false,
    mutateAsync: vi.fn(),
  },
  deleteTicketTypeMutation: {
    isPending: false,
    mutateAsync: vi.fn(),
  },
  addToLineupMutation: {
    isPending: false,
    mutateAsync: vi.fn(),
  },
  removeFromLineupMutation: {
    isPending: false,
    mutateAsync: vi.fn(),
  },
  toast: vi.fn(),
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

vi.mock('@/hooks/useEventDetail', () => ({
  useEventDetail: (...args: unknown[]) => mocks.useEventDetail(...args),
}));

vi.mock('@/hooks/useTicketTypes', () => ({
  useTicketTypes: (...args: unknown[]) => mocks.useTicketTypes(...args),
  useCreateTicketType: () => mocks.createTicketTypeMutation,
  useUpdateTicketType: () => mocks.updateTicketTypeMutation,
  useDeleteTicketType: () => mocks.deleteTicketTypeMutation,
}));

vi.mock('@/hooks/useArtists', () => ({
  useArtists: (...args: unknown[]) => mocks.useArtists(...args),
  useEventLineup: (...args: unknown[]) => mocks.useEventLineup(...args),
  useAddToLineup: () => mocks.addToLineupMutation,
  useRemoveFromLineup: () => mocks.removeFromLineupMutation,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

function renderPage() {
  return renderWithRoute(<EventDetail />, {
    path: '/events/:eventId/detail',
    route: '/events/event-1/detail',
  });
}

describe('EventDetail access', () => {
  beforeEach(() => {
    mocks.useEventDetail.mockReturnValue({
      data: {
        id: 'event-1',
        name: 'Sunset Session',
        description: 'Late rooftop set',
        start_time: '2030-06-15T18:00:00Z',
        end_time: '2030-06-16T02:00:00Z',
        venue_id: 'venue-1',
        venue_name: 'Main Hall',
        capacity: 500,
        timezone: 'Africa/Maputo',
        status: 'upcoming',
        publication_status: 'published',
        cover_image_url: null,
        tickets_sold: 120,
        ticket_types: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    });
    mocks.useTicketTypes.mockReturnValue({
      data: [
        {
          id: 'tt-1',
          name: 'General Admission',
          price: 500,
          quantity: 200,
          quantity_sold: 120,
          quantity_remaining: 80,
          is_vip: false,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });
    mocks.useArtists.mockReturnValue({
      data: [
        {
          id: 'artist-1',
          name: 'DJ Ardiles',
          genre: 'Afro House',
        },
      ],
    });
    mocks.useEventLineup.mockReturnValue({
      data: [
        {
          artist: {
            id: 'artist-1',
            name: 'DJ Ardiles',
            genre: 'Afro House',
          },
          performance_order: 1,
          is_headliner: true,
          stage: 'Main Stage',
          start_time: '2030-06-15T18:00:00Z',
          end_time: '2030-06-15T19:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('shows edit controls for members', () => {
    mocks.authState.org.role = 'member';

    renderPage();

    expect(
      screen.getByRole('button', { name: /edit event/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add ticket type/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add to lineup/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/dj ardiles/i)).toBeInTheDocument();
  });

  it('shows a read-only notice for viewer roles', () => {
    mocks.authState.org.role = 'viewer';

    renderPage();

    expect(
      screen.getByText(/role is read-only here/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /edit event/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add ticket type/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add to lineup/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/main stage/i)).toBeInTheDocument();
  });
});
