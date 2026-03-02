import { RiskStrip } from '@/components/dashboard/RiskStrip';
import { CommandHeader } from '@/components/dashboard/CommandHeader';
import { MomentumEngine } from '@/components/dashboard/MomentumEngine';
import { CrowdControl } from '@/components/dashboard/CrowdControl';
import { FinancePanel } from '@/components/dashboard/FinancePanel';
import { IncidentFeed } from '@/components/dashboard/IncidentFeed';
import { SimulationToggles } from '@/components/dashboard/SimulationToggles';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';
import { useLiveEventDashboard } from '@/hooks/useLiveEventDashboard';
import { EventSwitcherOption } from '@/types/dashboard';
import { useParams } from 'react-router-dom';

const Index = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const {
    data: liveDashboard,
    isLoading,
    isError,
    error,
  } = useLiveEventDashboard(eventId);
  const { data: overview } = useDashboardOverview();

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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
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
              {/* Persistent Risk Monitor Strip */}
              <div className="sticky top-0 z-50">
                <RiskStrip alerts={liveDashboard.currentEvent.riskAlerts} />
              </div>

              {/* Command Header */}
              <div className="mt-6">
                <CommandHeader
                  event={liveDashboard.currentEvent}
                  eventOptions={eventOptions}
                />
              </div>

              {/* 3-Zone Intelligence Grid + Incident Feed */}
              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
                {/* Main Content */}
                <div className="space-y-4">
                  {/* Zone 1 & 2: Momentum + Crowd Control */}
                  <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
                    <MomentumEngine event={liveDashboard.currentEvent} />
                    <CrowdControl event={liveDashboard.currentEvent} />
                  </div>

                  {/* Zone 3: Finance */}
                  <FinancePanel event={liveDashboard.currentEvent} />

                  {/* Backend Status */}
                  <SimulationToggles
                    dataSourceStatus={liveDashboard.dataSourceStatus}
                    alertCount={liveDashboard.currentEvent.riskAlerts.filter(
                      (alert) => alert.level !== 'normal',
                    ).length}
                    lastUpdated={liveDashboard.lastUpdated}
                  />
                </div>

                {/* Incident Feed - Right Column */}
                <div className="hidden lg:block">
                  <div className="sticky top-14 h-[calc(100vh-5rem)]">
                    <IncidentFeed incidents={liveDashboard.currentEvent.incidents} />
                  </div>
                </div>
              </div>

              {/* Mobile Incident Feed */}
              <div className="mt-4 lg:hidden">
                <details className="group">
                  <summary className="glass-pill cursor-pointer list-none text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-2">
                      📋 Incident Feed
                      <span className="transition-transform group-open:rotate-180">▾</span>
                    </span>
                  </summary>
                  <div className="mt-2 h-64">
                    <IncidentFeed incidents={liveDashboard.currentEvent.incidents} />
                  </div>
                </details>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default Index;
