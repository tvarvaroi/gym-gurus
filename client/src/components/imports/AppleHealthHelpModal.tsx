/**
 * AppleHealthHelpModal — Sprint 5 BATCH 5
 *
 * In-app modal explaining re-import duplicate semantics. Triggered from
 * ImportProgressCard's terminal (completed) state via a small "Why are some
 * records duplicates?" link, per BATCH 4 Decision 5 (inline counter + help link).
 *
 * Sub-question 4 confirmed: in-app modal v1, NOT external KB. Keeps the user
 * in flow, no external dependencies.
 *
 * Copy is VERBATIM from BATCH 4 D5 (post-amendment for hash-fallback path).
 * Don't paraphrase — the wording was reviewed and approved as-is. The
 * "fingerprint" framing is load-bearing: it's accurate for both UUID-bearing
 * exports (Apple Health ID) AND older exports without UUIDs (sourceName +
 * startDate + value + recordType hash) without leaking implementation detail.
 *
 * Mobile: shadcn Drawer (bottom sheet, mirrors PushPermissionPrompt).
 * Desktop: shadcn Dialog (centered card, same).
 */
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

export interface AppleHealthHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HELP_BODY = `Re-importing your Apple Health data is safe. Records you've already imported won't be added again — we identify each record by its unique fingerprint (Apple Health ID where available, or a fingerprint based on source, type, and timing for older data). If you edited records in Apple Health and re-exported, those edits will appear as new entries because Apple Health can't tell us which records are corrections vs. additions.`;

export function AppleHealthHelpModal({ open, onOpenChange }: AppleHealthHelpModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-['Playfair_Display'] text-2xl">
              Why are some records duplicates?
            </DrawerTitle>
            <DrawerDescription className="text-muted-foreground sr-only">
              Explanation of how the import flow detects already-imported records.
            </DrawerDescription>
          </DrawerHeader>
          <div className="text-foreground px-4 pb-6 text-sm leading-relaxed">{HELP_BODY}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-['Playfair_Display'] text-2xl">
            Why are some records duplicates?
          </DialogTitle>
          <DialogDescription className="sr-only">
            Explanation of how the import flow detects already-imported records.
          </DialogDescription>
        </DialogHeader>
        <p className="text-foreground text-sm leading-relaxed">{HELP_BODY}</p>
      </DialogContent>
    </Dialog>
  );
}
