import { useState } from 'react';
import { motion } from 'framer-motion';
import { LiveDashboardEvent } from '@/types/dashboard';

interface FinancePanelProps {
  event: LiveDashboardEvent;
}

export const FinancePanel = ({ event }: FinancePanelProps) => {
  const [payoutPct, setPayoutPct] = useState(50);

  const formatMZN = (n: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

  const payoutAmount = Math.round(event.availableFunds * (payoutPct / 100));
  const fee = Math.round(payoutAmount * 0.025);
  const netPayout = payoutAmount - fee;

  const totalFunds = event.availableFunds + event.lockedFunds + event.upcomingSettlement;
  const availPct = Math.round((event.availableFunds / totalFunds) * 100);
  const lockedPct = Math.round((event.lockedFunds / totalFunds) * 100);

  return (
    <motion.div
      className="glass-panel-gold p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <h3 className="mb-6 text-sm font-semibold uppercase tracking-widest text-gold">
        Financial Intelligence
      </h3>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cash Flow Timeline */}
        <div className="space-y-4">
          <p className="data-label">Cash Flow Timeline</p>
          <div className="relative">
            {/* Timeline bar */}
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="rounded-l-full bg-emerald-400/80"
                style={{ width: `${availPct}%` }}
              />
              <div
                className="bg-amber-400/60"
                style={{ width: `${lockedPct}%` }}
              />
              <div className="flex-1 bg-white/[0.08]" />
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>Now</span>
              <span>Event End</span>
              <span>+24h Release</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-muted-foreground">Available</span>
              </span>
              <span className="font-mono font-semibold text-emerald-400">
                {formatMZN(event.availableFunds)} MZN
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">Locked (50%)</span>
              </span>
              <span className="font-mono font-semibold text-amber-400">
                {formatMZN(event.lockedFunds)} MZN
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="text-muted-foreground">Settlement</span>
              </span>
              <span className="font-mono font-semibold text-muted-foreground">
                {formatMZN(event.upcomingSettlement)} MZN
              </span>
            </div>
          </div>
        </div>

        {/* Payout Engine */}
        <div className="space-y-4">
          <p className="data-label">Payout Engine</p>
          <div className="space-y-3">
            <input
              type="range"
              min={0}
              max={100}
              value={payoutPct}
              onChange={(e) => setPayoutPct(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-primary"
              aria-label="Payout percentage"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="font-mono text-sm font-semibold text-foreground">{payoutPct}%</span>
              <span>100%</span>
            </div>
          </div>
          <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Gross</span>
              <span className="font-mono text-foreground">{formatMZN(payoutAmount)} MZN</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Fee (2.5%)</span>
              <span className="font-mono text-red-400">-{formatMZN(fee)} MZN</span>
            </div>
            <div className="border-t border-white/[0.06] pt-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-muted-foreground">Net</span>
                <span className="font-mono text-primary">{formatMZN(netPayout)} MZN</span>
              </div>
            </div>
          </div>

          {/* Payout Log */}
          <div className="space-y-1.5">
            {event.payoutLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">
                  {formatMZN(log.amount)} {log.currency}
                </span>
                <span
                  className={`font-semibold ${
                    log.status === 'success'
                      ? 'text-emerald-400'
                      : log.status === 'pending'
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}
                >
                  {log.status === 'success' ? '✓ Success' : log.status === 'pending' ? '◷ Pending' : '✕ Failed (Retried)'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Intelligence */}
        <div className="space-y-4">
          <p className="data-label">Channel ROI</p>
          <div className="space-y-3">
            {event.channelROI.map((ch) => {
              const maxRev = Math.max(
                1,
                ...event.channelROI.map((c) => c.revenue),
              );
              const barWidth = Math.round((ch.revenue / maxRev) * 100);
              return (
                <div key={ch.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{ch.name}</span>
                    <span className="font-mono text-foreground">{formatMZN(ch.revenue)} MZN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + 0.1 * event.channelROI.indexOf(ch) }}
                      />
                    </div>
                    <span className="min-w-[40px] text-right font-mono text-xs text-primary">
                      {ch.conversion}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
