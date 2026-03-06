import {
  OrganizationMember,
  OrganizationMemberRole,
  OrganizationPermissionKey,
  OrganizationPermissionValues,
  OrganizationPermissions,
  UpdateMemberPermissionsRequest,
} from '@/types/settings';

export const ORGANIZATION_ROLE_OPTIONS: Array<{
  value: OrganizationMemberRole;
  label: string;
  description: string;
}> = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full organization control, including members and permissions.',
  },
  {
    value: 'member',
    label: 'Member',
    description: 'Operational access for event execution and ticket management.',
  },
  {
    value: 'billing_contact',
    label: 'Billing Contact',
    description: 'Finance-focused access without day-to-day event controls.',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only visibility into organization activity and analytics.',
  },
];

export const PERMISSION_FIELDS: Array<{
  key: OrganizationPermissionKey;
  label: string;
  description: string;
}> = [
  {
    key: 'can_scan_checkin',
    label: 'Can scan check-in',
    description: 'Scan guests at entry points and operate access-control flows.',
  },
  {
    key: 'can_see_financial_data',
    label: 'Can see financial data',
    description: 'Review revenue, fees, and other finance-sensitive numbers.',
  },
  {
    key: 'can_manage_events',
    label: 'Can manage events',
    description: 'Create, edit, publish, and cancel organization events.',
  },
  {
    key: 'can_manage_tickets',
    label: 'Can manage tickets',
    description: 'Add or update ticket types, inventory, and sale windows.',
  },
  {
    key: 'can_manage_venues',
    label: 'Can manage venues',
    description: 'Create and update venue records used across the organization.',
  },
  {
    key: 'can_manage_menus',
    label: 'Can manage menus',
    description: 'Control food, beverage, or service menus tied to events.',
  },
  {
    key: 'can_manage_members',
    label: 'Can manage members',
    description: 'Invite teammates, adjust roles, and manage org access.',
  },
  {
    key: 'can_send_broadcasts',
    label: 'Can send broadcasts',
    description: 'Send organizational or event communications to audiences.',
  },
  {
    key: 'can_manage_discounts',
    label: 'Can manage discounts',
    description: 'Create and maintain promotional pricing or discount codes.',
  },
  {
    key: 'can_view_analytics',
    label: 'Can view analytics',
    description: 'Access audience, performance, and operational reporting.',
  },
];

export const EMPTY_PERMISSION_VALUES: OrganizationPermissionValues = {
  can_scan_checkin: false,
  can_see_financial_data: false,
  can_manage_events: false,
  can_manage_tickets: false,
  can_manage_venues: false,
  can_manage_menus: false,
  can_manage_members: false,
  can_send_broadcasts: false,
  can_manage_discounts: false,
  can_view_analytics: false,
};

export function getRoleLabel(role: string): string {
  return (
    ORGANIZATION_ROLE_OPTIONS.find((option) => option.value === role)?.label ??
    role.replace(/_/g, ' ')
  );
}

export function getRoleBadgeClassName(role: string): string {
  switch (role) {
    case 'admin':
      return 'border-primary/25 bg-primary/10 text-primary';
    case 'member':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
    case 'billing_contact':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-200';
    case 'viewer':
      return 'border-white/[0.08] bg-white/[0.04] text-muted-foreground';
    default:
      return 'border-white/[0.08] bg-white/[0.04] text-muted-foreground';
  }
}

export function getMemberDisplayName(member: OrganizationMember): string {
  const fullName = member.user?.full_name?.trim();
  const email = member.user?.email?.trim();
  const username = member.user?.username?.trim();

  if (fullName) {
    return fullName;
  }

  if (email) {
    return email;
  }

  if (username) {
    return username;
  }

  return `Member ${member.user_id.slice(0, 8)}`;
}

export function getMemberContactLine(member: OrganizationMember): string {
  const segments = [
    member.user?.email?.trim(),
    member.user?.phone_number?.trim(),
    member.user?.username?.trim(),
  ].filter(Boolean);

  return segments.length > 0 ? segments.join(' • ') : 'Contact details pending';
}

export function extractPermissionValues(
  permissions?: Partial<OrganizationPermissions> | null,
): OrganizationPermissionValues {
  return PERMISSION_FIELDS.reduce<OrganizationPermissionValues>(
    (accumulator, field) => ({
      ...accumulator,
      [field.key]: Boolean(permissions?.[field.key]),
    }),
    EMPTY_PERMISSION_VALUES,
  );
}

export function countEnabledPermissions(
  values?: Partial<OrganizationPermissionValues> | null,
): number {
  if (!values) {
    return 0;
  }

  return PERMISSION_FIELDS.reduce(
    (count, field) => count + (values[field.key] ? 1 : 0),
    0,
  );
}

export function toPermissionsPayload(
  values: OrganizationPermissionValues,
): UpdateMemberPermissionsRequest {
  return PERMISSION_FIELDS.reduce<UpdateMemberPermissionsRequest>(
    (payload, field) => ({
      ...payload,
      [field.key]: values[field.key],
    }),
    {},
  );
}
