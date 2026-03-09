# Design Doc: § UX-5 Empty States + § DS-6 Role Illustrations

**Date:** 2026-03-09
**Status:** Approved — implementing
**Scope:** Ronin role only (§ UX-5b tracks Guru/Disciple — blocked on credentials)

---

## Problem

10+ pages in the Ronin flow show a blank or near-blank screen when a new user has no data. This creates a hostile first-visit experience — the user doesn't know whether the app is broken or simply empty. § DS-6 notes that the RoninIcon (samurai illustration) is used once (login page) and never seen again — a wasted brand opportunity.

---

## Solution

Two empty state templates, applied based on the emotional context of the page:

### Template 1 — Emotional (illustration)

Used on pages where the empty state is a motivational moment (first progress view, first achievement screen, empty training schedule).

```
[RoninIcon 128px, centered]
[Headline — Playfair Display, text-3xl, font-medium, text-foreground]
[Body — Inter, text-sm, text-muted-foreground, max-w-xs mx-auto]
[CTA Button — gold accent, links to /generate]
```

### Template 2 — Functional (icon + text + CTA)

Used on task/utility pages where the user wants to act, not be inspired.

```
[Lucide icon — h-12 w-12, text-muted-foreground/30]
[Body text — Inter, text-sm/base, text-muted-foreground]
[CTA Button — primary, links to /generate]
```

---

## Pages + Approved Copy

### Emotional template pages

| Page         | Headline                      | Body                                                                         | CTA                                |
| ------------ | ----------------------------- | ---------------------------------------------------------------------------- | ---------------------------------- |
| Progress     | "Your story starts here."     | "Complete your first workout and your progress will begin to take shape."    | "Generate a Workout" → `/generate` |
| Achievements | "Earn your first scar."       | "Train consistently and your achievements will reflect the work you put in." | "Start Training" → `/generate`     |
| Schedule     | "The path is empty. For now." | "Generate a workout and schedule it to start building your training week."   | "Generate a Workout" → `/generate` |

### Functional template pages

| Page          | Icon       | Body                                                                            | CTA                                   |
| ------------- | ---------- | ------------------------------------------------------------------------------- | ------------------------------------- |
| Workout Plans | `Dumbbell` | "No workouts saved yet. Generate your first AI-powered workout to get started." | "Generate a Workout" → `/generate`    |
| AI Coach      | `Sparkles` | "Ask anything about training, recovery, or nutrition. Your coach is ready."     | "Ask a Question" → focuses chat input |

---

## Trigger Conditions

- **Progress**: Ronin user with zero workout sessions logged
- **Achievements**: Filtered view returns zero results (tab filter active with no matches)
- **Schedule**: No workouts scheduled for the entire week (full-page empty state, not per-day)
- **Workout Plans**: Zero saved/generated workouts
- **AI Coach**: No conversation messages yet (initial state before first message sent)

---

## Implementation Notes

- `RoninIcon` is in `client/src/components/icons/RoninIcon.tsx` — accepts `size` (number, px) and `variant` (`'default'` | `'white'`)
- Use `variant="default"` (role-colored) for emotional empty states
- Navigation to `/generate`: use `useLocation` from wouter or `<Link>`
- AI Coach CTA focuses the textarea input ref rather than navigating away
- All empty states should be wrapped in `<motion.div>` with `initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}` for entrance

---

## Out of Scope

- § UX-5b: Guru pages (Clients, Client Details, Payments, Exercise Library) — blocked on credentials
- § UX-5b: Disciple pages — blocked on credentials
- Per-day empty slots in the Schedule calendar grid (keep existing Moon icon treatment)
