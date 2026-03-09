# Design Doc: § UX-5b Empty States — Guru & Disciple Roles

**Date:** 2026-03-09
**Status:** Approved — implementing
**Scope:** Guru (trainer) and Disciple (client) roles

---

## Rules

- **GuruIcon** (128px, `variant="default"`) appears ONLY on Clients and Payments — revenue-critical moments
- **GuruIcon does NOT** appear on Exercises, Client Details sections, or Schedule
- **DiscipleIcon does NOT** appear anywhere — Disciple empty states are waiting states, not motivational
- **No CTA on any Disciple empty state** — copy reflects that content comes from the trainer

---

## Guru — Emotional Template Pages (GuruIcon + Playfair Display headline)

| Page       | Trigger                                             | Headline                     | Body                                                                              | CTA                                       |
| ---------- | --------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------- |
| My Clients | `transformedClients.length === 0`                   | "Your roster awaits."        | "Add your first client to start managing their training, progress, and schedule." | "Add a Client" → opens add-client modal   |
| Payments   | `plans.length === 0 && paymentHistory.length === 0` | "Your business starts here." | "Set up a payment plan to start collecting revenue from your clients."            | "Create a Plan" → opens create-plan modal |

---

## Guru — Functional Template Pages (lucide icon + Inter text + CTA)

| Page                 | Section                     | Icon           | Body                                                                               | CTA                                         |
| -------------------- | --------------------------- | -------------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| Exercises            | Library empty               | `Dumbbell`     | "Your exercise library is empty. Add custom exercises to start building workouts." | "Add Exercise" → opens add-exercise modal   |
| Client Details       | No workouts assigned        | `Dumbbell`     | "No workouts assigned to this client yet."                                         | "Assign a Workout" → assign flow            |
| Client Details       | No progress data            | `TrendingUp`   | "No progress data recorded for this client yet."                                   | none                                        |
| Schedule (full-page) | `appointments.length === 0` | `CalendarDays` | "No appointments scheduled this week. Add a session to start planning."            | "New Appointment" → opens appointment modal |

---

## Disciple — Functional Template Pages (no illustration, waiting copy, no CTA)

| Page                            | Trigger                                                                | Icon           | Body                                                                                        | CTA  |
| ------------------------------- | ---------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------- | ---- |
| My Workouts (WeeklyWorkoutView) | `!hasWorkouts`                                                         | `Dumbbell`     | "Your trainer hasn't assigned any workouts yet. Check back after your next session."        | none |
| Schedule                        | `appointments.length === 0` (isClient view)                            | `CalendarDays` | "No sessions scheduled yet. Your trainer will add appointments when you're ready to start." | none |
| Progress                        | `selectedClientData && !loadingProgress && progressTypes.length === 0` | `TrendingUp`   | "Progress gets tracked here as you and your trainer work together."                         | none |

---

## Implementation Notes

- `GuruIcon` is in `client/src/components/icons/GuruIcon.tsx` — same API as `RoninIcon`
- `DiscipleIcon` exists but is NOT used in any empty state
- Schedule page: Trainer and Disciple both use `TrainerClientSchedule` — gate Disciple vs Trainer copy with `isClient`
- Existing per-day Moon icon treatment in Schedule calendar grid stays unchanged
- Exercises has two empty state triggers: filtered search (`filteredExercises.length === 0`) and library truly empty (`exercises.length === 0`) — update both with consistent copy
- Payments: GuruIcon only when BOTH `plans.length === 0` AND `paymentHistory.length === 0` (truly new trainer)
