import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import {
  useMemberPermissions,
  useUpdateMemberPermissions,
} from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import {
  countEnabledPermissions,
  EMPTY_PERMISSION_VALUES,
  extractPermissionValues,
  getMemberDisplayName,
  PERMISSION_FIELDS,
  toPermissionsPayload,
} from '@/lib/settings';
import { useAuthStore } from '@/stores/authStore';
import { OrganizationMember, OrganizationPermissionValues } from '@/types/settings';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrganizationMember | null;
}

export function PermissionsDialog({
  open,
  onOpenChange,
  member,
}: PermissionsDialogProps) {
  const { toast } = useToast();
  const currentUser = useAuthStore((state) => state.user);
  const updatePermissionsMutation = useUpdateMemberPermissions();
  const {
    data: permissions,
    isLoading,
    isError,
    error,
  } = useMemberPermissions(member?.user_id, {
    enabled: open && !!member,
  });
  const [form, setForm] = useState<OrganizationPermissionValues>(
    EMPTY_PERMISSION_VALUES,
  );

  const effectivePermissions = permissions ?? member?.permissions;
  const enabledCount = countEnabledPermissions(form);
  const isCurrentUser = member?.user_id === currentUser?.id;

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_PERMISSION_VALUES);
      return;
    }

    if (effectivePermissions) {
      setForm(extractPermissionValues(effectivePermissions));
    }
  }, [effectivePermissions, open]);

  const permissionsDescription = useMemo(() => {
    if (!effectivePermissions) {
      return 'Configure the explicit permissions this member should receive.';
    }

    if (effectivePermissions.inherited) {
      return 'This member is currently using role defaults. Saving here will create a custom permission override.';
    }

    return 'This member already has a custom permission override saved.';
  }, [effectivePermissions]);

  const savePermissions = async (inputEvent: FormEvent<HTMLFormElement>) => {
    inputEvent.preventDefault();

    if (!member) {
      return;
    }

    try {
      await updatePermissionsMutation.mutateAsync({
        userId: member.user_id,
        payload: toPermissionsPayload(form),
      });

      toast({
        title: 'Permissions updated',
        description: isCurrentUser
          ? 'Your updated permissions will fully apply on the next login.'
          : `${getMemberDisplayName(member)} now has ${enabledCount} enabled permissions.`,
      });
      onOpenChange(false);
    } catch (mutationError) {
      toast({
        title: 'Permission update failed',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'The permissions could not be saved.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/[0.08] bg-background sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Manage Permissions
          </DialogTitle>
          <DialogDescription>
            {member ? `${getMemberDisplayName(member)} • ${enabledCount} of 10 enabled` : 'Select a member to manage permissions.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={savePermissions}>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-muted-foreground">
            {permissionsDescription}
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading the latest saved permissions...
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Unable to refresh permissions: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          )}

          <div className="space-y-3">
            {PERMISSION_FIELDS.map((field) => (
              <div
                key={field.key}
                className="flex items-start justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="space-y-1">
                  <Label htmlFor={`permission-${field.key}`}>{field.label}</Label>
                  <p className="text-sm text-muted-foreground">
                    {field.description}
                  </p>
                </div>
                <Switch
                  id={`permission-${field.key}`}
                  checked={form[field.key]}
                  onCheckedChange={(checked) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      [field.key]: checked,
                    }))
                  }
                  disabled={updatePermissionsMutation.isPending}
                />
              </div>
            ))}
          </div>

          {isCurrentUser && (
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
              You are editing the current session. Permission changes take full
              effect after the next login.
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/[0.08] bg-transparent"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!member || updatePermissionsMutation.isPending}>
              {updatePermissionsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving permissions...
                </>
              ) : (
                'Save permissions'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
