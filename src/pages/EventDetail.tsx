import { FormEvent, useDeferredValue, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Calendar,
  Clock3,
  Edit3,
  ExternalLink,
  Globe2,
  Loader2,
  MapPin,
  Mic2,
  Plus,
  RadioTower,
  Save,
  ScanLine,
  Star,
  Ticket,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useAddToLineup,
  useArtists,
  useEventLineup,
  useRemoveFromLineup,
} from '@/hooks/useArtists';
import {
  useCreateTicketType,
  useDeleteTicketType,
  useTicketTypes,
  useUpdateTicketType,
} from '@/hooks/useTicketTypes';
import { useToast } from '@/hooks/use-toast';
import { useEventDetail } from '@/hooks/useEventDetail';
import { apiDelete, apiPatch } from '@/lib/apiClient';
import {
  DEFAULT_EVENT_TIMEZONE,
  EVENT_TIMEZONE_OPTIONS,
  isValidUrl,
  localInputToIso,
  resolvePublicationStatus,
  toLocalDateTimeValue,
  trimToUndefined,
} from '@/lib/eventManagement';
import { canManageOrganizationOperations } from '@/lib/organizationAccess';
import { isLiveEventStatus } from '@/lib/eventRouting';
import { useAuthStore } from '@/stores/authStore';
import { AddToLineupRequest, Artist, EventLineupEntry } from '@/types/artists';
import {
  CreateTicketTypeRequest,
  EventDetail as EventDetailModel,
  EventListItem,
  EventPublicationStatus,
  EventTicketType,
  UpdateEventRequest,
  UpdateTicketTypeRequest,
} from '@/types/events';

interface EditFormState {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  capacity: string;
  status: EventPublicationStatus;
  timezone: string;
  coverImageUrl: string;
}

interface TicketTypeFormState {
  name: string;
  price: string;
  quantity: string;
  isVip: boolean;
  saleStartDate: string;
  saleEndDate: string;
  description: string;
}

interface LineupFormState {
  artistId: string;
  stage: string;
  startTime: string;
  endTime: string;
  isHeadliner: boolean;
}

type TicketDialogMode = 'create' | 'edit';

const MANAGEMENT_STATUS_OPTIONS: Array<{
  value: EventPublicationStatus;
  label: string;
}> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EMPTY_TICKET_TYPE_FORM: TicketTypeFormState = {
  name: '',
  price: '',
  quantity: '',
  isVip: false,
  saleStartDate: '',
  saleEndDate: '',
  description: '',
};

