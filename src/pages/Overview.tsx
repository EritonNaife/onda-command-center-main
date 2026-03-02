import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewHeader } from '@/components/overview/OverviewHeader';
import { StatCards } from '@/components/overview/StatCards';
import { UpcomingEventsTable } from '@/components/overview/UpcomingEventsTable';
import { TopEventsTable } from '@/components/overview/TopEventsTable';
import { CheckInSummary } from '@/components/overview/CheckInSummary';
import { OverviewSkeleton } from '@/components/overview/OverviewSkeleton';
import { ErrorState } from '@/components/overview/ErrorState';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';

const Overview = () => {
  const { data, isLoading, isError, error } = useDashboardOverview();

  return (
    <AuthGuard>
      <AppShell>
        <OverviewHeader />

        {isLoading && <OverviewSkeleton />}

        {isError && <ErrorState message={error?.message} />}

        {data && (
          <>
            <StatCards
              eventCounts={data.event_counts}
              ticketSales={data.ticket_sales}
              revenue={data.revenue}
              checkInStats={data.check_in_stats}
            />

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <UpcomingEventsTable events={data.upcoming_events} />
              <TopEventsTable events={data.top_events} />
            </div>

            <div className="mt-6">
              <CheckInSummary stats={data.check_in_stats} />
            </div>
          </>
        )}
      </AppShell>
    </AuthGuard>
  );
};

export default Overview;
