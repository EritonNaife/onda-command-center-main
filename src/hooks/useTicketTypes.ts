import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import {
  CreateTicketTypeRequest,
  EventTicketType,
  UpdateTicketTypeRequest,
} from '@/types/events';

function useInvalidateTicketTypeQueries(eventId?: string) {
  const queryClient = useQueryClient();
  const org = useAuthStore((state) => state.org);

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['event-detail', org?.id, eventId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['ticket-types', org?.id, eventId],
      }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
      queryClient.invalidateQueries({ queryKey: ['org-dashboard'] }),
    ]);
  };
}

export function useTicketTypes(eventId?: string) {
  const org = useAuthStore((state) => state.org);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<EventTicketType[]>({
    queryKey: ['ticket-types', org?.id, eventId],
    queryFn: () => apiGet<EventTicketType[]>(`/events/${eventId}/ticket-types`),
    enabled: isAuthenticated && !!org && !!eventId,
    staleTime: 30_000,
  });
}

export function useCreateTicketType(eventId?: string) {
  const invalidate = useInvalidateTicketTypeQueries(eventId);

  return useMutation({
    mutationFn: (payload: CreateTicketTypeRequest) =>
      apiPost<EventTicketType, CreateTicketTypeRequest>(
        `/events/${eventId}/ticket-types`,
        payload,
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateTicketType(eventId?: string) {
  const invalidate = useInvalidateTicketTypeQueries(eventId);

  return useMutation({
    mutationFn: ({
      ticketTypeId,
      payload,
    }: {
      ticketTypeId: string;
      payload: UpdateTicketTypeRequest;
    }) =>
      apiPatch<EventTicketType, UpdateTicketTypeRequest>(
        `/events/${eventId}/ticket-types/${ticketTypeId}`,
        payload,
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteTicketType(eventId?: string) {
  const invalidate = useInvalidateTicketTypeQueries(eventId);

  return useMutation({
    mutationFn: (ticketTypeId: string) =>
      apiDelete(`/events/${eventId}/ticket-types/${ticketTypeId}`),
    onSuccess: invalidate,
  });
}
