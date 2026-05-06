# Sprint 3 BATCH 8 — Pre-delivery audit findings

Sprint 3 surface: 10 wellness components, 1 page, 5 routes, 1 service,
2 cron jobs, 1 migration (013_wellness_log). Audit scope per BATCH 8
checklist.

## ui-ux-pro-max

**Findings (fixed inline in BATCH 8):**

1. **Slider thumb hit area below WCAG AA** — `WellnessSlider.tsx`. The
   visible thumb dot was 24px desktop / 32px mobile; the actual hit area
   was identical, below the 44×44 WCAG AA minimum. **Fix:** added a
   `before:` pseudo-element with `-inset-2.5` (md) / `-inset-2` (max-md)
   on the Radix Thumb. Total hit area is now 24+20=**44×44** desktop and
   32+16=**48×48** mobile (AAA on mobile). The visible dot size is
   unchanged. Verified via `getBoundingClientRect()` on the rendered DOM
   at both viewports.

2. **WellnessMiniTrend recharts data array rebuilt on every parent
   re-render** — recharts triggers re-layout work when its `data` prop is
   referentially new, even when the values are equal. The post-submit
   count-up animation in `ReadinessHero` re-renders the whole summary
   tree, and without memoization the trend chart was paying repeated
   layout cost. **Fix:** wrapped the data array construction in
   `useMemo([historyQuery.data])`.

**Pass:**

- Every icon-only button has `aria-label` (sticky CTA, edit pencil)
- `role="switch"` + `aria-checked` on behavior toggles; `aria-live="polite"`
  on slider value readout
- Touch targets ≥44px on every interactive element after the slider fix
- Focus-visible inherited from shadcn / Radix
- Role-color via `bg-primary` / `text-primary` / `hsl(var(--primary))` —
  zero hardcoded role hex values in Sprint 3 code
- Playfair Display reserved for emotional moments (ReadinessHero,
  WellnessEmptyState headlines); Inter tabular-nums for data
  (WellnessHintCard score, WellnessSlider readouts, FactorCard scores)
- DO NOT comments on the two intentional inconsistencies (animation
  timing tiers; Guru-skip on dashboard hint card)

## vercel-react-best-practices

**Findings (resolved):**

- WellnessMiniTrend memoization — see ui-ux-pro-max #2 above (overlap)

**Pass:**

- ReadinessHero rAF cleanup — `cancelAnimationFrame(raf)` returned from
  effect; the `raf` variable is reassigned inside the `tick` callback,
  but the cleanup closure sees the latest assignment, so unmount mid-
  animation cancels the in-flight frame correctly
- All wellness query hooks declare `staleTime`:
  - `WellnessPage` `useQuery(['/api/wellness/today'], { staleTime: 60s })`
  - `WellnessHintCard` `useQuery(['/api/wellness/today'], { staleTime: 120s })`
    — slightly more aggressive caching for the dashboard hint, accepted
  - `WellnessMiniTrend` `useQuery(['/api/wellness/history', 7], { staleTime: 5min })`
- Both `today` consumers share the same query key, so a successful POST
  invalidating `['/api/wellness/today']` refreshes both surfaces atomically
- No premature memoization — WellnessRitual's `initialState` is `useMemo`'d
  only because it's derived from a prop (the `initial` entry); other
  derived values are simple enough that `useMemo` would be overhead

## web-design-guidelines (responsive audit)

Tested at 320px and 1440px (the two extremes; 768/1024 sit between).

- **320px ritual:** all 6 sliders visible, value readouts (text-3xl)
  fit, icon anchors don't crowd, sticky CTA at `bottom-20` clears the
  64px MobileBottomNav with 16px breath. No clipping.
- **320px summary:** Hero 160px ring + Playfair 64px number + 3
  factor cards stacked vertically, mini-trend 60px tall — all fit.
- **1440px ritual + summary:** Hero 200px ring + Playfair 80px number,
  factor cards horizontal row, max-w-2xl container holds the layout.
