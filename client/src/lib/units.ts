/**
 * Unit system display helpers.
 *
 * Storage is always metric (kg, cm) on the server. This module owns the
 * display-side conversion. Toggling units never changes server data.
 *
 * Sprint 2 BATCH 6: cross-device unit preference moved to the server
 * (`users.preferred_units` column) and is exposed via the `useUnits()` hook
 * in `client/src/hooks/useUnits.ts`. The hook handles a one-time migration
 * of any legacy `localStorage.gg_units` value on first load, then clears the
 * key. The `getUnits()` localStorage getter previously exported here was
 * intentionally REMOVED — non-React code paths must read the cached value
 * via `queryClient.getQueryData(['/api/settings/preferred-units'])` if they
 * absolutely need a synchronous read, but most callers should refactor to
 * use the hook from a React component instead.
 */

export type UnitSystem = 'metric' | 'imperial';

// ─── Conversion helpers ─────────────────────────────────────────────────────

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const inToCm = (i: number) => i * CM_PER_IN;

// ─── Display helpers — accept the canonical metric value, return localized string

export function displayWeight(
  kg: number | string | null | undefined,
  units: UnitSystem,
  digits = 1
): string {
  if (kg == null || kg === '') return '—';
  const n = typeof kg === 'string' ? parseFloat(kg) : kg;
  if (!Number.isFinite(n)) return '—';
  return units === 'metric' ? `${n.toFixed(digits)} kg` : `${kgToLb(n).toFixed(digits)} lb`;
}

export function displayLength(
  cm: number | string | null | undefined,
  units: UnitSystem,
  digits = 1
): string {
  if (cm == null || cm === '') return '—';
  const n = typeof cm === 'string' ? parseFloat(cm) : cm;
  if (!Number.isFinite(n)) return '—';
  return units === 'metric' ? `${n.toFixed(digits)} cm` : `${cmToIn(n).toFixed(digits)} in`;
}

export function displayPercent(pct: number | string | null | undefined, digits = 1): string {
  if (pct == null || pct === '') return '—';
  const n = typeof pct === 'string' ? parseFloat(pct) : pct;
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

// ─── Form-side: take the user's typed value (in their unit) and convert to canonical kg/cm

export function toCanonicalWeight(value: number, units: UnitSystem): number {
  return units === 'metric' ? value : lbToKg(value);
}

export function toCanonicalLength(value: number, units: UnitSystem): number {
  return units === 'metric' ? value : inToCm(value);
}

export const weightUnitLabel = (units: UnitSystem) => (units === 'metric' ? 'kg' : 'lb');
export const lengthUnitLabel = (units: UnitSystem) => (units === 'metric' ? 'cm' : 'in');
