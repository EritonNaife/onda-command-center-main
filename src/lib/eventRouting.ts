export interface EventRouteOptions {
  status?: string | null;
  isLive?: boolean;
}

export function isLiveEventStatus(status?: string | null): boolean {
  return (status ?? '').trim().toLowerCase() === 'active';
}

export function getEventRoute(
  eventId: string,
  options: EventRouteOptions = {},
): string {
  if (options.isLive || isLiveEventStatus(options.status)) {
    return `/events/${eventId}`;
  }

  return `/events/${eventId}/detail`;
}
