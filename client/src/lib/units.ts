/**
 * Unit system preference — stored in localStorage as 'gg_units'.
 *
 * Storage is always metric (kg, cm) on the server. This module owns the
 * display-side conversion. Toggling units never changes server data.
 *
 * TODO Sprint 4+: migrate to userFitnessProfile.preferredUnits column when
 * the granular consent system lands — userFitnessProfile is the natural home
 * for cross-device persistence. Two-device users (phone + desktop) currently
 * see independent toggles per device; that's the deliberate v1 trade-off.
 */

export type UnitSystem = 'metric' | 'imperial';

const KEY = 'gg_units';

export function getUnits(): UnitSystem {
  if (typeof window === 'undefined') return 'metric';
  const v = window.localStorage.getItem(KEY);
  return v === 'imperial' ? 'imperial' : 'metric';
}

export function setUnits(u: UnitSystem) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, u);
}

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
