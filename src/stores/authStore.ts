import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SessionAuthResponse,
  SessionBootstrapResponse,
  SessionOrganizationResponse,
  SessionUserResponse,
  bootstrapSession as fetchSessionBootstrap,
  loginSession,
  logoutSession,
  refreshSession,
} from '@/lib/sessionClient';

export interface User {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  phoneNumber: string | null;
  type: string;
  isActive: boolean;
}

export interface Org {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  org: Org | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  isAuthenticated: boolean;
  orgs: Org[];
  isBootstrapping: boolean;
  isHydrated: boolean;
  sessionLoadedAt: number | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  bootstrapSession: () => Promise<void>;
  switchOrg: (orgId: string) => void;
  markHydrated: () => void;
}

const TOKEN_REFRESH_BUFFER_MS = 60_000;
const SESSION_BOOTSTRAP_TTL_MS = 60_000;

let refreshPromise: Promise<boolean> | null = null;
let bootstrapPromise: Promise<void> | null = null;

function toUser(user: SessionUserResponse): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    username: user.username ?? null,
    phoneNumber: user.phone_number ?? null,
    type: user.type,
    isActive: user.is_active,
  };
}

function toOrg(org: SessionOrganizationResponse): Org {
  return {
    id: org.id,
    name: org.name,
    role: org.role,
    isActive: org.is_active,
  };
}

function selectOrg(orgs: Org[], currentOrgId?: string | null): Org | null {
  if (orgs.length === 0) {
    return null;
  }

  if (!currentOrgId) {
    return orgs[0];
  }

  return orgs.find((org) => org.id === currentOrgId) ?? orgs[0];
}

function getTokenExpiry(expiresInSeconds: number): number {
  return Date.now() + expiresInSeconds * 1000;
}

function clearSessionState(): Pick<
  AuthState,
  | 'user'
  | 'org'
  | 'accessToken'
  | 'refreshToken'
  | 'tokenExpiresAt'
  | 'isAuthenticated'
  | 'orgs'
  | 'isBootstrapping'
  | 'sessionLoadedAt'
> {
  return {
    user: null,
    org: null,
    accessToken: null,
    refreshToken: null,
    tokenExpiresAt: null,
    isAuthenticated: false,
    orgs: [],
    isBootstrapping: false,
    sessionLoadedAt: null,
  };
}

function applyBootstrapContext(
  state: AuthState,
  response: SessionBootstrapResponse,
): Pick<AuthState, 'user' | 'org' | 'orgs' | 'isAuthenticated' | 'isBootstrapping' | 'sessionLoadedAt'> {
  const orgs = response.organizations.map(toOrg);

  return {
    user: toUser(response.user),
    orgs,
    org: selectOrg(orgs, state.org?.id),
    isAuthenticated: true,
    isBootstrapping: false,
    sessionLoadedAt: Date.now(),
  };
}

function applyLoginSession(
  state: AuthState,
  response: SessionAuthResponse,
): Pick<
  AuthState,
  | 'user'
  | 'org'
  | 'orgs'
  | 'accessToken'
  | 'refreshToken'
  | 'tokenExpiresAt'
  | 'isAuthenticated'
  | 'isBootstrapping'
  | 'sessionLoadedAt'
> {
  const orgs = response.organizations.map(toOrg);

  return {
    user: toUser(response.user),
    orgs,
    org: selectOrg(orgs, state.org?.id),
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    tokenExpiresAt: getTokenExpiry(response.expires_in),
    isAuthenticated: true,
    isBootstrapping: false,
    sessionLoadedAt: Date.now(),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...clearSessionState(),
      isHydrated: false,

      login: async (identifier: string, password: string) => {
        const response = await loginSession(identifier, password);

        set((state) => ({
          ...applyLoginSession(state, response),
        }));
      },

      logout: async () => {
        const refreshToken = get().refreshToken;

        if (refreshToken) {
          try {
            await logoutSession(refreshToken);
          } catch {
            // Client state must still be cleared even if revocation fails.
          }
        }

        refreshPromise = null;
        bootstrapPromise = null;
        set(clearSessionState());
      },

      refreshTokens: async () => {
        if (refreshPromise) {
          return refreshPromise;
        }

        const currentRefreshToken = get().refreshToken;
        if (!currentRefreshToken) {
          set(clearSessionState());
          return false;
        }

        refreshPromise = (async () => {
          try {
            const tokens = await refreshSession(currentRefreshToken);

            set({
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              tokenExpiresAt: getTokenExpiry(tokens.expires_in),
              isAuthenticated: true,
            });

            return true;
          } catch {
            set(clearSessionState());
            return false;
          } finally {
            refreshPromise = null;
          }
        })();

        return refreshPromise;
      },

      bootstrapSession: async () => {
        if (bootstrapPromise) {
          return bootstrapPromise;
        }

        const {
          isAuthenticated,
          accessToken,
          tokenExpiresAt,
          sessionLoadedAt,
        } = get();

        if (!isAuthenticated || !accessToken) {
          return;
        }

        const recentlyBootstrapped =
          sessionLoadedAt !== null &&
          Date.now() - sessionLoadedAt < SESSION_BOOTSTRAP_TTL_MS;

        if (recentlyBootstrapped) {
          return;
        }

        bootstrapPromise = (async () => {
          set({ isBootstrapping: true });

          try {
            const shouldRefresh =
              tokenExpiresAt !== null &&
              tokenExpiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MS;

            if (shouldRefresh) {
              const refreshed = await get().refreshTokens();
              if (!refreshed) {
                return;
              }
            }

            const latestToken = get().accessToken;
            if (!latestToken) {
              set(clearSessionState());
              return;
            }

            const response = await fetchSessionBootstrap(latestToken);

            set((state) => ({
              ...applyBootstrapContext(state, response),
            }));
          } catch {
            set(clearSessionState());
          } finally {
            bootstrapPromise = null;
            set((state) => ({
              isBootstrapping: false,
              sessionLoadedAt: state.sessionLoadedAt,
            }));
          }
        })();

        return bootstrapPromise;
      },

      switchOrg: (orgId: string) => {
        const org = get().orgs.find((candidate) => candidate.id === orgId);
        if (org) {
          set({
            org,
          });
        }
      },

      markHydrated: () => {
        set({
          isHydrated: true,
        });
      },
    }),
    {
      name: 'muvue-auth',
      partialize: (state) => ({
        user: state.user,
        org: state.org,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenExpiresAt: state.tokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
        orgs: state.orgs,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
