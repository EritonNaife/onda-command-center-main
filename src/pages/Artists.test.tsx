import type { ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import Artists from './Artists';
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
  useArtists: vi.fn(),
  useArtist: vi.fn(),
  createArtistMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  updateArtistMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  claimArtistMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  releaseArtistMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
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

vi.mock('@/hooks/useArtists', () => ({
  useArtists: (...args: unknown[]) => mocks.useArtists(...args),
  useArtist: (...args: unknown[]) => mocks.useArtist(...args),
  useCreateArtist: () => mocks.createArtistMutation,
  useUpdateArtist: () => mocks.updateArtistMutation,
  useClaimArtist: () => mocks.claimArtistMutation,
  useReleaseArtist: () => mocks.releaseArtistMutation,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

function renderPage() {
  return renderWithRoute(<Artists />, {
    path: '/artists',
    route: '/artists',
  });
}

describe('Artists page access', () => {
  beforeEach(() => {
    mocks.useArtists.mockReturnValue({
      data: [
        {
          id: 'artist-1',
          name: 'DJ Ardiles',
          genre: 'Afro House',
          bio: 'Sunset-driven selector',
          image_url: null,
          email: 'ardiles@example.com',
          created_at: '2030-01-01T00:00:00.000Z',
          created_by_org_id: 'org-1',
          managed_by_org_id: 'org-1',
          is_verified: true,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });
    mocks.useArtist.mockReturnValue({ data: undefined });
    mocks.createArtistMutation.mutateAsync.mockReset();
    mocks.toast.mockReset();
  });

  it('shows artist cards and the add button for members', () => {
    mocks.authState.org.role = 'member';

    renderPage();

    expect(screen.getByRole('button', { name: /add artist/i })).toBeInTheDocument();
    expect(screen.getByText(/dj ardiles/i)).toBeInTheDocument();
    expect(screen.getByText(/managed & verified/i)).toBeInTheDocument();
  });

  it('shows a read-only message for viewer roles', () => {
    mocks.authState.org.role = 'viewer';

    renderPage();

    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add artist/i }),
    ).not.toBeInTheDocument();
  });

  it('submits the create flow for members', async () => {
    mocks.authState.org.role = 'member';
    mocks.createArtistMutation.mutateAsync.mockResolvedValue({
      id: 'artist-2',
      name: 'Maya Azul',
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /add artist/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Maya Azul' },
    });
    fireEvent.change(screen.getByLabelText(/genre/i), {
      target: { value: 'Amapiano' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create artist/i }));

    await waitFor(() => {
      expect(mocks.createArtistMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Maya Azul',
          genre: 'Amapiano',
        }),
      );
    });
  });
});
