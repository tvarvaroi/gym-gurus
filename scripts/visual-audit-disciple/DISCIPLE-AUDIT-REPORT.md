# Disciple Visual Audit Report

> Date: 2026-03-20 | Screenshots: 53 (desktop 1440x900 + mobile 390x844)
> Auditor: Claude Code | Access code: GG-WQVD-KAJX
> Comparison baseline: Ronin visual pass (135 screenshots, 14 fixes) + Guru visual pass (Phases 1-2 complete)

---

## Summary

**31 issues found across 6 pages.** The Disciple experience is roughly where the Guru dashboard was before Phases 1-2: ornamental hero with zero data, massive framer-motion usage, hardcoded colors bypassing the role CSS var system, and several UX problems specific to the client persona.

The biggest single problem: **ClientDashboard.tsx is a copy of the pre-fix Guru DashboardHero pattern** — animated blur orbs, fixed-height hero, zero actionable data, 20+ `motion.div` elements, and hardcoded `cyan-500`/`teal-500` everywhere instead of `bg-primary`/`text-primary`.

| Severity | Count | Description                                                |
| -------- | ----- | ---------------------------------------------------------- |
| CRITICAL | 3     | Ornamental hero, framer-motion bloat, hardcoded colors     |
| HIGH     | 7     | Role leaks, wrong nav items, irrelevant UI sections        |
| MEDIUM   | 12    | Styling inconsistencies, missing skeletons, stale patterns |
| LOW      | 9     | Minor copy, typography, polish issues                      |

---

## CRITICAL Issues (3)

### DC-1: ClientDashboard hero is the pre-fix ornamental pattern

**File:** `client/src/components/dashboard/ClientDashboard.tsx:161-253`
**Screenshot:** `desktop/03-dashboard-top.png`

The hero is a 90-line `motion.div` with:

- Fixed `h-72 sm:h-80` height (violates layout rule: no fixed heights on content)
- 2 animated blur orbs (`motion.div` with `repeat: Infinity`) — purely decorative
- Hardcoded inline `style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1)...' }}`
- "Welcome Back, Test" — "Your fitness journey continues" — zero actionable data
- 3 CTA buttons competing equally (no primary/secondary hierarchy)

**Fix:** Same treatment as Guru Phase 2A — compact hero with NumberTicker stats (Assigned Workouts / Completed / Streak). Remove all `motion.div`, use CSS fade-in.

---

### DC-2: 20+ framer-motion elements for trivial hover/fade effects

**File:** `client/src/components/dashboard/ClientDashboard.tsx` (entire file)
**Impact:** Bundle size, performance on low-end mobile (Disciple persona = lower tech proficiency)

Count of framer-motion usage in ClientDashboard.tsx:

- `motion.div` with `whileHover={{ y: -8, scale: 1.03 }}` on every stat card (4x)
- `StaggerContainer` + `StaggerItem` wrapping every section (8x)
- Animated gradient overlays on every card (`animate={{ backgroundPosition: [...] }}`) (4x)
- Animated blur orbs in hero (2x)
- Animated fire glow on streak card (1x)
- XP progress bar animation (1x)
- Achievement progress bar animation (1x)
- Next achievement teaser animation (1x)

**Fix:** Replace all with CSS `animate-in fade-in`, `hover:-translate-y-1.5 transition-transform`, `animate-pulse`. Match the approach used in Guru Phase 2B/2C.

---

### DC-3: Hardcoded `cyan-500`/`teal-500` everywhere instead of role CSS vars

**File:** `client/src/components/dashboard/ClientDashboard.tsx`
**Count:** 50+ instances of `cyan-500`, `teal-500`, `cyan-400` hardcoded in class names and inline styles

Examples:

```
border-cyan-500/20          (should be: border-primary/20)
bg-cyan-500/10              (should be: bg-primary/10)
text-cyan-500               (should be: text-primary)
from-cyan-500 to-teal-500   (should be: bg-primary)
from-cyan-400 via-teal-400  (should be: text-primary)
```

