import type { ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import CreateEvent from './CreateEvent';
import { renderWithRoute } from '@/test/renderWithProviders';
import {
  DEFAULT_EVENT_TIMEZONE,
  localInputToIso,
} from '@/lib/eventManagement';

const mocks = vi.hoisted(() => ({
  authState: {
    org: {
      id: 'org-1',
      name: 'Test Org',
      role: 'member',
      isActive: true,
    },
  },
  createEventMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  useVenues: vi.fn(),
  useVenue: vi.fn(),
  toast: vi.fn(),
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

vi.mock('@/hooks/useCreateEvent', () => ({
  useCreateEvent: () => mocks.createEventMutation,
}));

vi.mock('@/hooks/useVenues', () => ({
  useVenues: (...args: unknown[]) => mocks.useVenues(...args),
  useVenue: (...args: unknown[]) => mocks.useVenue(...args),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

function renderPage() {
  return renderWithRoute(<CreateEvent />, {
    path: '/events/new',
    route: '/events/new',
  });
}

describe('CreateEvent page access', () => {
  beforeEach(() => {
    mocks.createEventMutation.mutateAsync.mockReset();
    mocks.toast.mockReset();
    mocks.useVenues.mockReturnValue({
      data: {
        data: [],
        meta: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 1,
        },
      },
      isError: false,
      isLoading: false,
    });
    mocks.useVenue.mockReturnValue({ data: undefined });
  });

  it('renders a read-only message for viewer roles', () => {
    mocks.authState.org.role = 'viewer';

    renderPage();

    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^create event$/i }),
    ).not.toBeInTheDocument();
  });

  it('submits the create flow for members', async () => {
    mocks.authState.org.role = 'member';
    mocks.createEventMutation.mutateAsync.mockResolvedValue({
      id: 'event-99',
      name: 'Sunset Session',
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/event name/i), {
      target: { value: 'Sunset Session' },
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: '2030-06-15T18:00' },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: '2030-06-16T02:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^create event$/i }));

    await waitFor(() => {
      expect(mocks.createEventMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sunset Session',
          start_time: localInputToIso('2030-06-15T18:00'),
          end_time: localInputToIso('2030-06-16T02:00'),
          status: 'draft',
          timezone: DEFAULT_EVENT_TIMEZONE,
        }),
      );
    });
  });
});
