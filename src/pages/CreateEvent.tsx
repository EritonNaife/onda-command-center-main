import { FormEvent, useDeferredValue, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarPlus, Loader2, Plus, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { VenueDialog } from '@/components/venues/VenueDialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateEvent } from '@/hooks/useCreateEvent';
import { useVenue, useVenues } from '@/hooks/useVenues';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_EVENT_TIMEZONE,
  EVENT_PUBLICATION_OPTIONS,
  EVENT_TIMEZONE_OPTIONS,
  isValidUrl,
  localInputToIso,
  trimToUndefined,
} from '@/lib/eventManagement';
import { canManageOrganizationOperations } from '@/lib/organizationAccess';
import { useAuthStore } from '@/stores/authStore';
import { CreateEventRequest } from '@/types/events';
import { Venue } from '@/types/venues';

interface CreateEventFormState {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  venueId: string;
  capacity: string;
  status: 'draft' | 'published';
  coverImageUrl: string;
  timezone: string;
}

const NO_VENUE_VALUE = '__none__';

const INITIAL_FORM_STATE: CreateEventFormState = {
  name: '',
  description: '',
  startTime: '',
  endTime: '',
  venueId: '',
  capacity: '',
  status: 'draft',
  coverImageUrl: '',
  timezone: DEFAULT_EVENT_TIMEZONE,
};

