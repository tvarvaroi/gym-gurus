/**
 * Notification preferences + active devices hooks — Sprint 2 BATCH 5
 *
 * Wraps the BATCH 2 notification API for the Settings → Alerts tab.
 * Two parallel queries:
 *   - useNotificationPreferences() → /api/notifications/preferences
 *   - useActiveDevices()           → /api/notifications/subscriptions
 *
 * The PATCH mutation is deep-partial — pass only the slice you're changing
 * (e.g. `{ categories: { workouts: false } }` or `{ quietHours: { enabled: true } }`).
 * Server merges, validates, and audits the change.
 *
 * The CSRF interceptor in main.tsx auto-injects x-csrf-token on state-changing
 * /api requests, so DO NOT add the header manually here (gotchas.md: CSRF
 * double-injection causes byte-length mismatch crash on the server).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Categories are 5 fixed buckets defined server-side; mirror the literal type so
// the UI can iterate without a server round-trip.
export const NOTIFICATION_CATEGORIES = [
  'workouts',
  'recovery',
  'achievements',
  'social',
  'billing',
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface NotificationPreferences {
  categories: Record<NotificationCategory, boolean>;
  quietHours: {
    enabled: boolean;
    start: string; // 'HH:MM'
    end: string; // 'HH:MM'
    timezone: string; // IANA, e.g. 'Europe/Bucharest'
  };
  channels: {
    push: boolean;
    email: boolean;
  };
}

export type NotificationPreferencesPatch = {
  categories?: Partial<Record<NotificationCategory, boolean>>;
  quietHours?: Partial<NotificationPreferences['quietHours']>;
  channels?: Partial<NotificationPreferences['channels']>;
};

export interface ActiveDevice {
  id: string;
  endpointHash: string; // sha256(endpoint).slice(0,16) — for "This device" matching
  userAgent: string | null;
  platform: 'web' | 'ios_pwa' | 'ios_native' | 'android_native';
  lastUsedAt: string | null;
  createdAt: string;
}

const PREFS_KEY = ['/api/notifications/preferences'] as const;
const DEVICES_KEY = ['/api/notifications/subscriptions'] as const;

export function useNotificationPreferences() {
  const qc = useQueryClient();

  const query = useQuery<NotificationPreferences>({
    queryKey: PREFS_KEY,
    queryFn: async () => {
      const res = await fetch('/api/notifications/preferences', { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load preferences (${res.status})`);
      return res.json();
    },
    staleTime: 30_000, // settings data; refetch on focus is fine, no need to thrash
  });

  const mutate = useMutation<NotificationPreferences, Error, NotificationPreferencesPatch>({
    mutationFn: async (patch) => {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: (next) => {
      qc.setQueryData(PREFS_KEY, next);
    },
  });

  return { ...query, update: mutate };
}

export function useActiveDevices() {
  return useQuery<ActiveDevice[]>({
    queryKey: DEVICES_KEY,
    queryFn: async () => {
      const res = await fetch('/api/notifications/subscriptions', { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load devices (${res.status})`);
      return res.json();
    },
    staleTime: 10_000,
  });
}

export function useRevokeDevice() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, Error, string>({
    mutationFn: async (subscriptionId) => {
      const res = await fetch(`/api/notifications/subscribe/${subscriptionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Revoke failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DEVICES_KEY });
    },
  });
}

export function useSendTestNotification() {
  return useMutation<{ success: true; outcome: string; notificationId: string }, Error, void>({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Test failed (${res.status})`);
      }
      return res.json();
    },
  });
}
