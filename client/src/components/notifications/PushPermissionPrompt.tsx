/**
 * PushPermissionPrompt — Sprint 2 BATCH 3
 *
 * Educational permission prompt that fires AFTER a meaningful action (first
 * workout completed, first body metric logged, first AI coach message sent),
 * NEVER on page load. Wraps the OS permission prompt with our own copy so the
 * user understands what they're being asked.
 *
 * Visibility rules (in order):
 *   1. Suppressed if `Notification` API unsupported.
 *   2. Suppressed if user already dismissed it in this browser
 *      (localStorage `pushPromptSeen`). Sprint 12 native shell will move this
 *      to `users.notification_prompt_dismissed_at` server-side.
 *   3. Suppressed if `Notification.permission !== 'default'` (already granted
 *      or denied — no point re-asking).
 *   4. iOS Safari outside standalone PWA mode: shows educational copy
 *      ("Add to Home Screen") instead of trying to subscribe (the OS prompt
 *      would silently fail).
 *
 * Mobile: shadcn Drawer (bottom sheet). Desktop: shadcn Dialog (centered card).
 * Both use the same content body, so adding a third variant later is one prop.
 */

import { useState } from 'react';
import { Bell, Smartphone, Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  isIosNonStandalone,
  isPushSupported,
  requestPermissionAndSubscribe,
} from '@/lib/pushSubscription';

const SEEN_KEY = 'gg_push_prompt_seen';

export interface PushPermissionPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PushPermissionPrompt({ open, onOpenChange }: PushPermissionPromptProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // iOS PWA branch — show educational copy, do NOT call requestPermission
  // (Safari outside PWA mode either silently denies or crashes the prompt).
  const isIosNeedsPwa = isIosNonStandalone();

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // private mode — ignore, prompt will reappear next session, acceptable
    }
    onOpenChange(false);
  }

  async function handleEnable() {
    if (isIosNeedsPwa) {
      // The button is disabled in this branch but defensive — never try to subscribe.
      dismiss();
      return;
    }

    setSubmitting(true);
    const result = await requestPermissionAndSubscribe();
    setSubmitting(false);

    if (result.state === 'granted') {
      toast({
        title: 'Notifications enabled',
        description:
          "You'll get updates for the categories you care about. Manage them in Settings.",
      });
      try {
        localStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* ignore */
      }
      onOpenChange(false);
    } else if (result.state === 'denied') {
      toast({
        title: 'Notifications blocked',
        description: 'You can enable them later in your browser settings.',
        variant: 'destructive',
      });
      // Treat denial the same as dismissal — don't re-prompt.
      dismiss();
    } else if (result.state === 'unsupported') {
      toast({
        title: 'Not supported',
        description: "Your browser doesn't support push notifications.",
        variant: 'destructive',
      });
      dismiss();
    } else if (result.state === 'ios-pwa-required') {
      // Shouldn't reach here given the early branch, but defensive.
      // Don't dismiss — the user might add to home screen and come back.
      onOpenChange(false);
    } else {
      // 'error' state
      toast({
        title: 'Something went wrong',
        description: result.error || 'Try again later.',
        variant: 'destructive',
      });
      onOpenChange(false);
      // Don't set seen flag on transient errors — we want to retry next time.
    }
  }

  const Title = isIosNeedsPwa ? 'Stay on track' : 'Stay on track';
  const Body = isIosNeedsPwa
    ? 'On iPhone, web push works only when you install GymGurus on your Home Screen. Tap the Share button in Safari, then "Add to Home Screen" — come back here from the app icon.'
    : "Get push reminders for workouts, recovery, and achievements. You're in control — turn off any category in Settings.";

  const Icon = isIosNeedsPwa ? Smartphone : Sparkles;

  const sharedBody = (
    <div className="flex items-start gap-3">
      <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
        <Icon className="text-primary h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">
          <Bell className="mr-1 inline h-4 w-4" aria-hidden="true" />
          {isIosNeedsPwa ? 'Add to Home Screen first' : 'Notifications keep you on the path'}
        </p>
        <p className="text-muted-foreground text-sm">
          {isIosNeedsPwa
            ? 'Web push on iPhone requires the app to be installed via "Add to Home Screen". This is an Apple platform rule, not ours.'
            : 'Workout reminders, recovery alerts, achievement unlocks — all categories are on by default and any can be muted in Settings.'}
        </p>
      </div>
    </div>
  );

  const sharedFooter = (
    <>
      <Button
        variant="ghost"
        onClick={dismiss}
        disabled={submitting}
        className="cursor-pointer"
        data-testid="push-prompt-dismiss"
      >
        {isIosNeedsPwa ? 'Got it' : 'Maybe later'}
      </Button>
      {!isIosNeedsPwa && (
        <Button
          onClick={handleEnable}
          disabled={submitting}
          className="cursor-pointer"
          data-testid="push-prompt-enable"
        >
          {submitting ? 'Setting up…' : 'Enable notifications'}
        </Button>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-['Playfair_Display'] text-2xl">{Title}</DrawerTitle>
            <DrawerDescription className="text-muted-foreground text-sm">{Body}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">{sharedBody}</div>
          <DrawerFooter className="flex-row justify-end gap-2">{sharedFooter}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-['Playfair_Display'] text-2xl">{Title}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">{Body}</DialogDescription>
        </DialogHeader>
        <div className="py-2">{sharedBody}</div>
        <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
          {sharedFooter}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook: returns a `maybePrompt()` callback that decides whether to surface the
 * prompt based on:
 *   - support
 *   - localStorage pushPromptSeen flag
 *   - current Notification.permission
 *   - whether the caller already triggered (this turn)
 *
 * Triggers in WorkoutExecution / LogBodyMetricsSheet / AICoach call this from
 * a useEffect after a successful action.
 */
export function shouldShowPushPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isPushSupported()) return false;
  try {
    if (localStorage.getItem(SEEN_KEY)) return false;
  } catch {
    // ignore — private mode shows prompt every session, acceptable
  }
  if (Notification.permission !== 'default') return false;
  return true;
}