const CreateEvent = () => {
  const navigate = useNavigate();
  const org = useAuthStore((state) => state.org);
  const { toast } = useToast();
  const createEventMutation = useCreateEvent();
  const [form, setForm] = useState<CreateEventFormState>(INITIAL_FORM_STATE);
  const [venueSearch, setVenueSearch] = useState('');
  const [isCreateVenueOpen, setIsCreateVenueOpen] = useState(false);
  const deferredVenueSearch = useDeferredValue(venueSearch.trim());
  const { data: venuesData, isError: isVenueError, isLoading: isVenuesLoading } = useVenues({
    page: 1,
    limit: 50,
    search: deferredVenueSearch || undefined,
  });
  const { data: selectedVenue } = useVenue(form.venueId || undefined);
  const canManageEvents = canManageOrganizationOperations(org?.role);

  const venueOptions = useMemo(() => {
    const venues = new Map<string, Venue>();

    venuesData?.data.forEach((venue) => {
      venues.set(venue.id, venue);
    });

    if (selectedVenue) {
      venues.set(selectedVenue.id, selectedVenue);
    }

    return Array.from(venues.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [selectedVenue, venuesData]);

  const submitCreate = async (inputEvent: FormEvent<HTMLFormElement>) => {
    inputEvent.preventDefault();

    const name = form.name.trim();

    if (!name) {
      toast({
        title: 'Name required',
        description: 'Give the event a clear name before creating it.',
        variant: 'destructive',
      });
      return;
    }

    const startTime = localInputToIso(form.startTime);
    const endTime = localInputToIso(form.endTime);

    if (!startTime || !endTime) {
      toast({
        title: 'Invalid schedule',
        description: 'Both start and end times must be valid.',
        variant: 'destructive',
      });
      return;
    }

    if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
      toast({
        title: 'Invalid schedule',
        description: 'End time must be after start time.',
        variant: 'destructive',
      });
      return;
    }

    let capacity: number | undefined;
    const rawCapacity = form.capacity.trim();

    if (rawCapacity) {
      const parsedCapacity = Number(rawCapacity);

      if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
        toast({
          title: 'Invalid capacity',
          description: 'Capacity must be a positive whole number when set.',
          variant: 'destructive',
        });
        return;
      }

      capacity = parsedCapacity;
    }

    const coverImageUrl = trimToUndefined(form.coverImageUrl);

    if (coverImageUrl && !isValidUrl(coverImageUrl)) {
      toast({
        title: 'Invalid cover image URL',
        description: 'Use a full URL starting with http:// or https://.',
        variant: 'destructive',
      });
      return;
    }

    const payload: CreateEventRequest = {
      name,
      description: trimToUndefined(form.description),
      start_time: startTime,
      end_time: endTime,
      venue_id: trimToUndefined(form.venueId),
      capacity,
      status: form.status,
      timezone: trimToUndefined(form.timezone) ?? DEFAULT_EVENT_TIMEZONE,
      cover_image_url: coverImageUrl,
    };

    try {
      const createdEvent = await createEventMutation.mutateAsync(payload);

      toast({
        title: 'Event created',
        description: `${createdEvent.name} is ready for management.`,
      });

      navigate(`/events/${createdEvent.id}/detail`);
    } catch (error) {
      toast({
        title: 'Create failed',
        description:
          error instanceof Error
            ? error.message
            : 'The event could not be created right now.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthGuard>
      <AppShell>
        <motion.div
          className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to events
            </button>
            <div className="space-y-2">
              <div className="glass-pill w-fit text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Event Setup
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Create Event
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Capture the core schedule, publishing state, and rollout
                  details now. Venue assignment now pulls from the shared venue
                  directory, so organizers can create the place record before
                  finishing the event.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {!canManageEvents ? (
          <motion.div
            className="glass-panel space-y-4 p-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
          >
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Read-only access
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your current role can review event operations but cannot create
                new events or venues. Switch to an admin or member account to
                continue.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/[0.08] px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                Back to events
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            className="glass-panel space-y-8 p-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            onSubmit={submitCreate}
          >
            <div className="grid gap-8 xl:grid-cols-[1.35fr_0.95fr]">
            <section className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="create-event-name"
                  className="text-sm font-medium text-foreground"
                >
                  Event Name
                </label>
                <Input
                  id="create-event-name"
                  value={form.name}
                  onChange={(inputEvent) =>
                    setForm((current) => ({
                      ...current,
                      name: inputEvent.target.value,
                    }))
                  }
                  className="border-white/[0.08] bg-white/[0.03]"
                  placeholder="Sunset Rooftop Session"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="create-event-description"
                  className="text-sm font-medium text-foreground"
                >
                  Description
                </label>
                <Textarea
                  id="create-event-description"
                  value={form.description}
                  onChange={(inputEvent) =>
                    setForm((current) => ({
                      ...current,
                      description: inputEvent.target.value,
                    }))
                  }
                  className="border-white/[0.08] bg-white/[0.03]"
                  placeholder="What should organizers and attendees know about this event?"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="create-event-start"
                    className="text-sm font-medium text-foreground"
                  >
                    Start Time
                  </label>
                  <Input
                    id="create-event-start"
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(inputEvent) =>
                      setForm((current) => ({
                        ...current,
                        startTime: inputEvent.target.value,
                      }))
                    }
                    className="border-white/[0.08] bg-white/[0.03]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="create-event-end"
                    className="text-sm font-medium text-foreground"
                  >
                    End Time
                  </label>
                  <Input
                    id="create-event-end"
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(inputEvent) =>
                      setForm((current) => ({
                        ...current,
                        endTime: inputEvent.target.value,
                      }))
                    }
                    className="border-white/[0.08] bg-white/[0.03]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-sm font-medium text-foreground">
                  Publish State
                </span>
                <div className="grid gap-3 md:grid-cols-2">
                  {EVENT_PUBLICATION_OPTIONS.map((option) => {
                    const isActive = form.status === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            status: option.value,
                          }))
                        }
                        className={`rounded-2xl border p-4 text-left transition-colors ${
                          isActive
                            ? 'border-primary/30 bg-primary/10'
                            : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="text-sm font-semibold text-foreground">
                          {option.label}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="data-label">Venue</p>
                <div className="mt-3 space-y-2">
                  <Input
                    value={venueSearch}
                    onChange={(inputEvent) => setVenueSearch(inputEvent.target.value)}
                    className="border-white/[0.08] bg-white/[0.03]"
                    placeholder="Search venues by name"
                  />
                  <Select
                    value={form.venueId || NO_VENUE_VALUE}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        venueId: value === NO_VENUE_VALUE ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger className="border-white/[0.08] bg-white/[0.03]">
                      <SelectValue placeholder="Select a venue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_VENUE_VALUE}>No venue yet</SelectItem>
                      {venueOptions.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {[venue.name, venue.address?.city]
                            .filter(Boolean)
                            .join(' • ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {isVenuesLoading
                        ? 'Loading venues from the directory...'
                        : 'Live venue directory results. Add one inline if it is missing.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreateVenueOpen(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add venue
                    </button>
                  </div>
                  {!isVenuesLoading && venueOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No venues match this search yet. Create one to keep moving.
                    </p>
                  )}
                  {isVenueError && (
                    <p className="text-xs text-muted-foreground">
                      Venue search is unavailable right now. You can still create
                      the event without one.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="data-label">Timezone</p>
                <div className="mt-3">
                  <Select
                    value={form.timezone}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        timezone: value,
                      }))
                    }
                  >
                    <SelectTrigger className="border-white/[0.08] bg-white/[0.03]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TIMEZONE_OPTIONS.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="data-label">Capacity</p>
                <div className="mt-3 space-y-2">
                  <Input
                    id="create-event-capacity"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={form.capacity}
                    onChange={(inputEvent) =>
                      setForm((current) => ({
                        ...current,
                        capacity: inputEvent.target.value,
                      }))
                    }
                    className="border-white/[0.08] bg-white/[0.03]"
                    placeholder="Optional"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank if the event should not have a hard cap yet.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="data-label">Cover Image URL</p>
                <div className="mt-3">
                  <Input
                    id="create-event-cover-image"
                    type="url"
                    value={form.coverImageUrl}
                    onChange={(inputEvent) =>
                      setForm((current) => ({
                        ...current,
                        coverImageUrl: inputEvent.target.value,
                      }))
                    }
                    className="border-white/[0.08] bg-white/[0.03]"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </aside>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                New events land in the management detail page immediately after
                creation.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/[0.08] px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                  disabled={createEventMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={createEventMutation.isPending}
                >
                  {createEventMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Create Event
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2 font-medium text-foreground">
                <CalendarPlus className="h-4 w-4 text-primary" />
                First release scope
              </div>
              <p className="mt-2">
                This flow captures the core event record and keeps venue
                creation close at hand, while deeper artist and team management
                still land in later phases.
              </p>
            </div>
          </motion.form>
        )}
      </AppShell>
      <VenueDialog
        open={isCreateVenueOpen}
        onOpenChange={setIsCreateVenueOpen}
        onSuccess={(venue) => {
          setForm((current) => ({
            ...current,
            venueId: venue.id,
          }));
          setVenueSearch(venue.name);
        }}
      />
    </AuthGuard>
  );
};

export default CreateEvent;
