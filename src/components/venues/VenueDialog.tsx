import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, Save } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useCreateVenue, useUpdateVenue, useVenue } from '@/hooks/useVenues';
import { useToast } from '@/hooks/use-toast';
import { isValidUrl, trimToUndefined } from '@/lib/eventManagement';
import { CreateVenueRequest, UpdateVenueRequest, Venue } from '@/types/venues';

interface VenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId?: string;
  onSuccess?: (venue: Venue) => void;
}

interface VenueFormState {
  name: string;
  capacity: string;
  description: string;
  contactInfo: string;
  floorPlanUrl: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
}

const EMPTY_FORM_STATE: VenueFormState = {
  name: '',
  capacity: '',
  description: '',
  contactInfo: '',
  floorPlanUrl: '',
  streetAddress: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  latitude: '',
  longitude: '',
};

function buildFormState(venue: Venue): VenueFormState {
  return {
    name: venue.name,
    capacity:
      typeof venue.capacity === 'number' && venue.capacity > 0
        ? String(venue.capacity)
        : '',
    description: venue.description ?? '',
    contactInfo: venue.contact_info ?? '',
    floorPlanUrl: venue.floor_plan_url ?? '',
    streetAddress: venue.address?.street_address ?? '',
    city: venue.address?.city ?? '',
    state: venue.address?.state ?? '',
    postalCode: venue.address?.postal_code ?? '',
    country: venue.address?.country ?? '',
    latitude:
      typeof venue.address?.latitude === 'number'
        ? String(venue.address.latitude)
        : '',
    longitude:
      typeof venue.address?.longitude === 'number'
        ? String(venue.address.longitude)
        : '',
  };
}

function parseOptionalNumber(
  rawValue: string,
  fieldName: string,
): number | undefined {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return undefined;
  }

  const value = Number(trimmed);

  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return value;
}

