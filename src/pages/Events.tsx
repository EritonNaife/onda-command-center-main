import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  RadioTower,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEvents } from '@/hooks/useEvents';
import { canManageOrganizationOperations } from '@/lib/organizationAccess';
import { getEventRoute, isLiveEventStatus } from '@/lib/eventRouting';
import { useAuthStore } from '@/stores/authStore';
import { EventListItem, EventStatusFilter } from '@/types/events';
import { useNavigate } from 'react-router-dom';

type EventFilter = 'all' | EventStatusFilter;

const FILTER_OPTIONS: Array<{ label: string; value: EventFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Active', value: 'active' },
  { label: 'Past', value: 'past' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAGE_SIZE = 12;

function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Schedule unavailable';
  }

  const sameDay = start.toDateString() === end.toDateString();
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (sameDay) {
    return `${dateFormatter.format(start)} • ${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
  }

  return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`;
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

function getTicketsSold(event: EventListItem): number {
  return event.tickets_sold;
}

function getStatusBadgeClassName(status?: string): string {
  const normalized = (status ?? '').toLowerCase();

  switch (normalized) {
    case 'active':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
    case 'published':
    case 'upcoming':
      return 'border-primary/20 bg-primary/10 text-primary';
    case 'past':
      return 'border-white/[0.08] bg-white/[0.04] text-muted-foreground';
    case 'cancelled':
      return 'border-red-400/20 bg-red-400/10 text-red-300';
    case 'draft':
      return 'border-white/[0.08] bg-white/[0.04] text-muted-foreground';
    default:
      return 'border-white/[0.08] bg-white/[0.04] text-muted-foreground';
  }
}

const Events = () => {
  const navigate = useNavigate();
  const org = useAuthStore((state) => state.org);
  const [filter, setFilter] = useState<EventFilter>('all');
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const status = filter === 'all' ? undefined : filter;
  const {
    data,
    isLoading,
    isError,
    error,
  } = useEvents({
    page,
    limit: PAGE_SIZE,
    status,
  });

  const liveCount =
    data?.data.filter((event) => isLiveEventStatus(event.status)).length ?? 0;
  const canManageEvents = canManageOrganizationOperations(org?.role);

  const changeFilter = (nextFilter: EventFilter) => {
    startTransition(() => {
      setFilter(nextFilter);
      setPage(1);
    });
  };

  const changePage = (nextPage: number) => {
    startTransition(() => {
      setPage(nextPage);
    });
  };

  return (
    <AuthGuard>
      <AppShell>
        <motion.div
          className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="space-y-2">
            <div className="glass-pill text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Event Portfolio
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                All Events
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Browse your organization&apos;s event lineup, filter by lifecycle,
                and jump into the command view for anything currently live.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManageEvents ? (
              <button
                type="button"
                onClick={() => navigate('/events/new')}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <CalendarPlus className="h-4 w-4" />
                Create Event
              </button>
            ) : (
              <span className="glass-pill text-xs font-medium text-muted-foreground">
                Read-only access
              </span>
            )}
            <span className="glass-pill text-xs font-medium text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {data?.meta.total ?? 0} total
            </span>
            {liveCount > 0 && (
              <span className="glass-pill text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <RadioTower className="h-3.5 w-3.5" />
                {liveCount} live now
              </span>
            )}
          </div>
        </motion.div>

        {!canManageEvents && (
          <div className="mb-6 glass-panel p-4 text-sm text-muted-foreground">
            Your current organization role is read-only for event management.
            Admins and members can create events and manage ticketing changes.
          </div>
        )}

        <motion.div
          className="glass-panel p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <ListFilter className="h-3.5 w-3.5" />
                Filters
              </span>
              {FILTER_OPTIONS.map((option) => {
                const isActive = option.value === filter;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => changeFilter(option.value)}
                    className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-primary/20 bg-primary/10 text-primary'
                        : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {isPending && (
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Updating...
              </span>
            )}
          </div>
        </motion.div>

        {isLoading && (
          <div className="mt-6 glass-panel p-6 text-sm text-muted-foreground">
            Loading events...
          </div>
        )}

        {isError && (
          <div className="mt-6 glass-panel p-6 text-sm text-destructive">
            Unable to load events: {error?.message}
          </div>
        )}

        {data && (
          <motion.div
            className="mt-6 glass-panel overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25 }}
          >
            {data.data.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  No events match this filter.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Switch filters to view a different slice of the portfolio.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-xs text-muted-foreground">
                      Event
                    </TableHead>
                    <TableHead className="hidden text-xs text-muted-foreground md:table-cell">
                      Schedule
                    </TableHead>
                    <TableHead className="hidden text-xs text-muted-foreground lg:table-cell">
                      Venue
                    </TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">
                      Tickets
                    </TableHead>
                    <TableHead className="hidden text-right text-xs text-muted-foreground md:table-cell">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((event) => {
                    const ticketsSold = getTicketsSold(event);
                    const destination = getEventRoute(event.id, {
                      status: event.status,
                    });

                    return (
                      <TableRow
                        key={event.id}
                        className="cursor-pointer border-white/[0.06] transition-colors hover:bg-white/[0.04]"
                        onClick={() => navigate(destination)}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {event.name}
                              </span>
                              {isLiveEventStatus(event.status) && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  Live
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground md:hidden">
                              {formatDateRange(event.start_time, event.end_time)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                          {formatDateRange(event.start_time, event.end_time)}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {event.venue_name ?? 'Venue TBD'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <span className="text-foreground">
                            {formatCompactNumber(ticketsSold)}
                          </span>
                          {event.capacity > 0 && (
                            <span className="text-muted-foreground">
                              /{formatCompactNumber(event.capacity)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-right md:table-cell">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClassName(
                              event.status,
                            )}`}
                          >
                            {event.status ?? 'unknown'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </motion.div>
        )}

        {data && data.meta.totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.meta.page} of {data.meta.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={page <= 1 || isPending}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => changePage(Math.min(data.meta.totalPages, page + 1))}
                disabled={page >= data.meta.totalPages || isPending}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
};

export default Events;
