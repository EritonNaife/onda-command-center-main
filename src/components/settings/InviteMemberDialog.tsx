import { FormEvent, useEffect, useState } from 'react';
import { Loader2, MailPlus } from 'lucide-react';
import { useInviteMember } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { ORGANIZATION_ROLE_OPTIONS } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrganizationMemberRole } from '@/types/settings';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_ROLE: OrganizationMemberRole = 'member';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteMemberDialog({
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const { toast } = useToast();
  const inviteMemberMutation = useInviteMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationMemberRole>(DEFAULT_ROLE);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setRole(DEFAULT_ROLE);
    }
  }, [open]);

  const submitInvite = async (inputEvent: FormEvent<HTMLFormElement>) => {
    inputEvent.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      toast({
        title: 'Valid email required',
        description: 'Enter a teammate email address before sending the invite.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await inviteMemberMutation.mutateAsync({
        email: trimmedEmail,
        role,
      });

      toast({
        title: 'Invitation sent',
        description: `${response.email} can join as ${ORGANIZATION_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role}. Link valid for ${response.expires_in}.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Invite failed',
        description:
          error instanceof Error
            ? error.message
            : 'The member invite could not be sent.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.08] bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailPlus className="h-5 w-5 text-primary" />
            Invite Teammate
          </DialogTitle>
          <DialogDescription>
            Add a new member to this organization and assign their initial role.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={submitInvite}>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(inputEvent) => setEmail(inputEvent.target.value)}
              placeholder="teammate@example.com"
              className="border-white/[0.08] bg-white/[0.03]"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as OrganizationMemberRole)}
            >
              <SelectTrigger
                id="invite-role"
                className="border-white/[0.08] bg-white/[0.03]"
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {
                ORGANIZATION_ROLE_OPTIONS.find((option) => option.value === role)
                  ?.description
              }
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/[0.08] bg-transparent"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMemberMutation.isPending}>
              {inviteMemberMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending invite...
                </>
              ) : (
                'Send invite'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
