import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RiskStrip } from '@/components/dashboard/RiskStrip';
import { CommandHeader } from '@/components/dashboard/CommandHeader';
import { MomentumEngine } from '@/components/dashboard/MomentumEngine';
import { CrowdControl } from '@/components/dashboard/CrowdControl';
import { FinancePanel } from '@/components/dashboard/FinancePanel';
import { IncidentFeed } from '@/components/dashboard/IncidentFeed';
import { SimulationToggles } from '@/components/dashboard/SimulationToggles';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';
import {
  getLiveEventDashboardQueryKey,
  useLiveEventDashboard,
} from '@/hooks/useLiveEventDashboard';
import { useToast } from '@/hooks/use-toast';
import { apiPatch } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { EventSwitcherOption, LiveEventSnapshot } from '@/types/dashboard';
import { useParams } from 'react-router-dom';

const Index = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const org = useAuthStore((s) => s.org);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    data: liveDashboard,
    isLoading,
    isError,
    error,
  } = useLiveEventDashboard(eventId);
  const { data: overview } = useDashboardOverview();
  const liveDashboardQueryKey = getLiveEventDashboardQueryKey(org?.id, eventId);

  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (!eventId) {
        throw new Error('Missing event id in route.');
      }

      await apiPatch<void, Record<string, never>>(
        `/live/${eventId}/alerts/${alertId}/dismiss`,
        {},
      );
    },
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: liveDashboardQueryKey });

      const previousSnapshot =
        queryClient.getQueryData<LiveEventSnapshot>(liveDashboardQueryKey);

      if (previousSnapshot) {
        queryClient.setQueryData<LiveEventSnapshot>(liveDashboardQueryKey, {
          ...previousSnapshot,
          alerts: previousSnapshot.alerts.filter((alert) => alert.id !== alertId),
        });
      }

      return { previousSnapshot };
    },
    onError: (mutationError, _alertId, context) => {
      if (context?.previousSnapshot) {
        queryClient.setQueryData(liveDashboardQueryKey, context.previousSnapshot);
      }

      toast({
        title: 'Unable to dismiss alert',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Try again on the next refresh.',
        variant: 'destructive',
      });
    },
  });

  const eventOptionsMap = new Map<string, EventSwitcherOption>();

  if (liveDashboard) {
    eventOptionsMap.set(liveDashboard.currentEvent.id, {
      id: liveDashboard.currentEvent.id,
      name: liveDashboard.currentEvent.name,
      status: liveDashboard.currentEvent.status,
      isLive: liveDashboard.currentEvent.isLive,
    });
  }

  overview?.upcoming_events.forEach((event) => {
    if (!eventOptionsMap.has(event.id)) {
      eventOptionsMap.set(event.id, {
        id: event.id,
        name: event.name,
        status: event.status,
        isLive: false,
      });
    }
  });

  overview?.top_events.forEach((event) => {
    if (!eventOptionsMap.has(event.id)) {
      eventOptionsMap.set(event.id, {
        id: event.id,
        name: event.name,
        status: event.status,
        isLive: false,
      });
    }
  });

  const eventOptions = Array.from(eventOptionsMap.values());
  const handleDismissAlert = (alertId: string) => {
    dismissAlertMutation.mutate(alertId);
  };

  return (
    <AuthGuard>
      <AppShell>
        {!eventId && (
          <div className="glass-panel p-6 text-sm text-destructive">
            Missing event id in route.
          </div>
        )}

        {eventId && isLoading && (
          <div className="glass-panel p-6 text-sm text-muted-foreground">
            Loading live event dashboard...
          </div>
        )}

        {eventId && isError && (
          <div className="glass-panel p-6 text-sm text-destructive">
            Unable to load event dashboard: {error?.message}
          </div>
        )}

        {eventId && liveDashboard && (
          <>
            <div className="sticky top-0 z-50">
              <RiskStrip
                alerts={liveDashboard.currentEvent.riskAlerts}
                onDismissAlert={handleDismissAlert}
              />
            </div>

            <div className="mt-6">
              <CommandHeader
                event={liveDashboard.currentEvent}
                eventOptions={eventOptions}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
                  <MomentumEngine event={liveDashboard.currentEvent} />
                  <CrowdControl event={liveDashboard.currentEvent} />
                </div>

                <FinancePanel event={liveDashboard.currentEvent} />

                <SimulationToggles
                  dataSourceStatus={liveDashboard.dataSourceStatus}
                  alertCount={liveDashboard.currentEvent.riskAlerts.filter(
                    (alert) => alert.level !== 'normal',
                  ).length}
                  lastUpdated={liveDashboard.lastUpdated}
                />
              </div>

              <div className="hidden lg:block">
                <div className="sticky top-14 h-[calc(100vh-5rem)]">
                  <IncidentFeed
                    incidents={liveDashboard.currentEvent.incidents}
                    onDismissAlert={handleDismissAlert}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 lg:hidden">
              <details className="group">
                <summary className="glass-pill cursor-pointer list-none text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-2">
                    📋 Incident Feed
                    <span className="transition-transform group-open:rotate-180">▾</span>
                  </span>
                </summary>
                <div className="mt-2 h-64">
                  <IncidentFeed
                    incidents={liveDashboard.currentEvent.incidents}
                    onDismissAlert={handleDismissAlert}
                  />
                </div>
              </details>
            </div>
          </>
        )}
      </AppShell>
    </AuthGuard>
  );
};

export default Index;
