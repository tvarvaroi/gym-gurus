# FORENSIC VISUAL CRAFT AUDIT

**Date:** 2026-03-03
**Build:** Post 121/121 QA pass
**Methodology:** 8-point inspection (padding symmetry, spatial rhythm, visual connections, content density, label/value hierarchy, alignment rails, border/shadow consistency, touch feel)
**Viewports:** 375x812 (Mobile), 1440x900 (Desktop)
**Reference Apps:** Hevy, Strong, Fitbod, Apple Fitness+, WhatsApp, Fantastical

---

## PART 1: Craft Issues

### Dashboard (18 issues)

| #    | Component             | Issue                                                                                                 | 8-Point Category      | Fix                                                                        |
| ---- | --------------------- | ----------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------- |
| D-01 | HeroHeader            | Stats row dividers use `-ml-6 lg:-ml-8` creating asymmetric spacing between stat items                | Alignment rails       | Normalize divider positioning to consistent `gap-8` with centered dividers |
| D-02 | HeroHeader            | Mobile stat labels `text-[11px]` below Apple HIG min readability (11px + tracking-wider = washed out) | Label/value hierarchy | `text-xs` on mobile, `sm:text-[11px]`                                      |
| D-03 | HeroHeader            | Mobile photo `h-[160px]` creates dead space between name and CTA                                      | Spatial rhythm        | Reduce to `h-[120px]`, tighten `mb-2`                                      |
| D-04 | HeroHeader            | XP bar `w-16 h-[2px]` nearly invisible — fails to communicate progress                                | Content density       | `w-20 h-1 rounded-full`                                                    |
| D-05 | TodaysActionZone      | `mt-16 lg:mt-20` gap too large — 64px dead space on mobile breaks visual flow                         | Spatial rhythm        | `mt-8 lg:mt-10`                                                            |
| D-06 | ConsolidatedStats     | Mobile 2x2 grid `gap-6` too generous — stat values float in oversized containers                      | Padding symmetry      | Reduce to `gap-4` on mobile                                                |
| D-07 | ConsolidatedStats     | Streak dots lack breathing room from stat value above                                                 | Spatial rhythm        | Add `mt-1` gap                                                             |
| D-08 | WeeklyTrainingLog     | "Rest" text at `muted-foreground/15` barely visible on dark bg; empty state at `/50` also invisible   | Content density       | Bump Rest to `/25`, empty state to `/60`                                   |
| D-09 | WeeklyTrainingLog     | Day cards `min-w-[64px]` overflow on 375px, scroll dots `w-1 h-1` too small                           | Touch feel            | `snap-x snap-mandatory`, dots `w-1.5 h-1.5`                                |
| D-10 | WeeklyTrainingLog     | Volume chart and Training Log have uneven bottom edges at md:grid-cols-2                              | Alignment rails       | Add `min-h-[320px] md:min-h-0`                                             |
| D-11 | RecoveryBodyStatus    | Ring `size={180}` oversized for dashboard — dominates section on tablet                               | Content density       | `size={150}` mobile, `size={180}` md:                                      |
| D-12 | RecoveryBodyStatus    | Muscle tag dots use fragile string replacement; tags wrap unpredictably                               | Touch feel            | Pre-define dot color prop; max 4 tags on mobile + overflow                 |
| D-13 | BodyIntelligencePanel | `grid-cols-3` on 375px = cramped metrics, values like "1,795" compressed                              | Content density       | `grid-cols-2 sm:grid-cols-3 md:grid-cols-5`                                |
| D-14 | BodyIntelligencePanel | Divider logic `index % 3 !== 0` breaks when grid-cols changes                                         | Alignment rails       | Simplify to per-row-first-item check matching actual cols                  |
| D-15 | BodyIntelligencePanel | Macro bar labels use `absolute` positioning — "Protein 22%" and "Fat 20%" collide at narrow widths    | Alignment rails       | Switch to flexbox `justify-between`                                        |
| D-16 | FeatureWidgetsGrid    | Featured `py-5` vs secondary `py-3.5` — inconsistent vertical rhythm                                  | Padding symmetry      | Standardize to `py-4`                                                      |
| D-17 | FeatureWidgetsGrid    | Secondary grid 2x2 mobile — descriptions truncate, card heights vary                                  | Content density       | `line-clamp-1`, `min-h-[72px]`                                             |
| D-18 | RecentActivityFeed    | Items lack visual type indicator — all look identical (workout vs XP vs meal)                         | Visual connections    | Add colored left-bar (2px): purple=workout, gold=XP, green=meal            |