- Heading hierarchy: PageHeader h1 ("Daily readiness") → ReadinessHero
  h2 (band copy) → BehaviorToggle h3 ("Today"). No skipped levels.
- All semantic HTML: `<button type="button">`, `role="switch"`, `role="list"`
  on factor card row.

## /security-scan

**Findings:** clean. Sprint 3 introduced zero new vulnerabilities.

- **`?tz=` query parameter**: defense-in-depth working —
  - Type guard: `typeof queryTz === 'string'`
  - Length bounds: `0 < len < 64`
  - IANA-shape regex: `/^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z][A-Za-z0-9_+-]*)*$/`
  - `Intl.DateTimeFormat({ timeZone: queryTz })` validation (throws on
    invalid IANA names)
  - On any failure, falls back to `users.notification_preferences.quietHours.timezone`
    (Zod-validated at write time via `/api/notifications/preferences`)
  - The validated tz NEVER reaches SQL as a string interpolation — only
    `Intl.DateTimeFormat` consumes it client-side. Cron tz reads come
    from the column reference, not user input.
- **XP idempotency**: `grantWellnessXpIfFirstCheckInToday(userId, isNewInsert)`
  short-circuits when `isNewInsert=false`. `isNewInsert` is computed by
  `upsertTodayEntry` based on the IDOR-clause-protected SELECT-existing
  result. Same-day POST re-saves return `isNewInsert=false` → zero XP
  awarded. No streak gaming via re-submits.
- **Cron timezone math consistency**: BATCH 2 fix (`AT TIME ZONE 'UTC' AT TIME ZONE tz`
  for naked timestamps) applied at `dailyWellnessNudge.ts:125` for
  `notifications.created_at` reinterpretation. Other AT TIME ZONE uses
  in both crons operate on `NOW()` (already `timestamptz`), where single
  AT TIME ZONE is correct. wellnessReengagement's `n.created_at > NOW() -
INTERVAL` comparison is auto-coerced to UTC by Postgres, which matches
  the storage shape (created_at written by NOW() in UTC) — correct.
- **Cron dispatch IDOR**: SKIP-LOCKED query SELECTs `users.id AS user_id`
  via the candidate CTE; `dispatch(c.user_id, type, data)` writes
  `notifications.user_id = userId` server-side. No user-input path
  through to dispatch. Test coverage in
  `server/test/jobs/dailyWellnessNudge.test.ts` and
  `server/test/jobs/wellnessReengagement.test.ts` confirms shape.

**npm audit (pre-existing, NOT introduced by Sprint 3):** 27
vulnerabilities (2 low, 11 moderate, 14 high). Sprint 3 added zero
dependencies (verified: `git log --oneline f55e45f..HEAD -- package.json`
returns empty). The notable advisory is `drizzle-orm <0.45.2` SQL
injection via improperly escaped SQL identifiers — Sprint 3 wellness
code uses parameterized `sql\`...\${value}\`` template literals only,
no dynamic identifier paths. Mitigation tracked for Sprint 4 (`npm audit
fix --force` would bump to drizzle-orm@0.45.2, breaking change).

## /review

- TS baseline: **200** (unchanged from pre-Sprint-3)
- ESLint: clean across the 4 new test files + 2 BATCH 8 component edits
  (verified by lint-staged pre-commit hook on `7df43b2` and `0879985`)
- Build: `npm run build` clean. Bundle sizes within established envelope
  (vendor-charts 393kB / 107kB gzip; vendor-motion 117kB / 39kB gzip).
- Test suite: **324 passing** (Sprint 3 +57 vs 267 pre-Sprint-3
  baseline). 15 pre-existing aiService failures unchanged, deferred to
  Sprint 8 per MEMORY.md.
- Two `as any` casts in Sprint 3 code, both pragmatic and bounded:
  - `wellnessService.ts:100` — bracketed dynamic property access on
    SUBJECTIVE_FIELDS keys (the surrounding `for...of` constrains the
    key type; the cast is to accept the partial entry shape)
  - `dailyWellnessNudge.ts:134` / `wellnessReengagement.ts:115` — runtime
    shape detection across pg vs Drizzle return shapes at the
    `db.execute` integration boundary

