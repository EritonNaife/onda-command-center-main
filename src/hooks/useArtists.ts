import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import {
  AddToLineupRequest,
  Artist,
  CreateArtistRequest,
  EventLineupEntry,
  UpdateArtistRequest,
} from '@/types/artists';

function buildArtistsPath(search?: string): string {
  if (!search) {
    return '/artists';
  }

  const params = new URLSearchParams({ search });
  return `/artists?${params.toString()}`;
}

function useInvalidateArtistQueries() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['artists'] }),
      queryClient.invalidateQueries({ queryKey: ['artist'] }),
      queryClient.invalidateQueries({ queryKey: ['event-lineup'] }),
      queryClient.invalidateQueries({ queryKey: ['event-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
      queryClient.invalidateQueries({ queryKey: ['org-dashboard'] }),
    ]);
  };
}

export function useArtists(search?: string) {
  const org = useAuthStore((state) => state.org);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<Artist[]>({
    queryKey: ['artists', org?.id, search ?? ''],
    queryFn: () => apiGet<Artist[]>(buildArtistsPath(search)),
    enabled: isAuthenticated && !!org,
    staleTime: 30_000,
  });
}

export function useArtist(artistId?: string) {
  const org = useAuthStore((state) => state.org);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<Artist>({
    queryKey: ['artist', org?.id, artistId],
    queryFn: () => apiGet<Artist>(`/artists/${artistId}`),
    enabled: isAuthenticated && !!org && !!artistId,
    staleTime: 60_000,
  });
}

export function useEventLineup(eventId?: string) {
  const org = useAuthStore((state) => state.org);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<EventLineupEntry[]>({
    queryKey: ['event-lineup', org?.id, eventId],
    queryFn: () => apiGet<EventLineupEntry[]>(`/events/${eventId}/lineup`),
    enabled: isAuthenticated && !!org && !!eventId,
    staleTime: 30_000,
  });
}

export function useCreateArtist() {
  const invalidate = useInvalidateArtistQueries();

  return useMutation({
    mutationFn: (payload: CreateArtistRequest) =>
      apiPost<Artist, CreateArtistRequest>('/artists', payload),
    onSuccess: invalidate,
  });
}

export function useUpdateArtist() {
  const invalidate = useInvalidateArtistQueries();

  return useMutation({
    mutationFn: ({
      artistId,
      payload,
    }: {
      artistId: string;
      payload: UpdateArtistRequest;
    }) => apiPatch<Artist, UpdateArtistRequest>(`/artists/${artistId}`, payload),
    onSuccess: invalidate,
  });
}

export function useClaimArtist() {
  const invalidate = useInvalidateArtistQueries();

  return useMutation({
    mutationFn: (artistId: string) => apiPost<Artist, undefined>(`/artists/${artistId}/claim`, undefined),
    onSuccess: invalidate,
  });
}

export function useReleaseArtist() {
  const invalidate = useInvalidateArtistQueries();

  return useMutation({
    mutationFn: (artistId: string) => apiDelete<Artist>(`/artists/${artistId}/claim`),
    onSuccess: invalidate,
  });
}

export function useAddToLineup(eventId?: string) {
  const invalidate = useInvalidateArtistQueries();

  return useMutation({
    mutationFn: (payload: AddToLineupRequest) =>
      apiPost<EventLineupEntry, AddToLineupRequest>(
        `/events/${eventId}/lineup`,
        payload,
      ),
    onSuccess: invalidate,
  });
}

export function useRemoveFromLineup(eventId?: string) {
  const invalidate = useInvalidateArtistQueries();

  return useMutation({
    mutationFn: (artistId: string) =>
      apiDelete(`/events/${eventId}/lineup/${artistId}`),
    onSuccess: invalidate,
  });
}
