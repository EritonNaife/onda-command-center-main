import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { LiveDashboardIncident } from '@/types/dashboard';

interface IncidentFeedProps {
  incidents: LiveDashboardIncident[];
  onDismissAlert?: (alertId: string) => void;
}

export const IncidentFeed = ({
  incidents,
  onDismissAlert,
}: IncidentFeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const interval = setInterval(() => {
      el.scrollTop += 1;
      if (el.scrollTop >= el.scrollHeight - el.clientHeight) {
        el.scrollTop = 0;
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="glass-panel flex h-full flex-col p-4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Incident Feed
      </h3>
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-hidden"
        role="log"
        aria-label="Incident feed"
      >
        {[...incidents, ...incidents].map((inc, i) => (
          <div
            key={`${inc.id}-${i}`}
            className="flex items-start gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-xs"
          >
            <span
              className={`mt-0.5 ${
                inc.level === 'success'
                  ? 'text-emerald-400'
                  : inc.level === 'warning'
                    ? 'text-amber-400'
                    : 'text-primary'
              }`}
            >
              {inc.level === 'success' ? '✓' : inc.level === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <div className="flex-1">
              <span className="text-foreground/90">{inc.message}</span>
            </div>
            {inc.alertId && onDismissAlert && (
              <button
                type="button"
                onClick={() => onDismissAlert(inc.alertId!)}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                aria-label={`Dismiss alert: ${inc.message}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="shrink-0 font-mono text-muted-foreground">{inc.time}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
