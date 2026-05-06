# Sprint 3 — Wellness Check-In UI Design Brainstorm

**Status:** APPROVED 2026-05-06. All 6 decisions + 4 follow-ups locked with amendments noted in the "Locked answers" sections. This is the canonical implementation contract for BATCH 4.
**Sprint:** 3 (Daily Wellness Check-In) — keystone of Phase B Sensor Web.
**Surface:** `/wellness` route + dashboard hint card.
**State machine:** State A (Ritual) → State B (Summary) → State C (Empty).
**Dependencies already in tree:** shadcn `Slider` (Radix-based), `CircularProgressRing` (Apple-Watch-style open ring with gradient + auto-color + framer-motion animation), role-aware `bg-primary` token, role icon set (RoninIcon/GuruIcon/DiscipleIcon at 128px), `ActionButton` premium component, established Drawer/Dialog responsive sheet pattern.

The aesthetic anchor is the Ronin landing — dark luxury, gold/role-color accent, Playfair Display for emotional moments, Inter for data. Wellness is a daily ritual screen that needs to feel calmer than the rest of the app, not louder. Slider clusters in fitness/wellness products tend to drift toward "medical form" if the visual treatment is too literal, or "video game character creator" if it's too playful. The brief is somewhere between — dignified, intentional, no clutter.

Six decisions below. Each presents the candidate options, the recommendation, and the trade-off accepted.

---

## Decision 1 — Slider visual treatment

The wellness check-in has 6 sliders, mapped 1:1 to the locked schema columns from BATCH 1 (`shared/schema.ts:1100`): **energy** → `energyLevel`, **mood** → `moodScore`, **stress** → `stressLevel` (algorithm-inverted), **sleep quality** → `sleepQualitySubjective`, **motivation** → `motivationLevel`, **soreness** → `sorenessOverall` (algorithm-inverted). All are 1–10 integer scales. The user must answer them quickly — the 30-second target is real. _(Earlier draft of this paragraph mentioned "hunger" — that was a placeholder; schema is the canonical source of truth and contains no hunger field.)_

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

Three wellness-behavior toggles below the sliders, mapped to schema booleans (`shared/schema.ts:1117`): **Hit my water goal** → `hydrationGoalMet`, **Stepped outside** → `steppedOutside`, **Meditated** → `meditationCompleted`. Each is on/off (3-state — on, off, untouched — would dilute the speed of the ritual). _(Earlier draft mentioned "caffeine, alcohol, breakfast" — those were placeholder concepts; the schema models wellness behaviors users actively did, not consumption logging. Schema is the canonical source.)_

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

**Implementation contract — leave a discoverability marker.** When the inline pill block lands in `WellnessRitual.tsx`, prefix it with this exact one-line comment:

```tsx
// TODO §DS-7: extract to <RolePill> when filter chips, toggle pills, and selection chips converge.
```

The same comment goes on the existing duplicates in `PhotosTab.tsx:117` and `BodyMetricsTrends.tsx` (wherever the time-range pills live) **as part of BATCH 4**. Three identical TODO markers means whoever does §DS-7 in a future sprint can `grep` for the marker and find every site at once. Without the markers, the §DS-7 work has to grep for visual patterns — slow and incomplete.

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

### Streak-aware timing (locked)

A daily ritual seen 365× per year cannot use a 1.5s reveal forever. After the user has seen the choreography 30 days in a row, "delight" becomes "friction." Timing scales by streak:

| User state                                          | Total reveal | Step durations                                                                  |
| --------------------------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| First-time / no prior streak (`streak.current ≤ 1`) | **1.2s**     | form-fade 200ms · arc+count 1000ms · headline 700ms · cards stagger 100ms beats |
| Returning user with streak (`streak.current > 1`)   | **0.6s**     | form-fade 100ms · arc+count 500ms · headline 350ms · cards stagger 50ms beats   |
| `prefers-reduced-motion: reduce`                    | **instant**  | no count-up, no stagger, final state rendered immediately                       |

