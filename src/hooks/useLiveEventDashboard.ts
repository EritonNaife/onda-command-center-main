import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/apiBaseUrl';
import { apiClient, apiGet } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import {
  LiveDashboardIncident,
  LiveDashboardRiskAlert,
  LiveDashboardVelocityPoint,
  LiveDashboardViewModel,
  LiveEventAlert,
  LiveEventSnapshot,
} from '@/types/dashboard';

function formatMinutesAgo(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 'Now';

  const diffMinutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (diffMinutes < 1) return 'Now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours}h ago`;
}

function buildRiskAlerts(snapshot: LiveEventSnapshot): LiveDashboardRiskAlert[] {
  const alerts: LiveDashboardRiskAlert[] = snapshot.alerts.map((alert) => ({
    id: alert.id,
    message: alert.message,
    level: alert.severity,
    icon: alert.severity === 'critical' ? '!' : '!',
    alertId: alert.id,
  }));

  if (snapshot.dataSourceStatus.moveApi !== 'ok') {
    alerts.unshift({
      id: 'move-api-status',
      message: 'Move API degraded',
      level: 'warning',
      icon: '!',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'all-systems-go',
      message: 'All Systems Operational',
      level: 'normal',
      icon: 'OK',
    });
  }

  return alerts;
}

function buildIncidents(
  snapshot: LiveEventSnapshot,
  alerts: LiveDashboardRiskAlert[],
): LiveDashboardIncident[] {
  const incidents: LiveDashboardIncident[] = snapshot.alerts.map(
    (alert: LiveEventAlert) => ({
      id: alert.id,
      message: alert.message,
      level: alert.severity === 'critical' ? 'warning' : 'info',
      time: formatMinutesAgo(alert.triggered_at),
      alertId: alert.id,
    }),
  );

  incidents.unshift({
    id: 'snapshot-update',
    message: `Snapshot refreshed ${formatMinutesAgo(snapshot.timestamp)}`,
    level: 'success',
    time: 'Now',
  });

  if (snapshot.dataSourceStatus.moveApi !== 'ok') {
    incidents.unshift({
      id: 'move-api-incident',
      message: `Move API status: ${snapshot.dataSourceStatus.moveApi}`,
      level: 'warning',
      time: 'Now',
    });
  }

  if (incidents.length === 1 && alerts[0]?.level === 'normal') {
    incidents.push({
      id: 'ops-nominal',
      message: 'No active incidents. Operations are nominal.',
      level: 'success',
      time: 'Now',
    });
  }

  return incidents.slice(0, 8);
}

function buildVelocityData(snapshot: LiveEventSnapshot): LiveDashboardVelocityPoint[] {
  const actual = snapshot.revenue.actual_mzn;
  const projected = Math.max(snapshot.revenue.projected_mzn, actual);
  const steps = [
    { time: '-50m', actualFactor: 0.12, projectedFactor: 0.18 },
    { time: '-40m', actualFactor: 0.24, projectedFactor: 0.3 },
    { time: '-30m', actualFactor: 0.38, projectedFactor: 0.44 },
    { time: '-20m', actualFactor: 0.56, projectedFactor: 0.6 },
    { time: '-10m', actualFactor: 0.78, projectedFactor: 0.78 },
    { time: 'Now', actualFactor: 1, projectedFactor: 0.9 },
    { time: '+20m', actualFactor: null, projectedFactor: 1 },
  ];

  return steps.map((step) => ({
    time: step.time,
    actual:
      step.actualFactor === null
        ? null
        : Math.round(actual * step.actualFactor),
    projected: Math.round(projected * step.projectedFactor),
  }));
}

