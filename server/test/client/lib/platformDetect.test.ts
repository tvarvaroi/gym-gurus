/**
 * Platform detection tests — Sprint 5 BATCH 5.
 *
 * Pure-function tests for the client-side platform helper. Lives under
 * server/test/ because the project's vitest config only scans server/** and
 * shared/**; the helper itself imports nothing DOM-specific (`computePlatform`
 * takes UA + platform + maxTouchPoints as args), so co-locating the test
 * here doesn't break anything.
 *
 * The most subtle case: iPad in "Request Desktop Website" mode. Real iPads
 * report `navigator.platform === 'MacIntel'` AND `maxTouchPoints > 1` —
 * indistinguishable from a Mac on UA alone. The maxTouchPoints disambiguator
 * is load-bearing for BATCH 4 sub-question 5 (the iPad-with-desktop-mode
 * test variant).
 */
import { describe, it, expect } from 'vitest';
import {
  computePlatform,
  isIosShape,
  type Platform,
} from '../../../../client/src/lib/platformDetect';

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  ipadIosMode:
    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  ipadDesktopMode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  linuxFirefox: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
} as const;

describe('computePlatform', () => {
  it('detects iPhone', () => {
    expect(computePlatform(UA.iphone, 'iPhone', 5)).toBe<Platform>('ios');
  });

  it('detects iPad in iOS UA mode', () => {
    expect(computePlatform(UA.ipadIosMode, 'iPad', 5)).toBe<Platform>('ios');
  });

  it('detects iPad in "Request Desktop Website" mode (MacIntel + touch points)', () => {
    expect(computePlatform(UA.ipadDesktopMode, 'MacIntel', 5)).toBe<Platform>('ipad-desktop-mode');
  });

  it('detects real Mac (MacIntel + zero touch points)', () => {
    expect(computePlatform(UA.macSafari, 'MacIntel', 0)).toBe<Platform>('desktop');
    expect(computePlatform(UA.macChrome, 'MacIntel', 0)).toBe<Platform>('desktop');
  });

  it('detects Android', () => {
    expect(computePlatform(UA.android, 'Linux armv8l', 5)).toBe<Platform>('android');
  });

  it('detects Windows desktop', () => {
    expect(computePlatform(UA.windowsChrome, 'Win32', 0)).toBe<Platform>('desktop');
  });

  it('detects Linux desktop', () => {
    expect(computePlatform(UA.linuxFirefox, 'Linux x86_64', 0)).toBe<Platform>('desktop');
  });

  it('falls back to desktop on unknown UA', () => {
    expect(computePlatform('SomeFutureBrowser/1.0', 'Unknown', 0)).toBe<Platform>('desktop');
  });

  it('iPhone UA wins over MacIntel platform (handheld device priority)', () => {
    expect(computePlatform(UA.iphone, 'MacIntel', 5)).toBe<Platform>('ios');
  });
});

describe('isIosShape', () => {
  it('returns true for ios + ipad-desktop-mode (both have iOS file picker constraints)', () => {
    expect(isIosShape('ios')).toBe(true);
    expect(isIosShape('ipad-desktop-mode')).toBe(true);
  });

  it('returns false for android + desktop', () => {
    expect(isIosShape('android')).toBe(false);
    expect(isIosShape('desktop')).toBe(false);
  });
});
