import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { EventListResponse, EventStatusFilter } from '@/types/events';

interface UseEventsOptions {
  page?: number;
  limit?: number;
  status?: EventStatusFilter;
}

function buildEventsPath({ page, limit, status }: UseEventsOptions): string {
  const params = new URLSearchParams();

  if (typeof page === 'number') {
    params.set('page', String(page));
  }

  if (typeof limit === 'number') {
    params.set('limit', String(limit));
  }

  if (status) {
    params.set('status', status);
  }

  const query = params.toString();
  return query ? `/events?${query}` : '/events';
}

export function useEvents(options: UseEventsOptions = {}) {
  const org = useAuthStore((s) => s.org);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const page = options.page ?? 1;
  const limit = options.limit ?? 12;
  const status = options.status;

  return useQuery<EventListResponse>({
    queryKey: ['events', org?.id, page, limit, status ?? 'all'],
    queryFn: () =>
      apiGet<EventListResponse>(
        buildEventsPath({
          page,
          limit,
          status,
        }),
      ),
    enabled: isAuthenticated && !!org,
    staleTime: 30_000,
  });
}