### AI Coach (3 issues)

| #    | Issue                                                             | 8-Point Category   | Fix                                                    |
| ---- | ----------------------------------------------------------------- | ------------------ | ------------------------------------------------------ |
| C-01 | Chat area `h-[min(500px,55vh)]` too short on mobile (~350px)      | Content density    | `h-[min(600px,65vh)]` mobile, `md:h-[min(500px,55vh)]` |
| C-02 | "Try asking" suggestions feel disconnected from chat conversation | Visual connections | Group into bordered card, reduce gap from chat         |
| C-03 | Input field blends into background; send button small             | Touch feel         | Add `border border-border/30`, send button `w-10 h-10` |

### Workout Generator (3 issues)

| #    | Issue                                                               | 8-Point Category | Fix                                           |
| ---- | ------------------------------------------------------------------- | ---------------- | --------------------------------------------- |
| G-01 | Right "Ready to Generate" panel = decorative dead space (50% width) | Content density  | Reduce to `lg:w-[280px]`, give form more room |
| G-02 | Goal buttons always 2-cols — could be 4-cols on desktop             | Content density  | `grid-cols-2 lg:grid-cols-4`                  |
| G-03 | Duration slider labels too far from slider track                    | Spatial rhythm   | Reduce margin between slider and labels       |

### Nutrition Planner (3 issues)

| #    | Issue                                                                          | 8-Point Category | Fix                                            |
| ---- | ------------------------------------------------------------------------------ | ---------------- | ---------------------------------------------- |
| N-01 | Same right-panel dead space as Generator                                       | Content density  | Reduce right panel width                       |
| N-02 | Dietary restriction buttons wrap to 2 rows looking like afterthought           | Alignment rails  | `flex-wrap gap-2` with consistent button sizes |
| N-03 | Saved plans items misaligned — Load/delete buttons don't align with title/date | Alignment rails  | `items-center` on rows, consistent `gap-3`     |

### My Workouts (3 issues)

| #    | Issue                                                           | 8-Point Category | Fix                                         |
| ---- | --------------------------------------------------------------- | ---------------- | ------------------------------------------- |
| W-01 | Card heights vary from inconsistent title/description lengths   | Alignment rails  | `min-h-[200px]`, `line-clamp-2` on titles   |
| W-02 | Edit/Start buttons don't fill card width — feel unanchored      | Touch feel       | Make buttons `flex-1` to fill width equally |
| W-03 | Filter tabs too small for mobile touch — feel like tags not nav | Touch feel       | Increase to `px-4 py-2` (min 40px height)   |

### Progress (3 issues)

| #    | Issue                                                                              | 8-Point Category   | Fix                                        |
| ---- | ---------------------------------------------------------------------------------- | ------------------ | ------------------------------------------ |
| P-01 | Stat cards oversized padding/font — empty space between label and value            | Padding symmetry   | `p-4` not `p-6`, `text-3xl` not `text-4xl` |
| P-02 | Heatmap lacks color legend — gray empty state dominates                            | Visual connections | Add color legend below heatmap             |
| P-03 | Long workout names overflow on mobile ("Intermediate Hypertrophy – Lower Body...") | Content density    | `line-clamp-1 truncate`                    |

### Recovery (3 issues)

| #    | Issue                                                                         | 8-Point Category      | Fix                          |
| ---- | ----------------------------------------------------------------------------- | --------------------- | ---------------------------- |
| R-01 | Recovered/Recovering/Fatigued counts `text-3xl` oversized for supporting data | Label/value hierarchy | Reduce to `text-2xl`         |
| R-02 | "Train this muscle to start tracking" verbose for grid card                   | Content density       | Shorten to "Not trained yet" |
| R-03 | Recovery Tips long text causes very tall cards, excessive mobile scroll       | Content density       | `line-clamp-2` with expand   |

