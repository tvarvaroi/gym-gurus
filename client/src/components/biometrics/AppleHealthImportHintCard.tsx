/**
 * AppleHealthImportHintCard — Sprint 5 BATCH 6
 *
 * Discovery surface for the Apple Health import flow (BATCH 4 D1).
 * Renders on /biometrics empty state when ALL four conditions hold:
 *   1. User has zero completed `apple_health_imports` rows
 *   2. User has zero active `wearable_connections` (status IN connected/expired/error)
 *   3. User has not previously dismissed this card
 *   4. User role is solo (Ronin) or client (Disciple) — Gurus excluded
 *
 * The 4-condition AND is computed server-side via
 * `GET /api/apple-health/hint-card/visibility` — single round-trip, server-
 * authoritative. The component renders nothing while loading or while
 * visible=false; only when visible=true does it occupy layout space.
 *
 * "Manual data exists" deliberately doesn't hide the card: a Disciple who's
 * been logging weight manually still benefits from importing Apple Health
 * history. The hint surfaces an import path, not "fill the empty chart"
 * (BATCH 4 D1 amendment 1 explicitly).
 *
 * Dismissal is persistent and per-user. POST /api/settings/dismiss-hint
 * with { hintId: 'appleHealthImport' } persists into the
 * `notification_preferences.hintCards` JSON namespace; the next visibility
 * fetch will return visible=false, and the card disappears.
 *
 * a11y: card is a section with role="region" + aria-label so screen readers
 * announce it as a discoverable region. Both CTA + Dismiss are tap targets
 * ≥44px (Button size="lg").
 */
import { Sparkles, Smartphone, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

interface VisibilityResult {
  visible: boolean;
  reason?: string;
}

const QUERY_KEY = ['/api/apple-health/hint-card/visibility'];

export function AppleHealthImportHintCard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: visibility } = useQuery<VisibilityResult>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/apple-health/hint-card/visibility', {
        credentials: 'include',
      });
      if (!res.ok) {
        // Don't show the card on error — fail-safe to "hidden" so a transient
        // /api outage doesn't surface a hint card to a user who shouldn't see it.
        return { visible: false, reason: 'fetch-error' };
      }
      return res.json();
    },
    // Stable for the page render; user actions (uploading, connecting wearable,
    // dismissing) invalidate this manually.
    staleTime: 5 * 60 * 1000,
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/settings/dismiss-hint', {
        hintId: 'appleHealthImport',
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate the visibility query so the card disappears on next render.
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  // Render nothing during loading OR when not visible. The card occupies zero
  // layout space until we know it should appear.
  if (!visibility?.visible) return null;

  return (
    <section
      role="region"
      aria-label="Import your Apple Health data"
      className="bg-card border-border/40 relative mb-6 overflow-hidden rounded-2xl border p-6 sm:p-8"
      data-testid="apple-health-hint-card"
    >
      {/* Dismiss button — top-right corner, generous tap area via padding */}
      <button
        type="button"
        onClick={() => dismissMutation.mutate()}
        disabled={dismissMutation.isPending}
        aria-label="Dismiss this hint"
        data-testid="dismiss-hint"
        className="text-muted-foreground hover:text-foreground absolute right-3 top-3 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex items-start gap-4 sm:gap-6">
        {/* Decorative icon block — gold/role accent gradient */}
        <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14">
          <Smartphone className="text-primary h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
        </div>

        <div className="min-w-0 flex-1 pr-10 sm:pr-12">
          <h3 className="font-['Playfair_Display'] text-foreground mb-2 text-xl sm:text-2xl">
            Got an iPhone? Import your Apple Health data.
          </h3>
          <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
            Bring years of sleep, workouts, body metrics, and vitals from your iPhone into your
            GymGurus history. One upload, complete picture — no recurring sync, no provider account.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => setLocation('/settings?tab=imports')}
              className="cursor-pointer"
              data-testid="hint-card-cta"
            >
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              Import
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => dismissMutation.mutate()}
              disabled={dismissMutation.isPending}
              className="text-muted-foreground cursor-pointer"
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
