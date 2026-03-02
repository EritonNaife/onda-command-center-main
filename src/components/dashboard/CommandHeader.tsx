import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { EventSwitcherOption, LiveDashboardEvent } from '@/types/dashboard';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { OrgSwitcher } from '@/components/auth/OrgSwitcher';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CommandHeaderProps {
  event: LiveDashboardEvent;
  eventOptions: EventSwitcherOption[];
}

export const CommandHeader = ({ event, eventOptions }: CommandHeaderProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  const formatMZN = (n: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

  return (
    <motion.div
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {/* Left: Event Switcher + Org + Live Badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setShowSwitcher(!showSwitcher)}
            className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-left transition-colors hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Switch event"
            aria-expanded={showSwitcher}
          >
            <span className="text-lg font-semibold text-foreground">{event.name}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <AnimatePresence>
            {showSwitcher && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                className="absolute left-0 top-full z-50 mt-2 min-w-[260px] overflow-hidden rounded-xl border border-white/[0.08] bg-card/95 backdrop-blur-xl"
              >
                {eventOptions.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => {
                      navigate(`/events/${ev.id}`);
                      setShowSwitcher(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-white/[0.06] ${
                      ev.id === event.id ? 'bg-white/[0.04] text-primary' : 'text-foreground'
                    }`}
                  >
                    {ev.isLive && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-subtle" />
                    )}
                    <span>{ev.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <OrgSwitcher />

        {event.isLive && (
          <span className="glass-pill text-xs font-semibold uppercase tracking-widest text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-subtle" />
            LIVE
          </span>
        )}
      </div>

      {/* Right: Wallet + User */}
      <div className="flex items-center gap-3">
        <div
          className="relative"
          onMouseEnter={() => setShowWallet(true)}
          onMouseLeave={() => setShowWallet(false)}
        >
          <button
            className="glass-pill font-mono text-sm font-semibold text-gold"
            aria-label="Wallet balance"
          >
            <span>💰</span>
            <span>{formatMZN(event.walletMZN)} MZN</span>
          </button>
          <AnimatePresence>
            {showWallet && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                className="absolute right-0 top-full z-50 mt-2 min-w-[240px] rounded-xl border border-amber-400/10 bg-card/95 p-4 backdrop-blur-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">MZN</span>
                    <span className="font-mono text-emerald-400">Available Now</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">USD ${formatMZN(event.walletUSD)}</span>
                    <span className="font-mono text-amber-400">Settles in {event.settlementUSD}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">EUR €{formatMZN(event.walletEUR)}</span>
                    <span className="font-mono text-amber-400">Settles in {event.settlementEUR}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Avatar + Logout */}
        {user && (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border border-white/[0.08]">
              <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={logout}
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
