# Sprint 3 — Wellness Check-In UI Design Brainstorm

**Status:** Awaiting approval. NO UI code is written until this document is approved.
**Sprint:** 3 (Daily Wellness Check-In) — keystone of Phase B Sensor Web.
**Surface:** `/wellness` route + dashboard hint card.
**State machine:** State A (Ritual) → State B (Summary) → State C (Empty).
**Dependencies already in tree:** shadcn `Slider` (Radix-based), `CircularProgressRing` (Apple-Watch-style open ring with gradient + auto-color + framer-motion animation), role-aware `bg-primary` token, role icon set (RoninIcon/GuruIcon/DiscipleIcon at 128px), `ActionButton` premium component, established Drawer/Dialog responsive sheet pattern.

The aesthetic anchor is the Ronin landing — dark luxury, gold/role-color accent, Playfair Display for emotional moments, Inter for data. Wellness is a daily ritual screen that needs to feel calmer than the rest of the app, not louder. Slider clusters in fitness/wellness products tend to drift toward "medical form" if the visual treatment is too literal, or "video game character creator" if it's too playful. The brief is somewhere between — dignified, intentional, no clutter.

Six decisions below. Each presents the candidate options, the recommendation, and the trade-off accepted.

---

## Decision 1 — Slider visual treatment

The wellness check-in has 6 sliders (energy, stress, soreness, sleep quality, hunger, mood). All are 1–10 integer scales. The user must answer them quickly — the 30-second target is real.

**Options:**

**A) Native `<input type="range">` with custom CSS thumb/track styling.**
Pros: maximum performance, native touch behavior, free arrow-key keyboard nav. No JS dependency on each interaction.
Cons: cross-browser CSS quirks for thumb styling; `aria-valuenow` requires manual binding; tap-to-set on track is not free (browsers vary).

**B) shadcn `Slider` (already in tree, Radix-UI under the hood).**
Pros: already used by the design system, established `bg-primary` role-color theming via existing `<SliderPrimitive.Range>` styles, accessibility built in (keyboard arrows, focus ring, `role="slider"`, `aria-valuemin/max/now`, `aria-orientation`, screen-reader announcements). Tap-to-set on track works out of the box. Touch handling is well-tested by Radix.
Cons: framework dependency. Marginally more JS per interaction. The default thumb is a 20px ringed circle — needs sizing for thumb-friendly touch (min 44px hit target via padding).

**C) Custom framer-motion drag-only slider.**
Pros: total control over feel. Could use spring physics on thumb release.
Cons: re-implementing accessibility (we'd be writing aria + keyboard handlers ourselves); higher risk for the time budget; framer-motion bundle is already on the §FE-7 hit list — adding more uses moves us in the wrong direction.

**Anchor labels at low/high ends:** text vs emoji vs icons.

- Text alone is dignified but can feel medical ("Low / High").
- Emoji is quick to read but reads juvenile against Playfair Display.
- Icons are the middle ground — 16px lucide glyphs, role-color tinted at 50% opacity, paired with one-word text underneath.

**Recommendation: B + custom thumb sizing + icon+word anchors + tap-to-set + numeric value display above the track.**

Concretely: shadcn `Slider` extended via `className` overrides — track 4px tall (was 2px) for visual presence, thumb 24px on desktop / 32px on mobile (touch ergonomics), `bg-primary` track range, `bg-primary` thumb fill with `border-2 border-background`. Above the track, the current value renders large (text-3xl, tabular-nums) so the user gets unambiguous feedback. Below the track, the question text (e.g. "Energy") reads as a tab-style label on the left, anchor icons + words at the two ends ("Drained" / "Charged" — the band is dark teal → bright primary visually). All anchor text uses `text-muted-foreground` so they don't compete with the live value readout.

A brief opacity transition (200ms) on the track range + a 1.05 scale on the thumb during `:active` is the only motion. No spring physics, no over-the-top haptics.

**Trade-off accepted:** we depend on Radix; we get accessibility + battle-tested touch in exchange. The sizing override means we can't share styles 1:1 with the existing in-tree Slider (the body-metrics surfaces don't use it currently; this is the first usage anyway). Wellness gets its own size profile, registered via a className convention (`wellness-slider`) so future surfaces using the slider for non-wellness purposes aren't affected.

