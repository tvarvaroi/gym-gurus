# Guru Dashboard Visual Pass — Design Document

> Date: 2026-03-20 | Sprint: Guru Visual Pass | Status: Approved

---

## Problem

The Guru (trainer) dashboard has a 311-line ornamental hero that communicates zero actionable information, 108 framer-motion usages across 4 files for trivial hover/fade effects, hardcoded hex colors that bypass the role CSS var system, an isolated `useQuery` for auth that violates §FE-6, and no week-level activity view.

## Design Intelligence

Based on 1,116 competitor screenshots (Outsiders, WHOOP, Strava, Cal AI):

- Giant stat values at ~40px tabular-nums with ALL-CAPS muted labels beneath
- Single most important metric dominates the hero
- No decorative elements competing with data
- Subtle ambient color per section, not gradient cards

## Phases

### Phase 2A — DashboardHero replacement

**Current:** 311 lines, 65 framer-motion usages, 3 animated blur orbs, 2 decorative corner SVGs, noise texture overlay, hardcoded gold/teal gradient, "Your Fitness Studio" headline with zero data.

**New:** Compact, information-dense hero.

```
┌─────────────────────────────────────────────────┐
│  Good morning, [Name]          ● Live           │
│                                                  │
│   12          8           3                     │
│  ACTIVE    SESSIONS     UPCOMING                │
│  CLIENTS   THIS WEEK    TODAY                   │
│                                                  │
│  [+ Add Client]        [Create Workout →]       │
└─────────────────────────────────────────────────┘
```

Key decisions:

- Height: content-driven (`py-8 px-6`), not fixed `h-80`
- Background: `bg-gradient-to-br from-primary/8 via-background to-background`
- Top accent: single `h-[1px]` gradient line
- Connection status: `w-1.5 h-1.5` dot, no glassmorphism badge
- Stats: 3x NumberTicker with vertical dividers
- CTAs: `h-9 text-sm`, no uppercase
- Framer-motion: zero — CSS `animate-in fade-in duration-300` only

Props:

```ts
interface DashboardHeroProps {
  user: any;
  isConnected: boolean;
  greeting: string;
  activeClients: number;
  completedSessionsThisWeek: number;
  upcomingSessions: number;
  onNavigate: (path: string) => void;
  onAddClient: () => void;
}
```

Remove: `isTrainer`, `prefersReducedMotion`.

### Phase 2B — DashboardStatCards upgrade

- Remove `motion.div` wrappers → Tailwind `hover:-translate-y-1.5 transition-transform duration-300`
- Remove pulsing green `motion.circle` → `animate-pulse` CSS class
- Add NumberTicker for stat values (parse string → number)
- Typography: Outsiders pattern with `text-[10px] uppercase tracking-widest`

### Phase 2C — DashboardQuickActions cleanup

4 targeted fixes:

1. Achievement badges: `motion.div whileHover/Tap` → `hover:scale-105 active:scale-95 transition-transform`
2. Hardcoded purple: `from-primary/20 to-purple-500/20` → `bg-primary/10 border-primary/30`
3. Replace custom ProgressRing with existing `AnimatedCircularProgressBar`
4. Quick action buttons: `motion.button` → plain `<button>` with CSS animations

### Phase 2D — DashboardCharts color fix

Replace hardcoded hex:

- `#10b981` → `hsl(var(--primary))` for weight progress
- `#3b82f6` → `hsl(var(--primary) / 0.4)` for sessions bar
- Fill gradients use `hsl(var(--primary))` with opacity stops

### Phase 2E — §FE-6 fix in Dashboard.tsx

- Delete isolated `useQuery({ queryKey: ['/api/auth/user'] })`
- Use `currentUser` from `useUser()` everywhere
- Remove `userLoading` check
- Update `enabled: !!user?.id` guards

### Phase 2F — Guru Week Strip

**Backend:** `GET /api/dashboard/week-activity`

- Returns 7 days (Mon-Sun) with per-day completed/scheduled session counts
- Derives from existing session data for the trainer's clients

**Frontend:** `GuruWeekStrip` component

- 7 day circles with day abbrev + date + session count indicator
- Today highlighted with `bg-primary/10 ring-1 ring-primary/30`
- Completed sessions = colored dot, scheduled = hollow dot
- Links to `/schedule`

## Files Changed

| File                                             | Action                                     |
| ------------------------------------------------ | ------------------------------------------ |
| `components/dashboard/DashboardHero.tsx`         | Full rewrite                               |
| `components/dashboard/DashboardStatCards.tsx`    | Refactor (remove framer, add NumberTicker) |
| `components/dashboard/DashboardQuickActions.tsx` | Targeted fixes (4)                         |
| `components/dashboard/DashboardCharts.tsx`       | Color fix                                  |
| `components/Dashboard.tsx`                       | §FE-6 fix + hero prop updates              |
| `server/routes/dashboard.ts`                     | New week-activity endpoint                 |
| `components/dashboard/GuruWeekStrip.tsx`         | New component                              |

## Files NOT Changed

- `NeedsAttentionCard` (inline in Dashboard.tsx) — already excellent
- `ClientDashboard.tsx` — Disciple scope
- `SoloDashboard.tsx` + `redesign/dashboard/*` — Ronin scope
- `server/middleware/*` — DO NOT TOUCH
- `shared/schema.ts` — no DB changes

## Verification

- `npx tsc --noEmit` — no new errors
- `npx eslint` on changed files — clean
- framer-motion count drops from ~108 to ~11 across dashboard files
- No hardcoded hex colors in dashboard files
- No isolated auth useQuery in Dashboard.tsx
- Vite build succeeds
