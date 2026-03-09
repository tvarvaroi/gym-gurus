# ATLAS Deep-Dive UI/UX Audit Report

**Date:** 2026-03-01
**Auditor:** Claude Code (Opus 4.6)
**Environment:** Production (gym-gurus-production.up.railway.app)
**Viewports tested:** 1440x900 (desktop), 375x812 (mobile)
**Account:** test@test.com / Ronin role
**Benchmark:** Whoop, Oura, Linear, Stripe, Arc Browser

---

## Executive Summary

GymGurus is a feature-rich fitness platform with **solid functionality** (all 11 pages load, data flows correctly, AI integrations work). The visual overhaul of the Solo Dashboard brought significant improvements. However, several issues remain that prevent the app from feeling like a $50/month premium product.

**Critical bugs:** 1
**High-priority visual issues:** 8
**Medium-priority polish items:** 12
**Low-priority suggestions:** 6

---

## P0 — Critical Bugs (Ship-Blockers)

### 1. Notification Dropdown Invisible (z-index / overflow)

**Page:** Global (header bar)
**Severity:** CRITICAL — feature completely broken
**Repro:** Click the bell icon with "1" badge in top-right corner

The notification dropdown opens in the DOM (confirmed via accessibility snapshot) but is **completely invisible** on screen. The panel renders behind the main content area.

**Root cause identified:**

```
<header> has: sticky top-0 z-40 overflow-hidden
  <div> has: relative z-10
    <div> (notification wrapper): relative
      <div> (dropdown panel): absolute right-0 top-full z-50
```

The `<header>` element has `overflow: hidden` which clips the absolutely-positioned dropdown panel. The dropdown's `z-50` is meaningless because the stacking context is created by the header's `overflow: hidden`.

**Fix:**

```css
/* Option A: Remove overflow-hidden from header */
/* header: remove overflow-hidden, use overflow-visible */

/* Option B: Move dropdown to portal (recommended) */
/* Render dropdown outside header using React Portal */
```

**Recommended:** Use a Radix UI `<Popover>` or render the dropdown as a portal outside the header. This is the same pattern shadcn/ui uses for dropdowns.

---

## P1 — High Priority (Fix This Week)

### 2. Stats Show Excessive Decimal Precision

**Page:** Dashboard Hero Header
**Values shown:** `81.60kg`, `180.00cm`
**Expected:** `81.6kg`, `180cm`

The `.00` trailing zeros on height and `.60` on weight look like raw database values, not human-formatted numbers. Whoop and Oura always round to meaningful precision.

**Fix:** Format numbers: if value is whole number, show no decimals. If fractional, show 1 decimal max.

```ts
// In HeroHeader stats display
const formatStat = (v: number) => (v % 1 === 0 ? v.toString() : v.toFixed(1));
```

### 3. "45.1kkg" — Double Unit in Weekly Volume

**Page:** Dashboard > Weekly Overview
**Shown:** `45.1kkg` (the "k" abbreviation butts against the "kg" unit)
**Expected:** `45.1k kg` or just `45,100 kg`

This appears in both the consolidated stats card and the volume chart header.

**Fix:** Add a space between the abbreviated number and the unit, or don't abbreviate when the unit already has "k" connotation.

### 4. kcal/day Missing from Dashboard Hero Stats

**Page:** Dashboard Hero Header
**Current stats:** Weight | Height | Level
**Expected per design:** Weight | Height | kcal/day | Level

The `fitnessProfile.dailyCalorieTarget` stat is missing from the hero stats row. This was in the design plan but the field may not be populated in the fitness profile data.

**Fix:** Either populate `dailyCalorieTarget` from the TDEE calculator or show the computed TDEE from Body Intelligence panel.

### 5. AI Coach Page — Title Clipped at Top

**Page:** AI Coach (`/solo/coach`)
**Issue:** The "AI Coach" heading text is partially clipped by the header bar. The page title area has insufficient top padding.

**Fix:** Add `pt-4` or `pt-6` to the page content container.

### 6. AI Coach — Vast Empty Space

**Page:** AI Coach (`/solo/coach`) at 1440px
**Issue:** With only one welcome message, the chat area is 70%+ empty space. The four category buttons (Workout Tips, Nutrition, Recovery, Goals) float at the top with nothing below.

**Suggestion:** Show starter prompts or suggested questions in the empty space area. Or collapse the chat to the bottom half with a richer header section showing user stats/context.

### 7. My Workouts — Cards Feel Repetitive

**Page:** My Workouts (`/workouts`)
**Issue:** 12+ workout cards all look identical — same purple "Intermediate" badge, same "AI-generated push workout" subtitle, same 45min/Push metadata. The dashed purple borders on every card create visual noise.

**Suggestions:**

- Use different accent colors per workout type (Pull = blue, Push = orange, Legs = green)
- Show exercise count or last performed date
- Add a "last used" or "created" timestamp to distinguish duplicates
- Use solid borders instead of dashed for saved workouts

### 8. Calculators Page — Light-Mode Cards Jarring

