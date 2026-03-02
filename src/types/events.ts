export type EventStatusFilter = 'upcoming' | 'active' | 'past' | 'cancelled';

export interface EventTicketType {
  id: string;
  name: string;
  price: number;
  quantity_sold: number;
  quantity_remaining: number;
}

export interface EventListItem {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  venue_id: string;
  capacity: number;
  status?: string;
  ticket_types: EventTicketType[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EventListResponse {
  data: EventListItem[];
  meta: PaginationMeta;
}

export interface EventCheckInBreakdown {
  type: string;
  count: number;
}

export interface EventCheckInStats {
  total_scanned: number;
  by_type: EventCheckInBreakdown[];
}

export interface EventRevenueSummary {
  actual_mzn: number;
  projected_mzn: number;
  average_ticket_price: number;
  tickets_sold: number;
  refunds: number;
  fees: number;
}

export interface EventDetail extends EventListItem {
  check_in_stats?: EventCheckInStats;
  revenue?: EventRevenueSummary;
}

export interface UpdateEventRequest {
  name?: string;
  start_time?: string;
  end_time?: string;
  capacity?: number;
}
