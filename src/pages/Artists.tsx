import { FormEvent, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Loader2,
  Mic2,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useArtist,
  useArtists,
  useClaimArtist,
  useCreateArtist,
  useReleaseArtist,
  useUpdateArtist,
} from '@/hooks/useArtists';
import { useToast } from '@/hooks/use-toast';
import { isValidUrl, trimToUndefined } from '@/lib/eventManagement';
import { canManageOrganizationOperations } from '@/lib/organizationAccess';
import { useAuthStore } from '@/stores/authStore';
import { Artist, CreateArtistRequest, UpdateArtistRequest } from '@/types/artists';

interface ArtistFormState {
  name: string;
  genre: string;
  bio: string;
  imageUrl: string;
  email: string;
  socialLinks: string;
}

type ArtistDialogMode = 'create' | 'edit';

const EMPTY_ARTIST_FORM: ArtistFormState = {
  name: '',
  genre: '',
  bio: '',
  imageUrl: '',
  email: '',
  socialLinks: '',
};

function buildArtistFormState(artist?: Artist | null): ArtistFormState {
  if (!artist) {
    return EMPTY_ARTIST_FORM;
  }

  return {
    name: artist.name,
    genre: artist.genre ?? '',
    bio: artist.bio ?? '',
    imageUrl: artist.image_url ?? '',
    email: artist.email ?? '',
    socialLinks: artist.social_links
      ? JSON.stringify(artist.social_links, null, 2)
      : '',
  };
}

function parseSocialLinks(value: string): Record<string, unknown> | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = JSON.parse(trimmed);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Social links must be a JSON object.');
  }

  return parsed as Record<string, unknown>;
}

function getArtistStatus(
  artist: Artist,
  organizationId?: string,
): { label: string; className: string } {
  if (artist.managed_by_org_id && artist.managed_by_org_id === organizationId) {
    return {
      label: artist.is_verified ? 'Managed & verified' : 'Managed',
      className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    };
  }

  if (artist.created_by_org_id === organizationId) {
    return {
      label: 'Created only',
      className: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    };
  }

  return {
    label: 'Unmanaged',
    className: 'border-white/[0.08] bg-white/[0.04] text-muted-foreground',
  };
}

