import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { LiveDashboardRiskAlert } from '@/types/dashboard';

interface RiskStripProps {
  alerts: LiveDashboardRiskAlert[];
  onDismissAlert?: (alertId: string) => void;
}

export const RiskStrip = ({ alerts, onDismissAlert }: RiskStripProps) => {

  const worstLevel = alerts.reduce((worst, a) => {
    if (a.level === 'critical') return 'critical';
    if (a.level === 'warning' && worst !== 'critical') return 'warning';
    return worst;
  }, 'normal' as string);

  const stripClass =
    worstLevel === 'critical'
      ? 'risk-strip risk-strip-critical'
      : worstLevel === 'warning'
        ? 'risk-strip risk-strip-warning'
        : 'risk-strip';

  return (
    <motion.div
      className={stripClass}
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      role="status"
      aria-live="polite"
      aria-label="System status alerts"
    >
      <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`inline-flex items-center gap-1.5 ${
              alert.level === 'critical'
                ? 'text-red-400'
                : alert.level === 'warning'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
            }`}
          >
            <span>{alert.icon}</span>
            <span>{alert.message}</span>
            {alert.alertId && onDismissAlert && (
              <button
                type="button"
                onClick={() => onDismissAlert(alert.alertId!)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-current/70 transition hover:bg-white/10 hover:text-current"
                aria-label={`Dismiss alert: ${alert.message}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};