### Achievements (2 issues)

| #    | Issue                                                                  | 8-Point Category   | Fix                                     |
| ---- | ---------------------------------------------------------------------- | ------------------ | --------------------------------------- |
| A-01 | Unlocked vs locked cards have different heights (date vs progress bar) | Alignment rails    | `min-h-[160px]` on all cards            |
| A-02 | Rarity Guide at bottom disconnected from achievement cards             | Visual connections | Move inline with filter tabs or tooltip |

### Schedule (3 issues)

| #    | Issue                                                        | 8-Point Category   | Fix                                       |
| ---- | ------------------------------------------------------------ | ------------------ | ----------------------------------------- |
| S-01 | Calendar cells cramped at 375px, names truncate to 4-5 chars | Content density    | Default to list view on mobile            |
| S-02 | Completed/remaining stat cards lack icon reinforcement       | Visual connections | Icons already present — verify sizing     |
| S-03 | Planned workouts lack icon (rest days have moon icon)        | Visual connections | Add calendar-check icon for planned items |

### Settings (3 issues)

| #     | Issue                                                 | 8-Point Category | Fix                                 |
| ----- | ----------------------------------------------------- | ---------------- | ----------------------------------- |
| ST-01 | Tab icons may not render on mobile                    | Touch feel       | Ensure `flex-shrink-0` on tab icons |
| ST-02 | Save Body Stats button left-aligned feels odd in form | Alignment rails  | Full-width on mobile                |
| ST-03 | Profile photo 64px too small in settings context      | Touch feel       | Increase to `w-20 h-20` (80px)      |

### Calculators (1 issue)

| #     | Issue                                                              | 8-Point Category   | Fix                                    |
| ----- | ------------------------------------------------------------------ | ------------------ | -------------------------------------- |
| CA-01 | Calculator cards are text-only — feel like list disguised as cards | Visual connections | Add subtle gradient or accent to cards |

---

## PART 2: Mobile-Native Redesign Specs

### Priority 1: Dashboard Mobile

- Body Intelligence: 2-col grid instead of 3-col at 375px
- Weekly training log: horizontal scroll-snap with visible indicators
- Hero-to-CTA: Tighten from 64px to 32px gap
- Recovery ring: 150px mobile, 180px desktop

### Priority 2: AI Coach Mobile

- Chat: 65vh height instead of 55vh
- Input: Stronger visual border, larger send button
- Suggestions: Grouped in bordered card

### Priority 3: Progress Mobile

- Stats: 2x2 grid with tighter padding
- Names: Forced single-line truncation

### Priority 4: Recovery Mobile

- Cards: Shortened helper text
- Tips: 2-line truncation with expand

---

## SCORECARD

| Page         | Issues | Category Breakdown                                                  |
| ------------ | ------ | ------------------------------------------------------------------- |
| Dashboard    | 18     | Spatial(5), Content(5), Alignment(4), Touch(2), Label(1), Visual(1) |
| AI Coach     | 3      | Content(1), Visual(1), Touch(1)                                     |
| Generator    | 3      | Content(2), Spatial(1)                                              |
| Nutrition    | 3      | Content(1), Alignment(2)                                            |
| Workouts     | 3      | Alignment(1), Touch(2)                                              |
| Progress     | 3      | Padding(1), Visual(1), Content(1)                                   |
| Recovery     | 3      | Label(1), Content(2)                                                |
| Achievements | 2      | Alignment(1), Visual(1)                                             |
| Schedule     | 3      | Content(1), Visual(2)                                               |
| Settings     | 3      | Touch(2), Alignment(1)                                              |
| Calculators  | 1      | Visual(1)                                                           |
| **TOTAL**    | **45** |                                                                     |

---

## Implementation Batches

- **Batch 1**: Dashboard (D-01 to D-18) — 7 files, 18 fixes
- **Batch 2**: AI Coach + Generator + Nutrition (C/G/N) — 3 files, 9 fixes
- **Batch 3**: Progress + Recovery + Achievements (P/R/A) — 3 files, 8 fixes
- **Batch 4**: Schedule + Settings + Workouts + Calculators (S/ST/W/CA) — 4 files, 10 fixes