The role CSS var system (`--primary` resolves to teal for Disciple role) already exists. All these hardcoded values should use `bg-primary`, `text-primary`, `border-primary/N` — making the component automatically role-aware.

**Also affects:**

- `SchedulePage.tsx` — lines 827, 849-880: hardcoded `cyan-500/10`, `cyan-600` on Disciple tab active states
- `ProgressPage.tsx` — 30+ `isClient ? 'text-cyan-500' : 'text-primary'` ternaries that should just be `text-primary` (it resolves correctly per role)

---

## HIGH Issues (7)

### DC-4: "Access Denied" page shows raw DB role "client" instead of "Disciple"

**File:** `client/src/components/ProtectedRoute.tsx`
**Screenshot:** `desktop/13-clients-blocked.png`

Text reads: `Current role: client` — should use `getRoleDisplayName()` from `client/src/lib/roles.ts` to show "Disciple".

---

### DC-5: Mobile bottom nav shows "Coach" tab — Disciple has no AI Coach access

**Screenshot:** `mobile/03-dashboard-top.png`, `mobile/04-workouts-top.png` (all mobile pages)

The bottom nav shows: Home | Coach | Workout | Progress | Menu

Disciple cannot access `/solo/coach`. The "Coach" tab item should be hidden when `isClient` is true. Currently it takes up 20% of the nav width for a feature this role cannot use.

---

### DC-6: Settings Plan tab shows "No Active Plan" with "View Plans" CTA — irrelevant for Disciple

**Screenshot:** `desktop/09-settings-plan.png`

Disciples don't choose plans — their trainer manages their access. The Plan tab shows "No Active Plan" + "Choose a plan to unlock all features" + "View Plans" button. This is confusing and wrong for the client role.

**Fix:** Either hide the Plan tab for `isClient`, or show "Your access is managed by your trainer" with no CTA.

---

### DC-7: Settings Body Stats says "AI coach" — Disciple has no AI Coach

**Screenshot:** `desktop/09-settings-top.png`

Text: "Your physical measurements help the AI coach give personalised advice." Disciples don't have AI Coach access. Copy should be: "Your physical measurements help your trainer track your progress."

---

### DC-8: Dashboard "Current Weight" shows "N/A kg" and "Height: N/A cm"

**Screenshot:** `desktop/03-dashboard-top.png`, `mobile/03-dashboard-top.png`

When no biometric data exists, the stat card shows raw "N/A" string with "kg" suffix appended — reads "N/A kg". Should show either a proper empty state ("Not set") or hide the card entirely until the trainer populates client data.

---

### DC-9: `useQuery<any>` and 15+ `as any` casts in ClientDashboard.tsx

**File:** `client/src/components/dashboard/ClientDashboard.tsx:79, 96-98, 104, 109-111, 638`

Same pattern as §FE-5 (which was resolved for the rest of the codebase in Sprint 5). ClientDashboard.tsx was missed because it wasn't touched during the Sprint 5 type cleanup.

---

### DC-10: Login "Log in here" link uses gold (Guru accent) instead of neutral

**File:** `client/src/pages/DiscipleLoginPage.tsx:272`
**Screenshot:** `desktop/00-login-empty.png`

```tsx
style={{ color: 'hsl(var(--color-guru))' }}
```

The "Log in here" link on the Disciple login page uses the Guru gold accent color. Since this is a cross-role link, it should use neutral muted-foreground or the link's own color. Using a competing role's accent on the Disciple page creates visual confusion.

---

## MEDIUM Issues (12)

### DC-11: Stat cards use fixed `h-[180px]` height

**File:** `ClientDashboard.tsx:260, 304, 348, 389`
**Layout rule violated:** "No fixed heights on content containers"

All 4 stat cards have `h-[180px]` which clips content on small text or when accessibility font scaling is active. Should use `min-h-[180px]`.

---

### DC-12: ProgressPage has 30+ `isClient` ternaries for color — should just use `text-primary`

**File:** `client/src/pages/ProgressPage.tsx` (throughout)

Pattern repeated 30+ times:

```tsx
className={`${isClient ? 'text-cyan-500' : 'text-primary'}`}
```

