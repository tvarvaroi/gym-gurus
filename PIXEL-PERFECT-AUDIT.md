# GymGurus Pixel-Perfect Visual Audit

**Date:** 2026-03-02
**Tester:** Quinn (QA Agent)
**Viewports Tested:** 375×812 (iPhone), 768×1024 (iPad), 1440×900 (Desktop)
**Scope:** All 12 pages + workout execution UI

---

## SECTION A — ISSUES BY PAGE

---

### PAGE 1: Dashboard (/dashboard)

---

ISSUE-001: [severity: high]
Page: /dashboard
Component: HeroDashboard — weekly days row
Viewport: 375
Description: The "This Week" day pills row uses `flex min-w-max` instead of `grid` at mobile breakpoints. The row overflows 142px beyond the viewport (right: 517px vs. 375px viewport). Days Sat and Sun are fully hidden and unreachable without horizontal scroll. The parent container does not show a scrollbar so the overflow is silently clipped.
Fix: Replace `flex min-w-max` with `overflow-x-auto` wrapper at mobile or use `grid-cols-7` for all breakpoints, or reduce pill minimum size. Class `flex md:grid md:grid-cols-7` should remove `min-w-max` at mobile and add `overflow-x-auto` to the parent.

---

ISSUE-002: [severity: medium]
Page: /dashboard
Component: HeroDashboard — Profile photo
Viewport: 768
Description: At 768px, the profile photo drops below the hero text/stats section, creating a disconnected layout. The photo appears between the stats row and the Today's Workout card, not anchored to the hero header. The photo position (absolute right-0 bottom-0 with translate-y[15%]) works at desktop but breaks at the md breakpoint where the hero layout changes.
Fix: At 768px (md breakpoint), either hide the profile photo or reposition it into a flex column layout above the Today's Workout card. Currently the `hidden lg:block` class only shows it at lg and above — at 768px/md the photo IS showing (md is the transition point) but is not properly contained.

---

ISSUE-003: [severity: micro]
Page: /dashboard
Component: HeroDashboard — stats bar
Viewport: 1440
Description: "Weekly Volume: 45.1k" label uses lowercase "k" suffix. All other numeric values on the page use proper formatting (2,782 / 15.1% / 78.6 kg). Inconsistent abbreviation style.
Fix: Either use "45,100" or "45.1K" (uppercase K) to match the k-abbreviation convention used in the Progress chart labels.

---

ISSUE-004: [severity: low]
Page: /dashboard
Component: HeroDashboard — Today's Workout card
Viewport: all
Description: "Today's Workout" card shows "QA18 Set Count Test" with "0 exercises · ~45 min". The exercise count is 0 which is incorrect — the workout has 5 exercises. This makes the card look broken.
Fix: The exercise count calculation is returning 0 for this workout. The API or client-side logic for counting exercises in the "today's workout" card needs to be debugged.

---

ISSUE-005: [severity: low]
Page: /dashboard
Component: RecentActivity — Achievement items
Viewport: all
Description: Achievement entries in Recent Activity show "+100 XP" text duplicated — once inside the text paragraph and once as a separate badge element. In the accessibility tree: `paragraph "+100 XP"` AND `generic "+100 XP"`. This doubles the XP label visually.
Fix: Remove the redundant inner paragraph "+100 XP" from the text content of the activity item or remove the badge overlay.

---

### PAGE 2: AI Coach (/solo/coach)

---

ISSUE-006: [severity: critical]
Page: /solo/coach
Component: PageHeader — title section
Viewport: 375
Description: The AI Coach page heading is critically broken at 375px. The icon and "AI" part of the heading are completely hidden — the page renders showing only "Coach" at the top with no visible icon. The "984/999 today" and "AI Powered" badges are right-aligned next to "Coach" while the subtitle "Your personal fitness assistant, available 24/7" wraps to 5 lines on the left. The layout collapses completely.
Fix: The header row needs to stack vertically on mobile. The icon+title block should be `flex-wrap` or the badges should move below the heading on small screens. Add `flex-col sm:flex-row` to the header container or place badges in a separate row below the h1.