---

## Decision 2 — Toggle pill design

Three behavior toggles below the sliders: caffeine, alcohol, ate breakfast. Each is on/off (3-state — on, off, untouched — would dilute the speed of the ritual).

The codebase already has a strong pill pattern in `PhotosTab.tsx:117-132` — a `<button role="radio">` with `aria-checked` + `bg-primary text-primary-foreground` (active) / `bg-card border-border/40 text-muted-foreground` (inactive). It's not a separate `FilterChip` component — it's an inline implementation. The visual is right; the question is whether to extract or duplicate.

**Options:**

**A) Inline duplicate of the PhotosTab pattern.**
Pros: zero refactor; visual identity is locked in by precedent.
Cons: third copy of essentially the same pattern (PhotosTab pose filters, BodyMetricsTrends time range, now wellness toggles).

**B) Extract a shared `Pill` primitive in `@/components/ui/premium/`, retrofit PhotosTab and BodyMetricsTrends.**
Pros: DRY; single source of style truth for role-aware pills going forward.
Cons: scope creep into Sprint 3 from a Sprint-2-touched file; risk of breaking existing usages; extraction without a clean naming consensus invites future refactor churn.

**C) Use shadcn `Toggle` primitive.**
Pros: built-in accessibility (`aria-pressed`); Radix-tested.
Cons: visual mismatch — shadcn's default Toggle is rectangular and ghost-styled; would diverge from the established pill chip aesthetic; would either need heavy override (defeating the point) or import a new visual language.

**Recommendation: A (inline duplicate) for Sprint 3, with a follow-up tracked in tech debt.**

The existing pill implementation is 13 lines. Reproducing it here — with `role="switch"` + `aria-checked` semantics rather than `role="radio"` since we're not in a single-select group — costs nothing. Doing the extraction in Sprint 3 risks introducing visual regressions in already-shipped surfaces during a sprint that's focused elsewhere. Add `§DS-7 Pill primitive extraction` to the tech debt log so it's not forgotten.

Layout: the 3 toggles sit in a single horizontal row on desktop, single horizontal row that wraps to two on narrow mobile (390px). Each toggle is full word + leading icon (Coffee / Wine / Croissant from lucide). Off state shows muted icon + word. On state shows role-color icon + word + filled background. Tap target ≥44px tall.

**Trade-off accepted:** one more inline copy of the pattern. The §DS-7 entry compensates.

---

## Decision 3 — Readiness score hero composition (State B)

After the user submits, State B reveals the readiness score. This is the emotional payoff. Three visual layers of decision: ring composition, factor breakdown, role color.

**Ring composition options:**

**A) Reuse `CircularProgressRing` (already in tree at `solo-dashboard/CircularProgressRing.tsx`).**
Pros: established Apple-Watch-style open ring with 8% gap at 12 o'clock, gradient option (primary→primary 40%), framer-motion stroke-dasharray reveal, `prefers-reduced-motion` respect, auto color shift (red <50, amber <80, green ≥80). Same component already powers the Recovery widget at size=150. Reusing maintains visual cohesion across recovery + wellness surfaces, which both live in the "recovery" notification category — the visual link reinforces the conceptual one.
Pros (continued): zero new code, just compose around it.
Cons: the auto-color (red/amber/green) is hard-coded to a 50/80 split — the readiness band thresholds may diverge. Currently fine — readiness uses the same conceptual band (low/medium/high). Worst case we override the color via the `color` prop with a role-aware token.

**B) Build new ring from scratch with linear gradient through bands (red → amber → green along the arc).**
Pros: visually distinctive; the gradient itself communicates that the score has bands.
Cons: building new SVG when there's a perfectly good one in the tree. Adds another circular-progress component to the codebase. The "bands as gradient" idea sounds elegant but in practice reads confusingly — a 73 score arc that ends in the amber section visually communicates "almost in the green" which is correct but only if the user knows the band boundaries. Without labeling, the gradient is decorative.

**C) `AnimatedCircularProgressBar` (also in tree at `ui/animated-circular-progress-bar.tsx`).**
Pros: existing, fancier (separate animated stroke for the unfilled portion).
Cons: not used elsewhere yet; doesn't have gradient or open-ring with gap; visual idiom diverges from Recovery widget.

