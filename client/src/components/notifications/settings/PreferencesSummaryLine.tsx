/**
 * One-line summary of current notification preferences — Sprint 2 BATCH 5
 *
 * Sits between the Categories card and the Quiet Hours card. Reads the four
 * load-bearing pieces of state (categories on, quiet hours window, active
 * device count, email backup state) and renders them as a single sentence.
 *
 * Mobile + desktop both. The line is small enough to fit in 360px without
 * truncation by using `min-w-0 truncate` segments separated by middots.
 */

import { Bell } from 'lucide-react';
import {
  useActiveDevices,
  useNotificationPreferences,
  NOTIFICATION_CATEGORIES,
} from '@/hooks/useNotificationPreferences';

function formatTime12(hhmm: string): string {
  // 'HH:MM' → 'h:mma'. e.g. '22:00' → '10pm', '07:00' → '7am'.
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

function shortTz(timezone: string): string {
  // 'America/New_York' → 'EST'/'EDT' via Intl. Falls back to the city name.
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    const tz = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (tz) return tz;
  } catch {
    // ignore
  }
  return timezone.split('/').pop()?.replace(/_/g, ' ') ?? timezone;
}

export function PreferencesSummaryLine() {
  const { data: prefs } = useNotificationPreferences();
  const { data: devices } = useActiveDevices();

  if (!prefs) return null;

  const categoriesOn = NOTIFICATION_CATEGORIES.filter((k) => prefs.categories[k]).length;
  const totalCategories = NOTIFICATION_CATEGORIES.length;

  const quietPart = prefs.quietHours.enabled
    ? `Quiet hours: ${formatTime12(prefs.quietHours.start)}–${formatTime12(prefs.quietHours.end)} ${shortTz(prefs.quietHours.timezone)}`
    : 'Quiet hours: off';

  const deviceCount = (devices ?? []).length;
  const devicePart =
    deviceCount === 0
      ? 'No active devices'
      : deviceCount === 1
        ? '1 active device'
        : `${deviceCount} active devices`;

  return (
    <div
      className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
      data-testid="preferences-summary-line"
    >
      <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">
        {categoriesOn} of {totalCategories} categories on
        <span className="mx-1.5 opacity-60">·</span>
        {quietPart}
        <span className="mx-1.5 opacity-60">·</span>
        {devicePart}
      </span>
    </div>
  );
}
