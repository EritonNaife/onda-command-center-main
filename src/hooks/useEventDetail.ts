import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { EventDetail } from '@/types/events';

export function useEventDetail(eventId?: string) {
  const org = useAuthStore((s) => s.org);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<EventDetail>({
    queryKey: ['event-detail', org?.id, eventId],
    queryFn: () => apiGet<EventDetail>(`/events/${eventId}`),
    enabled: isAuthenticated && !!org && !!eventId,
    staleTime: 60_000,
  });
}