Detection: the `streak.current` field is already in the `POST /api/wellness/log` response shape (BATCH 2's `streakUpdate.current`). No extra state, no extra fetch — the same network round-trip that delivers the score also delivers the streak count. Branch on it client-side when picking timing constants.

**Rationale comment required at the timing constants.** The two-tier timing exists for a specific reason that future Claude / future-us will not figure out from the code alone. Bake this comment into the constants block in `ReadinessHero.tsx` (BATCH 5):

```ts
// Two-tier reveal timing. NOT a refactor target — the slow tier is for first-time
// users (emotional payoff); the fast tier is for daily returners (a 1.5s reveal
// every day for a year becomes friction, not delight). DO NOT "harmonize" these
// values. Detect via streak.current from the POST /log response. See
// docs/specs/2026-05-06-sprint-3-wellness-ui-design.md Decision 4.
```

Without the comment, a future code-review pass will notice the inconsistency and "fix" it. With the comment, the inconsistency is documented intent.

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

### Real-device verification gate (locked)

iOS Safari's keyboard timing has a specific window that desktop devtools mobile emulation does not replicate. Chrome devtools "iPhone" mode reports a viewport resize but does not actually animate a keyboard or fire the same `visualViewport.resize` cadence. A `scrollIntoView` that lands correctly in devtools emulation can land 200px off in real iOS Safari.

**Pre-merge requirement for BATCH 4:** real iOS Safari verification of the textarea-focus → scroll → CTA-still-visible sequence. Acceptable evidence:

- Screen recording on a real iOS device (or BrowserStack iOS Safari live session) showing focus → keyboard up → textarea centered → CTA visible.
- OR a written confirmation from human review on a real iOS device, captured in the BATCH 4 checkpoint commentary.

Devtools emulation does not satisfy this gate.

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

## Locked answers (was "Questions back to reviewer")

### FQ1 — Slider anchor labels: ICONS ONLY (drop the words)

**Locked:** 16px lucide icons at the two ends of each slider, no accompanying text labels. Icons tinted `text-muted-foreground` at base, brightening to `text-primary` at 50% opacity nearer the active range.

**Rationale:** 6 sliders × 2 anchors × (icon + word) = 24 elements competing for attention on mobile 390px. The slider's own large value readout (text-3xl, tabular-nums) shows the user's pick — anchor word labels reinforcing what "low" means is redundant. Battery / Zap / Frown / Smile / Bed / Coffee / Wine icons are universally legible mobile vocabulary; if a user genuinely doesn't recognize one, they'll figure it out the moment the value readout responds to their slide.

**Per-slider icon pairs (low → high):**
| Question | Low icon | High icon |
| -------- | -------- | --------- |
| Energy | `BatteryLow` | `Zap` |
| Stress | `Smile` | `Frown` (inverted — high stress is low score; see SUBJECTIVE_FIELDS map in `wellnessService.ts`) |
| Soreness | `CheckCircle2` | `Flame` (inverted — high soreness is low score) |
| Sleep quality | `Cloud` | `Moon` |
| Hunger | `Battery` | `Utensils` |
| Mood | `CloudRain` | `Sun` |

(Inverted sliders: the icon set still flows low-icon → high-icon visually, but the readiness algorithm inverts the score contribution. The anchor icons themselves are NOT swapped — high stress shows the high-stress icon at the high end. Score inversion is a backend concern, not a UI one.)

### FQ2 — Disciple privacy line: locked copy

**Locked:** `"Currently private. Change in Settings → Privacy."`

**Rendering:** small line, `text-xs text-muted-foreground`, below the primary CTA. Renders ONLY when `users.shareWellnessWithTrainer === false` (and only on the Disciple empty state).

**Rationale:** matches the exact same wording used in the BiometricsPage Disciple empty state — same pattern means users learn the convention once. The proposed "Tap to share" was misleading because the line is informational, not the share toggle (the toggle lives in Settings → Privacy). "Currently private" beats "Currently kept private" — same meaning, fewer words, less defensive register.

### FQ3 — Band thresholds + locked headline copy

**Locked thresholds:** `score ≥ 80` (high) / `50 ≤ score < 80` (mid) / `score < 50` (low). Matches the existing `CircularProgressRing` auto-color split even though wellness uses role-locked color, not auto-color. Consistency with Recovery scoring elsewhere in the app — same numeric bands across surfaces.

**Locked headline copy:**

| Band            | Headline (locked)                       |
| --------------- | --------------------------------------- |
| score ≥ 80      | **"Today's a green-light day."**        |
| 50 ≤ score < 80 | **"Solid base — listen to your body."** |
| score < 50      | **"Recovery first."**                   |

**Why these picks (vs. alternatives offered):**

- `≥ 80`: "Today's a green-light day." beats "You're firing on all cylinders" — the latter is car-mechanic cliché that reads casual against Playfair Display; the former is concise, universally legible, and lands the "go" signal without leaning on a tired metaphor.
- `50–79`: "Solid base — listen to your body." beats "You're recoverable." — "solid base" is rooted in training language (athletes say it daily), the em-dash gives it the dignified rhythm the dark-luxury aesthetic asks for, and "listen to your body" is universal recovery wisdom. "You're recoverable" reads like a medical-form line.
- `< 50`: "Recovery first." beats "Take it easy today." — punchier, no condescension, and "Recovery" is the named notification category in our taxonomy. The same word does double duty (UI label + technical category) reinforces conceptual unity.

**Locked. Do not drift these strings during implementation.** If a future sprint wants to A/B test alternate copy, that's a separate decision in a separate doc — not an implementation-time edit.

### FQ4 — Readiness number font: Playfair on hero, Inter on hint cards

**Locked typographic rule:**

| Surface                                               | Font                                               | Sizing                     |
| ----------------------------------------------------- | -------------------------------------------------- | -------------------------- |
| `/wellness` hero ring (State B)                       | **Playfair Display**, `font-light`, tracking-tight | 80px desktop / 64px mobile |
| Dashboard hint card "today's score" preview (BATCH 6) | **Inter** tabular-nums                             | 28px                       |
| Future analytics tiles, list views, summaries         | **Inter** tabular-nums                             | per-context                |

**Rationale:** the score number IS the emotional payoff of the ritual when shown at hero scale — Playfair earns its seriousness there. At hint-card size or in a list, the number is informational ("83 entries") not emotional ("your readiness today is 83") — Inter tabular-nums is the right choice. Playfair stays exclusive to the moment.

This is the cleanest typographic rule we can write: **Playfair when the number is the moment, Inter when the number is data.** Locked.

---

## Implementation contract for BATCH 4

After all locks above, BATCH 4 builds:

1. `client/src/pages/WellnessPage.tsx` — route + state machine root (State A / State B / State C). State B is a stub for BATCH 5; BATCH 4 only ships State A + State C.
2. `client/src/components/wellness/WellnessEmptyState.tsx` — three role-distinct copies + locked Disciple privacy line on `shareWellnessWithTrainer === false`.
3. `client/src/components/wellness/WellnessSlider.tsx` — shadcn `Slider` wrapper with custom thumb sizing (24px / 32px), tap-to-set, icon-only anchors, large value readout above. Wellness-specific `className="wellness-slider"` token.
4. `client/src/components/wellness/WellnessRitual.tsx` — 6 sliders + 3 inline toggle pills (with locked TODO §DS-7 marker) + notes accordion + sticky CTA on mobile.
5. **§DS-7 TODO markers** added to `PhotosTab.tsx:117` pose-filter pills and `BodyMetricsTrends.tsx` time-range pills as part of this commit. Three identical markers → one grep in the future.
6. Route wiring: `/wellness` added to `RouterConfig.tsx` + `isPublicPage` triple-check left untouched (route is auth-gated).
7. NO sidebar entry (BATCH 6). NO dashboard hint card (BATCH 6). NO State B implementation (BATCH 5).

**Screenshot pack for BATCH 4 checkpoint:**

- Empty state per role × 3 (Ronin, Guru, Disciple — Disciple includes the privacy line)
- Ritual mid-fill on mobile 390px (some sliders dragged, 2/3 toggles on, notes accordion expanded with text in textarea, sticky CTA visible)
- Ritual mid-fill on desktop 1440px (same form state, desktop layout)
- Save with truly empty form showing the inline hint
- Mobile keyboard test (textarea focused, keyboard simulated visible, CTA still in viewport — devtools emulation, plus a written acknowledgment that real iOS Safari verification is the pre-merge gate)

**Out of BATCH 4 / out of scope:**

- State B / Readiness Hero rendering — BATCH 5
- Edit-existing-entry flow — BATCH 5
- Streak rendering on summary — BATCH 5
- Sidebar wellness nav entry — BATCH 6
- Dashboard hint card — BATCH 6
- Cron go-live in dev — BATCH 6

---

## Implementation contract for BATCH 5 (State B — Readiness Hero)

Approved 2026-05-06. State B replaces the BATCH 4 SummaryStub. The data flow is locked from BATCH 4 (`SubmitResponse` carries everything State B needs); BATCH 5 changes rendering only.

### Locked band headline copy (final, do not drift)

| Band              | Headline (locked)                       |
| ----------------- | --------------------------------------- |
| `score ≥ 80`      | **"Today's a green-light day."**        |
| `50 ≤ score < 80` | **"Solid base — listen to your body."** |
| `score < 50`      | **"Recovery first."**                   |

(Same picks made in the BATCH 3 FQ3 lock — re-confirmed at BATCH 5 entry. Source-controlled in `ReadinessHero.tsx` constants block. Future copy A/B tests are a separate decision in a separate doc, not implementation-time edits.)

### Streak-aware staged reveal animation (locked)

| User state                                          | Total reveal | Per-step durations                                                                     |
| --------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| `streak.current ≤ 1` (first-time / no prior streak) | **1.2s**     | form-fade 200ms · arc+count 1000ms · headline 700ms · factor cards stagger 100ms beats |
| `streak.current > 1` (returning user)               | **0.6s**     | form-fade 100ms · arc+count 500ms · headline 350ms · factor cards stagger 50ms beats   |
| `prefers-reduced-motion: reduce`                    | **instant**  | no count-up, no stagger, final state rendered immediately                              |

Detection: `streak.current` from the `POST /api/wellness/log` response (already present in BATCH 4's `SubmitResponse` shape). No extra fetch, no extra state.

The constants block in `ReadinessHero.tsx` MUST carry this rationale comment so a future code-review pass doesn't "harmonize" the two tiers:

```ts
// Two-tier reveal timing. NOT a refactor target — the slow tier is for first-time
// users (emotional payoff); the fast tier is for daily returners (a 1.5s reveal
// every day for a year becomes friction, not delight). DO NOT "harmonize" these
// values. Detect via streak.current from the POST /log response. See
// docs/specs/2026-05-06-sprint-3-wellness-ui-design.md Decision 4.
```

### Typography rule (locked)

| Surface                               | Font                                       | Sizing                     |
| ------------------------------------- | ------------------------------------------ | -------------------------- |
| `/wellness` State B hero ring         | **Playfair Display** light, tracking-tight | 80px desktop / 64px mobile |
| Dashboard hint card preview (BATCH 6) | Inter tabular-nums                         | 28px                       |
| Future analytics tiles, list views    | Inter tabular-nums                         | per-context                |

Rule of thumb: **Playfair when the number is the moment, Inter when the number is data.**

### Factor cards layout + missing-input treatment (locked)

The v0 readiness algorithm output (`server/services/wellnessService.ts`) carries a `factors` array of present components plus a `missingInputs` array of absent component labels. BATCH 5 renders both — but visually distinct.

**Layout:**

- Mobile (`<md`): vertical stack of all factor cards
- Desktop (`md+`): horizontal row of all factor cards (3 across when all 3 are known)

**Present-factor card:** label + score number (text-2xl tabular-nums, role-color) + thin role-color bar at width = score% + footer "contributes N% to your readiness".

**Missing-input card** (visually distinct from "low score"):

- Label same as present
- Number replaced by `—` (em-dash) in muted color
- Footer line: **"Add data to refine."** (small, role-color link, links to relevant data source — wearables onboarding when those land in Phase B Sensor Web later sprints)
- No band-color bar (would be misleading)

**Why distinct:** "we don't know" must never read like "you scored low." The user with no wearable connected should never see a 35-score-shaped element where their training-load card would be — that creates anxiety from absent data and doesn't help us upsell wearables.

### Streak rendering on summary (locked)

| Streak state                                      | Rendering                                                |
| ------------------------------------------------- | -------------------------------------------------------- |
| `currentWellnessStreakDays === 0` (no streak yet) | **"Start a streak"** (no flame, muted color, no count)   |
| `currentWellnessStreakDays === 1`                 | **"Day 1"** + flame icon (engaged but not "streaky" yet) |
| `currentWellnessStreakDays >= 2`                  | **"Day N"** + flame icon (full streak treatment)         |

Never render "Day 0" — that's a meaningless state. The `=== 0` case is the entry point, not a count.

### 7-day mini-trend (locked)

Inline recharts `LineChart` of last 7 readiness scores (from `GET /api/wellness/history?days=7`).

- Role-colored stroke
- Dot markers on each entry
- No axis labels, no grid (just the trend)
- ~60px tall, full width of the summary container
- **Hide entirely if the user has fewer than 2 entries.** Don't render an empty state, don't render a placeholder; just absent. The chart is enrichment of an existing pattern, not a feature in itself.

### Edit-existing-entry flow (locked)

- Summary surfaces an **"Edit today's entry"** secondary CTA (text button, role-color)
- Tap returns to State A (Ritual) **pre-populated** with the existing entry's slider values, toggle states, and notes
- The `touched` flag on each slider is set to `true` for any field that was non-null in the existing entry — so the edit's payload includes those fields, not undefined
- "See my readiness" submits via the same `POST /api/wellness/log` upsert path; backend's `isNewInsert: false` flag suppresses the XP grant and skips streak update
- **Readiness recomputes on save only.** Live recomputation on every slider tick was considered and rejected — it creates a feedback loop where users start gaming the score instead of being honest about how they feel. Save-only computation keeps the ritual emotionally honest. Document this in the edit flow's component comment so future Claude doesn't "improve" it into live mode.

### Implementation files

1. `client/src/components/wellness/ReadinessHero.tsx` — circular ring + Playfair number + count-up + band headline copy + streak-aware timing
2. `client/src/components/wellness/FactorCard.tsx` — present + missing-input variants
3. `client/src/components/wellness/StreakBadge.tsx` — three states + locked copy
4. `client/src/components/wellness/WellnessMiniTrend.tsx` — inline 7-day recharts (hide if <2 entries)
5. `client/src/components/wellness/WellnessSummary.tsx` — composition: hero + factors + streak + mini-trend + edit CTA
6. `client/src/components/wellness/WellnessRitual.tsx` — extend to accept `initial` prop for edit mode
7. `client/src/pages/WellnessPage.tsx` — replace `SummaryStub` with `WellnessSummary`, wire edit transition

### Screenshot pack for BATCH 5 checkpoint

- State B mobile (390px) + desktop (1440px) — post-submit, ring rendered, factor cards visible, streak badge, mini-trend if present
- A→B animation captured as 3 mid-frames showing the choreography (form-fade → ring grow + count-up partial → factor cards staggering in)
- Edit flow: State B → tap "Edit today's entry" → State A pre-populated → adjust → save → State B updates with new score
- Streak rendering at days 1, 3, 7, 30 (use `.git/`-scoped disposable script to flip `currentWellnessStreakDays`, deleted after use — same pattern as BATCH 4)
- Missing-input factor card vs present-factor card side-by-side (DOM injection or fixture-based)
- Pre-merge note: real iOS Safari verification of the textarea-focus / sticky-CTA interaction remains a BATCH 4 carry-over gate, not a BATCH 5 deliverable.