Since `--primary` already resolves to teal for `isClient`, these ternaries are unnecessary. Every `isClient ? 'text-cyan-500' : 'text-primary'` should just be `text-primary`.

---

### DC-13: SchedulePage hardcodes cyan on Disciple tab active states

**File:** `client/src/pages/SchedulePage.tsx:849-880`

Each of the 4 tab triggers (Day/Week/Calendar/List) has:

```tsx
isClient
  ? 'data-[state=active]:from-cyan-500/10 data-[state=active]:text-cyan-600'
  : 'data-[state=active]:from-primary/10 data-[state=active]:text-primary';
```

Should just use `text-primary` for both branches.

---

### DC-14: No skeleton loading states on Disciple dashboard

**Screenshot:** `desktop/11-loading-state.png`

The loading screen shows branded GG logo (good), but after auth resolves, the dashboard content pops in all at once with no skeleton placeholders. The Ronin dashboard has skeleton loaders for stats and charts — ClientDashboard should match.

---

### DC-15: Progress empty state doesn't use DiscipleIcon or emotional template

**Screenshot:** `desktop/06-progress-top.png`

The Ronin Progress empty state uses RoninIcon (128px) + Playfair Display heading "Your story starts here." The Disciple Progress empty state is just a muted TrendingUp icon + plain text. Per §UX-5b, Disciple empty states use the functional template (no icon, waiting-state copy) — this is technically correct per the original spec, but now looks jarring compared to the quality bar set by the Ronin/Guru passes.

**Consider:** Adding DiscipleIcon to at least the Dashboard empty state for visual consistency.

---

### DC-16: CelebrationOverlay useEffect has unstable dependency

**File:** `ClientDashboard.tsx:129-151`

The `useEffect` for auto-celebrations includes `celebrate` in its closure but it's not in the dependency array — and the celebrations fire based on streak/workout counts that reset to zero on each mount, which means they can re-fire on every page visit.

---

### DC-17: Dashboard Profile card uses `client-border` and `client-gradient` custom classes

**File:** `ClientDashboard.tsx:583, 628, 678`

These CSS classes (`client-border`, `client-gradient`, `glass-strong`, `shadow-premium`, `shadow-premium-lg`, `shadow-premium-xl`) appear throughout the component. Some may not be defined in the stylesheet — verify they resolve. If they're custom utilities, they should be documented or replaced with standard Tailwind.

---

### DC-18: Login page uses `Cormorant Garamond` font — not in the design system

**File:** `DiscipleLoginPage.tsx:167`

```tsx
fontFamily: "'Cormorant Garamond', serif";
```

The app design system uses Playfair Display for headings and Inter for body. Cormorant Garamond is a third serif font not used anywhere else. Should be Playfair Display for consistency.

---

### DC-19: Login page uses 3 framer-motion elements

**File:** `DiscipleLoginPage.tsx:90-111, 113-117, 177-191`

2 ambient glow `motion.div` with `repeat: Infinity` + card entrance `motion.div` + `AnimatePresence` for error. The Guru login page was not in scope for framer-motion cleanup, but since we're auditing Disciple, these should be CSS.

---

### DC-20: Schedule "Month" tab label vs "calendar" value mismatch

**Screenshot:** `desktop/07-schedule-top.png` shows tab labeled "Month" but clicking it activates the CalendarView, not a month-grid. The visual label says "Month" which is correct for the user, but the underlying `TabsTrigger value="calendar"` is confusing in code. Minor — cosmetic code clarity.

---

### DC-21: Dashboard stat cards have shimmer lines that don't match Guru pattern

**File:** `ClientDashboard.tsx:268-271, 310-313`

Each card has top + bottom 1px gradient shimmer lines on hover:

```tsx
<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
```

These use hardcoded `cyan-400/50` and add visual complexity without data value. The Guru stat cards (after Phase 2B) use simpler hover treatment.

---

### DC-22: XP Level card uses hardcoded `text-yellow-500` for Trophy icon

**File:** `ClientDashboard.tsx:455`

```tsx
<Trophy className="h-5 w-5 text-yellow-500" />
```

