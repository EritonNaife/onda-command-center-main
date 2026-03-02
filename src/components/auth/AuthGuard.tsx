import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoginScreen } from './LoginScreen';

interface AuthGuardProps {
  children: React.ReactNode;
}

const SUPPORT_EMAIL = 'support@onda.app';

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootstrapSession = useAuthStore((s) => s.bootstrapSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const logout = useAuthStore((s) => s.logout);
  const org = useAuthStore((s) => s.org);
  const refreshTokens = useAuthStore((s) => s.refreshTokens);
  const tokenExpiresAt = useAuthStore((s) => s.tokenExpiresAt);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !accessToken) {
      return;
    }

    void bootstrapSession();
  }, [accessToken, bootstrapSession, isAuthenticated, isHydrated]);

  useEffect(() => {
    if (!isAuthenticated || !tokenExpiresAt) {
      return;
    }

    const checkAndRefresh = () => {
      const timeLeft = tokenExpiresAt - Date.now();
      if (timeLeft < 2 * 60 * 1000) {
        void refreshTokens();
      }
    };

    checkAndRefresh();

    const interval = setInterval(checkAndRefresh, 60_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshTokens, tokenExpiresAt]);

  if (!isHydrated || (isAuthenticated && isBootstrapping)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="glass-panel w-full max-w-md p-6 text-center text-sm text-muted-foreground">
          Loading session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (!org) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="glass-panel w-full max-w-md space-y-4 p-6 text-center">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold text-foreground">
              No Move organizer access
            </h1>
            <p className="text-sm text-muted-foreground">
              You are signed in, but this account does not have an active Move
              organizer membership for the Onda dashboard.
            </p>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user?.email ?? 'unknown account'}</span>.
              If this is the wrong account, sign out and try again.
            </p>
            <p className="text-sm text-muted-foreground">
              If you should already have access, contact your workspace admin or{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Move organizer access`}
                className="font-medium text-primary underline underline-offset-4"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Move organizer access`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.06]"
            >
              Contact Support
            </a>

            <button
              type="button"
              onClick={() => {
                void logout();
              }}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