**Factor breakdown:**
The `factors` array from the v0 algorithm is the source. Up to three rows: Subjective, Training Load, Recovery. Each row shows label + score + weight as a small bar. Missing inputs render with a "Connect a wearable to improve confidence" link instead of a number — surfaces the upsell exactly where the data gap is felt. (Per the v0 algorithm decision in `decisions.md` — missing inputs reduce confidence, not score.)

**Role color:**
A single role-color rotation. Ronin: purple gradient. Guru: gold gradient. Disciple: teal gradient. The `bg-primary` / `hsl(var(--primary))` tokens already wire this up. No score-band color shift — the score-band signal is communicated by the contextual headline copy ("You're charging today" at 80+, "Steady" at 50–79, "Take it slow" below 50), not by changing ring color away from role identity. Keeping the ring role-locked preserves the brand cohesion the visual audit flagged as broken in §DS-1.

**Recommendation:**

- Ring: **A** — reuse `CircularProgressRing` with `gradient={true}`, `id="wellness"` to disambiguate the gradient defs from Recovery's, `size=200` desktop / `size=160` mobile, `strokeWidth=14` (chunkier than Recovery's 10 — wellness ring is hero on its own page, Recovery is a widget).
- Number rendering: large Playfair Display number inside the ring, tabular-nums, with a small "/100" suffix in muted Inter and the band copy ("Charging" / "Steady" / "Take it slow") below.
- Factor breakdown: vertical stack of three rows on mobile, horizontal row of three cards on desktop (≥md). Each card has label (text-xs uppercase muted), score number (text-2xl tabular-nums), thin role-color bar, and either a contribution percent footer ("contributes 30% to your readiness") or a missing-input upsell row.
- A→B reveal animation: see Decision 4.

**Trade-off accepted:** the ring color is role-locked and doesn't visually flip to red/amber on low scores. Headline copy shoulders the "your readiness is low" signal. This trades a small communicative redundancy for brand cohesion, which the visual audit explicitly demanded.

---

## Decision 4 — A→B transition animation

The user's just submitted. The page is now revealing what the algorithm computed. This is the moment that turns "another form" into "the daily ritual." Three candidate moves:

**A) Continuous morph — sliders fade out in place; the readiness ring grows from the center; the form fields collapse and the ring expands into their position.**
Pros: visually beautiful. Conveys "your inputs became this score."
Cons: high engineering cost — coordinating layout transitions across two structurally different DOMs is a framer-motion `LayoutId` job, with edge cases in mobile. High risk for the time budget.

**B) Fade-out → fade-in with hard break.**
Pros: simple, fast, hard to break.
Cons: emotional flatness. The ritual deserves more than a 200ms cross-fade.

**C) Fade-out form + score number animates from 0 → final value (count-up) inside the ring + ring arc draws from 0% to final % + factor cards stagger in below.**
Pros: legible and emotional. The count-up reveal is exactly the kind of thing the `frontend-design` skill calls out as "one well-orchestrated page-load with staggered reveals creates more delight than scattered micro-interactions" (DS-4 deferred audit). The ring's existing framer-motion stroke-dasharray reveal already does the arc draw — we're free-riding on a built-in. Count-up on the number requires a small `useEffect` with `requestAnimationFrame`, ~30 lines.
Cons: `prefers-reduced-motion` users get an instant final value (no count-up, no arc draw) — but that's the correct behavior; framer-motion + `useReducedMotion` already wired into `CircularProgressRing`.

**Recommendation: C — staged reveal.**

Sequence:

1. User taps "See my readiness" — fade form out (200ms, `motion-safe:fade-out`).
2. State swaps. Ring container appears with arc at 0% (300ms beat — gives the eye time to find the new visual center).
3. Ring arc animates from 0 → final score (1000ms, ease-out — uses existing `CircularProgressRing` motion).
4. In parallel, number counts up from 0 → final score (1000ms, locked-step with the arc).
5. Band copy ("Charging" / "Steady" / "Take it slow") fades in at 800ms (slight overlap with the count-up so the headline arrives before the count finishes — readable feel).
6. Factor cards stagger in below at 1100ms / 1250ms / 1400ms (100ms beats; small).
7. Total elapsed: ~1.5s from submit-tap to fully revealed. Under the 30-sec budget by an order of magnitude.
8. `prefers-reduced-motion`: skip steps 2–6 timings; render final state immediately with no count-up, no stagger. Skipping is on the user's side, not ours — the `useReducedMotion()` hook returns true and we branch.

