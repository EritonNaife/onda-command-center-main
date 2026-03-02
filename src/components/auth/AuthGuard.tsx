import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoginScreen } from './LoginScreen';

interface AuthGuardProps {
  children: React.ReactNode;
}

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
              No active organizations
            </h1>
            <p className="text-sm text-muted-foreground">
              Your account is authenticated, but auth did not return an active
              Move organization for this dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