## License allowlist

Sprint 3 added zero dependencies. The Sprint 2 BATCH 8 baseline (1159
packages, 4 transitive flags accepted: `@img/sharp-win32-x64`,
`tween-functions`, `victory-vendor`; AGPL `@imgly/background-removal-node`
removed in Sprint 2.5) carries forward unchanged.

## Migration 013_wellness_log dry-run on dev

Captured to `sprint3-batch8/migration-013-dryrun.log`. All 3 phases pass:

1. **Baseline**: table exists, 3 user_gamification columns exist, 0 rows
2. **Idempotent re-up**: `up()` re-applies cleanly on already-applied DB
3. **Down safety assertion**: with 1 probe row inserted, `down()`
   correctly throws `[Migration 013 down] BLOCKED: 1 daily_wellness_log
rows exist. Dropping the table would destroy every wellness check-in
on record.` Probe cleaned up, final count back to 0.

**Production migration command (BATCH 8 close):**

```
railway run -- npx tsx scripts/run-prod-migration.ts up 013_wellness_log
```

Per MEMORY.md migration runner notes — `scripts/run-prod-migration.ts`
skips `.env`, has Railway host fail-safe, 3-second confirmation pause.
Direct `tsx server/migrations/013_wellness_log.ts up` is NOT supported
because the file's CLI block is bypassed by the script's dynamic import
path (the standard pattern across migrations 010, 011, 012).

## iOS Safari real-device verification (carry-over from BATCH 4)

**Status: GAP DOCUMENTED — no real-device test performed.**

**Surface under test:** `/wellness` ritual notes accordion textarea on
iOS Safari. The keyboard-popup → `scrollIntoView({block:'center'})` →
sticky CTA `bottom-20 z-40` clearance pattern is locked in code with a
100ms delay after focus, but iOS Safari's `visualViewport.resize` event
sequence does not fire identically in Chrome devtools mobile emulation.
Real-device verification required before any iOS-targeted launch
communication or App Store submission.

**Why not verified in BATCH 8:** No iPhone available to the developer
running BATCH 8. This carries forward from BATCH 4 and is tracked as a
launch-readiness checkpoint, not a code defect.

**What real-device verification would prove:**

1. User taps "Add a note" expanding the accordion
2. User taps the textarea
3. Keyboard pops up (~50% viewport reduction)
4. After the locked 100ms delay, `scrollIntoView({block:'center'})` fires
5. The textarea lands centered above the keyboard
6. Sticky "See my readiness" CTA (`bottom-20 z-40`) remains visible above
   the keyboard, not occluded by it
7. Typing characters does not jump the scroll position

**Acceptable closure paths:**

- Real iPhone tested by user — screen recording in a future commit
  satisfies the gate. Update MEMORY.md "Pending real-device verifications"
  by removing this entry.
- Defer to launch — keep the entry in MEMORY.md until either verified or
  a TestFlight build can be tested by an external user.

This is the same pattern documented for any future mobile sticky-CTA +
input-keyboard combination per MEMORY.md "Mobile sticky CTAs MUST clear
MobileBottomNav" gotcha.

## Sprint 3 close summary

| Gate                             | Status                                |
| -------------------------------- | ------------------------------------- |
| ui-ux-pro-max                    | ✓ 2 findings fixed inline             |
| vercel-react-best-practices      | ✓ 1 finding fixed inline              |
| web-design-guidelines responsive | ✓ 320/1440 verified                   |
| /security-scan                   | ✓ Sprint 3 introduced zero new vulns  |
| /review                          | ✓ TS baseline 200, build clean        |
| License allowlist                | ✓ Zero new deps                       |
| Migration 013 dry-run            | ✓ idempotent + safety assertion holds |
| iOS Safari real-device           | ⚠️ GAP DOCUMENTED (no iPhone access)  |
| Test suite                       | ✓ 324 passing (+57 from Sprint 3)     |

**Sprint 3 = COMPLETE pending production migration 013 run.**