const EMPTY_LINEUP_FORM: LineupFormState = {
  artistId: '',
  stage: '',
  startTime: '',
  endTime: '',
  isHeadliner: false,
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Schedule unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatSaleWindow(
  saleStartDate?: string | null,
  saleEndDate?: string | null,
): string {
  if (!saleStartDate && !saleEndDate) {
    return 'Open sale window';
  }

  if (saleStartDate && saleEndDate) {
    return `${formatDateTime(saleStartDate)} -> ${formatDateTime(saleEndDate)}`;
  }

  if (saleStartDate) {
    return `Starts ${formatDateTime(saleStartDate)}`;
  }

  return `Ends ${formatDateTime(saleEndDate ?? '')}`;
}

function formatLineupWindow(
  startTime?: string | null,
  endTime?: string | null,
): string {
  if (!startTime && !endTime) {
    return 'Set times pending';
  }

  if (startTime && endTime) {
    return `${formatDateTime(startTime)} -> ${formatDateTime(endTime)}`;
  }

  if (startTime) {
    return `Starts ${formatDateTime(startTime)}`;
  }

  return `Ends ${formatDateTime(endTime ?? '')}`;
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

function buildEditFormState(event: EventDetailModel): EditFormState {
  return {
    name: event.name,
    description: event.description ?? '',
    startTime: toLocalDateTimeValue(event.start_time),
    endTime: toLocalDateTimeValue(event.end_time),
    capacity: event.capacity > 0 ? String(event.capacity) : '',
    status: resolvePublicationStatus(event.status, event.publication_status),
    timezone: event.timezone ?? DEFAULT_EVENT_TIMEZONE,
    coverImageUrl: event.cover_image_url ?? '',
  };
}

function buildTicketTypeFormState(ticketType: EventTicketType): TicketTypeFormState {
  return {
    name: ticketType.name,
    price: String(ticketType.price),
    quantity: String(ticketType.quantity),
    isVip: Boolean(ticketType.is_vip),
    saleStartDate: toLocalDateTimeValue(ticketType.sale_start_date),
    saleEndDate: toLocalDateTimeValue(ticketType.sale_end_date),
    description: ticketType.description ?? '',
  };
}

const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const org = useAuthStore((state) => state.org);
  const {
    data: event,
    isLoading,
    isError,
    error,
  } = useEventDetail(eventId);
  const {
    data: ticketTypesData,
    isLoading: isTicketTypesLoading,
    isError: isTicketTypesError,
    error: ticketTypesError,
  } = useTicketTypes(eventId);
  const {
    data: lineupData,
    isLoading: isLineupLoading,
    isError: isLineupError,
    error: lineupError,
  } = useEventLineup(eventId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    capacity: '',
    status: 'draft',
    timezone: DEFAULT_EVENT_TIMEZONE,
    coverImageUrl: '',
  });
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketDialogMode, setTicketDialogMode] = useState<TicketDialogMode>('create');
  const [editingTicketType, setEditingTicketType] = useState<EventTicketType | null>(
    null,
  );
  const [ticketTypeForm, setTicketTypeForm] = useState<TicketTypeFormState>(
    EMPTY_TICKET_TYPE_FORM,
  );
  const [isLineupDialogOpen, setIsLineupDialogOpen] = useState(false);
  const [lineupSearchInput, setLineupSearchInput] = useState('');
  const [lineupForm, setLineupForm] = useState<LineupFormState>(
    EMPTY_LINEUP_FORM,
  );
  const deferredLineupSearch = useDeferredValue(lineupSearchInput.trim());
  const { data: lineupArtistsData } = useArtists(
    deferredLineupSearch || undefined,
  );

  const ticketTypes = useMemo(
    () => ticketTypesData ?? event?.ticket_types ?? [],
    [ticketTypesData, event?.ticket_types],
  );
  const lineup = useMemo(() => lineupData ?? [], [lineupData]);
  const canEdit = canManageOrganizationOperations(org?.role);
  const canManageTicketTypes =
    canEdit && event?.publication_status !== 'cancelled';
  const canManageLineup = canEdit && event?.publication_status !== 'cancelled';
  const availableArtists = useMemo(() => {
    const artists = lineupArtistsData ?? [];
    const currentLineupArtistIds = new Set(
      lineup.map((entry) => entry.artist.id),
    );

    return artists.filter((artist) => !currentLineupArtistIds.has(artist.id));
  }, [lineup, lineupArtistsData]);

  const soldCount = useMemo(() => {
    if (!event) {
      return 0;
    }

    return (
      event.revenue?.tickets_sold ??
      ticketTypes.reduce((sum, ticketType) => sum + ticketType.quantity_sold, 0)
    );
  }, [event, ticketTypes]);

  const capacityPercentage = useMemo(() => {
    if (!event || event.capacity <= 0) {
      return 0;
    }

    return Math.min(100, (soldCount / event.capacity) * 100);
  }, [event, soldCount]);

  const timezoneOptions = useMemo(() => {
    const options = new Set<string>(EVENT_TIMEZONE_OPTIONS);

    if (editForm.timezone.trim()) {
      options.add(editForm.timezone.trim());
    }

    return Array.from(options);
  }, [editForm.timezone]);

  const updateEventMutation = useMutation({
    mutationFn: async (payload: UpdateEventRequest) =>
      apiPatch<EventListItem, UpdateEventRequest>(`/events/${eventId}`, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['org-dashboard'] }),
      ]);

      setIsEditOpen(false);
      toast({
        title: 'Event updated',
        description: 'The latest event details have been saved.',
      });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Update failed',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const cancelEventMutation = useMutation({
    mutationFn: async () => apiDelete(`/events/${eventId}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['org-dashboard'] }),
      ]);

      toast({
        title: 'Event cancelled',
        description: 'The event is now marked as cancelled.',
      });
      navigate('/events');
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Cancellation failed',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const createTicketTypeMutation = useCreateTicketType(eventId);
  const updateTicketTypeMutation = useUpdateTicketType(eventId);
  const deleteTicketTypeMutation = useDeleteTicketType(eventId);
  const addToLineupMutation = useAddToLineup(eventId);
  const removeFromLineupMutation = useRemoveFromLineup(eventId);
  const isTicketDialogPending =
    createTicketTypeMutation.isPending || updateTicketTypeMutation.isPending;
  const isLineupDialogPending = addToLineupMutation.isPending;

  const openEditDialog = () => {
    if (!event) {
      return;
    }

    setEditForm(buildEditFormState(event));
    setIsEditOpen(true);
  };

  const openCreateTicketTypeDialog = () => {
    setTicketDialogMode('create');
    setEditingTicketType(null);
    setTicketTypeForm(EMPTY_TICKET_TYPE_FORM);
    setIsTicketDialogOpen(true);
  };

  const openEditTicketTypeDialog = (ticketType: EventTicketType) => {
    setTicketDialogMode('edit');
    setEditingTicketType(ticketType);
    setTicketTypeForm(buildTicketTypeFormState(ticketType));
    setIsTicketDialogOpen(true);
  };

  const openCreateLineupDialog = () => {
    setLineupSearchInput('');
    setLineupForm(EMPTY_LINEUP_FORM);
    setIsLineupDialogOpen(true);
  };

  const submitEdit = (inputEvent: FormEvent<HTMLFormElement>) => {
    inputEvent.preventDefault();

    if (!eventId || !event) {
      return;
    }

    const name = editForm.name.trim();

    if (!name) {
      toast({
        title: 'Name required',
        description: 'Event name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    const nextStartTime = localInputToIso(editForm.startTime);
    const nextEndTime = localInputToIso(editForm.endTime);

    if (!nextStartTime || !nextEndTime) {
      toast({
        title: 'Invalid schedule',
        description: 'Both start and end times must be valid.',
        variant: 'destructive',
      });
      return;
    }

    if (new Date(nextEndTime).getTime() <= new Date(nextStartTime).getTime()) {
      toast({
        title: 'Invalid schedule',
        description: 'End time must be after start time.',
        variant: 'destructive',
      });
      return;
    }

    let capacity: number | undefined;
    const rawCapacity = editForm.capacity.trim();

    if (rawCapacity) {
      const parsedCapacity = Number(rawCapacity);

      if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
        toast({
          title: 'Invalid capacity',
          description: 'Capacity must be a positive whole number.',
          variant: 'destructive',
        });
        return;
      }

      capacity = parsedCapacity;
    } else if (event.capacity > 0) {
      toast({
        title: 'Capacity required',
        description:
          'Set a positive capacity here. Removing an existing limit is not supported from this dialog yet.',
        variant: 'destructive',
      });
      return;
    }

    const coverImageUrl = trimToUndefined(editForm.coverImageUrl);

    if (coverImageUrl && !isValidUrl(coverImageUrl)) {
      toast({
        title: 'Invalid cover image URL',
        description: 'Use a full URL starting with http:// or https://.',
        variant: 'destructive',
      });
      return;
    }

    updateEventMutation.mutate({
      name,
      description: trimToUndefined(editForm.description),
      start_time: nextStartTime,
      end_time: nextEndTime,
      capacity,
      status: editForm.status,
      timezone: trimToUndefined(editForm.timezone) ?? DEFAULT_EVENT_TIMEZONE,
      cover_image_url: coverImageUrl,
    });
  };

  const submitTicketType = async (inputEvent: FormEvent<HTMLFormElement>) => {
    inputEvent.preventDefault();

    if (!eventId) {
      return;
    }

    const name = ticketTypeForm.name.trim();

    if (!name) {
      toast({
        title: 'Name required',
        description: 'Ticket type name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    const price = Number(ticketTypeForm.price);

    if (!Number.isFinite(price) || price < 0) {
      toast({
        title: 'Invalid price',
        description: 'Price must be zero or greater.',
        variant: 'destructive',
      });
      return;
    }

    const quantity = Number(ticketTypeForm.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      toast({
        title: 'Invalid quantity',
        description: 'Quantity must be a whole number greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    if (
      ticketDialogMode === 'edit' &&
      editingTicketType &&
      quantity < editingTicketType.quantity_sold
    ) {
      toast({
        title: 'Quantity too low',
        description: `Quantity cannot be reduced below tickets sold (${editingTicketType.quantity_sold}).`,
        variant: 'destructive',
      });
      return;
    }

    const saleStartDate = localInputToIso(ticketTypeForm.saleStartDate);
    const saleEndDate = localInputToIso(ticketTypeForm.saleEndDate);

    if (
      saleStartDate &&
      saleEndDate &&
      new Date(saleEndDate).getTime() < new Date(saleStartDate).getTime()
    ) {
      toast({
        title: 'Invalid sale window',
        description: 'Sale end date must be after or equal to the sale start date.',
        variant: 'destructive',
      });
      return;
    }

    const payload: CreateTicketTypeRequest | UpdateTicketTypeRequest = {
      name,
      price,
      quantity,
      description: trimToUndefined(ticketTypeForm.description),
      is_vip: ticketTypeForm.isVip,
      sale_start_date: saleStartDate,
      sale_end_date: saleEndDate,
    };

    try {
      if (ticketDialogMode === 'create') {
        await createTicketTypeMutation.mutateAsync(
          payload as CreateTicketTypeRequest,
        );
        toast({
          title: 'Ticket type created',
          description: `${name} is now available on this event.`,
        });
      } else if (editingTicketType) {
        await updateTicketTypeMutation.mutateAsync({
          ticketTypeId: editingTicketType.id,
          payload: payload as UpdateTicketTypeRequest,
        });
        toast({
          title: 'Ticket type updated',
          description: `${name} has been updated.`,
        });
      }

      setIsTicketDialogOpen(false);
      setEditingTicketType(null);
      setTicketTypeForm(EMPTY_TICKET_TYPE_FORM);
    } catch (mutationError) {
      toast({
        title:
          ticketDialogMode === 'create'
            ? 'Create ticket type failed'
            : 'Update ticket type failed',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'The ticket type could not be saved.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTicketType = async (ticketType: EventTicketType) => {
    if (ticketType.quantity_sold > 0) {
      toast({
        title: 'Cannot delete ticket type',
        description: 'Ticket types with sales cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await deleteTicketTypeMutation.mutateAsync(ticketType.id);
      toast({
        title: 'Ticket type deleted',
        description: `${ticketType.name} has been removed.`,
      });
    } catch (mutationError) {
      toast({
        title: 'Delete failed',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'The ticket type could not be deleted.',
        variant: 'destructive',
      });
    }
  };

  const submitLineup = async (inputEvent: FormEvent<HTMLFormElement>) => {
    inputEvent.preventDefault();

    if (!eventId) {
      return;
    }

    if (!lineupForm.artistId) {
      toast({
        title: 'Artist required',
        description: 'Select an artist before adding to the lineup.',
        variant: 'destructive',
      });
      return;
    }

    const startTime = localInputToIso(lineupForm.startTime);
    const endTime = localInputToIso(lineupForm.endTime);

    if (lineupForm.startTime && !startTime) {
      toast({
        title: 'Invalid start time',
        description: 'Use a valid start time for the lineup entry.',
        variant: 'destructive',
      });
      return;
    }

    if (lineupForm.endTime && !endTime) {
      toast({
        title: 'Invalid end time',
        description: 'Use a valid end time for the lineup entry.',
        variant: 'destructive',
      });
      return;
    }

    if (startTime && endTime && new Date(endTime).getTime() < new Date(startTime).getTime()) {
      toast({
        title: 'Invalid set window',
        description: 'End time must be after or equal to the start time.',
        variant: 'destructive',
      });
      return;
    }

    const payload: AddToLineupRequest = {
      artist_id: lineupForm.artistId,
      stage: trimToUndefined(lineupForm.stage),
      start_time: startTime,
      end_time: endTime,
      is_headliner: lineupForm.isHeadliner,
    };

    const selectedArtist = (lineupArtistsData ?? []).find(
      (artist) => artist.id === lineupForm.artistId,
    );

    try {
      await addToLineupMutation.mutateAsync(payload);
      toast({
        title: 'Artist added to lineup',
        description: `${selectedArtist?.name ?? 'Artist'} is now on the bill.`,
      });
      setIsLineupDialogOpen(false);
      setLineupSearchInput('');
      setLineupForm(EMPTY_LINEUP_FORM);
    } catch (mutationError) {
      toast({
        title: 'Add to lineup failed',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'The lineup entry could not be saved.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveFromLineup = async (entry: EventLineupEntry) => {
    try {
      await removeFromLineupMutation.mutateAsync(entry.artist.id);
      toast({
        title: 'Artist removed',
        description: `${entry.artist.name} has been removed from the lineup.`,
      });
    } catch (mutationError) {
      toast({
        title: 'Remove failed',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'The artist could not be removed from the lineup.',
        variant: 'destructive',
      });
    }
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
            Loading event detail...
          </div>
        )}

        {eventId && isError && (
          <div className="glass-panel p-6 text-sm text-destructive">
            Unable to load event detail: {error?.message}
          </div>
        )}

        {eventId && event && (
          <>
            <motion.div
              className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="space-y-3">
                <div className="glass-pill w-fit text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Event Detail
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                      {event.name}
                    </h1>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClassName(
                        event.status,
                      )}`}
                    >
                      {event.status ?? 'unknown'}
                    </span>
                    {isLiveEventStatus(event.status) && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Live now
                      </span>
                    )}
                  </div>

                  {event.description && (
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                      {event.description}
                    </p>
                  )}

                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                    <div className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {formatDateTime(event.start_time)}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-primary" />
                      Ends {formatDateTime(event.end_time)}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-primary" />
                      {event.timezone ?? DEFAULT_EVENT_TIMEZONE}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {event.venue_name ?? 'Venue TBD'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {canEdit && (
                  <button
                    type="button"
                    onClick={openEditDialog}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-5 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.06]"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Event
                  </button>
                )}

                {canEdit && event.publication_status !== 'cancelled' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-11 items-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-400/15"
                      >
                        <Ban className="h-4 w-4" />
                        Cancel Event
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-white/[0.08] bg-card/95 text-foreground backdrop-blur-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This uses the dashboard cancel flow and marks the event
                          as cancelled. The current detail view will close after
                          the request succeeds.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          className="border-white/[0.08] bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
                          disabled={cancelEventMutation.isPending}
                        >
                          Keep Event
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => cancelEventMutation.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={cancelEventMutation.isPending}
                        >
                          {cancelEventMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="mr-2 h-4 w-4" />
                          )}
                          Cancel Event
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {isLiveEventStatus(event.status) && (
                  <button
                    type="button"
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <RadioTower className="h-4 w-4" />
                    View Live
                  </button>
                )}
              </div>
            </motion.div>

            {event.cover_image_url && (
              <motion.section
                className="glass-panel mb-6 overflow-hidden"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.16 }}
              >
                <div
                  className="h-44 w-full bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(8, 12, 18, 0.08), rgba(8, 12, 18, 0.72)), url(${event.cover_image_url})`,
                  }}
                />
                <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="data-label">Cover image</p>
                    <p className="text-sm text-muted-foreground">
                      This event already has a linked marketing image.
                    </p>
                  </div>
                  <a
                    href={event.cover_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open image
                  </a>
                </div>
              </motion.section>
            )}

            <motion.div
              className="glass-panel mb-6 p-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="data-label">Capacity</p>
                  <p className="data-value">
                    {soldCount.toLocaleString()}
                    {event.capacity > 0 ? (
                      <span className="text-muted-foreground">
                        /{event.capacity.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">/Uncapped</span>
                    )}
                  </p>
                </div>
                <span className="glass-pill text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {event.capacity > 0
                    ? `${formatPercent(capacityPercentage)} sold`
                    : 'No limit'}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-emerald-300 transition-all"
                  style={{ width: `${event.capacity > 0 ? capacityPercentage : 100}%` }}
                />
              </div>
            </motion.div>

            {!canEdit && (
              <motion.div
                className="glass-panel mb-6 p-4 text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.22 }}
              >
                Your current organization role is read-only here. Admins and
                members can edit event details and manage ticket types.
              </motion.div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
              <div className="space-y-6">
                <motion.section
                  className="glass-panel overflow-hidden"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.25 }}
                >
                  <div className="border-b border-white/[0.06] px-6 py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold text-foreground">
                          Ticket Types
                        </h2>
                      </div>
                      {canManageTicketTypes && (
                        <button
                          type="button"
                          onClick={openCreateTicketTypeDialog}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          <Plus className="h-4 w-4" />
                          Add Ticket Type
                        </button>
                      )}
                    </div>
                  </div>

                  {isTicketTypesLoading ? (
                    <div className="p-6 text-sm text-muted-foreground">
                      Loading ticket types...
                    </div>
                  ) : isTicketTypesError ? (
                    <div className="p-6 text-sm text-destructive">
                      Unable to load ticket types: {ticketTypesError?.message}
                    </div>
                  ) : ticketTypes.length === 0 ? (
                    <div className="space-y-3 p-6 text-sm text-muted-foreground">
                      <p>No ticket types configured for this event.</p>
                      {canManageTicketTypes && (
                        <button
                          type="button"
                          onClick={openCreateTicketTypeDialog}
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          <Plus className="h-4 w-4" />
                          Create the first ticket type
                        </button>
                      )}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/[0.06] hover:bg-transparent">
                          <TableHead className="text-xs text-muted-foreground">
                            Type
                          </TableHead>
                          <TableHead className="text-right text-xs text-muted-foreground">
                            Price
                          </TableHead>
                          <TableHead className="text-right text-xs text-muted-foreground">
                            Inventory
                          </TableHead>
                          <TableHead className="hidden text-xs text-muted-foreground lg:table-cell">
                            Sale Window
                          </TableHead>
                          {canManageTicketTypes && (
                            <TableHead className="text-right text-xs text-muted-foreground">
                              Actions
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ticketTypes.map((ticketType) => {
                          const sellThrough =
                            ticketType.quantity > 0
                              ? (ticketType.quantity_sold / ticketType.quantity) * 100
                              : 0;

                          return (
                            <TableRow
                              key={ticketType.id}
                              className="border-white/[0.06] hover:bg-white/[0.02]"
                            >
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium text-foreground">
                                      {ticketType.name}
                                    </span>
                                    {ticketType.is_vip && (
                                      <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                                        VIP
                                      </span>
                                    )}
                                    {ticketType.is_sold_out && (
                                      <span className="inline-flex rounded-full border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300">
                                        Sold out
                                      </span>
                                    )}
                                  </div>
                                  {ticketType.description && (
                                    <p className="max-w-md text-xs text-muted-foreground">
                                      {ticketType.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground lg:hidden">
                                    {formatSaleWindow(
                                      ticketType.sale_start_date,
                                      ticketType.sale_end_date,
                                    )}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-gold">
                                {formatCurrency(ticketType.price)} MZN
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                <div className="space-y-1">
                                  <div className="text-foreground">
                                    {ticketType.quantity_sold.toLocaleString()} sold
                                  </div>
                                  <div className="text-muted-foreground">
                                    {ticketType.quantity_remaining.toLocaleString()} left /
                                    {' '}
                                    {ticketType.quantity.toLocaleString()} total
                                  </div>
                                  <div className="text-primary">
                                    {formatPercent(sellThrough)} sell-through
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                                {formatSaleWindow(
                                  ticketType.sale_start_date,
                                  ticketType.sale_end_date,
                                )}
                              </TableCell>
                              {canManageTicketTypes && (
                                <TableCell className="text-right">
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openEditTicketTypeDialog(ticketType)}
                                      className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06]"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                      Edit
                                    </button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <button
                                          type="button"
                                          disabled={
                                            ticketType.quantity_sold > 0 ||
                                            deleteTicketTypeMutation.isPending
                                          }
                                          className="inline-flex h-9 items-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-3 text-sm font-medium text-red-200 transition-colors hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Delete
                                        </button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="border-white/[0.08] bg-card/95 text-foreground backdrop-blur-xl">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Delete {ticketType.name}?
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            {ticketType.quantity_sold > 0
                                              ? 'This ticket type already has sales and cannot be deleted.'
                                              : 'This will permanently remove the ticket type from the event.'}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel
                                            className="border-white/[0.08] bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
                                            disabled={deleteTicketTypeMutation.isPending}
                                          >
                                            Keep Ticket Type
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteTicketType(ticketType)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            disabled={
                                              ticketType.quantity_sold > 0 ||
                                              deleteTicketTypeMutation.isPending
                                            }
                                          >
                                            {deleteTicketTypeMutation.isPending ? (
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                              <Trash2 className="mr-2 h-4 w-4" />
                                            )}
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </motion.section>

                <motion.section
                  className="glass-panel overflow-hidden"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.28 }}
                >
                  <div className="border-b border-white/[0.06] px-6 py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Mic2 className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold text-foreground">
                          Lineup
                        </h2>
                      </div>
                      {canManageLineup && (
                        <button
                          type="button"
                          onClick={openCreateLineupDialog}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          <Plus className="h-4 w-4" />
                          Add to Lineup
                        </button>
                      )}
                    </div>
                  </div>

                  {isLineupLoading ? (
                    <div className="p-6 text-sm text-muted-foreground">
                      Loading lineup...
                    </div>
                  ) : isLineupError ? (
                    <div className="p-6 text-sm text-destructive">
                      Unable to load lineup: {lineupError?.message}
                    </div>
                  ) : lineup.length === 0 ? (
                    <div className="space-y-3 p-6 text-sm text-muted-foreground">
                      <p>No artists are assigned to this event yet.</p>
                      {canManageLineup && (
                        <button
                          type="button"
                          onClick={openCreateLineupDialog}
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          <Plus className="h-4 w-4" />
                          Build the first lineup entry
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.06]">
                      {lineup.map((entry, index) => (
                        <div
                          key={entry.artist.id}
                          className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Slot {entry.performance_order ?? index + 1}
                              </span>
                              {entry.is_headliner && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                                  <Star className="h-3 w-3" />
                                  Headliner
                                </span>
                              )}
                              {entry.artist.genre && (
                                <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                                  {entry.artist.genre}
                                </span>
                              )}
                            </div>

                            <div>
                              <h3 className="text-lg font-semibold text-foreground">
                                {entry.artist.name}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {entry.artist.bio ?? 'Artist profile ready for scheduling notes.'}
                              </p>
                            </div>

                            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                              <div>
                                <span className="data-label">Stage</span>
                                <p className="mt-1 text-foreground">
                                  {entry.stage ?? 'Stage pending'}
                                </p>
                              </div>
                              <div>
                                <span className="data-label">Set Window</span>
                                <p className="mt-1 text-foreground">
                                  {formatLineupWindow(
                                    entry.start_time,
                                    entry.end_time,
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          {canManageLineup && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFromLineup(entry)}
                              disabled={removeFromLineupMutation.isPending}
                              className="inline-flex h-10 items-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-4 text-sm font-medium text-red-200 transition-colors hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {removeFromLineupMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.section>
              </div>

              <div className="space-y-6">
                <motion.section
                  className="glass-panel p-6"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.3 }}
                >
                  <div className="mb-5 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-400" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Revenue Summary
                    </h2>
                  </div>

                  {event.revenue ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="data-label">Actual Revenue</p>
                        <p className="mt-2 font-mono text-xl font-semibold text-foreground">
                          {formatCurrency(event.revenue.actual_mzn)} MZN
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="data-label">Projected Revenue</p>
                        <p className="mt-2 font-mono text-xl font-semibold text-amber-300">
                          {formatCurrency(event.revenue.projected_mzn)} MZN
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="data-label">Avg Ticket Price</p>
                        <p className="mt-2 font-mono text-lg font-semibold text-foreground">
                          {formatCurrency(event.revenue.average_ticket_price)} MZN
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="data-label">Tickets Sold</p>
                        <p className="mt-2 font-mono text-lg font-semibold text-foreground">
                          {event.revenue.tickets_sold.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="data-label">Refunds</p>
                        <p className="mt-2 font-mono text-lg font-semibold text-red-300">
                          {formatCurrency(event.revenue.refunds)} MZN
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="data-label">Fees</p>
                        <p className="mt-2 font-mono text-lg font-semibold text-muted-foreground">
                          {formatCurrency(event.revenue.fees)} MZN
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Revenue enrichment is unavailable right now. Core event
                      metadata is still loaded.
                    </p>
                  )}
                </motion.section>

                <motion.section
                  className="glass-panel p-6"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.35 }}
                >
                  <div className="mb-5 flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Check-in Summary
                    </h2>
                  </div>

                  {event.check_in_stats ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="data-label">Total Scanned</p>
                        <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                          {event.check_in_stats.total_scanned.toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {event.check_in_stats.by_type.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No scan breakdown available.
                          </p>
                        ) : (
                          event.check_in_stats.by_type.map((entry) => (
                            <div
                              key={entry.type}
                              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                            >
                              <span className="text-sm font-medium capitalize text-foreground">
                                {entry.type.replace(/_/g, ' ')}
                              </span>
                              <span className="font-mono text-sm text-primary">
                                {entry.count.toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Check-in enrichment is unavailable right now. Event detail
                      is still accessible.
                    </p>
                  )}
                </motion.section>
              </div>
            </div>
          </>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto border-white/[0.08] bg-card/95 text-foreground backdrop-blur-xl sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
              <DialogDescription>
                Update scheduling, publishing, and presentation fields exposed by
                the dashboard API.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-6" onSubmit={submitEdit}>
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
                <section className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="event-name"
                      className="text-sm font-medium text-foreground"
                    >
                      Event Name
                    </label>
                    <Input
                      id="event-name"
                      value={editForm.name}
                      onChange={(inputEvent) =>
                        setEditForm((current) => ({
                          ...current,
                          name: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="event-description"
                      className="text-sm font-medium text-foreground"
                    >
                      Description
                    </label>
                    <Textarea
                      id="event-description"
                      value={editForm.description}
                      onChange={(inputEvent) =>
                        setEditForm((current) => ({
                          ...current,
                          description: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="event-start"
                        className="text-sm font-medium text-foreground"
                      >
                        Start Time
                      </label>
                      <Input
                        id="event-start"
                        type="datetime-local"
                        value={editForm.startTime}
                        onChange={(inputEvent) =>
                          setEditForm((current) => ({
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
                        htmlFor="event-end"
                        className="text-sm font-medium text-foreground"
                      >
                        End Time
                      </label>
                      <Input
                        id="event-end"
                        type="datetime-local"
                        value={editForm.endTime}
                        onChange={(inputEvent) =>
                          setEditForm((current) => ({
                            ...current,
                            endTime: inputEvent.target.value,
                          }))
                        }
                        className="border-white/[0.08] bg-white/[0.03]"
                        required
                      />
                    </div>
                  </div>
                </section>

                <aside className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="event-status"
                      className="text-sm font-medium text-foreground"
                    >
                      Status
                    </label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value: EventPublicationStatus) =>
                        setEditForm((current) => ({
                          ...current,
                          status: value,
                        }))
                      }
                    >
                      <SelectTrigger
                        id="event-status"
                        className="border-white/[0.08] bg-white/[0.03]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MANAGEMENT_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="event-timezone"
                      className="text-sm font-medium text-foreground"
                    >
                      Timezone
                    </label>
                    <Select
                      value={editForm.timezone}
                      onValueChange={(value) =>
                        setEditForm((current) => ({
                          ...current,
                          timezone: value,
                        }))
                      }
                    >
                      <SelectTrigger
                        id="event-timezone"
                        className="border-white/[0.08] bg-white/[0.03]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezoneOptions.map((timezone) => (
                          <SelectItem key={timezone} value={timezone}>
                            {timezone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="event-capacity"
                      className="text-sm font-medium text-foreground"
                    >
                      Capacity
                    </label>
                    <Input
                      id="event-capacity"
                      type="number"
                      min={1}
                      step={1}
                      value={editForm.capacity}
                      onChange={(inputEvent) =>
                        setEditForm((current) => ({
                          ...current,
                          capacity: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                      placeholder={event?.capacity > 0 ? undefined : 'Optional'}
                    />
                    <p className="text-xs text-muted-foreground">
                      {event?.capacity > 0
                        ? 'Use a positive whole number here. Removing an existing cap is not supported yet.'
                        : 'Leave blank to keep this event uncapped.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="event-cover-image"
                      className="text-sm font-medium text-foreground"
                    >
                      Cover Image URL
                    </label>
                    <Input
                      id="event-cover-image"
                      type="url"
                      value={editForm.coverImageUrl}
                      onChange={(inputEvent) =>
                        setEditForm((current) => ({
                          ...current,
                          coverImageUrl: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                      placeholder="https://..."
                    />
                  </div>
                </aside>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.08] px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                  disabled={updateEventMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updateEventMutation.isPending}
                >
                  {updateEventMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isLineupDialogOpen}
          onOpenChange={(open) => {
            setIsLineupDialogOpen(open);
            if (!open) {
              setLineupSearchInput('');
              setLineupForm(EMPTY_LINEUP_FORM);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto border-white/[0.08] bg-card/95 text-foreground backdrop-blur-xl sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add to Lineup</DialogTitle>
              <DialogDescription>
                Search your artist roster, pick the act, and attach optional
                stage and schedule details for this event.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-5" onSubmit={submitLineup}>
              <div className="grid gap-5 lg:grid-cols-[1.15fr_0.9fr]">
                <section className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lineup-artist-search">Search Artists</Label>
                    <Input
                      id="lineup-artist-search"
                      value={lineupSearchInput}
                      onChange={(inputEvent) =>
                        setLineupSearchInput(inputEvent.target.value)
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                      placeholder="Search by name or genre"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lineup-artist">Artist</Label>
                    <Select
                      value={lineupForm.artistId || undefined}
                      onValueChange={(value) =>
                        setLineupForm((current) => ({
                          ...current,
                          artistId: value,
                        }))
                      }
                    >
                      <SelectTrigger
                        id="lineup-artist"
                        className="border-white/[0.08] bg-white/[0.03]"
                      >
                        <SelectValue placeholder="Select artist" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableArtists.map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            {artist.name}
                            {artist.genre ? ` - ${artist.genre}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableArtists.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No available artists match this search, or every roster
                        artist is already on the lineup.
                      </p>
                    )}
                  </div>
                </section>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="lineup-headliner"
                        checked={lineupForm.isHeadliner}
                        onCheckedChange={(checked) =>
                          setLineupForm((current) => ({
                            ...current,
                            isHeadliner: checked === true,
                          }))
                        }
                      />
                      <div className="space-y-1">
                        <Label htmlFor="lineup-headliner">Headliner</Label>
                        <p className="text-xs text-muted-foreground">
                          Highlight this artist as the main draw.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lineup-stage">Stage</Label>
                    <Input
                      id="lineup-stage"
                      value={lineupForm.stage}
                      onChange={(inputEvent) =>
                        setLineupForm((current) => ({
                          ...current,
                          stage: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                      placeholder="Main Stage"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lineup-start-time">Start Time</Label>
                    <Input
                      id="lineup-start-time"
                      type="datetime-local"
                      value={lineupForm.startTime}
                      onChange={(inputEvent) =>
                        setLineupForm((current) => ({
                          ...current,
                          startTime: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lineup-end-time">End Time</Label>
                    <Input
                      id="lineup-end-time"
                      type="datetime-local"
                      value={lineupForm.endTime}
                      onChange={(inputEvent) =>
                        setLineupForm((current) => ({
                          ...current,
                          endTime: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave schedule fields blank if the set times are still
                      being finalized.
                    </p>
                  </div>
                </aside>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setIsLineupDialogOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.08] px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                  disabled={isLineupDialogPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLineupDialogPending || availableArtists.length === 0}
                >
                  {isLineupDialogPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add Artist
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isTicketDialogOpen}
          onOpenChange={(open) => {
            setIsTicketDialogOpen(open);
            if (!open) {
              setEditingTicketType(null);
              setTicketTypeForm(EMPTY_TICKET_TYPE_FORM);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto border-white/[0.08] bg-card/95 text-foreground backdrop-blur-xl sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {ticketDialogMode === 'create'
                  ? 'Add Ticket Type'
                  : `Edit ${editingTicketType?.name ?? 'Ticket Type'}`}
              </DialogTitle>
              <DialogDescription>
                Configure pricing, inventory, and the sales window for this
                event&apos;s ticket offer.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-5" onSubmit={submitTicketType}>
              <div className="grid gap-5 lg:grid-cols-[1.15fr_0.9fr]">
                <section className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-type-name">Name</Label>
                    <Input
                      id="ticket-type-name"
                      value={ticketTypeForm.name}
                      onChange={(inputEvent) =>
                        setTicketTypeForm((current) => ({
                          ...current,
                          name: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                      placeholder="General Admission"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket-type-description">Description</Label>
                    <Textarea
                      id="ticket-type-description"
                      value={ticketTypeForm.description}
                      onChange={(inputEvent) =>
                        setTicketTypeForm((current) => ({
                          ...current,
                          description: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                      placeholder="Optional context for the offer"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-type-price">Price (MZN)</Label>
                      <Input
                        id="ticket-type-price"
                        type="number"
                        min={0}
                        step="0.01"
                        value={ticketTypeForm.price}
                        onChange={(inputEvent) =>
                          setTicketTypeForm((current) => ({
                            ...current,
                            price: inputEvent.target.value,
                          }))
                        }
                        className="border-white/[0.08] bg-white/[0.03]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ticket-type-quantity">Quantity</Label>
                      <Input
                        id="ticket-type-quantity"
                        type="number"
                        min={1}
                        step={1}
                        value={ticketTypeForm.quantity}
                        onChange={(inputEvent) =>
                          setTicketTypeForm((current) => ({
                            ...current,
                            quantity: inputEvent.target.value,
                          }))
                        }
                        className="border-white/[0.08] bg-white/[0.03]"
                        required
                      />
                      {ticketDialogMode === 'edit' && editingTicketType && (
                        <p className="text-xs text-muted-foreground">
                          Sold so far: {editingTicketType.quantity_sold}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="ticket-type-vip"
                        checked={ticketTypeForm.isVip}
                        onCheckedChange={(checked) =>
                          setTicketTypeForm((current) => ({
                            ...current,
                            isVip: checked === true,
                          }))
                        }
                      />
                      <div className="space-y-1">
                        <Label htmlFor="ticket-type-vip">VIP access</Label>
                        <p className="text-xs text-muted-foreground">
                          Highlight this ticket as a premium offer.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket-type-sale-start">Sale Start</Label>
                    <Input
                      id="ticket-type-sale-start"
                      type="datetime-local"
                      value={ticketTypeForm.saleStartDate}
                      onChange={(inputEvent) =>
                        setTicketTypeForm((current) => ({
                          ...current,
                          saleStartDate: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket-type-sale-end">Sale End</Label>
                    <Input
                      id="ticket-type-sale-end"
                      type="datetime-local"
                      value={ticketTypeForm.saleEndDate}
                      onChange={(inputEvent) =>
                        setTicketTypeForm((current) => ({
                          ...current,
                          saleEndDate: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave either field blank to keep the sale window open-ended.
                    </p>
                  </div>
                </aside>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setIsTicketDialogOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.08] px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                  disabled={isTicketDialogPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isTicketDialogPending}
                >
                  {isTicketDialogPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {ticketDialogMode === 'create' ? 'Create Ticket Type' : 'Save Ticket Type'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
};

export default EventDetail;
