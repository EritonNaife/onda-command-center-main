import { ReactNode, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Mic2, RadioTower, Settings2 } from 'lucide-react';
import { OrgSwitcher } from '@/components/auth/OrgSwitcher';
import { NavLink } from '@/components/NavLink';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';

interface AppShellProps {
  children: ReactNode;
}

const navLinkClassName =
  'rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground';
const navLinkActiveClassName = 'bg-white/[0.06] text-foreground';

export const AppShell = ({ children }: AppShellProps) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const org = useAuthStore((s) => s.org);
  const navigate = useNavigate();
  const prevOrgId = useRef(org?.id);

  useEffect(() => {
    if (prevOrgId.current && org?.id && prevOrgId.current !== org.id) {
      navigate('/');
    }
    prevOrgId.current = org?.id;
  }, [org?.id, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/[0.06] bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-primary">
                <RadioTower className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[0.18em] text-foreground">
                  ONDA
                </p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Command Center
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-1">
              <NavLink
                to="/"
                end
                className={navLinkClassName}
                activeClassName={navLinkActiveClassName}
              >
                <span className="inline-flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Overview
                </span>
              </NavLink>
              <NavLink
                to="/events"
                className={navLinkClassName}
                activeClassName={navLinkActiveClassName}
              >
                Events
              </NavLink>
              <NavLink
                to="/venues"
                className={navLinkClassName}
                activeClassName={navLinkActiveClassName}
              >
                Venues
              </NavLink>
              <NavLink
                to="/artists"
                className={navLinkClassName}
                activeClassName={navLinkActiveClassName}
              >
                <span className="inline-flex items-center gap-2">
                  <Mic2 className="h-4 w-4" />
                  Artists
                </span>
              </NavLink>
              <NavLink
                to="/settings"
                className={navLinkClassName}
                activeClassName={navLinkActiveClassName}
              >
                <span className="inline-flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Settings
                </span>
              </NavLink>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <OrgSwitcher />
            {user && (
              <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1.5">
                <Avatar className="h-8 w-8 border border-white/[0.08]">
                  <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                    {user.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[180px] truncate text-sm text-foreground sm:inline">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void logout();
                  }}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};
