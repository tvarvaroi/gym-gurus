import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isThisYear } from 'date-fns';
import { Lock, Link2, Plus, X } from 'lucide-react';
import { ActionButton } from '@/components/ui/premium/ActionButton';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProgressPhoto } from '@shared/schema';
import type { UnitSystem } from '@/lib/units';
import { PhotosEmptyState } from './PhotosEmptyState';
import { UploadPhotoSheet } from './UploadPhotoSheet';
import { PhotoFullScreen } from './PhotoFullScreen';
import { PhotoCompareView } from './PhotoCompareView';

const POSE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'front', label: 'Front' },
  { value: 'side_left', label: 'Side L' },
  { value: 'side_right', label: 'Side R' },
  { value: 'back', label: 'Back' },
] as const;

type PoseFilter = (typeof POSE_FILTERS)[number]['value'];

interface PhotosTabProps {
  units: UnitSystem;
}

// Sprint 1 ships a Disciple-only photos surface. The trainer-side photos route
// (GET /api/biometrics/photos/client/:clientId) was removed in Sprint 1.5
// because it contradicted the locked decision "Photos NEVER visible to Guru in
// v1." Sprint 4 will reintroduce a trainer-side photos view with proper
// per-photo consent grants — see docs/audits/2026-05-03-sprint-1-retrospective-audit.md.
export function PhotosTab({ units }: PhotosTabProps) {
  const [poseFilter, setPoseFilter] = useState<PoseFilter>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [compareFrom, setCompareFrom] = useState<ProgressPhoto | null>(null);
  const [compareTo, setCompareTo] = useState<ProgressPhoto | null>(null);

  const photosQuery = useQuery<ProgressPhoto[]>({
    queryKey: ['/api/biometrics/photos'],
  });

  const photos = photosQuery.data ?? [];
  const filtered = poseFilter === 'all' ? photos : photos.filter((p) => p.pose === poseFilter);
  const hasPhotos = photos.length > 0;
  const isLoading = photosQuery.isLoading;
  const inCompareSelect = Boolean(compareFrom);

  // Linked photo IDs (for the chain icon overlay)
  const linkedIds = new Set<string>();
  for (const p of photos) {
    if (p.comparesPhotoId) {
      linkedIds.add(p.id);
      linkedIds.add(p.comparesPhotoId);
    }
  }

  const onPickCompareTarget = (p: ProgressPhoto) => {
    if (!compareFrom || p.id === compareFrom.id) return;
    setCompareTo(p);
  };

  const onCloseCompare = () => {
    setCompareFrom(null);
    setCompareTo(null);
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-24 md:pb-6">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (!hasPhotos) {
    return (
      <>
        <PhotosEmptyState onAddPhoto={() => setUploadOpen(true)} />
        <UploadPhotoSheet open={uploadOpen} onOpenChange={setUploadOpen} units={units} />
      </>
    );
  }

  return (
    <>
      {/* Compare-select header bar */}
      {inCompareSelect && compareFrom && (
        <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/95 backdrop-blur-sm border-b border-border/30 flex items-center justify-between gap-3">
          <p className="text-sm text-foreground">
            <span className="text-primary font-medium">Compare with…</span>{' '}
            <span className="text-muted-foreground">tap a second photo</span>
          </p>
          <button
            onClick={onCloseCompare}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer min-h-[40px] px-3 rounded-md"
            aria-label="Cancel compare"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      )}

      {/* Header row: filter chips + add CTA (desktop) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* TODO §DS-7: extract to <RolePill> when filter chips, toggle pills, and selection chips converge. */}
        <div
          className="flex flex-wrap gap-2 flex-1 min-w-0"
          role="radiogroup"
          aria-label="Filter by pose"
        >
          {POSE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={poseFilter === f.value}
              onClick={() => setPoseFilter(f.value)}
              className={`min-h-[36px] px-3.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                poseFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ActionButton
          variant="primary"
          size="sm"
          onClick={() => setUploadOpen(true)}
          icon={<Plus className="w-4 h-4" />}
          className="hidden md:inline-flex"
        >
          Add photo
        </ActionButton>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-24 md:pb-6">
        {filtered.map((p) => {
          const taken = new Date(p.takenAt);
          const dateStr = format(taken, isThisYear(taken) ? 'MMM d' : 'MMM d, yyyy');
          const isFromPhoto = compareFrom?.id === p.id;
          const isLinked = linkedIds.has(p.id);
          const tappable = inCompareSelect ? !isFromPhoto : true;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (!tappable) return;
                if (inCompareSelect) {
                  onPickCompareTarget(p);
                } else {
                  setSelectedPhoto(p);
                }
              }}
              disabled={!tappable}
              className={`group relative aspect-[3/4] rounded-2xl overflow-hidden bg-card border transition-all cursor-pointer ${
                isFromPhoto
                  ? 'border-primary border-2 shadow-lg shadow-primary/30'
                  : inCompareSelect
                    ? 'border-border/30 hover:border-primary hover:scale-[1.02]'
                    : 'border-border/20 hover:border-primary/40 active:scale-[0.98]'
              } ${!tappable && !isFromPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={`Photo from ${dateStr}, ${p.pose} pose`}
            >
              <img
                src={p.thumbnailUrl ?? p.imageUrl}
                alt=""
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {/* Bottom gradient + date overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-8">
                <p className="text-xs text-white tabular-nums font-medium">{dateStr}</p>
              </div>
              {/* Lock icon (always private in v1) */}
              {p.isPrivate && (
                <div className="absolute top-2 right-2 p-1 rounded-md bg-black/60 backdrop-blur-sm">
                  <Lock className="w-3 h-3 text-white" />
                </div>
              )}
              {/* Linked indicator */}
              {isLinked && (
                <div
                  className="absolute top-2 left-2 p-1 rounded-md bg-primary/90 backdrop-blur-sm"
                  title="Linked comparison"
                >
                  <Link2 className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              {/* Compare-from highlight overlay */}
              {isFromPhoto && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <span className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wide">
                    Selected
                  </span>
                </div>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
            No photos in this pose yet.
          </div>
        )}
      </div>

      {/* Mobile sticky add CTA */}
      {!inCompareSelect && (
        <button
          onClick={() => setUploadOpen(true)}
          aria-label="Add photo"
          className="md:hidden fixed bottom-4 left-4 right-4 z-30 min-h-[52px] rounded-full bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add photo
        </button>
      )}

      {/* Modals */}
      <UploadPhotoSheet open={uploadOpen} onOpenChange={setUploadOpen} units={units} />
      <PhotoFullScreen
        photo={selectedPhoto}
        units={units}
        onClose={() => setSelectedPhoto(null)}
        onCompare={(p) => {
          setSelectedPhoto(null);
          setCompareFrom(p);
        }}
      />
      <PhotoCompareView
        photoA={compareFrom}
        photoB={compareTo}
        units={units}
        onClose={onCloseCompare}
      />
    </>
  );
}
