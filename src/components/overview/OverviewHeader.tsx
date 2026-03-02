import { motion } from 'framer-motion';
import { LayoutDashboard } from 'lucide-react';

export const OverviewHeader = () => {
  return (
    <motion.div
      className="mb-6 flex flex-col gap-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="glass-pill w-fit text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        Portfolio Snapshot
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-primary">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Command Overview
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor event performance, revenue, and check-in health across the
              organization.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