**Page:** Calculators (`/dashboard/calculators`)
**Issue:** The "Total Calculations", "Favorites", "This Week" stat cards and "Recent Results" card use **white/light backgrounds** while everything else in the app is dark. This creates a jarring contrast break. The "All Calculators" grid cards also have light backgrounds.

**Fix:** Use `bg-card` (dark theme card color) instead of white backgrounds. Match the rest of the app's dark aesthetic.

### 9. Calendar Strip (Dashboard) — Activity Dots Missing

**Page:** Dashboard > Weekly Overview > Calendar Strip
**Issue:** The "This Week" calendar shows 7 workouts but only Fri (27), Sat (28), and Sun (1) have colored indicator bars at the bottom. Mon-Thu show no activity indicators despite the stat card claiming 7 workouts this week.

**Fix:** Verify the calendar strip date range alignment. The workouts may all be on Feb 27-28, meaning Mon-Thu genuinely had no workouts. If so, consider not claiming "7 workouts" for "this week" if they're all in 2 days.

---

## P2 — Medium Priority (Fix This Sprint)

### 10. Dashboard "Body Stats" Widget Duplicates Body Intelligence

**Page:** Dashboard
**Issue:** The "Body Stats" widget (BMI 25.2, Body Fat 25.10%, TDEE "Set", Weight 81.60kg, Height 180.00cm) overlaps heavily with the "Body Intelligence" panel directly below it (BMI 25.2, BMR 1,806, TDEE 2,799, Protein 163g, Water 3L, Fat 65g, Carbs 391g, Ideal Weight 75kg, FFMI 18.9).

Both show BMI. Both show weight/height data. The Body Intelligence panel is strictly more useful.

**Fix:** Remove the Body Stats widget entirely, or merge its unique value (Body Fat %) into the Body Intelligence panel.

### 11. Body Fat Shows "25.10%" — Extra Precision

**Page:** Dashboard > Body Stats widget
**Issue:** Shows `25.10%` instead of `25.1%`
**Fix:** Same number formatting as issue #2.

### 12. Schedule Page — No Completed vs Planned Visual Distinction

**Page:** Schedule (`/schedule`)
**Issue:** All workouts on the calendar look the same — small blue dots with truncated names. There's no distinction between past completed workouts (should show green/checkmark) and future planned workouts (should show outline/pending style).

**Fix:** Past dates with completed workouts should have a green indicator. Future planned workouts should have a more muted/outline style. Today should be highlighted.

### 13. Schedule Shows "0 Completed this month" Despite Workouts

**Page:** Schedule
**Issue:** The stat card says "0 Completed this month" but the calendar clearly shows workouts scheduled. This is likely because it's March 1 and the February workouts don't count. But the "18 Planned remaining" stat suggests pre-scheduled workouts, which feels auto-generated rather than user-planned.

**Fix:** If the schedule is auto-populated, make that clear. Show "0 completed / 18 suggested" rather than implying the user planned them.

### 14. Recovery Page — Muscle Group Grid Alignment

**Page:** Recovery (`/solo/recovery`)
**Issue:** The muscle group cards are arranged in a 4-column grid that works well, but the "recovered" badges use inconsistent colors (teal/green) and the fatigue progress bars are barely visible at low percentages (6%, 8%, 9%). Cards with "Never" trained groups look the same as recently trained ones.

**Fix:** Visually distinguish never-trained muscle groups (gray/dashed) from recovered ones (solid/green). Make the fatigue bars more visible even at low values.

### 15. Achievement Progress Bars All Show 0%

**Page:** Achievements (`/solo/achievements`)
**Issue:** Out of 45 achievements, 42 show "Progress 0%" with full-width green progress bars that appear to be at 0 but the bar color makes them look partially filled. The bar itself is green even at 0% which is misleading.

**Fix:** Progress bars at 0% should be gray/empty, not green. Only fill with green as progress is made.

### 16. Progress Page — Heatmap Mostly Empty

**Page:** Progress (`/progress`)
**Issue:** The workout frequency heatmap shows 12 weeks but only 2 days have any activity (Feb 27-28). The rest is a sea of empty cells. This is accurate for a test account but in production, a new user would see an entirely empty heatmap which is demoralizing.

**Suggestion:** Hide the heatmap until the user has at least 2 weeks of data, or show a motivational empty state.

### 17. Progress Page — "Total Time: 19min" Suspicious

**Page:** Progress
**Issue:** 7 workouts with only 19 minutes total time seems wrong. This is likely because the test workouts were completed quickly during QA. But in a real scenario, this stat would confuse users.

**Suggestion:** Consider showing average workout duration instead of total, or both.

### 18. Settings Page — No Heading Consistency

**Page:** Settings (`/settings`)
**Issue:** The Settings page heading is plain `font-bold` without the decorative Playfair Display / gradient accent treatment used on every other page (e.g., "My **Progress**", "Recovery **Status**", "AI Workout **Generator**").

**Fix:** Apply the same heading style: `"Settings"` or `"Account **Settings**"` with the accent word in gradient.

### 19. Mobile Dashboard — Photo Positioning

