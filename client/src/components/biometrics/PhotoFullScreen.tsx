import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isThisYear } from 'date-fns';
import { GitCompare, Trash2, X, Lock } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
import { ActionButton } from '@/components/ui/premium/ActionButton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { displayWeight, displayPercent, type UnitSystem } from '@/lib/units';
import type { ProgressPhoto } from '@shared/schema';

const POSE_LABELS: Record<string, string> = {
  front: 'Front',
  side_left: 'Side L',
  side_right: 'Side R',
  back: 'Back',
  other: 'Other',
};

interface PhotoFullScreenProps {
  photo: ProgressPhoto | null;
  units: UnitSystem;
  onClose: () => void;
  onCompare: (photo: ProgressPhoto) => void;
  readOnly?: boolean;
}

export function PhotoFullScreen({
  photo,
  units,
  onClose,
  onCompare,
  readOnly,
}: PhotoFullScreenProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/biometrics/photos/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/biometrics/photos'] });
      toast({ title: 'Photo deleted' });
      setConfirmDelete(false);
      onClose();
    },
    onError: (err: unknown) => {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    },
  });

  if (!photo) return null;

  const taken = new Date(photo.takenAt);
  const dateStr = format(taken, isThisYear(taken) ? 'MMMM d · h:mm a' : 'MMMM d, yyyy · h:mm a');

  return (
    <>
      <Dialog open={photo !== null} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="max-w-3xl w-[95vw] p-0 overflow-hidden bg-card border-border/30"
          // Hide the default shadcn close button — we render our own visible one
        >
          <div className="relative bg-black flex items-center justify-center min-h-[50vh] max-h-[70vh]">
            <img
              src={photo.imageUrl}
              alt={`${POSE_LABELS[photo.pose] ?? photo.pose} pose, ${dateStr}`}
              className="max-w-full max-h-[70vh] object-contain"
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 md:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {POSE_LABELS[photo.pose] ?? photo.pose}
                  </span>
                  {photo.isPrivate && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      Private
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1.5">{dateStr}</p>
              </div>
              {(photo.weightAtPhotoKg || photo.bodyFatAtPhoto) && (
                <div className="text-right">
                  {photo.weightAtPhotoKg && (
                    <p className="text-xl font-light tabular-nums">
                      {displayWeight(photo.weightAtPhotoKg, units)}
                    </p>
                  )}
                  {photo.bodyFatAtPhoto && (
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {displayPercent(photo.bodyFatAtPhoto)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {photo.notes && (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pt-2 border-t border-border/30">
                {photo.notes}
              </p>
            )}

            {!readOnly && (
              <div className="flex gap-2 pt-2">
                <ActionButton
                  variant="primary"
                  size="sm"
                  onClick={() => onCompare(photo)}
                  icon={<GitCompare className="w-4 h-4" />}
                  className="flex-1"
                >
                  Compare with…
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  icon={<Trash2 className="w-4 h-4" />}
                  aria-label="Delete photo"
                >
                  <span className="hidden sm:inline">Delete</span>
                </ActionButton>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This is permanent. The photo will be removed from your timeline and any saved
              comparisons that reference it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              onClick={() => deleteMutation.mutate(photo.id)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
