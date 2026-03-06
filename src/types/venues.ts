import { PaginationMeta } from '@/types/events';

export interface VenueAddress {
  id?: string;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Venue {
  id: string;
  name: string;
  capacity?: number | null;
  description?: string | null;
  contact_info?: string | null;
  amenities?: Record<string, unknown> | null;
  floor_plan_url?: string | null;
  address?: VenueAddress | null;
  event_count: number;
}

export interface VenueListResponse {
  data: Venue[];
  meta: PaginationMeta;
}

export interface VenueAddressRequest {
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateVenueRequest {
  name: string;
  capacity?: number;
  description?: string;
  contact_info?: string;
  amenities?: Record<string, unknown>;
  floor_plan_url?: string;
  address?: VenueAddressRequest;
}

export type UpdateVenueRequest = Partial<CreateVenueRequest>;
