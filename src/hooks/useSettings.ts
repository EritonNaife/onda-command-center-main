import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import {
  InviteMemberRequest,
  InviteMemberResponse,
  OrganizationMembersResponse,
  OrganizationPermissions,
  OrganizationProfile,
  UpdateMemberPermissionsRequest,
  UpdateMemberRoleRequest,
  UpdateOrgProfileRequest,
} from '@/types/settings';

interface UseOrgMembersOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

interface UseMemberPermissionsOptions {
  enabled?: boolean;
}

function buildMembersPath({ page, limit }: UseOrgMembersOptions): string {
  const params = new URLSearchParams();

  if (typeof page === 'number') {
    params.set('page', String(page));
  }

  if (typeof limit === 'number') {
    params.set('limit', String(limit));
  }

  const query = params.toString();
  return query ? `/settings/members?${query}` : '/settings/members';
}

function useInvalidateSettingsQueries() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['settings'] });
  };
}

export function useOrgProfile() {
  const org = useAuthStore((state) => state.org);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<OrganizationProfile>({
    queryKey: ['settings', 'profile', org?.id],
    queryFn: () => apiGet<OrganizationProfile>('/settings/profile'),
    enabled: isAuthenticated && !!org,
    staleTime: 30_000,
  });
}

export function useUpdateOrgProfile() {
  const invalidate = useInvalidateSettingsQueries();

  return useMutation({
    mutationFn: (payload: UpdateOrgProfileRequest) =>
      apiPatch<OrganizationProfile, UpdateOrgProfileRequest>(
        '/settings/profile',
        payload,
      ),
    onSuccess: invalidate,
  });
}

export function useOrgMembers(options: UseOrgMembersOptions = {}) {
  const org = useAuthStore((state) => state.org);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;

  return useQuery<OrganizationMembersResponse>({
    queryKey: ['settings', 'members', org?.id, page, limit],
    queryFn: () =>
      apiGet<OrganizationMembersResponse>(
        buildMembersPath({
          page,
          limit,
        }),
      ),
    enabled: isAuthenticated && !!org && (options.enabled ?? true),
    staleTime: 15_000,
  });
}

export function useInviteMember() {
  const invalidate = useInvalidateSettingsQueries();

  return useMutation({
    mutationFn: (payload: InviteMemberRequest) =>
      apiPost<InviteMemberResponse, InviteMemberRequest>(
        '/settings/members/invite',
        payload,
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateMemberRole() {
  const invalidate = useInvalidateSettingsQueries();

  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: UpdateMemberRoleRequest;
    }) =>
      apiPatch(`/settings/members/${userId}/role`, payload),
    onSuccess: invalidate,
  });
}

export function useMyPermissions() {
  const org = useAuthStore((state) => state.org);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<OrganizationPermissions>({
    queryKey: ['settings', 'permissions', org?.id, 'me'],
    queryFn: () => apiGet<OrganizationPermissions>('/settings/permissions/me'),
    enabled: isAuthenticated && !!org,
    staleTime: 15_000,
  });
}

export function useMemberPermissions(
  userId?: string,
  options: UseMemberPermissionsOptions = {},
) {
  const org = useAuthStore((state) => state.org);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<OrganizationPermissions>({
    queryKey: ['settings', 'permissions', org?.id, userId],
    queryFn: () =>
      apiGet<OrganizationPermissions>(`/settings/members/${userId}/permissions`),
    enabled: isAuthenticated && !!org && !!userId && (options.enabled ?? true),
    staleTime: 15_000,
  });
}

export function useUpdateMemberPermissions() {
  const invalidate = useInvalidateSettingsQueries();

  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: UpdateMemberPermissionsRequest;
    }) =>
      apiPut<OrganizationPermissions, UpdateMemberPermissionsRequest>(
        `/settings/members/${userId}/permissions`,
        payload,
      ),
    onSuccess: invalidate,
  });
}

export function useRemoveMember() {
  const invalidate = useInvalidateSettingsQueries();

  return useMutation({
    mutationFn: (userId: string) =>
      apiDelete<void>(`/settings/members/${userId}`),
    onSuccess: invalidate,
  });
}
