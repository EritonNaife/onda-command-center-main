import { motion } from 'framer-motion';
import { LiveEventDataSourceStatus } from '@/types/dashboard';

interface SimulationTogglesProps {
  dataSourceStatus: LiveEventDataSourceStatus;
  alertCount: number;
  lastUpdated: string;
}

const statusClass: Record<LiveEventDataSourceStatus['moveApi'], string> = {
  ok: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400',
  stale: 'border-amber-400/20 bg-amber-400/10 text-amber-400',
  error: 'border-red-400/20 bg-red-400/10 text-red-400',
};

export const SimulationToggles = ({
  dataSourceStatus,
  alertCount,
  lastUpdated,
}: SimulationTogglesProps) => {
  const updatedAt = new Date(lastUpdated);
  const updateLabel = Number.isNaN(updatedAt.getTime())
    ? 'Unknown'
    : updatedAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

  return (
    <motion.div
      className="glass-panel p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        System Signals
      </h3>
      <div className="flex flex-wrap gap-2">
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium ${statusClass[dataSourceStatus.moveApi]}`}
        >
          <span>●</span>
          <span>Move API: {dataSourceStatus.moveApi}</span>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium ${statusClass[dataSourceStatus.paymentsApi]}`}
        >
          <span>●</span>
          <span>Payments: {dataSourceStatus.paymentsApi}</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>{alertCount}</span>
          <span>Active Alerts</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Last snapshot: {updateLabel}
      </p>
    </motion.div>
  );
};
