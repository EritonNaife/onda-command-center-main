export interface Artist {
  id: string;
  name: string;
  genre?: string | null;
  bio?: string | null;
  image_url?: string | null;
  social_links?: Record<string, unknown> | null;
  email?: string | null;
  created_at?: string | null;
  created_by_org_id?: string | null;
  managed_by_org_id?: string | null;
  is_verified?: boolean;
}

export interface EventLineupEntry {
  artist: Artist;
  performance_order?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  is_headliner?: boolean | null;
  stage?: string | null;
}

export interface CreateArtistRequest {
  name: string;
  genre?: string;
  bio?: string;
  image_url?: string;
  social_links?: Record<string, unknown>;
  email?: string;
}

export type UpdateArtistRequest = Partial<CreateArtistRequest>;

export interface AddToLineupRequest {
  artist_id: string;
  performance_order?: number;
  start_time?: string;
  end_time?: string;
  is_headliner?: boolean;
  stage?: string;
}