export function VenueDialog({
  open,
  onOpenChange,
  venueId,
  onSuccess,
}: VenueDialogProps) {
  const { toast } = useToast();
  const isEditing = Boolean(venueId);
  const { data: venue, isLoading: isVenueLoading } = useVenue(venueId);
  const createVenueMutation = useCreateVenue();
  const updateVenueMutation = useUpdateVenue();
  const [form, setForm] = useState<VenueFormState>(EMPTY_FORM_STATE);

  useEffect(() => {
    if (!open) {
      if (!isEditing) {
        setForm(EMPTY_FORM_STATE);
      }
      return;
    }

    if (isEditing && venue) {
      setForm(buildFormState(venue));
      return;
    }

    if (!isEditing) {
      setForm(EMPTY_FORM_STATE);
    }
  }, [isEditing, open, venue]);

  const isPending =
    createVenueMutation.isPending || updateVenueMutation.isPending;

  const addressSummary = useMemo(() => {
    if (!venue?.address) {
      return 'No saved address yet';
    }

    return [
      venue.address.street_address,
      venue.address.city,
      venue.address.state,
      venue.address.country,
    ]
      .filter(Boolean)
      .join(', ');
  }, [venue]);

  const submitVenue = async (inputEvent: FormEvent<HTMLFormElement>) => {
    inputEvent.preventDefault();

    const name = form.name.trim();

    if (!name) {
      toast({
        title: 'Name required',
        description: 'Give the venue a clear name before saving it.',
        variant: 'destructive',
      });
      return;
    }

    let capacity: number | undefined;

    if (form.capacity.trim()) {
      const parsedCapacity = Number(form.capacity);

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

    const floorPlanUrl = trimToUndefined(form.floorPlanUrl);

    if (floorPlanUrl && !isValidUrl(floorPlanUrl)) {
      toast({
        title: 'Invalid floor plan URL',
        description: 'Use a full URL starting with http:// or https://.',
        variant: 'destructive',
      });
      return;
    }

    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      latitude = parseOptionalNumber(form.latitude, 'Latitude');
      longitude = parseOptionalNumber(form.longitude, 'Longitude');
    } catch (error) {
      toast({
        title: 'Invalid coordinates',
        description: error instanceof Error ? error.message : 'Coordinates are invalid.',
        variant: 'destructive',
      });
      return;
    }

    const address = {
      street_address: trimToUndefined(form.streetAddress),
      city: trimToUndefined(form.city),
      state: trimToUndefined(form.state),
      postal_code: trimToUndefined(form.postalCode),
      country: trimToUndefined(form.country),
      latitude,
      longitude,
    };

    const hasAddress = Object.values(address).some((value) => value !== undefined);

    const payload: CreateVenueRequest | UpdateVenueRequest = {
      name,
      capacity,
      description: trimToUndefined(form.description),
      contact_info: trimToUndefined(form.contactInfo),
      floor_plan_url: floorPlanUrl,
      address: hasAddress ? address : undefined,
    };

    try {
      const savedVenue = isEditing && venueId
        ? await updateVenueMutation.mutateAsync({
            venueId,
            payload: payload as UpdateVenueRequest,
          })
        : await createVenueMutation.mutateAsync(payload as CreateVenueRequest);

      toast({
        title: isEditing ? 'Venue updated' : 'Venue created',
        description: `${savedVenue.name} is ready for event assignment.`,
      });

      onSuccess?.(savedVenue);
      onOpenChange(false);
      if (!isEditing) {
        setForm(EMPTY_FORM_STATE);
      }
    } catch (error) {
      toast({
        title: isEditing ? 'Update failed' : 'Create failed',
        description:
          error instanceof Error
            ? error.message
            : 'The venue could not be saved right now.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/[0.08] bg-card/95 text-foreground backdrop-blur-xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Venue' : 'Add Venue'}</DialogTitle>
          <DialogDescription>
            Keep venue names, capacity, and address details current so event setup
            stays fast and accurate.
          </DialogDescription>
        </DialogHeader>

        {isEditing && isVenueLoading && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-muted-foreground">
            Loading venue details...
          </div>
        )}

        <form className="space-y-6" onSubmit={submitVenue}>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="venue-name">Venue Name</Label>
                <Input
                  id="venue-name"
                  value={form.name}
                  onChange={(inputEvent) =>
                    setForm((current) => ({
                      ...current,
                      name: inputEvent.target.value,
                    }))
                  }
                  className="border-white/[0.08] bg-white/[0.03]"
                  placeholder="Coconut Live"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="venue-capacity">Capacity</Label>
                  <Input
                    id="venue-capacity"
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue-contact-info">Contact Info</Label>
                  <Input
                    id="venue-contact-info"
                    value={form.contactInfo}
                    onChange={(inputEvent) =>
                      setForm((current) => ({
                        ...current,
                        contactInfo: inputEvent.target.value,
                      }))
                    }
                    className="border-white/[0.08] bg-white/[0.03]"
                    placeholder="+258 84 123 4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue-description">Description</Label>
                <Textarea
                  id="venue-description"
                  value={form.description}
                  onChange={(inputEvent) =>
                    setForm((current) => ({
                      ...current,
                      description: inputEvent.target.value,
                    }))
                  }
                  className="min-h-24 border-white/[0.08] bg-white/[0.03]"
                  placeholder="What makes this venue operationally useful?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue-floor-plan">Floor Plan URL</Label>
                <Input
                  id="venue-floor-plan"
                  type="url"
                  value={form.floorPlanUrl}
                  onChange={(inputEvent) =>
                    setForm((current) => ({
                      ...current,
                      floorPlanUrl: inputEvent.target.value,
                    }))
                  }
                  className="border-white/[0.08] bg-white/[0.03]"
                  placeholder="https://..."
                />
              </div>
            </section>

            <aside className="space-y-4 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
              <div>
                <p className="data-label">Location</p>
                <p className="mt-2 text-sm text-muted-foreground">{addressSummary}</p>
              </div>

              {isEditing && venue && (
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="data-label">Assigned Events</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {venue.event_count}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Updating the venue refreshes linked event and dashboard labels.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-white/[0.08] bg-background/60 p-4 text-sm text-muted-foreground">
                <div className="inline-flex items-center gap-2 font-medium text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  Address scope
                </div>
                <p className="mt-2">
                  Street, city, country, and coordinates are all optional, but
                  adding them improves venue search and operator context.
                </p>
              </div>
            </aside>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venue-street-address">Street Address</Label>
              <Input
                id="venue-street-address"
                value={form.streetAddress}
                onChange={(inputEvent) =>
                  setForm((current) => ({
                    ...current,
                    streetAddress: inputEvent.target.value,
                  }))
                }
                className="border-white/[0.08] bg-white/[0.03]"
                placeholder="Av. Julius Nyerere 1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue-city">City</Label>
              <Input
                id="venue-city"
                value={form.city}
                onChange={(inputEvent) =>
                  setForm((current) => ({
                    ...current,
                    city: inputEvent.target.value,
                  }))
                }
                className="border-white/[0.08] bg-white/[0.03]"
                placeholder="Maputo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue-state">State / Province</Label>
              <Input
                id="venue-state"
                value={form.state}
                onChange={(inputEvent) =>
                  setForm((current) => ({
                    ...current,
                    state: inputEvent.target.value,
                  }))
                }
                className="border-white/[0.08] bg-white/[0.03]"
                placeholder="Maputo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue-postal-code">Postal Code</Label>
              <Input
                id="venue-postal-code"
                value={form.postalCode}
                onChange={(inputEvent) =>
                  setForm((current) => ({
                    ...current,
                    postalCode: inputEvent.target.value,
                  }))
                }
                className="border-white/[0.08] bg-white/[0.03]"
                placeholder="1100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue-country">Country</Label>
              <Input
                id="venue-country"
                value={form.country}
                onChange={(inputEvent) =>
                  setForm((current) => ({
                    ...current,
                    country: inputEvent.target.value,
                  }))
                }
                className="border-white/[0.08] bg-white/[0.03]"
                placeholder="Mozambique"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue-latitude">Latitude</Label>
                <Input
                  id="venue-latitude"
                  inputMode="decimal"
                  value={form.latitude}
                  onChange={(inputEvent) =>
                    setForm((current) => ({
                      ...current,
                      latitude: inputEvent.target.value,
                    }))
                  }
                  className="border-white/[0.08] bg-white/[0.03]"
                  placeholder="-25.9692"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue-longitude">Longitude</Label>
                <Input
                  id="venue-longitude"
                  inputMode="decimal"
                  value={form.longitude}
                  onChange={(inputEvent) =>
                    setForm((current) => ({
                      ...current,
                      longitude: inputEvent.target.value,
                    }))
                  }
                  className="border-white/[0.08] bg-white/[0.03]"
                  placeholder="32.5732"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/[0.08] px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending || (isEditing && isVenueLoading)}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditing ? 'Save Venue' : 'Create Venue'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
