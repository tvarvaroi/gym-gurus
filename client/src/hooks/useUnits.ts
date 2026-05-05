/**
 * Cross-device unit preference — Sprint 2 BATCH 6
 *
 * Server-backed via `users.preferred_units`, exposed at GET/PATCH
 * /api/settings/preferred-units (added in BATCH 2). This hook replaces the
 * Sprint 1 localStorage `gg_units` flag; the hook also handles the one-time
 * migration of any pre-existing localStorage value to the server.
 *
 * Migration semantics:
 *   - First call after BATCH 6 deploys: if localStorage `gg_units` exists
 *     AND the server's preferred_units is still 'metric' (default), promote
 *     the localStorage value to the server, then clear localStorage.
 *   - If the server has a non-default preferred_units already, the
 *     localStorage value is discarded silently — server wins.
 *   - If the user has localStorage 'metric' and server 'metric', clear the
 *     localStorage entry quietly. No PATCH needed.
 *
 * Loading state contract:
 *   - `isLoading` is true on first mount until either the server query
 *     resolves OR the migration shim runs (whichever wins). Consumers SHOULD
 *     render a muted toggle (or skeleton) during this window so the UI
 *     doesn't flash the wrong unit.
 *   - `units` defaults to 'metric' during loading — explicit fallback so
 *     non-React conversion helpers (still keyed off the server cache) keep
 *     working without crashing.
 *
 * Cross-device sync:
 *   - Default `staleTime` is 30s. After a user changes units on device A,
 *     device B picks it up on the next refetch (focus / mount / interval).
 *   - PATCH writes optimistically update the local cache so the toggle
 *     responds instantly. On error the cache rolls back.
 *
 * The CSRF interceptor in main.tsx auto-injects x-csrf-token on /api state-
 * changing requests; do NOT add it manually here (gotchas.md).
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type UnitSystem = 'metric' | 'imperial';

const PREFERRED_UNITS_KEY = ['/api/settings/preferred-units'] as const;
const LEGACY_LS_KEY = 'gg_units';

// Internal: read the legacy localStorage value (if any). Returns null if
// unset or unrecognized.
function readLegacyLocalStorage(): UnitSystem | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(LEGACY_LS_KEY);
    if (v === 'imperial' || v === 'metric') return v;
    return null;
  } catch {
    return null;
  }
}

function clearLegacyLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LEGACY_LS_KEY);
  } catch {
    // ignore (private mode)
  }
}

interface PreferredUnitsResponse {
  units: UnitSystem;
}

export function useUnits() {
  const qc = useQueryClient();

  const query = useQuery<PreferredUnitsResponse>({
    queryKey: PREFERRED_UNITS_KEY,
    queryFn: async () => {
      const res = await fetch('/api/settings/preferred-units', { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load unit preference (${res.status})`);
      return res.json();
    },
    // 30s stale window — cross-device sync picks up changes on next focus.
    staleTime: 30_000,
  });

  const mutation = useMutation<
    PreferredUnitsResponse,
    Error,
    UnitSystem,
    { previous?: PreferredUnitsResponse }
  >({
    mutationFn: async (next) => {
      const res = await fetch('/api/settings/preferred-units', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ units: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (${res.status})`);
      }
      return res.json();
    },
    // Optimistic update so the toggle responds instantly. On error, roll back.
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: PREFERRED_UNITS_KEY });
      const previous = qc.getQueryData<PreferredUnitsResponse>(PREFERRED_UNITS_KEY);
      qc.setQueryData<PreferredUnitsResponse>(PREFERRED_UNITS_KEY, { units: next });
      return { previous };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.previous) qc.setQueryData(PREFERRED_UNITS_KEY, ctx.previous);
    },
    // No onSettled refetch — server returns the canonical value, we already
    // cached it via onMutate's optimistic write.
    onSuccess: (data) => {
      qc.setQueryData(PREFERRED_UNITS_KEY, data);
    },
  });

  // ─── Migration shim (one-time per browser per user) ───────────────────────
  // Runs whenever the query resolves AND legacy localStorage has a value.
  // The migration is idempotent: once localStorage is cleared, this effect
  // is a no-op forever after.
  useEffect(() => {
    if (!query.data) return;
    const legacy = readLegacyLocalStorage();
    if (legacy === null) return;

    if (query.data.units === 'metric' && legacy === 'imperial') {
      // Server is at default, user had imperial in localStorage → promote.
      mutation.mutate('imperial', {
        onSuccess: () => clearLegacyLocalStorage(),
      });
    } else {
      // All other cases — server already has a non-default value, OR both
      // are 'metric'. Just clear the stale flag; no server write needed.
      clearLegacyLocalStorage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data?.units]);

  return {
    units: query.data?.units ?? 'metric',
    isLoading: query.isLoading,
    error: query.error,
    setUnits: (next: UnitSystem) => mutation.mutate(next),
    isPending: mutation.isPending,
  };
}
