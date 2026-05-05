/**
 * Quiet hours card — Sprint 2 BATCH 5
 *
 * Master toggle + start/end time inputs + timezone selector. When enabled,
 * the dispatcher's computeDeliverAfter() defers push delivery until the window
 * ends; the cron job in cleanupExpiredQuietHours.ts picks queued rows up.
 *
 * UX choices baked in (per BATCH 4 brainstorm):
 *   - Native <input type="time"> for both pickers — gets mobile time-wheel
 *     pickers for free, full a11y, zero custom code.
 *   - Timezone defaults to Intl.DateTimeFormat().resolvedOptions().timeZone.
 *     The Combobox-equivalent here is a curated <select> of common zones
 *     plus the user's auto-detected one. The full IANA list is too long for
 *     a normal select; if a power-user travels to an unlisted zone they can
 *     toggle the master switch off (which leaves the timezone field unused).
 *     Future Sprint 12 native shell may swap this for a full IANA combobox.
 *   - "(spans overnight)" hint when start > end so the user understands the
 *     window wraps midnight.
 *   - start === end → save disabled + inline "Start and end can't be the same."
 *     (treating it as "no quiet hours" would silently break the user's intent;
 *     forcing them to fix it is honest.)
 *   - Master toggle off→on auto-focuses the start input — closes the loop
 *     where users toggle, see fields appear, and don't realize they need to
 *     interact.
 *
 * Persistence: PATCH on every blur/change, not on a Save button. Matches the
 * autosave pattern of the categories card and the email-backup card.
 */

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

// Detect the browser's IANA timezone. Falls back to UTC if Intl is unavailable
// (won't happen on any supported runtime but defensive).
function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// Curated common-zone list. The detected zone is prepended dynamically below
// so it always appears at the top even if it's not in this list.
const COMMON_TIMEZONES = [
  'UTC',
  // Americas
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  // Europe / Africa
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Bucharest',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  // Asia / Oceania
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland',
];

function buildZoneOptions(detected: string): string[] {
  const set = new Set<string>([detected, ...COMMON_TIMEZONES]);
  return Array.from(set);
}

function spansOvernight(start: string, end: string): boolean {
  return start > end; // string-compare 'HH:MM' is correct lexicographically
}

export function QuietHoursCard() {
  const { data: prefs, isLoading, update } = useNotificationPreferences();
  const { toast } = useToast();
  const startRef = useRef<HTMLInputElement>(null);

  // Local mirror so the inputs feel snappy. Persist via PATCH on each commit.
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState('22:00');
  const [end, setEnd] = useState('07:00');
  const [timezone, setTimezone] = useState<string>(detectTimezone());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!prefs || hydrated) return;
    setEnabled(prefs.quietHours.enabled);
    setStart(prefs.quietHours.start);
    setEnd(prefs.quietHours.end);
    // If the server has 'UTC' (the default for users who never edited prefs),
    // prefer the browser-detected zone. The user can override on save.
    setTimezone(
      prefs.quietHours.timezone && prefs.quietHours.timezone !== 'UTC'
        ? prefs.quietHours.timezone
        : detectTimezone()
    );
    setHydrated(true);
  }, [prefs, hydrated]);

  const isInvalid = enabled && start === end;

  function handleToggleEnabled(next: boolean) {
    setEnabled(next);
    if (next) {
      // Save immediately with the current local state (the user can refine
      // the inputs and the next blur will persist again).
      persist({
        enabled: true,
        start,
        end,
        timezone,
      });
      // Auto-focus the start input on first enable (per Q2 amendment).
      // setTimeout 0 lets the disabled→enabled transition complete.
      setTimeout(() => {
        startRef.current?.focus();
      }, 0);
    } else {
      persist({ enabled: false });
    }
  }

  function persist(patch: Partial<NonNullable<typeof prefs>['quietHours']>) {
    update.mutate(
      { quietHours: patch },
      {
        onError: (err) => {
          toast({
            title: 'Save failed',
            description: err.message,
            variant: 'destructive',
          });
        },
      }
    );
  }

  function commitStart(value: string) {
    setStart(value);
    if (enabled && value !== end) persist({ start: value });
  }
  function commitEnd(value: string) {
    setEnd(value);
    if (enabled && value !== start) persist({ end: value });
  }
  function commitTimezone(value: string) {
    setTimezone(value);
    if (enabled) persist({ timezone: value });
  }

  if (isLoading || !prefs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quiet hours</CardTitle>
          <CardDescription className="text-xs">Loading…</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const zoneOptions = buildZoneOptions(timezone);

  return (
    <Card data-testid="quiet-hours-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base">Quiet hours</CardTitle>
            <CardDescription className="text-xs">
              No push during this window. Notifications queue and fire when the window ends.
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggleEnabled}
            aria-label="Enable quiet hours"
            data-testid="quiet-hours-toggle"
            className="cursor-pointer"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="quiet-hours-start" className="text-xs">
              Start
            </Label>
            <input
              ref={startRef}
              id="quiet-hours-start"
              type="time"
              value={start}
              onChange={(e) => commitStart(e.target.value)}
              disabled={!enabled}
              data-testid="quiet-hours-start"
              className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quiet-hours-end" className="text-xs">
              End
            </Label>
            <input
              id="quiet-hours-end"
              type="time"
              value={end}
              onChange={(e) => commitEnd(e.target.value)}
              disabled={!enabled}
              data-testid="quiet-hours-end"
              className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quiet-hours-tz" className="text-xs">
            Timezone
          </Label>
          <select
            id="quiet-hours-tz"
            value={timezone}
            onChange={(e) => commitTimezone(e.target.value)}
            disabled={!enabled}
            data-testid="quiet-hours-tz"
            className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {zoneOptions.map((z) => (
              <option key={z} value={z}>
                {z}
                {z === detectTimezone() ? ' (your timezone)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Status / hint line */}
        <div className="text-xs text-muted-foreground" data-testid="quiet-hours-status">
          {!enabled && <span>Quiet hours are off — notifications fire any time.</span>}
          {enabled && isInvalid && (
            <span className="text-destructive font-medium" data-testid="quiet-hours-invalid">
              Start and end can&apos;t be the same.
            </span>
          )}
          {enabled && !isInvalid && (
            <span>
              Active: {formatTimeRange(start, end, timezone)}
              {spansOvernight(start, end) && (
                <span className="ml-1 opacity-70">(spans overnight)</span>
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatTimeRange(start: string, end: string, timezone: string): string {
  return `${start} – ${end} ${timezone}`;
}
