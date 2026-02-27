import { motion } from 'framer-motion';
import { useEventStore, useCurrentEvent } from '@/stores/eventStore';

export const CrowdControl = () => {
  const event = useCurrentEvent();
  const simulation = useEventStore((s) => s.simulation);

  const entryPct = Math.round((event.entryCount / event.totalCapacity) * 100);
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (entryPct / 100) * circumference;

  const isBottleneck = simulation.gateSlowdown;
  const ringColor = isBottleneck ? 'stroke-amber-400' : 'stroke-primary';
  const glowClass = isBottleneck ? 'glow-gold' : 'glow-teal';

  return (
    <motion.div
      className={`glass-panel flex h-full flex-col items-center justify-center p-6 ${glowClass}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* Radial Entry Ring */}
      <div className="relative mb-6">
        <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90" aria-label={`Entry progress: ${entryPct}%`}>
          <circle
            cx="90"
            cy="90"
            r="80"
            fill="none"
            className="stroke-white/[0.06]"
            strokeWidth="8"
          />
          <motion.circle
            cx="90"
            cy="90"
            r="80"
            fill="none"
            className={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold text-foreground">{entryPct}%</span>
          <span className="text-xs text-muted-foreground">Capacity</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid w-full grid-cols-2 gap-4">
        <div className="text-center">
          <p className="data-label">Entered</p>
          <p className="font-mono text-xl font-bold text-foreground">
            {event.entryCount.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="data-label">Total</p>
          <p className="font-mono text-xl font-bold text-muted-foreground">
            {event.totalCapacity.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Entry Rate & Time to Capacity */}
      <div className="mt-5 w-full space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Entry Rate</span>
          <span className={`font-mono text-sm font-semibold ${event.entryRate > 80 ? 'text-amber-400' : 'text-primary'}`}>
            {event.entryRate} tickets/min
          </span>
        </div>

        {event.timeToCapacity > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Time to Full</span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {event.timeToCapacity} min
            </span>
          </div>
        )}

        {isBottleneck && (
          <motion.div
            className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-xs font-semibold text-amber-400"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            ⚠ Gate slowdown detected
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
