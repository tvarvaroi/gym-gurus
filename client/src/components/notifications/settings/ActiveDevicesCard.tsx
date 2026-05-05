/**
 * Active devices card — Sprint 2 BATCH 5
 *
 * Lists every active push subscription for the current user. Each row shows:
 *   - "Browser on OS" label parsed from userAgent (inline regex, no UA library)
 *   - Last-used timestamp (relative)
 *   - "This device" badge if the row's endpointHash matches the current
 *     browser's active subscription
 *   - Revoke button → AlertDialog confirm
 *
 * Critical revoke flow detail: when revoking THIS device, we ALSO call
 * unsubscribeBrowser() to remove the local browser-side subscription. Without
 * that step, the SW would re-register on the next push attempt and the row
 * would reappear (the user toggle in the UI would feel broken). This is the
 * load-bearing piece of the BATCH 4 design — see the Q4 amendment in the
 * brainstorm transcript.
 */

import { useEffect, useState } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';
import {
  useActiveDevices,
  useRevokeDevice,
  type ActiveDevice,
} from '@/hooks/useNotificationPreferences';
import { parseUserAgent } from '@/lib/userAgent';
import { unsubscribeBrowser, isPushSupported } from '@/lib/pushSubscription';

// Hash an endpoint string to its 16-char SHA-256 hex prefix — same algorithm as
// the server-side hash exposed via GET /subscriptions, so the two values match
// exactly when this device's current subscription belongs to one of the rows.
async function hashEndpoint(endpoint: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never used';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 0) return 'Just now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ActiveDevicesCard() {
  const { data: devices, isLoading } = useActiveDevices();
  const revoke = useRevokeDevice();
  const { toast } = useToast();
  const [thisDeviceHash, setThisDeviceHash] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ActiveDevice | null>(null);

  // Derive this device's hash on mount. If the browser doesn't support push
  // or has no active subscription, leave it null (no row gets the badge).
  useEffect(() => {
    if (!isPushSupported()) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub || cancelled) return;
        const hash = await hashEndpoint(sub.endpoint);
        if (!cancelled) setThisDeviceHash(hash);
      } catch {
        // ignore — bad SW state doesn't break the list
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openConfirm(device: ActiveDevice) {
    setConfirming(device);
  }

  async function handleConfirmedRevoke() {
    if (!confirming) return;
    const device = confirming;
    const isThisDevice = thisDeviceHash && device.endpointHash === thisDeviceHash;

    revoke.mutate(device.id, {
      onSuccess: async () => {
        // CRITICAL: if revoking THIS device, also tear down the local browser
        // subscription. Without this the SW immediately re-registers on the
        // next push attempt and the row re-appears.
        if (isThisDevice) {
          try {
            await unsubscribeBrowser();
          } catch {
            // logged inside unsubscribeBrowser; the server-side row is already
            // marked inactive so the user's intent is honoured even if the
            // local cleanup hiccups.
          }
        }
        toast({
          title: 'Device revoked',
          description: isThisDevice
            ? 'This device will no longer receive notifications.'
            : `${parseUserAgent(device.userAgent).label} will no longer receive notifications.`,
        });
        setConfirming(null);
      },
      onError: (err) => {
        toast({
          title: 'Revoke failed',
          description: err.message,
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <Card data-testid="active-devices-card">
      <CardHeader>
        <CardTitle className="text-base">Active devices</CardTitle>
        <CardDescription className="text-xs">
          Devices currently receiving your notifications. Revoke any you don&apos;t recognise.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !devices || devices.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-8 text-center"
            data-testid="active-devices-empty"
          >
            <div className="bg-muted/40 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
              <Bell className="text-muted-foreground h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium">No devices yet.</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              After you enable notifications on a device, it&apos;ll show up here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3" data-testid="active-devices-list">
            {devices.map((device) => {
              const ua = parseUserAgent(device.userAgent);
              const isThisDevice =
                thisDeviceHash !== null && device.endpointHash === thisDeviceHash;
              return (
                <li
                  key={device.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2.5"
                  data-testid={`active-device-row-${device.id}`}
                  data-this-device={isThisDevice ? 'true' : 'false'}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{ua.label}</p>
                      {isThisDevice && (
                        <span
                          className="inline-flex shrink-0 items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
                          data-testid="this-device-badge"
                        >
                          This device
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Last used {relativeTime(device.lastUsedAt)}
                      <span className="mx-1.5 opacity-60">·</span>
                      Added {new Date(device.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openConfirm(device)}
                    disabled={revoke.isPending}
                    className="cursor-pointer text-muted-foreground hover:text-destructive"
                    data-testid={`revoke-device-${device.id}`}
                    aria-label={`Revoke ${ua.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent data-testid="revoke-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming && thisDeviceHash !== null && confirming.endpointHash === thisDeviceHash
                ? 'Stop notifications on this device?'
                : `Stop notifications on ${confirming ? parseUserAgent(confirming.userAgent).label : 'this device'}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This won&apos;t affect your other devices. You can re-enable from any browser by
              visiting GymGurus and approving notifications again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoke.isPending} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedRevoke}
              disabled={revoke.isPending}
              data-testid="revoke-confirm"
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoke.isPending ? 'Revoking…' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