**Trade-off accepted:** we don't do the continuous morph (option A). The staged reveal is 80% of the emotional payoff for 20% of the engineering effort, and is robust on mobile.

---

## Decision 5 — Empty state copy variants per role (State C)

State C is "no entry today, ritual not yet started" — the entry point. The brief calls for distinct voices.

**Ronin (solo)**

- **Headline:** "How are you feeling today?"
- **Subtitle:** "30 seconds. Six sliders, three toggles, one note. Your AI coach learns from this — and so do you."
- **CTA:** "Start today's check-in"
- **Voice rationale:** Ronin is alone, motivated, training for themselves. The voice is direct, slightly intimate ("you"), promises payoff (AI coach learns).

**Guru (trainer)**

- **Headline:** "Track your own readiness."
- **Subtitle:** "Same wellness check-in your clients get — for yourself. Daily readiness data feeds your own dashboards."
- **CTA:** "Start today's check-in"
- **Voice rationale:** Guru is a trainer first — they spend their day thinking about clients. The voice acknowledges they'll recognize the form ("same one your clients get") and grounds the value in their workflow ("feeds your own dashboards"). Quietly business-like.

**Disciple (client)**

- **Headline:** "How are you feeling today?"
- **Subtitle:** "30 seconds tells your trainer how to coach you better. You control what they see — change anytime in Privacy."
- **CTA:** "Start today's check-in"
- **Secondary line (small, below CTA, only if `shareWellnessWithTrainer === false`):** "Currently kept private. Tap to share."
- **Voice rationale:** Disciple's check-in produces data that gets shared by default with their Guru. The Sprint 1 Privacy precedent is that the share question is foregrounded honestly. The subtitle frames the value ("better coaching") and the control ("you decide") in one breath. The conditional secondary line surfaces opt-out state without dredging it up if the user already opted in.

All three: 128px role icon (RoninIcon / GuruIcon / DiscipleIcon at `variant="default"`) above the headline. Playfair Display headline. Inter body. Established empty-state shape (matches `BodyMetricsEmptyState`).

**Trade-off accepted:** Disciple gets a slightly longer subtitle (mentions Privacy). The honesty pays back the cost.

---

## Decision 6 — Mobile keyboard handling on the notes accordion

The "Add a note" accordion sits below the toggles. When opened, the textarea takes focus; on iOS/Android the keyboard pops up and consumes ~50% viewport. The risk is that the sticky CTA ("See my readiness") gets pushed off-screen, leaving the user staring at a textarea with no visible submit affordance.

**Options:**

**A) Match the existing `LogBodyMetricsSheet` pattern: rely on Drawer's intrinsic `max-h-[90vh] overflow-y-auto` to handle keyboard collision.**
Pros: zero new code; pattern already shipped on body-metrics surfaces.
Cons: in practice, the wellness page is **not** a Drawer — it's a full route at `/wellness`. The intrinsic Drawer scrolling doesn't apply. The page itself is the scroll container.

**B) Add explicit `scrollIntoView({ block: 'center', behavior: 'smooth' })` on textarea focus.**
Pros: deterministic — the textarea is guaranteed to land in the visible center; CTA naturally remains visible above (or scrolls into reach below); works on every browser; ~5 lines.
Cons: smooth-scroll on rapid focus events can feel jittery. Mitigate by debouncing (only fire if not already in view).

**C) `inputMode="text"` + `enterKeyHint="done"` + `position: sticky` CTA bar that pins to viewport bottom (above keyboard).**
Pros: CTA always reachable; no scroll required.
Cons: fixed-positioning when an iOS keyboard is up has historically been buggy — `position: sticky` and `position: fixed` both have edge cases when the visual viewport shrinks. The `visualViewport` API can correct for this, but adding viewport listeners is non-trivial scope.