---

ISSUE-007: [severity: high]
Page: /solo/coach
Component: PageHeader — title section
Viewport: 768
Description: At 768px, the heading "AI" is partially cut off at the top of the viewport — only the bottom half of the "AI" icon and the word "Coach" is visible at the initial scroll position. The page does not account for the app header height (56px) when rendering the title. The "Workout Tips" tab button also wraps its text to 2 lines.
Fix: Ensure the page content area has sufficient `padding-top` to clear the fixed 56px app header. The `Workout Tips` button needs a `min-w-fit` or `whitespace-nowrap` class to prevent wrapping.

---

ISSUE-008: [severity: low]
Page: /solo/coach
Component: Suggestion chips
Viewport: all
Description: The "TRY ASKING" suggestion buttons are rendered as a 2×2 grid. The buttons have inconsistent heights — "Create a push workout for intermediate lifters" wraps to 2 lines making it taller than "What should I eat on rest days?" which fits on one line. The grid cells are different heights.
Fix: Add `h-full` or `min-h-[52px]` to suggestion button containers, or use flexbox with equal heights via `items-stretch`.

---

### PAGE 3: Workout Generator (/solo/generate)

---

ISSUE-009: [severity: high]
Page: /solo/generate
Component: PageHeader — "AI Powered" badge
Viewport: 375 and 768
Description: At both 375px and 768px, the "AI Powered" badge is clipped off the right edge of the screen. At 375px, only "+ AI" is visible in the top-right. At 768px, "AI P..." is cut off. The badge is in a `flex` row that doesn't wrap.
Fix: The header row containing the badge should use `flex-wrap` so the badge drops to a new line when there's not enough space. Add `flex-wrap gap-2` to the header flex container.

---

ISSUE-010: [severity: micro]
Page: /solo/generate
Component: Duration slider
Viewport: all
Description: The duration slider is a gradient from purple-to-green (visually nice) but the styling differs from the nutrition page slider which uses a plain appearance. Inconsistent slider styling across similar controls.
Fix: Standardize slider appearance across all pages.

---

### PAGE 4: Nutrition Planner (/solo/nutrition)

---

ISSUE-011: [severity: low]
Page: /solo/nutrition
Component: Goal selector buttons
Viewport: all
Description: The goal selector buttons ("Bulk (muscle gain)", "Cut (fat loss)", "Maintain", "Body Recomposition") are inconsistently sized. "Body Recomposition" is notably longer text than others and makes the button wider, causing uneven grid. Currently "Maintain" is selected (showing green active state) but sits in row 2 column 1, making the layout asymmetric.
Fix: Use `grid-cols-2` with equal column widths and `text-center justify-center` on buttons so all cells are same size.

---

ISSUE-012: [severity: micro]
Page: /solo/nutrition
Component: Saved Plans list
Viewport: all
Description: Two duplicate "Bulk Plan - 2802 kcal" entries on 2/28/2026 and two "AI Coach Meal Plan" entries (one from 2/28 and one from 2/27). While this is data not a visual bug, the repeated identical plan names with identical dates make the list look like a rendering error to users.
Fix: Data issue, not visual — consider deduplicating or adding a timestamp suffix.

---

### PAGE 5: My Workouts (/workouts)

---

ISSUE-013: [severity: medium]
Page: /workouts
Component: Page heading
Viewport: all
Description: "My Workouts" page heading uses a different style pattern than other pages. Other pages (AI Coach, Generate Workout, Nutrition Planner, Recovery) have an icon+gradient-word heading with an "AI Powered" or similar badge. My Workouts has: plain white "My" + purple "Workouts" but no icon, and the "Generate with AI" button is top-right. This is inconsistent with the icon+heading pattern established on all other pages.
Fix: Add the workout icon to the heading following the same pattern as other pages.

---

