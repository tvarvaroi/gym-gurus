/**
 * Inline user-agent parser — Sprint 2 BATCH 5
 *
 * Returns "Browser on OS" labels for the active devices list in
 * Settings → Notifications without a heavyweight dependency. Covers
 * Chrome / Edge / Safari / Firefox / Opera × macOS / Windows / iOS /
 * Android / Linux which is ~95% of real-world traffic.
 *
 * Anything unrecognised falls back to "Browser" / "Device" / "Browser on Device"
 * — never throws, never reads as a stack trace.
 *
 * Sprint 12 (Capacitor native shell): replaces this stopgap with the
 * `platform` field from the push_subscriptions row (already populated as
 * `web` / `ios_pwa` and will gain `ios_native` / `android_native`). Once
 * platform reliably indicates the right label, this module is deleted.
 */

export interface ParsedUA {
  browser: string;
  os: string;
  /** "Chrome on Mac" — concise label for the Active Devices list */
  label: string;
}

const BROWSER_PATTERNS: Array<[RegExp, string]> = [
  // Order matters: Edge contains "Chrome", Opera contains "Chrome"/"Safari", etc.
  [/Edg(?:e|A|iOS)?\//i, 'Edge'],
  [/OPR\//i, 'Opera'],
  [/Opera\//i, 'Opera'],
  [/Firefox\//i, 'Firefox'],
  [/FxiOS\//i, 'Firefox'],
  [/Chrome\//i, 'Chrome'],
  [/CriOS\//i, 'Chrome'],
  [/Safari\//i, 'Safari'],
];

const OS_PATTERNS: Array<[RegExp, string]> = [
  // Order matters: iPad reports as "Macintosh" on iPadOS 13+, so iOS detection
  // must come before macOS. (We don't have access to navigator.maxTouchPoints
  // here — that's checked in pushSubscription.ts at subscription time.)
  [/iPhone|iPod/i, 'iPhone'],
  [/iPad/i, 'iPad'],
  [/Android/i, 'Android'],
  [/Mac OS X|Macintosh/i, 'Mac'],
  [/Windows NT/i, 'Windows'],
  [/CrOS/i, 'ChromeOS'],
  [/Linux/i, 'Linux'],
];

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) {
    return { browser: 'Browser', os: 'Device', label: 'Browser on Device' };
  }
  const browser = BROWSER_PATTERNS.find(([re]) => re.test(ua))?.[1] ?? 'Browser';
  const os = OS_PATTERNS.find(([re]) => re.test(ua))?.[1] ?? 'Device';
  return { browser, os, label: `${browser} on ${os}` };
}