**Recommendation: B — explicit `scrollIntoView({ block: 'center' })` on textarea focus, plus `enterKeyHint="done"` for completeness.**

Implementation: an `onFocus` handler on the textarea that calls `e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' })` after a 100ms delay (gives the keyboard time to start animating in so the layout calculation reflects the shrunken viewport). The CTA is in the page flow below — once the textarea is centered, the CTA is naturally one swipe away.

For the broader "is the CTA reachable when the keyboard is up" question, we add a sticky behavior **only on the CTA** (`md:relative sticky bottom-4 z-10`), so on mobile the submit button stays pinned above the keyboard, and on desktop it sits in normal flow. `position: sticky` with `bottom: 4` is well-supported, and unlike `position: fixed` it cleanly disengages once the keyboard closes. We forgo the `visualViewport` API.

**Trade-off accepted:** there's a 100ms delay before the textarea centers (intentional, lets the keyboard animation settle). Users typing fast won't notice. Slow-network or older devices may see the scroll pop slightly after the cursor — acceptable.

---

## Summary table — what BATCH 4 will build, given approval

| Decision          | Choice                                                                               | Implementation hook                                               |
| ----------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 1. Slider         | shadcn `Slider` w/ wellness sizing + tap-to-set + icon-word anchors + value readout  | `client/src/components/wellness/WellnessSlider.tsx` (new wrapper) |
| 2. Toggle pill    | Inline duplicate of PhotosTab pattern; `role="switch" aria-checked`                  | inline in `WellnessRitual.tsx`                                    |
| 3. Readiness hero | `CircularProgressRing` reuse, role-locked color, large Playfair number, factor cards | `client/src/components/wellness/ReadinessHero.tsx`                |
| 4. A→B transition | Staged reveal: form fade → ring grow + count-up → headline → factors stagger         | `framer-motion` + `prefers-reduced-motion` branch                 |
| 5. Empty copy     | Three role-distinct headline+subtitle+CTA; Disciple has conditional privacy hint     | `client/src/components/wellness/WellnessEmptyState.tsx`           |
| 6. Keyboard       | `scrollIntoView({block:'center'})` on textarea focus + sticky-bottom CTA on mobile   | `WellnessRitual.tsx` textarea + ActionButton container            |

---

## Out of scope for this brainstorm (and why)

- **Dashboard hint card design.** Visual treatment will mirror existing dashboard widget pattern (`bg-card rounded-2xl p-4 border border-border/20`) with a small ring summary + CTA. Trivial composition, will land in BATCH 6 with the cron-live work.
- **Sidebar wellness nav entry.** Same icon language as Body sidebar entry — lucide HeartPulse with role accent. BATCH 6.
- **Streak rendering on Summary.** Already covered by the read-side from BATCH 2 (`getWellnessStreak`); UI is a small chip below the readiness hero — "🔥 5-day streak" treatment matches the existing achievements streak shape. BATCH 5.
- **Edit-existing-entry flow.** State B has an "Edit today's entry" affordance; tapping returns to State A pre-filled. Same form, same submit path; the `isNewInsert` flag guards XP. BATCH 5.

---

## Questions back to reviewer

1. **Slider anchor labels — text or icon-word combo?** Recommendation is icon+word (e.g. lucide `Battery` + "Drained" / `Zap` + "Charged"). Confirm or substitute.
2. **Disciple privacy line "Currently kept private. Tap to share."** — does this follow the Sprint 1 Privacy section copy convention precisely, or do you want a different phrasing?
3. **Band copy thresholds for the Summary headline ("Charging" / "Steady" / "Take it slow").** Recommendation: ≥80 / 50–79 / <50 (matches the established `CircularProgressRing` auto-color thresholds even though we're not using auto-color). Confirm or override.
4. **Should the readiness number be Playfair Display or Inter tabular-nums?** Recommendation is Playfair — it's the emotional moment, and `BiometricsPage`/empty states already use Playfair for hero numerics. Inter would be more "stat tile" and less "ritual."

After approval on these four refinements, BATCH 4 builds the page + ritual + slider/toggle/textarea form. **No code in BATCH 3.**
