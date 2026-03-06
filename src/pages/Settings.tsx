import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  ExternalLink,
  Globe,
  Loader2,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users2,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { InviteMemberDialog } from '@/components/settings/InviteMemberDialog';
import { PermissionsDialog } from '@/components/settings/PermissionsDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  useMyPermissions,
  useOrgMembers,
  useOrgProfile,
  useRemoveMember,
  useUpdateMemberRole,
  useUpdateOrgProfile,
} from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { isValidUrl } from '@/lib/eventManagement';
import {
  countEnabledPermissions,
  extractPermissionValues,
  getMemberContactLine,
  getMemberDisplayName,
  getRoleBadgeClassName,
  getRoleLabel,
  ORGANIZATION_ROLE_OPTIONS,
  PERMISSION_FIELDS,
} from '@/lib/settings';
import { useAuthStore } from '@/stores/authStore';
import { OrganizationMember, OrganizationMemberRole } from '@/types/settings';

interface ProfileFormState {
  description: string;
  logoUrl: string;
  websiteUrl: string;
}

const INITIAL_PROFILE_FORM: ProfileFormState = {
  description: '',
  logoUrl: '',
  websiteUrl: '',
};

function formatTimestamp(value?: string | null, fallback = 'Not recorded yet'): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getOrganizationInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function PermissionsOverview({
  title,
  description,
  inherited,
  enabledCount,
  permissions,
}: {
  title: string;
  description: string;
  inherited?: boolean;
  enabledCount: number;
  permissions?: ReturnType<typeof extractPermissionValues>;
}) {
  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-white/[0.08] bg-white/[0.04] text-foreground">
            {enabledCount} of 10 enabled
          </Badge>
          {typeof inherited === 'boolean' && (
            <Badge
              className={
                inherited
                  ? 'border-white/[0.08] bg-white/[0.04] text-muted-foreground'
                  : 'border-primary/20 bg-primary/10 text-primary'
              }
            >
              {inherited ? 'Inherited from role' : 'Custom override'}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PERMISSION_FIELDS.map((field) => {
          const isEnabled = Boolean(permissions?.[field.key]);

          return (
            <div
              key={field.key}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  {field.label}
                </p>
                <Badge
                  className={
                    isEnabled
                      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/[0.08] bg-white/[0.04] text-muted-foreground'
                  }
                >
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {field.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const Settings = () => {
  const { toast } = useToast();
  const org = useAuthStore((state) => state.org);
  const user = useAuthStore((state) => state.user);
  const isAdmin = org?.role === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'profile' : 'access');
  const [profileForm, setProfileForm] = useState<ProfileFormState>(
    INITIAL_PROFILE_FORM,
  );
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [permissionsMember, setPermissionsMember] =
    useState<OrganizationMember | null>(null);
  const [memberToRemove, setMemberToRemove] =
    useState<OrganizationMember | null>(null);
  const [pendingRoleUserId, setPendingRoleUserId] = useState<string | null>(
    null,
  );
  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
  } = useOrgProfile();
  const {
    data: membersResponse,
    isLoading: isMembersLoading,
    isError: isMembersError,
    error: membersError,
  } = useOrgMembers({
    page: 1,
    limit: 50,
    enabled: isAdmin,
  });
  const {
    data: myPermissions,
    isLoading: isMyPermissionsLoading,
    isError: isMyPermissionsError,
    error: myPermissionsError,
  } = useMyPermissions();
  const updateOrgProfileMutation = useUpdateOrgProfile();
  const updateMemberRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveMember();

  useEffect(() => {
    if (profile) {
      setProfileForm({
        description: profile.description ?? '',
        logoUrl: profile.logo_url ?? '',
        websiteUrl: profile.website_url ?? '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!isAdmin && activeTab === 'team') {
      setActiveTab('access');
    }
  }, [activeTab, isAdmin]);

  const members = membersResponse?.data ?? [];
  const adminCount =
    membersResponse?.data.filter((member) => member.role === 'admin').length ??
    0;
  const customPermissionCount =
    membersResponse?.data.filter((member) => !member.permissions.inherited)
      .length ?? 0;
  const myPermissionValues = extractPermissionValues(myPermissions);
  const myEnabledCount = countEnabledPermissions(myPermissionValues);
  const profilePreviewLogo =
    profileForm.logoUrl.trim() && isValidUrl(profileForm.logoUrl.trim())
      ? profileForm.logoUrl.trim()
      : null;

  const saveProfile = async (inputEvent: FormEvent<HTMLFormElement>) => {
    inputEvent.preventDefault();

    if (!isAdmin) {
      return;
    }

    const trimmedLogoUrl = profileForm.logoUrl.trim();
    const trimmedWebsiteUrl = profileForm.websiteUrl.trim();

    if (trimmedLogoUrl && !isValidUrl(trimmedLogoUrl)) {
      toast({
        title: 'Invalid logo URL',
        description: 'Use a full http:// or https:// URL for the organization logo.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedWebsiteUrl && !isValidUrl(trimmedWebsiteUrl)) {
      toast({
        title: 'Invalid website URL',
        description: 'Use a full http:// or https:// URL for the website.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateOrgProfileMutation.mutateAsync({
        description: profileForm.description.trim() || null,
        logo_url: trimmedLogoUrl || null,
        website_url: trimmedWebsiteUrl || null,
      });

      toast({
        title: 'Organization profile updated',
        description: 'Settings changes are live for everyone in this organization.',
      });
    } catch (error) {
      toast({
        title: 'Profile save failed',
        description:
          error instanceof Error
            ? error.message
            : 'The organization profile could not be updated.',
        variant: 'destructive',
      });
    }
  };

  const changeMemberRole = async (
    member: OrganizationMember,
    role: OrganizationMemberRole,
  ) => {
    if (member.role === role) {
      return;
    }

    setPendingRoleUserId(member.user_id);

    try {
      await updateMemberRoleMutation.mutateAsync({
        userId: member.user_id,
        payload: { role },
      });

      toast({
        title: 'Role updated',
        description:
          member.user_id === user?.id
            ? 'Your new role will fully apply on the next login.'
            : `${getMemberDisplayName(member)} is now ${getRoleLabel(role)}.`,
      });
    } catch (error) {
      toast({
        title: 'Role update failed',
        description:
          error instanceof Error
            ? error.message
            : 'The member role could not be updated.',
        variant: 'destructive',
      });
    } finally {
      setPendingRoleUserId(null);
    }
  };

  const removeMember = async () => {
    if (!memberToRemove) {
      return;
    }

    try {
      await removeMemberMutation.mutateAsync(memberToRemove.user_id);
      toast({
        title: 'Member removed',
        description: `${getMemberDisplayName(memberToRemove)} no longer has access to this organization.`,
      });
      setMemberToRemove(null);
    } catch (error) {
      toast({
        title: 'Member removal failed',
        description:
          error instanceof Error
            ? error.message
            : 'The member could not be removed.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthGuard>
      <AppShell>
        <motion.div
          className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="space-y-2">
            <div className="glass-pill text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Organization Controls
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Settings
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Manage the organization profile, teammate access, and the exact
                permissions each operator carries into the dashboard.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="glass-pill text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {getRoleLabel(org?.role ?? profile?.role ?? 'member')}
            </span>
            {isAdmin ? (
              <>
                <span className="glass-pill text-xs font-medium text-muted-foreground">
                  <Users2 className="h-3.5 w-3.5" />
                  {membersResponse?.meta.total ?? 0} team members
                </span>
                <span className="glass-pill text-xs font-medium text-muted-foreground">
                  <Settings2 className="h-3.5 w-3.5" />
                  {customPermissionCount} custom access overrides
                </span>
              </>
            ) : (
              <span className="glass-pill text-xs font-medium text-muted-foreground">
                <Settings2 className="h-3.5 w-3.5" />
                {myEnabledCount} active permissions
              </span>
            )}
          </div>
        </motion.div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="glass-panel h-auto w-full justify-start gap-2 rounded-2xl bg-white/[0.03] p-2 text-muted-foreground lg:w-auto">
            <TabsTrigger
              value="profile"
              className="rounded-full px-4 py-2 data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground"
            >
              Organization Profile
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="team"
                className="rounded-full px-4 py-2 data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground"
              >
                Team Members
              </TabsTrigger>
            )}
            <TabsTrigger
              value="access"
              className="rounded-full px-4 py-2 data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground"
            >
              My Access
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0">
            {isProfileLoading && (
              <div className="glass-panel p-6 text-sm text-muted-foreground">
                Loading organization profile...
              </div>
            )}

            {isProfileError && (
              <div className="glass-panel p-6 text-sm text-destructive">
                Unable to load organization profile:{' '}
                {profileError instanceof Error ? profileError.message : 'Unknown error'}
              </div>
            )}

            {profile && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <motion.form
                  onSubmit={saveProfile}
                  className="glass-panel p-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.15 }}
                >
                  <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">
                          Organization Profile
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Name stays read-only here. Description, logo, and website
                          are maintained in dashboard settings.
                        </p>
                      </div>
                    </div>

                    {!isAdmin && (
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-muted-foreground">
                        You can view the organization profile, but only admins can
                        update it.
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">Organization name</Label>
                      <Input
                        id="org-name"
                        value={profile.name}
                        readOnly
                        className="border-white/[0.08] bg-white/[0.04] text-muted-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="org-description">Description</Label>
                      <Textarea
                        id="org-description"
                        value={profileForm.description}
                        onChange={(inputEvent) =>
                          setProfileForm((currentForm) => ({
                            ...currentForm,
                            description: inputEvent.target.value,
                          }))
                        }
                        readOnly={!isAdmin}
                        className="min-h-[140px] border-white/[0.08] bg-white/[0.03]"
                        placeholder="Describe this organization for internal operators."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="org-logo-url">Logo URL</Label>
                      <Input
                        id="org-logo-url"
                        value={profileForm.logoUrl}
                        onChange={(inputEvent) =>
                          setProfileForm((currentForm) => ({
                            ...currentForm,
                            logoUrl: inputEvent.target.value,
                          }))
                        }
                        readOnly={!isAdmin}
                        className="border-white/[0.08] bg-white/[0.03]"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="org-website-url">Website URL</Label>
                      <Input
                        id="org-website-url"
                        value={profileForm.websiteUrl}
                        onChange={(inputEvent) =>
                          setProfileForm((currentForm) => ({
                            ...currentForm,
                            websiteUrl: inputEvent.target.value,
                          }))
                        }
                        readOnly={!isAdmin}
                        className="border-white/[0.08] bg-white/[0.03]"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="mt-6 flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateOrgProfileMutation.isPending}
                        className="rounded-full px-5"
                      >
                        {updateOrgProfileMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving profile...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </motion.form>

                <motion.div
                  className="glass-panel p-6"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2 }}
                >
                  <div className="flex items-start gap-4 border-b border-white/[0.06] pb-4">
                    {profilePreviewLogo ? (
                      <img
                        src={profilePreviewLogo}
                        alt={`${profile.name} logo`}
                        className="h-16 w-16 rounded-2xl border border-white/[0.08] object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-lg font-semibold text-primary">
                        {getOrganizationInitials(profile.name)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                        Preview
                      </p>
                      <h2 className="mt-2 truncate text-xl font-semibold text-foreground">
                        {profile.name}
                      </h2>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge className={getRoleBadgeClassName(profile.role)}>
                          {getRoleLabel(profile.role)}
                        </Badge>
                        <Badge className="border-white/[0.08] bg-white/[0.04] text-muted-foreground">
                          Org ID {profile.id.slice(0, 8)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Description
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {profileForm.description.trim() || 'No organization description saved yet.'}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Created
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {formatTimestamp(profile.created_at)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Last updated
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {formatTimestamp(profile.updated_at)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        Website
                      </div>
                      {profileForm.websiteUrl.trim() ? (
                        <a
                          href={profileForm.websiteUrl.trim()}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                          Visit website
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">
                          No website URL saved.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="team" className="mt-0">
              <motion.div
                className="glass-panel overflow-hidden"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
              >
                <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Team Members
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Manage member roles, explicit permission overrides, and
                      organization access for every operator.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-white/[0.08] bg-white/[0.04] text-muted-foreground">
                      {membersResponse?.meta.total ?? 0} total members
                    </Badge>
                    <Badge className="border-white/[0.08] bg-white/[0.04] text-muted-foreground">
                      {adminCount} admins
                    </Badge>
                    <Button
                      type="button"
                      onClick={() => setIsInviteOpen(true)}
                      className="rounded-full px-5"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite member
                    </Button>
                  </div>
                </div>

                {isMembersLoading && (
                  <div className="p-6 text-sm text-muted-foreground">
                    Loading team members...
                  </div>
                )}

                {isMembersError && (
                  <div className="p-6 text-sm text-destructive">
                    Unable to load members:{' '}
                    {membersError instanceof Error ? membersError.message : 'Unknown error'}
                  </div>
                )}

                {!isMembersLoading && !isMembersError && members.length === 0 && (
                  <div className="p-10 text-center">
                    <p className="text-sm font-medium text-foreground">
                      No members found yet.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Invite teammates to share event operations across the organization.
                    </p>
                  </div>
                )}

                {!isMembersLoading && !isMembersError && members.length > 0 && (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/[0.06] hover:bg-transparent">
                          <TableHead className="text-xs text-muted-foreground">
                            Member
                          </TableHead>
                          <TableHead className="text-xs text-muted-foreground">
                            Role
                          </TableHead>
                          <TableHead className="hidden text-xs text-muted-foreground md:table-cell">
                            Access
                          </TableHead>
                          <TableHead className="hidden text-xs text-muted-foreground xl:table-cell">
                            Joined
                          </TableHead>
                          <TableHead className="text-right text-xs text-muted-foreground">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => {
                          const permissionCount = countEnabledPermissions(
                            extractPermissionValues(member.permissions),
                          );
                          const isCurrentUser = member.user_id === user?.id;
                          const isRolePending =
                            pendingRoleUserId === member.user_id &&
                            updateMemberRoleMutation.isPending;

                          return (
                            <TableRow
                              key={member.user_id}
                              className="border-white/[0.05] hover:bg-white/[0.02]"
                            >
                              <TableCell className="align-top">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-foreground">
                                      {getMemberDisplayName(member)}
                                    </p>
                                    {isCurrentUser && (
                                      <Badge className="border-primary/20 bg-primary/10 text-primary">
                                        Current session
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {getMemberContactLine(member)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <Badge className={getRoleBadgeClassName(member.role)}>
                                  {getRoleLabel(member.role)}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden align-top md:table-cell">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-foreground">
                                    {permissionCount} enabled permissions
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {member.permissions.inherited
                                      ? 'Inherited from current role'
                                      : 'Custom override saved'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden align-top text-sm text-muted-foreground xl:table-cell">
                                {formatTimestamp(member.added_at, 'Join date unavailable')}
                              </TableCell>
                              <TableCell className="align-top">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  <Select
                                    value={member.role}
                                    onValueChange={(value) =>
                                      changeMemberRole(
                                        member,
                                        value as OrganizationMemberRole,
                                      )
                                    }
                                    disabled={isRolePending}
                                  >
                                    <SelectTrigger className="h-10 w-[170px] border-white/[0.08] bg-white/[0.03] text-left">
                                      <SelectValue placeholder="Change role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ORGANIZATION_ROLE_OPTIONS.map((option) => (
                                        <SelectItem
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPermissionsMember(member)}
                                    className="border-white/[0.08] bg-transparent"
                                  >
                                    <ShieldCheck className="h-4 w-4" />
                                    Permissions
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setMemberToRemove(member)}
                                    disabled={isCurrentUser}
                                    className="border-destructive/25 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <div className="border-t border-white/[0.06] px-5 py-4 text-sm text-muted-foreground">
                      Showing {members.length} of {membersResponse?.meta.total ?? members.length} members.
                    </div>
                  </>
                )}
              </motion.div>
            </TabsContent>
          )}

          <TabsContent value="access" className="mt-0 space-y-6">
            {isMyPermissionsLoading && (
              <div className="glass-panel p-6 text-sm text-muted-foreground">
                Loading your permissions...
              </div>
            )}

            {isMyPermissionsError && (
              <div className="glass-panel p-6 text-sm text-destructive">
                Unable to load your access profile:{' '}
                {myPermissionsError instanceof Error
                  ? myPermissionsError.message
                  : 'Unknown error'}
              </div>
            )}

            {!isMyPermissionsLoading && !isMyPermissionsError && myPermissions && (
              <>
                <PermissionsOverview
                  title="My Access"
                  description="This is the effective permission set the dashboard applies to your current organization membership."
                  inherited={myPermissions.inherited}
                  enabledCount={myEnabledCount}
                  permissions={myPermissionValues}
                />

                <div className="glass-panel p-6 text-sm text-muted-foreground">
                  Changes to role or permission assignments take full effect after
                  the next login. If access looks stale, sign out and sign back in.
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <InviteMemberDialog
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
        />
        <PermissionsDialog
          open={Boolean(permissionsMember)}
          onOpenChange={(open) => {
            if (!open) {
              setPermissionsMember(null);
            }
          }}
          member={permissionsMember}
        />
        <AlertDialog
          open={Boolean(memberToRemove)}
          onOpenChange={(open) => {
            if (!open) {
              setMemberToRemove(null);
            }
          }}
        >
          <AlertDialogContent className="border-white/[0.08] bg-background">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove team member</AlertDialogTitle>
              <AlertDialogDescription>
                {memberToRemove
                  ? `Remove ${getMemberDisplayName(memberToRemove)} from this organization? They will lose dashboard access immediately.`
                  : 'This member will lose access immediately.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/[0.08] bg-transparent">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={removeMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removeMemberMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove member'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppShell>
    </AuthGuard>
  );
};

export default Settings;
