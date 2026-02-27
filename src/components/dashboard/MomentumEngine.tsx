import { motion } from 'framer-motion';
import { useCurrentEvent } from '@/stores/eventStore';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export const MomentumEngine = () => {
  const event = useCurrentEvent();

  const formatMZN = (n: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

  const breakEvenPct = Math.min(
    100,
    Math.round((event.totalRevenue / event.breakEvenTarget) * 100)
  );
  const hasBreakEven = event.totalRevenue >= event.breakEvenTarget;
  const isCelebrating = event.totalRevenue >= 1_000_000;

  return (
    <motion.div
      className={`glass-panel radial-glow flex h-full flex-col p-6 ${isCelebrating ? 'animate-celebrate' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="data-label">Sales Velocity</p>
            <p className="data-value mt-1">{formatMZN(event.totalRevenue)} <span className="text-sm font-normal text-muted-foreground">MZN</span></p>
          </div>
          <div className="text-right">
            <p className="data-label">Projected Final</p>
            <p className="mt-1 font-mono text-lg font-semibold text-primary">
              {formatMZN(event.projectedRevenue)} MZN
            </p>
          </div>
        </div>

        {/* Break-even Badge */}
        <div className="flex items-center gap-3">
          {hasBreakEven ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              ✓ Break-even reached
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-400">
              {breakEvenPct}% to break-even
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-muted-foreground">
            🎟 {event.ticketsRemaining} tickets remaining
          </span>
        </div>

        {/* Chart */}
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={event.velocityData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(170, 70%, 45%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(170, 70%, 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradProjected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(215, 15%, 55%)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(215, 15%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(220, 18%, 10%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'hsl(210, 20%, 92%)',
                }}
                formatter={(value: number) => [`${formatMZN(value)} MZN`]}
              />
              <ReferenceLine
                y={event.breakEvenTarget}
                stroke="hsl(45, 90%, 55%)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="projected"
                stroke="hsl(215, 15%, 45%)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                fill="url(#gradProjected)"
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="hsl(170, 70%, 45%)"
                strokeWidth={2}
                fill="url(#gradActual)"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};
