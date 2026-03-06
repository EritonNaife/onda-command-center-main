import { useDeferredValue, useMemo, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  PencilLine,
  Plus,
  Search,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { VenueDialog } from '@/components/venues/VenueDialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useVenues } from '@/hooks/useVenues';
import { Venue } from '@/types/venues';

const PAGE_SIZE = 12;

function formatCapacity(capacity?: number | null): string {
  if (typeof capacity !== 'number' || capacity <= 0) {
    return 'Open';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(capacity);
}

function formatVenueLocation(venue: Venue): string {
  const parts = [
    venue.address?.city,
    venue.address?.state,
    venue.address?.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'Location pending';
}

const Venues = () => {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState<string>();
  const deferredSearch = useDeferredValue(searchInput.trim());
  const {
    data,
    isLoading,
    isError,
    error,
  } = useVenues({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch || undefined,
  });

  const totalAssignedEvents = useMemo(
    () =>
      data?.data.reduce((sum, venue) => sum + venue.event_count, 0) ?? 0,
    [data],
  );

  const changePage = (nextPage: number) => {
    startTransition(() => {
      setPage(nextPage);
    });
  };

  const openEditVenue = (venueId: string) => {
    setEditingVenueId(venueId);
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
              Venue Network
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Venues
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Build the venue directory organizers rely on before events go
                live. Capacity, address data, and event assignment counts stay
                visible in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Venue
            </button>
            <span className="glass-pill text-xs font-medium text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {data?.meta.total ?? 0} venues
            </span>
            <span className="glass-pill text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {totalAssignedEvents} linked events on this page
            </span>
          </div>
        </motion.div>

        <motion.div
          className="glass-panel p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(inputEvent) => {
                  setSearchInput(inputEvent.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-full border-white/[0.08] bg-white/[0.03] pl-11"
                placeholder="Search venues by name"
              />
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
            Loading venues...
          </div>
        )}

        {isError && (
          <div className="mt-6 glass-panel p-6 text-sm text-destructive">
            Unable to load venues: {error?.message}
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
                  No venues match this search yet.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Clear the search or add a fresh venue to expand the directory.
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-xs text-muted-foreground">
                        Venue
                      </TableHead>
                      <TableHead className="hidden text-xs text-muted-foreground md:table-cell">
                        Location
                      </TableHead>
                      <TableHead className="text-right text-xs text-muted-foreground">
                        Capacity
                      </TableHead>
                      <TableHead className="hidden text-right text-xs text-muted-foreground md:table-cell">
                        Events
                      </TableHead>
                      <TableHead className="text-right text-xs text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((venue) => (
                      <TableRow
                        key={venue.id}
                        className="cursor-pointer border-white/[0.05] transition-colors hover:bg-white/[0.03]"
                        onClick={() => openEditVenue(venue.id)}
                      >
                        <TableCell className="align-top">
                          <div>
                            <p className="font-medium text-foreground">{venue.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {venue.description ?? 'No venue description yet.'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden align-top text-sm text-muted-foreground md:table-cell">
                          {formatVenueLocation(venue)}
                        </TableCell>
                        <TableCell className="align-top text-right text-sm font-medium text-foreground">
                          {formatCapacity(venue.capacity)}
                        </TableCell>
                        <TableCell className="hidden align-top text-right text-sm font-medium text-foreground md:table-cell">
                          {venue.event_count}
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <button
                            type="button"
                            onClick={(inputEvent) => {
                              inputEvent.stopPropagation();
                              openEditVenue(venue.id);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex flex-col gap-4 border-t border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {data.meta.page} of {Math.max(1, data.meta.totalPages)}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changePage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        changePage(
                          Math.min(data.meta.totalPages || 1, page + 1),
                        )
                      }
                      disabled={page >= data.meta.totalPages}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        <VenueDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
        <VenueDialog
          open={Boolean(editingVenueId)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingVenueId(undefined);
            }
          }}
          venueId={editingVenueId}
        />
      </AppShell>
    </AuthGuard>
  );
};

export default Venues;
