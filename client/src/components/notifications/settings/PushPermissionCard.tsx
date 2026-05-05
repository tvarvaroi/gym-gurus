/**
 * Push permission status card — Sprint 2 BATCH 5
 *
 * First card in the Settings → Alerts tab. Shows the user where they stand:
 *   - Permission state pill (Granted / Denied / Not asked / Unsupported / iOS PWA)
 *   - Enable button (only when state is `default`, browser supports push,
 *     and we're not on iOS Safari outside standalone mode)
 *   - Send test button (only when ≥1 active subscription)
 *
 * Why this is the FIRST card: it's the gate. If push isn't enabled, every other
 * card on the page is read-only or moot.
 */

import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Loader2, Send, Smartphone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  isIosNonStandalone,
  isPushSupported,
  requestPermissionAndSubscribe,
} from '@/lib/pushSubscription';
import { useActiveDevices, useSendTestNotification } from '@/hooks/useNotificationPreferences';
import { useQueryClient } from '@tanstack/react-query';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported' | 'ios-pwa-required';

function detectState(): PermissionState {
  if (typeof window === 'undefined' || !isPushSupported()) return 'unsupported';
  if (isIosNonStandalone()) return 'ios-pwa-required';
  return Notification.permission;
}

const STATE_COPY: Record<
  PermissionState,
  { label: string; description: string; tone: 'good' | 'neutral' | 'bad' }
> = {
  granted: {
    label: 'Notifications on',
    description: 'Push notifications are enabled on this device.',
    tone: 'good',
  },
  denied: {
    label: 'Blocked',
    description:
      'You blocked notifications in your browser. Re-enable them in browser site settings, then refresh this page.',
    tone: 'bad',
  },
  default: {
    label: 'Not enabled',
    description:
      'Get push reminders for workouts, recovery, and achievements. You can mute any category later.',
    tone: 'neutral',
  },
  unsupported: {
    label: 'Not supported',
    description: "This browser doesn't support web push notifications.",
    tone: 'bad',
  },
  'ios-pwa-required': {
    label: 'iOS Home Screen needed',
    description:
      'On iPhone or iPad, web push works only when GymGurus is installed via "Add to Home Screen". Tap the Share button in Safari, then "Add to Home Screen", and re-open from the icon.',
    tone: 'neutral',
  },
};

const TONE_PILL: Record<'good' | 'neutral' | 'bad', string> = {
  good: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  neutral: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  bad: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
};

export function PushPermissionCard() {
  const [state, setState] = useState<PermissionState>(detectState);
  const [enabling, setEnabling] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: devices } = useActiveDevices();
  const test = useSendTestNotification();

  // Re-poll on focus — if user grants permission via OS prompt and returns,
  // we want the pill to update without a hard refresh.
  useEffect(() => {
    function refresh() {
      setState(detectState());
    }
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const copy = STATE_COPY[state];
  const canEnable = state === 'default';
  const hasActiveSubs = (devices ?? []).length > 0;
  const canTest = state === 'granted' && hasActiveSubs;

  async function handleEnable() {
    setEnabling(true);
    const result = await requestPermissionAndSubscribe();
    setEnabling(false);
    setState(detectState());

    if (result.state === 'granted') {
      toast({
        title: 'Notifications enabled',
        description: 'This device is now registered for push notifications.',
      });
      qc.invalidateQueries({ queryKey: ['/api/notifications/subscriptions'] });
    } else if (result.state === 'denied') {
      toast({
        title: 'Notifications blocked',
        description: 'You can enable them later in your browser site settings.',
        variant: 'destructive',
      });
    } else if (result.state === 'error') {
      toast({
        title: 'Something went wrong',
        description: result.error || 'Try again later.',
        variant: 'destructive',
      });
    }
  }

  function handleTest() {
    test.mutate(undefined, {
      onSuccess: (data) => {
        if (data.outcome === 'sent') {
          toast({
            title: 'Test sent',
            description: 'Look for the notification on this device or any active device.',
          });
        } else if (data.outcome === 'queued_quiet_hours') {
          toast({
            title: 'Test queued',
            description: "You're in quiet hours. The test will fire when they end.",
          });
        } else if (data.outcome === 'no_destination') {
          toast({
            title: 'No devices to send to',
            description: 'Enable notifications on at least one device first.',
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Test sent', description: `Outcome: ${data.outcome}` });
        }
      },
      onError: (err) => {
        toast({
          title: 'Test failed',
          description: err.message,
          variant: 'destructive',
        });
      },
    });
  }

  const Icon =
    state === 'granted'
      ? BellRing
      : state === 'denied'
        ? BellOff
        : state === 'ios-pwa-required'
          ? Smartphone
          : state === 'unsupported'
            ? AlertCircle
            : Bell;

  return (
    <Card data-testid="push-permission-card">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Icon className="text-primary h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-base">Push notifications</CardTitle>
              <CardDescription className="text-xs">
                Browser-level permission for this device.
              </CardDescription>
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_PILL[copy.tone]}`}
            data-testid="push-permission-pill"
          >
            {copy.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">{copy.description}</p>

        <div className="flex flex-wrap gap-2">
          {canEnable && (
            <Button
              onClick={handleEnable}
              disabled={enabling}
              data-testid="push-permission-enable"
              className="cursor-pointer"
            >
              {enabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {enabling ? 'Setting up…' : 'Enable notifications'}
            </Button>
          )}

          {/* Test button is always rendered when state allows — disabled with tooltip otherwise */}
          {state === 'granted' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={canTest ? -1 : 0}>
                    <Button
                      onClick={handleTest}
                      disabled={!canTest || test.isPending}
                      variant="outline"
                      data-testid="push-permission-test"
                      className="cursor-pointer"
                    >
                      {test.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send test
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canTest && (
                  <TooltipContent>
                    No devices registered yet — enable on this device first.
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
