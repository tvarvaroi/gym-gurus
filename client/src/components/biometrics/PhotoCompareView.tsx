import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isThisYear } from 'date-fns';
import { X, Link2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ActionButton } from '@/components/ui/premium/ActionButton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { displayWeight, displayPercent, type UnitSystem } from '@/lib/units';
import type { ProgressPhoto } from '@shared/schema';

interface PhotoCompareViewProps {
  photoA: ProgressPhoto | null;
  photoB: ProgressPhoto | null;
  units: UnitSystem;
  onClose: () => void;
  /** When true, hides the "Save comparison" button (already linked or trainer view). */
  readOnly?: boolean;
}

function formatDate(d: Date | string): string {
  const date = new Date(d);
  return format(date, isThisYear(date) ? 'MMM d, h:mm a' : 'MMM d yyyy, h:mm a');
}

function PhotoPanel({ photo, units }: { photo: ProgressPhoto; units: UnitSystem }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="px-3 py-2 bg-card border-b border-border/30 flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDate(photo.takenAt)}
        </span>
        {photo.weightAtPhotoKg && (
          <span className="text-base font-light tabular-nums">
            {displayWeight(photo.weightAtPhotoKg, units)}
            {photo.bodyFatAtPhoto && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                · {displayPercent(photo.bodyFatAtPhoto)}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex-1 bg-black flex items-center justify-center min-h-[35vh] md:min-h-[55vh]">
        <img
          src={photo.imageUrl}
          alt={`Photo from ${formatDate(photo.takenAt)}`}
          className="max-w-full max-h-[55vh] object-contain"
        />
      </div>
    </div>
  );
}

export function PhotoCompareView({
  photoA,
  photoB,
  units,
  onClose,
  readOnly,
}: PhotoCompareViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!photoA || !photoB) throw new Error('Missing photos');
      const res = await apiRequest(
        'POST',
        `/api/biometrics/photos/${photoA.id}/compare/${photoB.id}`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/biometrics/photos'] });
      toast({
        title: 'Comparison saved',
        description: 'Both photos now show the linked indicator.',
      });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    },
  });

  const open = Boolean(photoA && photoB);
  if (!photoA || !photoB) return null;

  // Determine chronological order: older photo on the left/top
  const aIsOlder = new Date(photoA.takenAt).getTime() < new Date(photoB.takenAt).getTime();
  const left = aIsOlder ? photoA : photoB;
  const right = aIsOlder ? photoB : photoA;

  // Already linked? Hide the save button.
  const alreadyLinked =
    photoA.comparesPhotoId === photoB.id || photoB.comparesPhotoId === photoA.id;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden bg-card border-border/30">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
            aria-label="Close compare view"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row">
            <PhotoPanel photo={left} units={units} />
            <div className="hidden md:block w-px bg-border/30" />
            <div className="md:hidden h-px bg-border/30" />
            <PhotoPanel photo={right} units={units} />
          </div>

          {!readOnly && !alreadyLinked && (
            <div className="p-4 border-t border-border/30 flex justify-end">
              <ActionButton
                variant="primary"
                size="sm"
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                icon={<Link2 className="w-4 h-4" />}
              >
                Save comparison
              </ActionButton>
            </div>
          )}
          {alreadyLinked && (
            <div className="p-3 border-t border-border/30 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Link2 className="w-3.5 h-3.5" />
              Comparison saved
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
