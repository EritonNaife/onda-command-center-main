import { PaginationMeta } from '@/types/events';

export type OrganizationMemberRole =
  | 'admin'
  | 'member'
  | 'billing_contact'
  | 'viewer';

export interface OrganizationProfile {
  id: string;
  name: string;
  role: OrganizationMemberRole | string;
  description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OrganizationPermissions {
  organization_id: string;
  user_id: string;
  can_scan_checkin: boolean;
  can_see_financial_data: boolean;
  can_manage_events: boolean;
  can_manage_tickets: boolean;
  can_manage_venues: boolean;
  can_manage_menus: boolean;
  can_manage_members: boolean;
  can_send_broadcasts: boolean;
  can_manage_discounts: boolean;
  can_view_analytics: boolean;
  inherited: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export type OrganizationPermissionKey = keyof Omit<
  OrganizationPermissions,
  'organization_id' | 'user_id' | 'inherited' | 'created_at' | 'updated_at'
>;

export type OrganizationPermissionValues = Record<
  OrganizationPermissionKey,
  boolean
>;

export interface OrganizationMemberUser {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  phone_number?: string;
}

export interface OrganizationMember {
  user_id: string;
  organization_id: string;
  role: OrganizationMemberRole;
  added_at: string;
  user?: OrganizationMemberUser;
  permissions: OrganizationPermissions;
}

export interface OrganizationMembersResponse {
  data: OrganizationMember[];
  meta: PaginationMeta;
}

export interface UpdateOrgProfileRequest {
  description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
}

export interface InviteMemberRequest {
  email: string;
  role: OrganizationMemberRole;
}

export interface InviteMemberResponse {
  message: string;
  email: string;
  organization_id: string;
  role: OrganizationMemberRole;
  expires_in: string;
}

export interface UpdateMemberRoleRequest {
  role: OrganizationMemberRole;
}

export type UpdateMemberPermissionsRequest = Partial<
  OrganizationPermissionValues
>;