Trophy is semantic (gold = reward), so this is arguably intentional. But it introduces a third accent color (teal + cyan + yellow) competing on one page. Consider using `text-primary` for the card chrome, keeping yellow only for the XP emoji tier indicator.

---

## LOW Issues (9)

### DC-23: "Managed by your trainer" text is `text-[10px]` — nearly invisible

**File:** `ClientDashboard.tsx:294`
**Screenshot:** `desktop/03-dashboard-top.png`

Sub-label below weight stat is 10px — below readable threshold on desktop. Should be at least `text-xs` (12px).

---

### DC-24: Dashboard hero "Your fitness journey continues" is generic motivational copy

**File:** `ClientDashboard.tsx:200-204`

Compare with Guru hero which shows contextual data (active clients, sessions this week). The Disciple hero shows no data — just a greeting + motivational subtitle. Should show: next scheduled session, assigned workouts this week, or completion %.

---

### DC-25: Goal badge in hero shows "Goal: General fitness" — likely test data

**Screenshot:** `mobile/03-dashboard-top.png`

The pill badge "Goal: General fitness" comes from `clientData.goal`. This is likely test seed data. Not a code issue, but the visual treatment (pill badge in hero) is good.

---

### DC-26: Progress page subtitle differs between desktop and mobile

**Desktop:** Shows "View your fitness journey tracked by your trainer" (PageHeader subtitle visible)
**Mobile:** PageHeader subtitle is hidden (`hidden md:block` class in PageHeader component)

This is consistent with how all PageHeaders work — not a bug, just noting for awareness.

---

### DC-27: Settings "Danger" tab uses red text — appropriate but verify it works for clients

**Screenshot:** `desktop/09-settings-top.png`

The "Danger" tab (account deletion) is visible and red-colored. Verify that account deletion actually works for Disciple role and doesn't orphan the trainer's client record. Likely needs soft-delete on the `clients` table too.

---

### DC-28: Workouts empty state icon is generic dumbbell cross — not DiscipleIcon

**Screenshot:** `desktop/04-workouts-top.png`

The weekly workout view shows a generic dumbbell icon for "No workouts this week". While this follows the §UX-5b functional template spec, it would benefit from more visual personality.

---

### DC-29: Mobile sidebar toggle button has no visible icon on very first load

**Screenshot:** `mobile/10-sidebar-open.png`

The sidebar toggle (hamburger) in the top-left is a teal-outlined square with what appears to be a phone icon inside — inconsistent with the standard hamburger menu pattern.

---

### DC-30: Achievement section renders `streakEmoji` inline — shows raw emoji in card title

**File:** `ClientDashboard.tsx:410-411`

```tsx
{
  streakData.isStreakActive && <span className="text-base">{streakEmoji}</span>;
}
```

Emoji rendering varies across OS/browser. On some Windows systems, the fire/lightning emoji may render as black-and-white Segoe UI symbols, not colored. Consider using lucide icons instead.

---

### DC-31: `useReducedMotion` imported but animations still visually heavy

**File:** `ClientDashboard.tsx:25, 177, 183, 265, 305, 349, 390, 398`

The `prefersReducedMotion` flag correctly sets `repeat: 0` for infinite animations, but the static animation variants (entrance fades, hover transforms) still fire. With 20+ elements animating on load, the page feels heavy even with reduced motion. The root fix is DC-2 (remove framer-motion entirely).

---

## Access Control Verification

| Route                    | Expected                   | Actual                     | Status |
| ------------------------ | -------------------------- | -------------------------- | ------ |
| `/dashboard`             | ClientDashboard renders    | ClientDashboard renders    | PASS   |
| `/workouts`              | WeeklyWorkoutView renders  | WeeklyWorkoutView renders  | PASS   |
| `/progress`              | ProgressPage (client view) | ProgressPage (client view) | PASS   |
| `/schedule`              | SchedulePage (client view) | SchedulePage (client view) | PASS   |
| `/settings`              | Settings renders           | Settings renders           | PASS   |
| `/dashboard/calculators` | Calculators accessible     | Calculators accessible     | PASS   |
| `/clients`               | Access Denied              | Access Denied              | PASS   |
| `/exercises`             | Access Denied              | Access Denied              | PASS   |
| `/pricing`               | Redirects to dashboard     | Redirects to dashboard     | PASS   |

