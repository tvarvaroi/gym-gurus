# § DS-1 Brand Colour Fix — Design Document

**Date:** 2026-03-08
**Issue:** Three-way brand colour split (gold landing / purple app / green Nutrition Planner)
**Scope:** NutritionPlanner.tsx (19 occurrences) + AICoach.tsx (4 occurrences)

---

## Green Classification Framework

Three categories of green exist in the codebase. Treatment differs for each.

### Category 1 — Semantic / UX green → KEEP

Universal conventions users expect across all fitness apps. Changing these would confuse users.

Examples:
- Completion states (`✓ checkmarks`, `bg-green-500` on completed sets)
- Positive trends (`text-green-400` on upward progress arrows)
- Password strength indicators
- "Unlocked" achievement badges
- "Beginner" difficulty labels
- Success alerts (`border-green-500/50 bg-green-500/10` on form confirmation)

Files: ~40 files across the codebase. **None changed.**

### Category 2 — Structural UI green → FIX

Green used as the page identity colour for the Nutrition Planner. Has no design justification —
makes the page look like a food-tracking app embedded in GymGurus rather than a feature of it.
The `frontend-design` skill flags this as a failure of the "cohesive aesthetic" requirement.

**NutritionPlanner.tsx — 19 occurrences changed:**
- Goal selector active-state buttons (3×)
- Meals-per-day selector active-state buttons (1×)
- Dietary restriction active/hover states (2× — active + hover)
- Budget selector active-state buttons (1×)
- "Generate Meal Plan" primary CTA button (1×)
- "Upgrade Plan" upsell button in limit-reached state (1×)
- Daily Totals card border + background gradient (1×)
- Flame icon (calories section header) (1×)
- Calorie total number (1×)
- Meal number badge (bg + text) (1×)
- ShoppingCart icon (grocery list header) (1×)
- "Save Plan" button — active + saved states (2×)
- History icon (saved plans section header) (1×)
- Saved plan card hover border (1×)
- "Generated" source badge (1×)
- "Load" button (border + text + hover) (1×)

**AICoach.tsx — 4 occurrences changed:**
- "Saved!" status text after saving a workout (1×)
- "Start Now" button (bg + border + text + hover) (1×)
- "Save Meal Plan" button (border + text + hover) (1×)
- "Meal plan saved!" status text (1×)

### Category 3 — Domain-accurate green → KEEP

Fitness-domain colour conventions that informed users expect. Analogous to plate weights
(10 kg plates are green IRL) and heart rate zones (Zone 2 = aerobic green range).

Explicitly out of scope:
- `<Apple>` icon in loading state (NutritionPlanner line 553) — food illustration
- Empty-state circle container `bg-green-500/10` (NutritionPlanner line 755) — apple backdrop
- `<Apple>` icon in empty state (NutritionPlanner line 756) — food illustration
- Weight plate colours in plates.ts (10 kg = green)
- Muscle group anatomy colours in muscleGroups.ts (biceps = #22c55e)
- Heart rate zone colours (Zone 2 aerobic = green)
- Progress trend indicators (up = green, down = red — universal convention)
- Set completion states in WorkoutExecution (green = done — universal convention)

---

## Replacement Rule

**All structural green → `var(--primary)` via Tailwind tokens**

| Old class | New class |
|---|---|
| `bg-gradient-to-r from-green-500 to-emerald-500 text-white` | `bg-primary text-primary-foreground` |
| `hover:from-green-600 hover:to-emerald-600` | `hover:bg-primary/90` |
| `bg-green-500/20` | `bg-primary/20` |
| `bg-green-500/5` | `bg-primary/5` (or `bg-primary/10`) |
| `border-green-500/30` | `border-primary/30` |
| `border-green-500/50` | `border-primary/50` |
| `border-green-500/20` | `border-primary/20` |
| `text-green-400` | `text-primary` |
| `hover:bg-green-500/30` | `hover:bg-primary/30` |
| `hover:bg-green-500/10` | `hover:bg-primary/10` |
| `hover:border-green-500/30` | `hover:border-primary/30` |

## Why `bg-primary` (solid) over gradient

The user decision: **solid `bg-primary`** for all CTA buttons.

Rationale: consistency with every other primary button in the app (the shadcn Button component
`variant="default"` uses `bg-primary text-primary-foreground`). Gradient richness is secondary
to coherence with the established button system.

## Effect by Role

Because `--primary` is set per role in `index.css`:

| Role | `var(--primary)` | Result on Nutrition Planner |
|---|---|---|
| Ronin (solo) | Purple `271 81% 56%` | All structural elements become purple |
| Guru (trainer) | Gold `43 54% 55%` | All structural elements become gold |
| Disciple (client) | Teal `174 82% 29%` | All structural elements become teal |

---

## Files Changed

- `client/src/pages/solo/NutritionPlanner.tsx` — 19 structural occurrences
- `client/src/pages/solo/AICoach.tsx` — 4 structural occurrences
- `docs/plans/2026-03-08-ds1-brand-colour.md` — this document
