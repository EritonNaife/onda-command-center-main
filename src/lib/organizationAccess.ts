import { OrganizationMemberRole } from '@/types/settings';

const MANAGEMENT_ROLES: OrganizationMemberRole[] = ['admin', 'member'];

export function canManageOrganizationOperations(
  role?: string | null,
): boolean {
  return MANAGEMENT_ROLES.includes(role as OrganizationMemberRole);
}