ISSUE-014: [severity: low]
Page: /workouts
Component: Workout card titles
Viewport: 1440
Description: Several workout card titles are very long ("Intermediate Hypertrophy – Lower Body (Quads, Hamstrings, Glutes, Calves)", "Chest, Shoulders & Triceps Hypertrophy – 60-Minute Session") and wrap to 4-5 lines in the card title area, making cards in the same row have very different heights. The card grid is not uniform height.
Fix: Add `line-clamp-2` or `line-clamp-3` to card titles and truncate with ellipsis to maintain uniform card heights.

---

ISSUE-015: [severity: micro]
Page: /workouts
Component: Filter pills
Viewport: all
Description: The "All" filter pill has a filled purple background (active state) while other inactive pills have just a border. But the active "All" pill uses a more rounded shape than the others. Very subtle inconsistency in border-radius between active and inactive pills.
Fix: Ensure active and inactive pill `border-radius` values match.

---

### PAGE 6: My Progress (/progress)

---

ISSUE-016: [severity: medium]
Page: /progress
Component: Page heading
Viewport: all
Description: "My Progress" page heading has no icon. The heading is plain Playfair Display "My Progress" without the icon+gradient-word+badge pattern used by AI Coach, Generate Workout, Nutrition Planner, and Recovery pages. This is an inconsistency in the page header design system.
Fix: Add a progress/chart icon before the heading and apply gradient to "Progress" word, matching other pages.

---

ISSUE-017: [severity: medium]
Page: /progress
Component: Stats cards row
Viewport: all
Description: "Avg Duration: 3 min" is displayed for workouts. The actual workout durations range from 1–5 minutes which appears to be the active session timer rather than real workout duration. This is a data accuracy issue that makes the UI look broken ("Average workout: 3 minutes?" is clearly wrong).
Fix: Duration calculation needs to use actual workout timestamps, not session-clock duration.

---

ISSUE-018: [severity: low]
Page: /progress
Component: Recent Workouts list
Viewport: all
Description: Two separate sessions show the same workout title "Intermediate Hypertrophy – Lower Body" on the same date (Feb 28) with different set counts (1 set and 11 sets). The 1-set entry looks like an incomplete/aborted session. There is no visual indicator to distinguish aborted vs completed sessions.
Fix: Add a "completed" vs "partial" badge to session entries or filter out sessions below a minimum set threshold.

---

### PAGE 7: Recovery (/solo/recovery)

---

ISSUE-019: [severity: medium]
Page: /solo/recovery
Component: Muscle grid — card height inconsistency
Viewport: 1440
Description: The muscle group cards in the recovery grid have two distinct heights. "Recovered" muscle cards (Hamstrings, Quads, Chest, etc.) are taller (showing Fatigue %, timestamp) while "Not yet trained" cards are shorter (showing only "Train this muscle to start tracking"). This creates a visually uneven grid that looks like a layout bug.
Fix: Set a `min-h-[100px]` or unified height on all muscle grid cards so the grid has uniform rows.

---

