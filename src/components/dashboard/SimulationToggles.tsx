import { motion } from 'framer-motion';
import { useEventStore } from '@/stores/eventStore';

const toggles = [
  { key: 'refundSpike' as const, label: 'Refund Spike', icon: '💸' },
  { key: 'gateSlowdown' as const, label: 'Gate Slowdown', icon: '🚧' },
  { key: 'apiLatency' as const, label: 'API Latency', icon: '📡' },
  { key: 'highEntryRate' as const, label: 'High Entry Rate', icon: '🏃' },
];

export const SimulationToggles = () => {
  const simulation = useEventStore((s) => s.simulation);
  const toggle = useEventStore((s) => s.toggleSimulation);

  return (
    <motion.div
      className="glass-panel p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Simulations
      </h3>
      <div className="flex flex-wrap gap-2">
        {toggles.map((t) => {
          const active = simulation[t.key];
          return (
            <button
              key={t.key}
              onClick={() => toggle(t.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                active
                  ? 'border border-amber-400/30 bg-amber-400/10 text-amber-400'
                  : 'border border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]'
              }`}
              aria-pressed={active}
              aria-label={`Toggle ${t.label} simulation`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
