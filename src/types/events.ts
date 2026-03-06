export type EventStatusFilter = 'upcoming' | 'active' | 'past' | 'cancelled';
export type EventPublicationStatus = 'draft' | 'published' | 'cancelled';

export interface EventTicketType {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  is_vip?: boolean | null;
  vip_tier?: string | null;
  sale_start_date?: string | null;
  sale_end_date?: string | null;
  is_available?: boolean;
  is_sold_out?: boolean;
  quantity: number;
  quantity_sold: number;
  quantity_remaining: number;
}

export interface EventListItem {
  id: string;
  name: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  venue_id?: string | null;
  venue_name?: string | null;
  capacity: number;
  timezone?: string | null;
  status?: string;
  publication_status?: EventPublicationStatus | null;
  cover_image_url?: string | null;
  tickets_sold: number;
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

export interface CreateEventRequest {
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  venue_id?: string;
  capacity?: number;
  timezone?: string;
  status?: EventPublicationStatus;
  cover_image_url?: string;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  venue_id?: string;
  capacity?: number;
  timezone?: string;
  status?: EventPublicationStatus;
  cover_image_url?: string;
}

export interface CreateTicketTypeRequest {
  name: string;
  price: number;
  quantity: number;
  description?: string;
  is_vip?: boolean;
  sale_start_date?: string;
  sale_end_date?: string;
}

export interface UpdateTicketTypeRequest {
  name?: string;
  price?: number;
  quantity?: number;
  description?: string;
  is_vip?: boolean;
  sale_start_date?: string;
  sale_end_date?: string;
}