function toViewModel(snapshot: LiveEventSnapshot): LiveDashboardViewModel {
  const entryRate = Math.max(0, Math.round(snapshot.crowd.entry_rate_per_minute));
  const timeToCapacity =
    entryRate > 0 && snapshot.crowd.current_occupancy < snapshot.crowd.capacity
      ? Math.round(
          (snapshot.crowd.capacity - snapshot.crowd.current_occupancy) /
            entryRate,
        )
      : 0;
  const riskAlerts = buildRiskAlerts(snapshot);
  const incidents = buildIncidents(snapshot, riskAlerts);
  const velocityData = buildVelocityData(snapshot);
  const breakEvenTarget = Math.max(
    1,
    Math.round(snapshot.revenue.projected_mzn * 0.72),
    Math.round(snapshot.revenue.actual_mzn * 0.9),
  );

  return {
    currentEvent: {
      id: snapshot.event.id,
      name: snapshot.event.name,
      shortName: snapshot.event.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 4)
        .toUpperCase(),
      isLive: snapshot.event.is_live,
      totalRevenue: snapshot.revenue.actual_mzn,
      projectedRevenue: snapshot.revenue.projected_mzn,
      breakEvenTarget,
      ticketsSold: snapshot.revenue.tickets_sold,
      ticketsRemaining: snapshot.revenue.tickets_remaining,
      entryCount: snapshot.crowd.current_occupancy,
      totalCapacity: snapshot.crowd.capacity,
      entryRate,
      timeToCapacity,
      walletMZN: snapshot.finance.wallet_mzn,
      walletUSD: snapshot.finance.wallet_usd,
      walletEUR: snapshot.finance.wallet_eur,
      settlementUSD: snapshot.finance.settlement_usd,
      settlementEUR: snapshot.finance.settlement_eur,
      availableFunds: snapshot.finance.available_funds,
      lockedFunds: snapshot.finance.locked_funds,
      upcomingSettlement: snapshot.finance.upcoming_settlement,
      velocityData,
      riskAlerts,
      incidents,
      payoutLogs: snapshot.finance.payout_logs,
      channelROI: snapshot.channelROI,
      status: snapshot.event.status,
    },
    dataSourceStatus: snapshot.dataSourceStatus,
    lastUpdated: snapshot.timestamp,
    raw: snapshot,
  };
}

function extractSsePayload(chunk: string): string | null {
  const dataLines = chunk
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart());

  if (dataLines.length === 0) {
    return null;
  }

  return dataLines.join('\n');
}

async function streamLiveEventDashboard(
  eventId: string,
  signal: AbortSignal,
  onSnapshot: (snapshot: LiveEventSnapshot) => void,
): Promise<void> {
  const response = await apiClient(`${API_BASE_URL}/live/${eventId}/stream`, {
    headers: {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    signal,
  });

  if (!response.ok) {
    const message = (await response.text()) || 'Unable to open live stream.';
    throw new Error(message);
  }

  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (!signal.aborted) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const payload = extractSsePayload(chunk);

      if (!payload) {
        continue;
      }

      try {
        onSnapshot(JSON.parse(payload) as LiveEventSnapshot);
      } catch {
        // Ignore malformed SSE payloads and keep the stream open.
      }
    }
  }
}

export function getLiveEventDashboardQueryKey(
  organizationId?: string | null,
  eventId?: string,
) {
  return ['live-event-dashboard', organizationId ?? null, eventId ?? null] as const;
}

export function useLiveEventDashboard(eventId?: string) {
  const org = useAuthStore((s) => s.org);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const organizationId = org?.id;
  const queryKey = getLiveEventDashboardQueryKey(organizationId, eventId);

  useEffect(() => {
    if (!isAuthenticated || !organizationId || !eventId || !accessToken) {
      return;
    }

    const controller = new AbortController();
    let reconnectTimer: number | undefined;
    let stopped = false;
    const liveQueryKey = getLiveEventDashboardQueryKey(organizationId, eventId);

    const connect = async () => {
      try {
        await streamLiveEventDashboard(eventId, controller.signal, (snapshot) => {
          queryClient.setQueryData<LiveEventSnapshot>(liveQueryKey, snapshot);
        });
      } catch {
        if (controller.signal.aborted || stopped) {
          return;
        }
      }

      if (!controller.signal.aborted && !stopped) {
        reconnectTimer = window.setTimeout(() => {
          void connect();
        }, 3000);
      }
    };

    void connect();

    return () => {
      stopped = true;
      controller.abort();

      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [accessToken, eventId, isAuthenticated, organizationId, queryClient]);

  return useQuery<LiveEventSnapshot, Error, LiveDashboardViewModel>({
    queryKey,
    queryFn: () => apiGet<LiveEventSnapshot>(`/live/${eventId}`),
    enabled: isAuthenticated && !!org && !!eventId,
    staleTime: 10_000,
    select: toViewModel,
  });
}