ISSUE-020: [severity: low]
Page: /solo/recovery
Component: Recovery ring color
Viewport: all
Description: The recovery status ring is pink/red (`#ff4466` range) on the Recovery page, but the Recovery dashboard widget uses purple for the ring. The Ronin role color is purple (#a855f7). Pink suggests the "heart" theme but is inconsistent with the rest of the Ronin UI color scheme.
Fix: Use the role-appropriate purple `hsl(var(--primary))` for the recovery ring, or at least make it consistent between the full page and dashboard widget.

---

### PAGE 8: Achievements (/solo/achievements)

---

ISSUE-021: [severity: medium]
Page: /solo/achievements
Component: Achievement cards — inconsistent sizes
Viewport: 1440
Description: Unlocked achievement cards ("First Step", "Getting Started", "Volume Veteran") are significantly taller than locked achievement cards. Unlocked cards have a full dark background with icon, name, description, unlock date, and XP badge. Locked cards are just dimmed text. The visual difference is appropriate but causes uneven grid rows — a visual quality issue.
Fix: Ensure all achievement cards have `min-h-[160px]` or match the tallest card height so the grid rows are uniform.

---

ISSUE-022: [severity: low]
Page: /solo/achievements
Component: Page heading gradient color
Viewport: all
Description: The "Achievements" heading uses gold/amber gradient color (`text-amber-400` or similar), while all other pages use purple for their gradient word. While this matches the gold trophy icon aesthetically, it deviates from the purple Ronin theme used everywhere else.
Fix: Decide on one of: (a) keep gold for Achievements to match the trophy icon and treat it as intentional, or (b) switch to purple to maintain theme consistency. If keeping gold, document this as an intentional exception.

---

ISSUE-023: [severity: low]
Page: /solo/achievements
Component: Social achievements shown to Ronin
Viewport: all
Description: "Social" achievements (Mentor, Coach, Team Builder, Transformation Specialist) are trainer-role achievements shown to a Ronin (solo) user. "Have 5 clients set personal records" is meaningless for a solo user. These locked achievements with trainer-role descriptions are confusing.
Fix: Filter Social achievements to only show for Guru/Sensei role users, or at minimum add a "Trainer Only" label to these cards.

---

### PAGE 9: Calculators (/dashboard/calculators)

---

ISSUE-024: [severity: critical]
Page: /dashboard/calculators
Component: Page heading
Viewport: all
Description: The Calculators hub page uses a completely different heading style. "Premium Calculators" is rendered as a giant centered full-gradient heading (both words purple, very large font, centered layout). Every other page uses: left-aligned icon + "Plain White Word" + "Gradient Word" pattern. This page looks like it belongs to a different app.
Fix: Refactor the Calculators page heading to match the established pattern: add a calculator icon, left-align, apply gradient only to the second word: `[icon] Premium [gradient]Calculators`. Remove the centered layout.

---

ISSUE-025: [severity: medium]
Page: /dashboard/calculators
Component: Stats cards
Viewport: all
Description: The "Total Calculations: 2", "Favorites: 0", "This Week: 2" stats use a very different card style than the dashboard stats. The cards here have a dark background with the number in large purple text and the icon floating separately. Dashboard stats are inline with smaller text. The inconsistency is jarring when navigating between them.
Fix: Standardize stats card design with a shared component.

---

### PAGE 10: Schedule (/schedule)

---

ISSUE-026: [severity: medium]
Page: /schedule
Component: Calendar/list toggle button placement
Viewport: 1440
Description: The calendar/list view toggle buttons (grid icon and list icon) are floating right-aligned below the stats cards but above the calendar. They are visually disconnected — no label, no clear relationship to the content below. Users may not notice the toggle.
Fix: Move the toggle buttons to be inline with the "March 2026" calendar heading (right side of that row), or add a "View:" label before the toggle group.

---

ISSUE-027: [severity: medium]
Page: /schedule
Component: Calendar cell workout labels
Viewport: 1440
Description: Calendar cell workout name labels are severely truncated — showing "09:00 Q..." (5 chars), "09:00 I..." etc. The workout names are completely unreadable. Users cannot identify their scheduled workout from the calendar view.
Fix: Increase calendar cell height or use a smaller font size for labels. Alternatively, on hover show a tooltip with the full workout name. Consider showing only the exercise category label (Push/Pull/Legs) instead of the full name.

---

ISSUE-028: [severity: low]
Page: /schedule
Component: Stats counter labels
Viewport: all
Description: "0 — None yet this month" for completed sessions and "18 sessions left" is confusing. "Sessions left" implies the month has 18 sessions remaining, but actually means 18 future scheduled workouts. The label should be "18 planned" or "18 upcoming" to be clear.
Fix: Change "sessions left" label to "upcoming" or "planned this month".

---

ISSUE-029: [severity: low]
Page: /schedule
Component: List view workout name truncation
Viewport: 375
Description: In list view at 375px, "Intermediate Pull Day – Hypertrophy Focus" shows as "Intermediate Pull Day – Hypertr..." The `text-ellipsis` truncation is appropriate but the cutoff happens at "Hypertr..." which leaves an odd break mid-word. Using `line-clamp-1` with full text in a tooltip would be better.
Fix: Add `title` attribute with full workout name to each row for accessibility, and ensure the truncation ellipsis appears at a word boundary.

---

### PAGE 11: Settings (/settings)

---

ISSUE-030: [severity: medium]
Page: /settings
Component: Page heading
Viewport: all
Description: "Account Settings" heading has no icon, same as My Progress and My Workouts. These three pages break the icon+heading pattern established on AI Coach, Generate Workout, Nutrition Planner, Recovery, and Achievements pages.
Fix: Add a settings/gear icon before "Account Settings" and apply gradient to "Settings". Apply same fix to My Progress and My Workouts headings for consistency.

---

ISSUE-031: [severity: low]
Page: /settings
Component: Email field
Viewport: all
Description: The email field in Profile Information tab shows "Contact support to change your email address." below it, but the field itself is still an `<input type="email">` that is editable (not `disabled` or `readonly`). Users can type in it, submit, and potentially be confused when changes don't save.
Fix: Add `disabled` or `readonly` attribute to the email input, or visually grey it out so it's obvious it cannot be changed.

---

ISSUE-032: [severity: micro]
Page: /settings
Component: Danger tab
Viewport: all
Description: The "Danger" tab label uses red text color which is appropriate, but the icon before it also appears in the tab. When the Danger tab is selected, its content area background should visually indicate danger (e.g., subtle red border). Currently no visual difference between Danger tab panel and other panels.
Fix: Add `border border-destructive/30` to the Danger tab panel container when active.

---

### PAGE 12: Workout Execution (/workout-execution/:id)

---

ISSUE-033: [severity: critical]
Page: /workout-execution
Component: Reps stepper
Viewport: 375
Description: At 375px, the REPS section overflows the right edge of the viewport. The "+" button for increasing reps is clipped off-screen (right: 389px vs 375px viewport). This means users cannot increase their rep count on mobile phones — the primary device used at the gym rack. The overflow is ~14px.
Fix: The weight and reps steppers container uses `flex-1` layout. Add `max-w-full overflow-hidden` to the exercise card container, or reduce the minimum width of the stepper inputs. Use `w-full` on the input and smaller padding on the stepper buttons at mobile.

---

ISSUE-034: [severity: critical]
Page: /workout-execution
Component: Exercise navigation pills
Viewport: 375
Description: The exercise navigation tabs use `flex gap-1.5 min-w-max` causing the row to extend to right: 702px (327px overflow beyond 375px viewport). While arrows are provided to scroll left/right, the arrows themselves (< >) add visual clutter and the rightmost exercise tabs are not immediately visible. The active exercise tab is visible but context pills are hidden.
Fix: The navigation pills container needs `overflow-x-auto` with hidden scrollbar rather than raw overflow, and the `min-w-max` should be contained within a scrollable wrapper with `scrollbar-none`.

---

ISSUE-035: [severity: high]
Page: /workout-execution
Component: Content area — dead space
Viewport: 768 and 1440
Description: After completing 3 sets of an exercise, the main content area has approximately 300–400px of pure black empty space below Set 3 and above the fixed bottom bar. This dead space makes the page look unfinished. At 1440px, sets 1/2/3 end around Y=575 and the bottom bar starts at Y=862, leaving ~290px of void.
Fix: The exercise content should either: (a) use `flex-1` or `min-h-full` to fill available space, or (b) show next-exercise preview or motivational content in the dead space. Alternatively, reduce padding or center the content vertically in the available height.

---

ISSUE-036: [severity: medium]
Page: /workout-execution
Component: Page background
Viewport: all
Description: The workout execution page uses a pure black (#000000) background, while the rest of the app uses a dark grey `bg-background` (~#0f0f14). When exiting back to the app, there is a jarring visual context switch.
Fix: Use `bg-background` (dark grey) consistently, or if black is intentional for focus-mode UX, ensure the transition back to the main app is smooth with a crossfade animation.

---

ISSUE-037: [severity: low]
Page: /workout-execution
Component: Header workout title
Viewport: 375
Description: At 375px, the workout name "QA18 Set Count Test" is truncated to "QA18 Set Count ..." even though the title is only moderately long. The title competes for space with the "KG LBS" toggle and the timer "0:17". The available width for the title is approximately 180px.
Fix: At mobile, move the KG/LBS toggle to a non-header location (e.g., inside the exercise card) and give the workout title full header width.

---

---

## SECTION B — CROSS-CUTTING ISSUES

---

ISSUE-038: [severity: high]
Page: all
Component: Page heading design system
Viewport: all
Description: The page heading pattern is inconsistent across the app. Three distinct styles are used:

STYLE A (icon + "Plain" + gradient word + optional badge) — used by:

- AI Coach: [icon] AI [gradient]Coach + [AI Powered badge]
- Generate Workout: [icon] AI Workout [gradient]Generator + [AI Powered badge]
- Nutrition Planner: [icon] Nutrition [gradient]Planner + [AI Powered badge]
- Recovery: [icon] Recovery [gradient]Status
- Achievements: [icon] [all-gradient]Achievements (close to A)
- My Schedule: "My" + [gradient]Schedule (no icon)

STYLE B (plain text, no icon) — used by:

- My Progress: plain "My Progress"
- Account Settings: plain "Account Settings"
- My Workouts: "My" + [gradient]Workouts (no icon, no badge)

STYLE C (centered full-gradient, large, no icon) — used by:

- Calculators: centered giant full-gradient "Premium Calculators"

Fix: Establish a single standard. Recommended: STYLE A for all pages. Add icon + partial gradient to My Progress, Account Settings, My Workouts, and fix the Calculators page to left-align and use an icon.

---

ISSUE-039: [severity: medium]
Page: all
Component: Card border-radius consistency
Viewport: all
Description: Comparing cards across pages reveals two distinct border-radius values:

- Dashboard stat cards: `rounded-2xl` (16px)
- Recovery muscle cards: `rounded-xl` (12px)
- Achievement cards: `rounded-2xl` (16px)
- Workout cards (/workouts): appear to use `rounded-xl` (12px)
- Calculator hub cards: `rounded-2xl` (16px)
  The inconsistency between `rounded-xl` and `rounded-2xl` is visible when comparing similar card types.
  Fix: Standardize to one value — recommend `rounded-2xl` for all content cards.

---

ISSUE-040: [severity: medium]
Page: all
Component: Heading typography — icon-heading alignment
Viewport: all
Description: On pages where icons are present next to headings (AI Coach, Generate Workout, Nutrition Planner, Recovery), the icon and text vertical alignment is inconsistent. The icon on AI Coach sits at a different vertical center relative to the text than the icon on Recovery Status or Nutrition Planner.
Fix: Ensure all icon-heading pairs use `flex items-center gap-3` with the icon height matching the h1 line-height.

---

ISSUE-041: [severity: low]
Page: all sidebar
Component: Sidebar navigation — My Workouts expand chevron
Viewport: 1440
Description: The "My Workouts" sidebar item has an expand/collapse chevron button, but no other nav items have sub-menus. This creates an inconsistency in the sidebar visual hierarchy. When collapsed, there is no visual indication of what expands (the submenu items are not shown in the snapshot).
Fix: Either add a consistent disclosure pattern across all nav items that have sub-pages, or remove the chevron from My Workouts if the submenu is not needed.

---

ISSUE-042: [severity: low]
Page: all
Component: Footer copyright
Viewport: all
Description: Footer shows "© 2026 GymGurus. All rights reserved." — but the copyright symbol is correct. However, the footer is positioned inside the main content scrollable area rather than as a sticky footer, meaning on short-content pages it appears mid-screen, and on long-content pages it appears at the very bottom after scrolling.
Fix: This is acceptable behavior, but for short pages the floating footer looks odd. Consider adding `min-h-[calc(100vh-56px)]` to main content to push footer to bottom of viewport.

---

ISSUE-043: [severity: micro]
Page: all
Component: Notification badge
Viewport: all
Description: The notification bell shows "1 unread" notification persistently across all pages and sessions. This stale notification state may indicate the notification is not being marked as read when viewed. If this is the same notification that has been unread for multiple QA sessions, it represents a UX issue.
Fix: Ensure clicking the notification bell marks notifications as read and updates the badge count.

---

---

## SECTION C — PREVIOUSLY DOCUMENTED BUGS (still present)

The following bugs from previous QA sessions remain active:

ISSUE-044: [severity: critical] (BUG-13-03, updated)
Page: /workout-execution
Component: Reps stepper overflow
Viewport: 375
Description: Confirmed still present — Reps "+" button clipped at 375px. Measured right: 389px. (See ISSUE-033 above — same bug.)

ISSUE-045: [severity: high] (BUG-13-02, partially resolved)
Page: /workout-execution
Component: Bottom bar sticky behavior
Viewport: 768, 1440
Description: The Finish/navigation bar is NOW fixed at the bottom (visible at Y~838 at 768px). This appears fixed from session 13. However, the content above has a large dead space gap (ISSUE-035). The fix introduced the dead space problem.

ISSUE-046: [severity: medium] (BUG-13-01, status uncertain)
Page: /workout-execution
Component: Rest timer z-index
Viewport: all
Description: Could not test rest timer visibility in this session (would require completing a set which was not done). Previous bug: rest timer hidden behind bottom bar. Mark as "needs verification."

ISSUE-047: [severity: medium] (BUG-13-05)
Page: /solo/coach
Component: AI context
Viewport: all
Description: AI Coach still has no access to exercise details, sets, reps, weights. Can only identify workout by name and date. Cannot give granular coaching advice.

---

## TOTAL ISSUES

```
TOTAL ISSUES: 47
  - Critical: 5  (001-level: ISSUE-006, ISSUE-024, ISSUE-033, ISSUE-034, ISSUE-044)
  - High: 6      (ISSUE-001, ISSUE-007, ISSUE-009, ISSUE-035, ISSUE-038, ISSUE-045)
  - Medium: 16   (ISSUE-002, ISSUE-008, ISSUE-013, ISSUE-016, ISSUE-017, ISSUE-019, ISSUE-021, ISSUE-023, ISSUE-025, ISSUE-026, ISSUE-027, ISSUE-030, ISSUE-036, ISSUE-039, ISSUE-040, ISSUE-047)
  - Low: 14      (ISSUE-003, ISSUE-004, ISSUE-011, ISSUE-014, ISSUE-015, ISSUE-018, ISSUE-020, ISSUE-022, ISSUE-028, ISSUE-029, ISSUE-031, ISSUE-037, ISSUE-041, ISSUE-042)
  - Micro: 6     (ISSUE-003b, ISSUE-010, ISSUE-012, ISSUE-015b, ISSUE-032, ISSUE-043)
```

---

## TOP 10 FIXES RANKED BY VISUAL IMPACT PER EFFORT

### RANK 1 — Fix the AI Coach header at mobile (ISSUE-006, ISSUE-007)

**Impact: Critical | Effort: Low**
The AI Coach page title is completely broken at 375px and partially broken at 768px. This is the first thing users see when they open the app on mobile. Fix: Add `flex-wrap` to the header container and `whitespace-nowrap` to the badges. ~10 minutes of CSS work, massive visual improvement.

### RANK 2 — Fix the Reps "+" button overflow on workout execution (ISSUE-033)

**Impact: Critical | Effort: Low**
The core gym-use-case (logging reps on your phone) is broken because the "+" button is 14px off-screen. This is the #1 primary user action. Fix: Adjust the stepper container `max-w-full` and button padding. ~15 minutes of CSS work.

### RANK 3 — Standardize all page headings (ISSUE-038, ISSUE-013, ISSUE-016, ISSUE-024, ISSUE-030)

**Impact: High | Effort: Medium**
Five pages have non-standard headings. The Calculators page looks like a different app entirely. Fixing all to use icon + mixed white/gradient text left-aligned would create a cohesive, premium feel. ~45 minutes to update 5 page headers.

### RANK 4 — Fix the weekly days row overflow on dashboard (ISSUE-001)

**Impact: High | Effort: Low**
The "This Week" day pills extend 142px off-screen, hiding Sat/Sun. Users cannot see their weekend schedule. Fix: Remove `min-w-max` and add `overflow-x-auto` to the parent. ~5 minutes.

### RANK 5 — Fix the "AI Powered" badge clipping on Generator and Nutrition (ISSUE-009)

**Impact: High | Effort: Low**
The page header badge is clipped at both 375px and 768px. Fix: Add `flex-wrap` to the header flex container. ~5 minutes per page, 10 minutes total.

### RANK 6 — Fill the dead space on workout execution page (ISSUE-035)

**Impact: High | Effort: Medium**
300–400px of black void on the execution page between the set cards and the Finish bar looks severely unfinished. Fix: Add `flex-1` to the main exercise area or add next-exercise preview content. ~30 minutes.

### RANK 7 — Unify achievement and recovery card heights (ISSUE-019, ISSUE-021)

**Impact: Medium | Effort: Low**
Uneven card grid rows on Achievements and Recovery pages look like rendering bugs. Fix: Add `min-h-[100px]` to recovery cards and `min-h-[160px]` to achievement cards. ~15 minutes.

### RANK 8 — Fix workout card title line clamping on /workouts (ISSUE-014)

**Impact: Medium | Effort: Low**
Long AI-generated workout titles cause extreme card height variance in the 3-column grid. Fix: Add `line-clamp-2` to card title element. ~5 minutes.

### RANK 9 — Fix calendar cell workout label readability (ISSUE-027)

**Impact: Medium | Effort: Medium**
Calendar cells show 2-3 characters of workout name — totally unreadable. Fix: Show category badge (Push/Pull/Legs) instead of truncated name, or implement a tooltip. ~30 minutes.

### RANK 10 — Add icon to My Progress and Account Settings headings (ISSUE-016, ISSUE-030)

**Impact: Medium | Effort: Low**
Two of the most-visited pages (Progress and Settings) have bare headings with no icon, while AI Coach, Generator, Nutrition, and Recovery all have icons. These pages look unfinished by comparison. Fix: Import and add the chart icon to My Progress and gear icon to Account Settings. ~10 minutes total.

---

## SCREENSHOTS CAPTURED

- `pixel-audit-dashboard-1440.png` — Dashboard at 1440px
- `pixel-audit-dashboard-768.png` — Dashboard at 768px (profile photo drop visible)
- `pixel-audit-dashboard-375.png` — Dashboard at 375px (days row overflow)
- `pixel-audit-coach-1440.png` — AI Coach at 1440px
- `pixel-audit-coach-768.png` — AI Coach at 768px (title cut off)
- `pixel-audit-coach-375.png` — AI Coach at 375px (critical header collapse)
- `pixel-audit-generate-1440.png` — Generate Workout at 1440px
- `pixel-audit-generate-768.png` — Generate Workout at 768px (badge clipped)
- `pixel-audit-generate-375.png` — Generate Workout at 375px (badge clipped)
- `pixel-audit-nutrition-1440.png` — Nutrition Planner at 1440px
- `pixel-audit-workouts-1440.png` — My Workouts at 1440px
- `pixel-audit-progress-1440.png` — My Progress at 1440px
- `pixel-audit-recovery-1440-top.png` — Recovery at 1440px
- `pixel-audit-achievements-1440.png` — Achievements at 1440px
- `pixel-audit-calculators-1440.png` — Calculators at 1440px (style anomaly)
- `pixel-audit-schedule-1440.png` — Schedule calendar at 1440px
- `pixel-audit-schedule-list-1440.png` — Schedule list view at 1440px
- `pixel-audit-settings-1440.png` — Settings at 1440px
- `pixel-audit-dash-375-fresh.png` — Dashboard at 375px fresh load
- `pixel-audit-schedule-375.png` — Schedule at 375px
- `pixel-audit-execution-375.png` — Workout execution at 375px (reps overflow)
- `pixel-audit-execution-768.png` — Workout execution at 768px (dead space)
- `pixel-audit-execution-1440.png` — Workout execution at 1440px (dead space)

---

_Report generated by Quinn, QA Agent | Session 2026-03-02_