---

## Recommended Fix Order (by WSJF)

| #   | Issue                                            | BV  | TC  | RR  | Effort | WSJF     | Phase |
| --- | ------------------------------------------------ | --- | --- | --- | ------ | -------- | ----- |
| 1   | DC-1: Hero replacement (compact, data-dense)     | 9   | 8   | 8   | 3      | **8.3**  | 3A    |
| 2   | DC-2: Remove all framer-motion                   | 8   | 7   | 9   | 3      | **8.0**  | 3A    |
| 3   | DC-3: Replace hardcoded cyan with `bg-primary`   | 9   | 6   | 8   | 2      | **11.5** | 3A    |
| 4   | DC-5: Hide Coach tab for Disciple mobile nav     | 7   | 8   | 5   | 1      | **20**   | 3B    |
| 5   | DC-4: Access Denied shows raw "client" role      | 6   | 6   | 5   | 1      | **17**   | 3B    |
| 6   | DC-6: Hide/fix Plan tab for Disciple             | 6   | 5   | 4   | 1      | **15**   | 3B    |
| 7   | DC-7: Fix AI Coach reference in Settings         | 5   | 4   | 3   | 1      | **12**   | 3B    |
| 8   | DC-8: N/A weight display                         | 6   | 5   | 3   | 1      | **14**   | 3B    |
| 9   | DC-10: Gold link on login page                   | 4   | 3   | 2   | 1      | **9**    | 3B    |
| 10  | DC-12: Remove isClient ternaries in ProgressPage | 7   | 4   | 6   | 2      | **8.5**  | 3C    |
| 11  | DC-13: Remove isClient ternaries in SchedulePage | 6   | 4   | 5   | 1      | **15**   | 3C    |
| 12  | DC-9: Type cleanup (as any)                      | 5   | 3   | 6   | 2      | **7**    | 3C    |

---

## Proposed Phases

### Phase 3A — ClientDashboard rewrite (DC-1 + DC-2 + DC-3)

Replicate the Guru Phase 2A-2C treatment:

- Compact hero with NumberTicker stats
- Remove all framer-motion, use CSS transitions
- Replace all hardcoded cyan/teal with `bg-primary`/`text-primary`
- Fix stat card fixed heights to `min-h-`

### Phase 3B — Role-specific UX fixes (DC-4 through DC-10)

Quick targeted fixes:

- Access Denied: use `getRoleDisplayName()`
- Mobile nav: hide Coach for `isClient`
- Settings: hide/fix Plan tab + Body Stats copy
- Weight N/A display
- Login link color

### Phase 3C — Cross-page color cleanup (DC-12 + DC-13 + DC-9)

- Remove all `isClient ? 'cyan-*' : 'primary'` ternaries in ProgressPage and SchedulePage
- Type cleanup in ClientDashboard

---

## Files Changed (anticipated)

| File                                             | Issues                                  | Action                                    |
| ------------------------------------------------ | --------------------------------------- | ----------------------------------------- |
| `components/dashboard/ClientDashboard.tsx`       | DC-1,2,3,8,9,11,14,16,17,22,23,24,30,31 | Full rewrite                              |
| `pages/ProgressPage.tsx`                         | DC-12                                   | Remove isClient color ternaries           |
| `pages/SchedulePage.tsx`                         | DC-13                                   | Remove isClient color ternaries           |
| `pages/DiscipleLoginPage.tsx`                    | DC-10,18,19                             | Fix link color, font, remove motion       |
| `pages/SettingsPage.tsx`                         | DC-6,7                                  | Fix Plan tab + Body Stats copy for client |
| `components/ProtectedRoute.tsx`                  | DC-4                                    | Use getRoleDisplayName()                  |
| `components/AppSidebar.tsx` or `MobileBottomNav` | DC-5                                    | Hide Coach for isClient                   |