**Page:** Dashboard (375px)
**Issue:** The profile photo cutout looks great on desktop but on mobile it appears centered between the stats and the workout card. The photo is cropped at roughly chest-level. On a small screen, the photo takes up significant vertical space (~200px) before the user reaches the "Start Workout" button.

**Suggestion:** Reduce mobile photo to 140-160px max height, or move it to a smaller inline position.

### 20. Feature Widget Grid — No Visual Hierarchy

**Page:** Dashboard > Quick Access grid
**Issue:** All 6 feature cards (AI Coach, Generate Workout, My Workouts, Nutrition, Progress, Calculators) have identical styling — same size, same arrow icon, same border. There's no indication of which features are most important or recently used.

**Suggestion:** Make "AI Coach" and "Generate Workout" slightly larger or more prominent since they're primary actions.

### 21. Mobile Navigation — No Bottom Nav Bar

**Page:** All pages (375px)
**Issue:** On mobile, navigation is only accessible via the hamburger menu. Modern fitness apps (Whoop, Oura, Strava) all use a persistent bottom tab bar for quick access to 4-5 core sections. Having to open the sidebar for every navigation adds friction.

**Suggestion:** Add a bottom nav bar on mobile with: Dashboard, Coach, Workout, Progress, More.

---

## P3 — Low Priority (Backlog)

### 22. Sidebar Scroll Position Not Preserved

Navigating between pages resets sidebar scroll position. Minor with 11 items but could be annoying.

### 23. "GYM GURUS - Elite Fitness Platform" Banner

The sticky header shows "GYM GURUS - Elite Fitness Platform" in the center with a gradient background. This takes 64-80px of vertical space on every page and doesn't provide actionable value. Consider making it more compact or showing breadcrumbs instead.

### 24. Footer "© 2026 GymGurus" on Every Page

The footer appears at the bottom of every page scroll. On pages like AI Coach where the chat should feel immersive, the footer breaks the illusion. Consider hiding it on full-screen pages.

### 25. No Loading Skeleton on Initial Auth Check

Every page shows "Checking authentication" with a spinner before rendering. This takes 2-4 seconds on production. Consider pre-rendering the sidebar layout during auth check.

### 26. Achievements Rarity Guide at Bottom

The rarity guide (Common, Uncommon, Rare, Epic, Legendary) is at the very bottom of the achievements page, after scrolling past 45 cards. Move it to the top or make it a sticky reference.

### 27. Recovery Tips — Static Content

The Recovery Tips section (Sleep Quality, Hydration, Active Recovery, Protein Intake) shows the same 4 tips regardless of user state. Consider making them contextual based on actual recovery data.

---

## Page-by-Page Summary

| Page                  | Overall | Key Issue                                               |
| --------------------- | ------- | ------------------------------------------------------- |
| **Dashboard**         | B+      | Stats decimal formatting, duplicate Body Stats widget   |
| **AI Coach**          | B       | Empty space, clipped title, good quick-action buttons   |
| **Workout Generator** | A-      | Clean layout, recovery banner is great, good form UX    |
| **Nutrition Planner** | A-      | Well-organized form, saved plans section works well     |
| **My Workouts**       | B       | Cards too uniform, no visual distinction between types  |
| **Progress**          | B+      | Good charts, heatmap needs more data to shine           |
| **Recovery**          | A-      | Informative layout, muscle group grid is useful         |
| **Achievements**      | B+      | Great gamification, progress bar colors misleading      |
| **Calculators**       | B-      | Light-mode cards clash with dark theme                  |
| **Schedule**          | B       | Calendar works but needs completed/planned distinction  |
| **Settings**          | B+      | Functional, heading style inconsistent with rest of app |

---

## Top 5 Fixes for Maximum Impact

1. **Fix notification dropdown** (P0) — Users can't see their notifications at all
2. **Fix light-mode calculator cards** (P1) — Most visually jarring inconsistency
3. **Format decimal numbers** (P1) — `81.60kg` and `25.10%` look unpolished everywhere
4. **Remove duplicate Body Stats widget** (P2) — Declutters dashboard significantly
5. **Add bottom nav on mobile** (P2) — Biggest UX improvement for mobile users

---

## What's Working Well

- Profile photo silhouette with drop-shadow looks premium on desktop
- Recovery ring visualization is informative and visually appealing
- Weekly overview consolidated stats card (7 Workouts, 45.1k Volume, 2 Streak, 0 PRs) is clean
- Workout Generator recovery awareness banner ("Suggested: Pull Day") is smart
- Nutrition Planner form with TDEE/protein pre-populated from profile is thoughtful
- Achievement system with 45 achievements and rarity tiers adds engagement
- Schedule calendar with workout previews is functional
- Body Intelligence panel with 9 calculated metrics is comprehensive
- Macro distribution bar (Protein 23%, Fat 21%, Carbs 56%) is a nice touch
- Consistent page heading style (icon + two-tone title) across most pages

---

_Report generated from production deployment. All screenshots saved as `atlas-deep-dive-_.png` in project root.\*
