/**
 * Platform detection — Sprint 5 BATCH 5
 *
 * Decides which set of upload-flow instructions to render (BATCH 4 D2). NOT a
 * security boundary — server-side multipart validation in
 * `server/routes/appleHealth.ts` is the security gate. This helper only
 * affects which UI affordances appear (drag-drop zone vs. inline-checklist
 * for the iOS Files-app handoff).
 *
 * Four buckets:
 *   - 'ios'              — iPhone, iPad in iOS-shape mode, iPod. Show inline numbered checklist.
 *   - 'ipad-desktop-mode' — iPad with "Request Desktop Website" toggled. UA
 *                          says desktop but file picker constraints are still
 *                          iOS-shaped. We surface the desktop drag-drop UI
 *                          (it works — file-picker fallback button suffices),
 *                          but capture this bucket separately so BATCH 5's
 *                          real-device test matrix has an explicit entry per
 *                          BATCH 4 sub-question 5.
 *   - 'android'          — Android. Standard file picker handles .zip cleanly.
 *                          Desktop drag-drop UI would not work; render a
 *                          simplified mobile picker affordance.
 *   - 'desktop'          — macOS / Windows / Linux desktop browsers. Drag-drop
 *                          zone with file-picker fallback button.
 *
 * Detection sources:
 *   - navigator.userAgent (primary)
 *   - navigator.platform + maxTouchPoints (iPad-on-iPadOS-13+ desktop UA spoof)
 *   - navigator.platform alone (fallback)
 *
 * The iPad-desktop-mode detection mirrors `isIosNonStandalone` in
 * pushSubscription.ts: navigator.platform === 'MacIntel' AND
 * navigator.maxTouchPoints > 1 indicates iPad pretending to be a Mac. We
 * combine that with a UA check that DOESN'T contain iPad/iPhone/iPod (because
 * desktop-mode has stripped those tokens) — that combination is iPad in
 * desktop-mode specifically, not a real Mac.
 */

export type Platform = 'ios' | 'ipad-desktop-mode' | 'android' | 'desktop';

export interface PlatformDetectionResult {
  platform: Platform;
  /** Raw navigator.userAgent for diagnostics. Stored on the import row's
   *  raw_payload column would be too leaky; this is for client-side only. */
  userAgent: string;
}

/**
 * Detect platform from browser globals. Returns 'desktop' as a safe default
 * when called in non-browser contexts (SSR, tests without happy-dom, etc.) so
 * server-rendered or test-rendered components don't crash.
 */
export function detectPlatform(): PlatformDetectionResult {
  if (typeof navigator === 'undefined') {
    return { platform: 'desktop', userAgent: '' };
  }
  const ua = navigator.userAgent || '';
  const platform = computePlatform(ua, navigator.platform, navigator.maxTouchPoints);
  return { platform, userAgent: ua };
}

/**
 * Pure detection logic, exported for testability. Tests pass synthetic
 * UA / platform / maxTouchPoints triples and assert the bucket.
 */
export function computePlatform(
  userAgent: string,
  platform: string,
  maxTouchPoints: number
): Platform {
  const ua = userAgent.toLowerCase();

  // iOS-shape devices: iPhone / iPod / iPad in iOS UA mode (no desktop spoof).
  // iPad UA contains 'ipad' when desktop mode is OFF; switching ON strips
  // 'ipad' from the UA and surfaces 'macintosh' instead.
  if (/iphone|ipod/.test(ua)) return 'ios';
  if (/ipad/.test(ua)) return 'ios';

  // iPad in "Request Desktop Website" mode: UA looks like macOS, but the
  // device is touch-first. The maxTouchPoints > 1 signal disambiguates a
  // real Mac (no touch, maxTouchPoints === 0) from an iPad spoofing macOS.
  // Real MacBooks with Touch Bar still report maxTouchPoints === 0;
  // touchpad gestures don't count.
  if (platform === 'MacIntel' && maxTouchPoints > 1) return 'ipad-desktop-mode';

  if (/android/.test(ua)) return 'android';

  // Default: desktop. Catches macOS, Windows, Linux, and unknown UAs.
  return 'desktop';
}

/**
 * True for any iOS-shape device (iPhone / iPad-iOS-mode / iPad-desktop-mode).
 * The shared property: WebKit file picker constraints apply. Used by the
 * upload flow to decide whether to render the inline iOS file-picker
 * instructions even when the desktop UA is shown.
 */
export function isIosShape(p: Platform): boolean {
  return p === 'ios' || p === 'ipad-desktop-mode';
}
