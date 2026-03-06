import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import {
  CreateVenueRequest,
  UpdateVenueRequest,
  Venue,
  VenueListResponse,
} from '@/types/venues';

interface UseVenuesOptions {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
}

function buildVenuesPath({ page, limit, search, city }: UseVenuesOptions): string {
  const params = new URLSearchParams();

  if (typeof page === 'number') {
    params.set('page', String(page));
  }

  if (typeof limit === 'number') {
    params.set('limit', String(limit));
  }

  if (search) {
    params.set('search', search);
  }

  if (city) {
    params.set('city', city);
  }

  const query = params.toString();
  return query ? `/venues?${query}` : '/venues';
}

function useInvalidateVenueQueries() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['venues'] }),
      queryClient.invalidateQueries({ queryKey: ['venue'] }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
      queryClient.invalidateQueries({ queryKey: ['event-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['org-dashboard'] }),
    ]);
  };
}

export function useVenues(options: UseVenuesOptions = {}) {
  const org = useAuthStore((state) => state.org);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  return useQuery<VenueListResponse>({
    queryKey: [
      'venues',
      org?.id,
      page,
      limit,
      options.search ?? '',
      options.city ?? '',
    ],
    queryFn: () =>
      apiGet<VenueListResponse>(
        buildVenuesPath({
          page,
          limit,
          search: options.search,
          city: options.city,
        }),
      ),
    enabled: isAuthenticated && !!org,
    staleTime: 30_000,
  });
}

export function useVenue(venueId?: string) {
  const org = useAuthStore((state) => state.org);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<Venue>({
    queryKey: ['venue', org?.id, venueId],
    queryFn: () => apiGet<Venue>(`/venues/${venueId}`),
    enabled: isAuthenticated && !!org && !!venueId,
    staleTime: 60_000,
  });
}

export function useCreateVenue() {
  const invalidate = useInvalidateVenueQueries();

  return useMutation({
    mutationFn: (payload: CreateVenueRequest) =>
      apiPost<Venue, CreateVenueRequest>('/venues', payload),
    onSuccess: invalidate,
  });
}

export function useUpdateVenue() {
  const invalidate = useInvalidateVenueQueries();

  return useMutation({
    mutationFn: ({
      venueId,
      payload,
    }: {
      venueId: string;
      payload: UpdateVenueRequest;
    }) => apiPatch<Venue, UpdateVenueRequest>(`/venues/${venueId}`, payload),
    onSuccess: invalidate,
  });
}