const Artists = () => {
  const org = useAuthStore((state) => state.org);
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [dialogMode, setDialogMode] = useState<ArtistDialogMode>('create');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [artistForm, setArtistForm] = useState<ArtistFormState>(EMPTY_ARTIST_FORM);
  const deferredSearch = useDeferredValue(searchInput.trim());
  const {
    data: artistsData,
    isLoading,
    isError,
    error,
  } = useArtists(deferredSearch || undefined);
  const { data: artistDetail } = useArtist(
    dialogMode === 'edit' ? selectedArtist?.id : undefined,
  );
  const createArtistMutation = useCreateArtist();
  const updateArtistMutation = useUpdateArtist();
  const claimArtistMutation = useClaimArtist();
  const releaseArtistMutation = useReleaseArtist();
  const canManageArtists = canManageOrganizationOperations(org?.role);
  const artists = artistsData ?? [];
  const isArtistDialogPending =
    createArtistMutation.isPending || updateArtistMutation.isPending;

  useEffect(() => {
    if (dialogMode === 'create') {
      setArtistForm(EMPTY_ARTIST_FORM);
      return;
    }

    setArtistForm(buildArtistFormState(artistDetail ?? selectedArtist));
  }, [artistDetail, dialogMode, selectedArtist]);

  const managedCount = useMemo(
    () =>
      artists.filter((artist) => artist.managed_by_org_id === org?.id).length,
    [artists, org?.id],
  );

  const openCreateDialog = () => {
    setDialogMode('create');
    setSelectedArtist(null);
    setArtistForm(EMPTY_ARTIST_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (artist: Artist) => {
    if (!canManageArtists) {
      return;
    }

    setDialogMode('edit');
    setSelectedArtist(artist);
    setArtistForm(buildArtistFormState(artist));
    setIsDialogOpen(true);
  };

  const submitArtist = async (inputEvent: FormEvent<HTMLFormElement>) => {
    inputEvent.preventDefault();

    const name = artistForm.name.trim();

    if (!name) {
      toast({
        title: 'Name required',
        description: 'Artist name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    const imageUrl = trimToUndefined(artistForm.imageUrl);

    if (imageUrl && !isValidUrl(imageUrl)) {
      toast({
        title: 'Invalid image URL',
        description: 'Use a full URL starting with http:// or https://.',
        variant: 'destructive',
      });
      return;
    }

    let socialLinks: Record<string, unknown> | undefined;

    try {
      socialLinks = parseSocialLinks(artistForm.socialLinks);
    } catch (parseError) {
      toast({
        title: 'Invalid social links JSON',
        description:
          parseError instanceof Error
            ? parseError.message
            : 'Social links must be a JSON object.',
        variant: 'destructive',
      });
      return;
    }

    const payload: CreateArtistRequest | UpdateArtistRequest = {
      name,
      genre: trimToUndefined(artistForm.genre),
      bio: trimToUndefined(artistForm.bio),
      image_url: imageUrl,
      email: trimToUndefined(artistForm.email),
      social_links: socialLinks,
    };

    try {
      if (dialogMode === 'create') {
        await createArtistMutation.mutateAsync(payload as CreateArtistRequest);
        toast({
          title: 'Artist created',
          description: `${name} is ready for lineup assignments.`,
        });
      } else if (selectedArtist) {
        await updateArtistMutation.mutateAsync({
          artistId: selectedArtist.id,
          payload: payload as UpdateArtistRequest,
        });
        toast({
          title: 'Artist updated',
          description: `${name} has been updated.`,
        });
      }

      setIsDialogOpen(false);
      setSelectedArtist(null);
      setArtistForm(EMPTY_ARTIST_FORM);
    } catch (mutationError) {
      toast({
        title:
          dialogMode === 'create' ? 'Create artist failed' : 'Update artist failed',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'The artist could not be saved.',
        variant: 'destructive',
      });
    }
  };

  const handleClaimArtist = async (artist: Artist) => {
    try {
      await claimArtistMutation.mutateAsync(artist.id);
      toast({
        title: 'Management claimed',
        description: `${artist.name} is now managed by your organization.`,
      });
    } catch (mutationError) {
      toast({
        title: 'Claim failed',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Management could not be claimed.',
        variant: 'destructive',
      });
    }
  };

  const handleReleaseArtist = async (artist: Artist) => {
    try {
      await releaseArtistMutation.mutateAsync(artist.id);
      toast({
        title: 'Management released',
        description: `${artist.name} is no longer managed by your organization.`,
      });
    } catch (mutationError) {
      toast({
        title: 'Release failed',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Management could not be released.',
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
              Artist Roster
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Artists
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Maintain the roster your organization can claim, edit, and place
                into event lineups.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManageArtists ? (
              <button
                type="button"
                onClick={openCreateDialog}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add Artist
              </button>
            ) : (
              <span className="glass-pill text-xs font-medium text-muted-foreground">
                Read-only access
              </span>
            )}
            <span className="glass-pill text-xs font-medium text-muted-foreground">
              <Mic2 className="h-3.5 w-3.5" />
              {artists.length} artists
            </span>
            <span className="glass-pill text-xs font-medium text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5" />
              {managedCount} managed
            </span>
          </div>
        </motion.div>

        <motion.div
          className="glass-panel p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(inputEvent) =>
                  startTransition(() => {
                    setSearchInput(inputEvent.target.value);
                  })
                }
                className="h-11 rounded-full border-white/[0.08] bg-white/[0.03] pl-11"
                placeholder="Search artists by name or genre"
              />
            </div>

            {isPending && (
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Updating...
              </span>
            )}
          </div>
        </motion.div>

        {!canManageArtists && (
          <div className="mt-6 glass-panel p-4 text-sm text-muted-foreground">
            Your current organization role can review artists and lineups but
            cannot create, edit, claim, or release artist management.
          </div>
        )}

        {isLoading && (
          <div className="mt-6 glass-panel p-6 text-sm text-muted-foreground">
            Loading artists...
          </div>
        )}

        {isError && (
          <div className="mt-6 glass-panel p-6 text-sm text-destructive">
            Unable to load artists: {error?.message}
          </div>
        )}

        {!isLoading && !isError && artists.length === 0 && (
          <div className="mt-6 glass-panel p-10 text-center">
            <p className="text-sm font-medium text-foreground">
              No artists match this search yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create the first artist profile or widen the search to see more of
              your roster.
            </p>
          </div>
        )}

        {!isLoading && !isError && artists.length > 0 && (
          <motion.div
            className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25 }}
          >
            {artists.map((artist) => {
              const status = getArtistStatus(artist, org?.id);
              const canClaim = canManageArtists && !artist.managed_by_org_id;
              const canRelease =
                canManageArtists && artist.managed_by_org_id === org?.id;

              return (
                <div
                  key={artist.id}
                  role={canManageArtists ? 'button' : undefined}
                  tabIndex={canManageArtists ? 0 : undefined}
                  onClick={() => openEditDialog(artist)}
                  onKeyDown={(inputEvent) => {
                    if (
                      canManageArtists &&
                      (inputEvent.key === 'Enter' || inputEvent.key === ' ')
                    ) {
                      inputEvent.preventDefault();
                      openEditDialog(artist);
                    }
                  }}
                  className={`glass-panel overflow-hidden text-left transition-transform ${
                    canManageArtists ? 'cursor-pointer hover:-translate-y-1' : ''
                  }`}
                >
                  <div
                    className="h-32 w-full bg-cover bg-center"
                    style={{
                      backgroundImage: artist.image_url
                        ? `linear-gradient(180deg, rgba(8, 12, 18, 0.05), rgba(8, 12, 18, 0.8)), url(${artist.image_url})`
                        : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                    }}
                  />

                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">
                          {artist.name}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {artist.genre ?? 'Genre pending'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <p className="min-h-[3rem] text-sm leading-6 text-muted-foreground">
                      {artist.bio ?? 'No artist bio yet. Add context for bookers and lineup editors.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {artist.is_verified && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-300">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                      {artist.email && (
                        <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1">
                          {artist.email}
                        </span>
                      )}
                    </div>

                    {canManageArtists && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm font-medium text-foreground">
                          <PencilLine className="h-3.5 w-3.5" />
                          Edit
                        </span>

                        {canClaim && (
                          <button
                            type="button"
                            onClick={(inputEvent) => {
                              inputEvent.stopPropagation();
                              void handleClaimArtist(artist);
                            }}
                            disabled={claimArtistMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {claimArtistMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            )}
                            Claim
                          </button>
                        )}

                        {canRelease && (
                          <button
                            type="button"
                            onClick={(inputEvent) => {
                              inputEvent.stopPropagation();
                              void handleReleaseArtist(artist);
                            }}
                            disabled={releaseArtistMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {releaseArtistMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ShieldOff className="h-3.5 w-3.5" />
                            )}
                            Release
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setSelectedArtist(null);
              setArtistForm(EMPTY_ARTIST_FORM);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto border-white/[0.08] bg-card/95 text-foreground backdrop-blur-xl sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {dialogMode === 'create'
                  ? 'Add Artist'
                  : `Edit ${selectedArtist?.name ?? 'Artist'}`}
              </DialogTitle>
              <DialogDescription>
                Capture the artist profile used by your lineup and management
                workflows.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-6" onSubmit={submitArtist}>
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
                <section className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="artist-name">Name</Label>
                    <Input
                      id="artist-name"
                      value={artistForm.name}
                      onChange={(inputEvent) =>
                        setArtistForm((current) => ({
                          ...current,
                          name: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="artist-genre">Genre</Label>
                    <Input
                      id="artist-genre"
                      value={artistForm.genre}
                      onChange={(inputEvent) =>
                        setArtistForm((current) => ({
                          ...current,
                          genre: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                      placeholder="Afro House"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="artist-bio">Bio</Label>
                    <Textarea
                      id="artist-bio"
                      value={artistForm.bio}
                      onChange={(inputEvent) =>
                        setArtistForm((current) => ({
                          ...current,
                          bio: inputEvent.target.value,
                        }))
                      }
                      className="min-h-32 border-white/[0.08] bg-white/[0.03]"
                      placeholder="Short background and booking notes"
                    />
                  </div>
                </section>

                <aside className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="artist-image-url">Image URL</Label>
                    <Input
                      id="artist-image-url"
                      type="url"
                      value={artistForm.imageUrl}
                      onChange={(inputEvent) =>
                        setArtistForm((current) => ({
                          ...current,
                          imageUrl: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="artist-email">Email</Label>
                    <Input
                      id="artist-email"
                      type="email"
                      value={artistForm.email}
                      onChange={(inputEvent) =>
                        setArtistForm((current) => ({
                          ...current,
                          email: inputEvent.target.value,
                        }))
                      }
                      className="border-white/[0.08] bg-white/[0.03]"
                      placeholder="artist@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="artist-social-links">Social Links JSON</Label>
                    <Textarea
                      id="artist-social-links"
                      value={artistForm.socialLinks}
                      onChange={(inputEvent) =>
                        setArtistForm((current) => ({
                          ...current,
                          socialLinks: inputEvent.target.value,
                        }))
                      }
                      className="min-h-40 border-white/[0.08] bg-white/[0.03] font-mono text-xs"
                      placeholder={'{\n  "instagram": "@artist",\n  "spotify": "spotify:artist:123"\n}'}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank if you do not want to store social links yet.
                    </p>
                  </div>
                </aside>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.08] px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                  disabled={isArtistDialogPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isArtistDialogPending}
                >
                  {isArtistDialogPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {dialogMode === 'create' ? 'Create Artist' : 'Save Artist'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
};

export default Artists;
