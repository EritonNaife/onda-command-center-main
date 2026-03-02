import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { OrgSwitcher } from '@/components/auth/OrgSwitcher';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export const OverviewHeader = () => {
  const user = useAuthStore((s) => s.user);
  const org = useAuthStore((s) => s.org);
  const logout = useAuthStore((s) => s.logout);

  return (
    <motion.div
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {/* Left: Org name + Switcher */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold text-foreground">
            {org?.name ?? 'Organization'}
          </span>
        </div>

        <OrgSwitcher />

        <span className="glass-pill text-xs font-medium text-muted-foreground">
          Overview
        </span>
      </div>

      {/* Right: User Avatar + Logout */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border border-white/[0.08]">
              <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => {
                void logout();
              }}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
