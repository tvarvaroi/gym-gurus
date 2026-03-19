# Guru Dashboard Visual Pass — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Guru (trainer) dashboard from an ornamental, information-sparse layout to a compact, data-dense, role-aware design matching the quality bar set by the Ronin dashboard redesign.

**Architecture:** Six sequential phases (2A–2F) modifying 5 existing files, creating 1 new component, and adding 1 new backend endpoint. Each phase is independently committable. No DB schema changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, NumberTicker (Magic UI), AnimatedCircularProgressBar (Magic UI), TanStack Query, Drizzle ORM, Express.

---

## Task 1: §FE-6 Fix — Remove isolated useQuery in Dashboard.tsx (Phase 2E)

> Do this FIRST — it affects every subsequent phase's `user` references.

**Files:**

- Modify: `client/src/components/Dashboard.tsx`

**Step 1: Remove the isolated useQuery block**

In `Dashboard.tsx`, delete the entire `useQuery({ queryKey: ['/api/auth/user'] })` block (lines ~112–124):

```tsx
// DELETE THIS ENTIRE BLOCK:
const { data: user, isLoading: userLoading } = useQuery({
  queryKey: ['/api/auth/user'],
  queryFn: async () => {
    const response = await fetch('/api/auth/user', { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },
  retry: false,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
});
```

**Step 2: Rename `currentUser` to `user` in the useUser() destructure**

```tsx
// Before:
const { isClient, isTrainer, user: currentUser } = useUser();

// After:
const { isClient, isTrainer, user } = useUser();
```

**Step 3: Update all references from `currentUser` to `user`**

There is currently no usage of `currentUser` in the file — it was destructured but the component uses `user` from the isolated useQuery. After deleting the useQuery, `user` now comes from `useUser()`. No further renames needed.

**Step 4: Remove `userLoading` from the loading guard**

```tsx
// Before:
if (!userLoading && !user) return <LoginPage />;

// After — useUser() handles auth state; if no user, AuthGuard already redirects:
// DELETE the entire line: if (!userLoading && !user) return <LoginPage />;
```

Also remove the `LoginPage` import if it becomes unused:

```tsx
// DELETE if unused after removing the guard:
import { LoginPage } from './LoginPage';
```

**Step 5: Update `enabled` guards on queries**

The existing `enabled: !!user?.id` guards now reference the `user` from `useUser()`. This works correctly — no change needed since the variable name is the same.

**Step 6: Fix console.error → console.warn**

```tsx
// In handleChecklistDismiss:
// Before:
console.error('Failed to dismiss checklist:', error);
// After:
console.warn('Failed to dismiss checklist:', error);
```

**Step 7: Commit**

```
fix(dashboard): remove isolated useQuery, use useUser() everywhere (§FE-6)
```

---

## Task 2: DashboardHero Full Replacement (Phase 2A)

**Files:**

- Rewrite: `client/src/components/dashboard/DashboardHero.tsx`
- Modify: `client/src/components/Dashboard.tsx` (update props passed to hero)

**Step 1: Rewrite DashboardHero.tsx**

Replace the entire 311-line file with a compact, information-dense hero. Zero framer-motion. CSS-only animations.

```tsx
import { memo } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumberTicker } from '@/components/ui/number-ticker';

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

const DashboardHero = memo(
  ({
    user,
    isConnected,
    greeting,
    activeClients,
    completedSessionsThisWeek,
    upcomingSessions,
    onNavigate,
    onAddClient,
  }: DashboardHeroProps) => {
    const stats = [
      { value: activeClients, label: 'Active Clients' },
      { value: completedSessionsThisWeek, label: 'Sessions This Week' },
      { value: upcomingSessions, label: 'Upcoming Today' },
    ];

    return (
      <div className="relative rounded-2xl border border-border/20 bg-gradient-to-br from-primary/8 via-background to-background overflow-hidden animate-in fade-in duration-300">
        {/* Top accent line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="px-6 py-8 md:px-8">
          {/* Greeting row */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {greeting},{' '}
              <span className="text-foreground font-medium">{user?.firstName || 'Trainer'}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`}
              />
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-start justify-center gap-0 mb-8">
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex items-start">
                {i > 0 && (
                  <div className="w-px h-10 bg-border/40 mx-6 md:mx-8 mt-1 flex-shrink-0" />
                )}
                <div className="text-center">
                  <NumberTicker
                    value={stat.value}
                    className="text-4xl font-extralight tabular-nums text-foreground"
                  />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div className="flex items-center gap-3">
            <Button size="sm" className="h-9 text-sm gap-1.5" onClick={onAddClient}>
              <Plus className="w-3.5 h-3.5" />
              Add Client
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm gap-1.5"
              onClick={() => onNavigate('/workouts')}
            >
              Create Workout
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

DashboardHero.displayName = 'DashboardHero';

export default DashboardHero;
```

**Step 2: Update Dashboard.tsx hero props**

Replace the current `<DashboardHero>` call:

```tsx
// Before:
<DashboardHero
  isTrainer={isTrainer}
  prefersReducedMotion={prefersReducedMotion}
  user={user}
  isConnected={isConnected}
  greeting={greeting}
  activeClients={dashboardStats?.activeClients || 0}
  onNavigate={navigate}
/>

// After:
<DashboardHero
  user={user}
  isConnected={isConnected}
  greeting={greeting}
  activeClients={dashboardStats?.activeClients || 0}
  completedSessionsThisWeek={dashboardStats?.completedSessionsThisWeek || 0}
  upcomingSessions={dashboardStats?.upcomingSessions || 0}
  onNavigate={navigate}
  onAddClient={() => setShowClientModal(true)}
/>
```

**Step 3: Clean up unused imports in Dashboard.tsx**

After hero replacement, check if `useReducedMotion` and `prefersReducedMotion` are still used elsewhere in Dashboard.tsx. The `prefersReducedMotion` was also passed to `DashboardStatCards` — it will be removed in Task 3. For now, keep it.

Remove `AnimatedButton` import if no longer used (it was only in the old hero via `NewClientButton`).

**Step 4: Commit**

```
refactor(hero): replace DashboardHero with information-dense compact hero
```

---

## Task 3: DashboardStatCards Upgrade (Phase 2B)

**Files:**

- Modify: `client/src/components/dashboard/DashboardStatCards.tsx`
- Modify: `client/src/components/Dashboard.tsx` (remove prefersReducedMotion prop)

**Step 1: Rewrite DashboardStatCards.tsx**

Replace the framer-motion-heavy version with CSS transitions and NumberTicker:

```tsx
import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NumberTicker } from '@/components/ui/number-ticker';

export interface StatItem {
  label: string;
  value: string;
  icon: any;
  trend: string;
  change: string;
  changeType: string;
  color: string;
  bgGlow: string;
}

interface DashboardStatCardsProps {
  stats: StatItem[];
  onNavigate: (path: string) => void;
}

const DashboardStatCards = memo(({ stats, onNavigate }: DashboardStatCardsProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
    {stats.map((stat) => (
      <Card
        key={stat.label}
        className={`
          relative overflow-hidden cursor-pointer
          bg-gradient-to-br ${stat.bgGlow}
          glass border-border/40
          hover:shadow-lg hover:border-primary/30 hover:-translate-y-1.5
          active:scale-[0.97]
          transition-all duration-300 group
        `}
        onClick={() => {
          if (stat.label === 'Active Clients') onNavigate('/clients');
          if (stat.label === 'Workout Plans') onNavigate('/workouts');
          if (stat.label === 'Sessions This Week') onNavigate('/schedule');
        }}
      >
        {/* Hover glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
            {stat.label}
          </CardTitle>
          <div className="relative">
            <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-all duration-300">
              <stat.icon
                className={`h-5 w-5 ${stat.color} transition-all duration-500 group-hover:scale-125 group-hover:rotate-12`}
              />
            </div>
            {stat.changeType === 'increase' && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <NumberTicker
              value={Number(stat.value) || 0}
              className="text-4xl font-extralight tabular-nums"
            />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
            {stat.label}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">{stat.trend}</p>
        </CardContent>
      </Card>
    ))}
  </div>
));

DashboardStatCards.displayName = 'DashboardStatCards';

export default DashboardStatCards;
```

**Step 2: Update Dashboard.tsx — remove prefersReducedMotion prop**

```tsx
// Before:
<DashboardStatCards
  stats={stats}
  prefersReducedMotion={prefersReducedMotion}
  onNavigate={navigate}
/>

// After:
<DashboardStatCards stats={stats} onNavigate={navigate} />
```

If `prefersReducedMotion` and `useReducedMotion` are no longer used anywhere in Dashboard.tsx, remove the hook call and import.

**Step 3: Remove StaggerContainer/StaggerItem imports from DashboardStatCards.tsx**

These were framer-motion wrappers — delete their imports:

```tsx
// DELETE:
import { StaggerContainer, StaggerItem } from '@/components/AnimationComponents';
```

**Step 4: Commit**

```
refactor(stat-cards): remove framer-motion, add NumberTicker, CSS transitions
```

---

## Task 4: DashboardQuickActions Cleanup (Phase 2C)

**Files:**

- Modify: `client/src/components/dashboard/DashboardQuickActions.tsx`

**Step 1: Remove framer-motion import and replace all motion elements**

Remove:

```tsx
import { motion } from 'framer-motion';
```

**Fix 1 — AchievementBadge:** Replace `motion.div whileHover/whileTap` with CSS:

```tsx
// Before:
<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">

// After:
<div className="relative hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer">
```

And close with `</div>` instead of `</motion.div>`.

**Fix 2 — Hardcoded purple in AchievementBadge:**

```tsx
// Before:
'bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/50';

// After:
'bg-primary/10 border-primary/30';
```

Also fix the unlocked icon background:

```tsx
// Before:
'bg-gradient-to-br from-primary to-purple-500';

// After:
'bg-primary';
```

**Fix 3 — Replace ProgressRing with AnimatedCircularProgressBar:**

Delete the entire `ProgressRing` component (lines ~9–58).

Add import:

```tsx
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';
```

Replace usage in Weekly Goal section:

```tsx
// Before:
<ProgressRing progress={weeklyProgress} size={60} strokeWidth={5} color="text-primary" />

// After:
<AnimatedCircularProgressBar
  max={100}
  value={Math.round(weeklyProgress)}
  gaugePrimaryColor="hsl(var(--primary))"
  gaugeSecondaryColor="hsl(var(--muted))"
  className="size-16 text-sm"
/>
```

**Fix 4 — Quick action buttons:** Replace `motion.button` with plain `<button>` and `motion.div` wrappers with plain `<div>`:

```tsx
// Before:
<motion.button
  key={action.action}
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: index * 0.05, duration: 0.3 }}
  whileHover={{ scale: 1.05, y: -2 }}
  whileTap={{ scale: 0.95 }}
  ...

// After:
<button
  key={action.action}
  className={`
    relative overflow-hidden
    ${action.color}
    text-white rounded-xl p-4
    shadow-lg hover:shadow-2xl
    hover:scale-105 hover:-translate-y-0.5 active:scale-95
    transition-all duration-300
    flex flex-col items-center justify-center gap-2
    group
    animate-in fade-in zoom-in-95 duration-300
  `}
  ...
```

Also replace the `motion.div` wrapper around the NewClientButton:

```tsx
// Before:
<motion.div key={action.action} initial={...} animate={...} transition={...}>
  <NewClientButton ... />
</motion.div>

// After:
<div key={action.action} className="animate-in fade-in zoom-in-95 duration-300">
  <NewClientButton ... />
</div>
```

**Step 2: Commit**

```
refactor(quick-actions): remove framer-motion, fix hardcoded colours, replace ProgressRing
```

---

## Task 5: DashboardCharts Color Fix (Phase 2D)

**Files:**

- Modify: `client/src/components/dashboard/DashboardCharts.tsx`

**Step 1: Fix weight progress area chart colors**

```tsx
// Before:
<stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
<stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
...
<Area type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} fill="url(#colorWeight)" />

// After:
<stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
<stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
...
<Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorWeight)" />
```

**Step 2: Fix sessions bar chart colors**

```tsx
// Before:
<Bar dataKey="sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
<Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />

// After:
<Bar dataKey="sessions" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
<Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
```

**Step 3: Fix the progress badge colors**

```tsx
// Weight progress badge — keep semantic (green = loss is good, orange = gain):
// These are SEMANTIC colors — weight loss = good (green), weight gain = warning (orange).
// Do NOT change these to primary — they communicate health status.

// Completion rate badge:
// Before:
className = 'bg-emerald-500/10 text-emerald-600 border-none';
// After (role-aware):
className = 'bg-primary/10 text-primary border-none';
```

**Step 4: Fix growth rate badge**

```tsx
// Before:
className = 'bg-purple-500/10 text-purple-600 border-none';
// After:
className = 'bg-primary/10 text-primary border-none';
```

**Step 5: Commit**

```
fix(charts): replace hardcoded hex colours with CSS vars
```

---

## Task 6: Guru Week Strip — Backend Endpoint (Phase 2F backend)

**Files:**

- Modify: `server/routes/dashboard.ts`

**Step 1: Add week-activity endpoint**

Add this route after the existing `/dashboard/needs-attention` route:

```ts
// GET /api/dashboard/week-activity - Get per-day session breakdown for current week
router.get('/dashboard/week-activity', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const trainerId = req.user!.id;
    const database = await getDb();

    // Calculate Monday–Sunday of current week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // Format as YYYY-MM-DD strings to match appointments.date text column
    const mondayStr = monday.toISOString().slice(0, 10);
    const sundayStr = sunday.toISOString().slice(0, 10);

    // Fetch appointments for this trainer in this week range
    const weekAppointments = await database
      .select({
        date: appointments.date,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.trainerId, trainerId),
          gte(appointments.date, mondayStr),
          lte(appointments.date, sundayStr)
        )
      );

    // Build 7-day array
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayAppointments = weekAppointments.filter((a) => a.date === dateStr);
      const completed = dayAppointments.filter((a) => a.status === 'completed').length;
      const scheduled = dayAppointments.filter((a) => a.status === 'scheduled').length;

      return {
        date: dateStr,
        dayName: dayNames[i],
        dateNumber: d.getDate(),
        completedSessions: completed,
        scheduledSessions: scheduled,
        totalSessions: completed + scheduled,
      };
    });

    res.json({ days });
  } catch (error) {
    console.warn('Error fetching week activity:', error);
    res.json({ days: [] });
  }
});
```

**Step 2: Add the missing import at the top of dashboard.ts**

The `gte` and `lte` imports are needed. Check current imports:

```ts
// Current:
import { eq, and, isNull } from 'drizzle-orm';

// Update to:
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
```

**Step 3: Commit**

```
feat(dashboard): add GET /api/dashboard/week-activity endpoint
```

---

## Task 7: Guru Week Strip — Frontend Component (Phase 2F frontend)

**Files:**

- Create: `client/src/components/dashboard/GuruWeekStrip.tsx`
- Modify: `client/src/components/Dashboard.tsx` (add query + render)

**Step 1: Create GuruWeekStrip.tsx**

```tsx
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Check, Calendar } from 'lucide-react';

interface WeekDay {
  date: string;
  dayName: string;
  dateNumber: number;
  completedSessions: number;
  scheduledSessions: number;
  totalSessions: number;
}

export function GuruWeekStrip() {
  const { data, isLoading } = useQuery<{ days: WeekDay[] }>({
    queryKey: ['/api/dashboard/week-activity'],
    staleTime: 2 * 60 * 1000,
  });

  const days = data?.days || [];

  // Determine today's index (0=Mon, 6=Sun)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  if (isLoading || days.length === 0) return null;

  return (
    <Link href="/schedule">
      <a className="block cursor-pointer group animate-in fade-in slide-in-from-bottom-1 duration-300">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground/50 font-medium flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            This Week
          </span>
          <span className="text-xs text-muted-foreground/30 group-hover:text-primary transition-colors">
            Schedule →
          </span>
        </div>

        <div className="flex gap-1 rounded-xl border border-border/20 bg-card p-2">
          {days.map((day, i) => {
            const isToday = i === todayIndex;
            const hasCompleted = day.completedSessions > 0;
            const hasScheduled = day.scheduledSessions > 0;

            return (
              <div
                key={day.date}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-colors ${
                  isToday
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : hasCompleted
                      ? 'bg-white/[0.03]'
                      : ''
                }`}
              >
                <span
                  className={`text-[10px] uppercase tracking-wider ${
                    isToday ? 'text-primary font-bold' : 'text-muted-foreground/40'
                  }`}
                >
                  {day.dayName}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums mt-0.5 ${
                    isToday
                      ? 'text-primary'
                      : hasCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground/20'
                  }`}
                >
                  {day.dateNumber}
                </span>

                {/* Session indicator */}
                <div className="mt-1.5 h-4 flex items-center justify-center">
                  {hasCompleted ? (
                    <div className="flex items-center gap-0.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                      {day.completedSessions > 1 && (
                        <span className="text-[9px] text-primary font-bold ml-0.5">
                          {day.completedSessions}
                        </span>
                      )}
                    </div>
                  ) : hasScheduled ? (
                    <div className="w-2 h-2 rounded-full border border-muted-foreground/30" />
                  ) : isToday ? (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/10" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </a>
    </Link>
  );
}
```

**Step 2: Add GuruWeekStrip to Dashboard.tsx**

Import at the top:

```tsx
import { GuruWeekStrip } from './dashboard/GuruWeekStrip';
```

Add after `<DashboardStatCards>` and before `<NeedsAttentionCard />`:

```tsx
<DashboardStatCards stats={stats} onNavigate={navigate} />

<GuruWeekStrip />

<NeedsAttentionCard />
```

Also add `'/api/dashboard/week-activity'` to WebSocket invalidation for session events:

```tsx
case 'session_updated':
case 'session_created':
case 'session_completed':
  queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
  queryClient.invalidateQueries({ queryKey: ['/api/dashboard/charts'] });
  queryClient.invalidateQueries({ queryKey: ['/api/dashboard/week-activity'] });
  break;
```

**Step 3: Commit**

```
feat(dashboard): add GuruWeekStrip with week-activity endpoint
```

---

## Task 8: Final Cleanup and Verification

**Files:**

- Verify: all modified files

**Step 1: Check unused imports in Dashboard.tsx**

After all changes, verify these are cleaned up:

- `useReducedMotion` + `prefersReducedMotion` — remove if no longer passed to any child
- `LoginPage` import — remove if guard was deleted
- `AnimatedButton` import — check if still needed (it's used in old hero, not new hero)
- `AnimatePresence` + `motion` — **KEEP** (used in Recent Activity section)
- `NewClientButton` — **KEEP** (used in `ClientFormModal` still rendered)

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: same count as before (130 pre-existing, zero new).

**Step 3: Run ESLint on changed files**

```bash
npx eslint client/src/components/Dashboard.tsx client/src/components/dashboard/DashboardHero.tsx client/src/components/dashboard/DashboardStatCards.tsx client/src/components/dashboard/DashboardQuickActions.tsx client/src/components/dashboard/DashboardCharts.tsx client/src/components/dashboard/GuruWeekStrip.tsx --ext .tsx --quiet
```

Expected: zero errors.

**Step 4: Verify framer-motion reduction**

```bash
grep -c "motion\.\|from 'framer-motion'\|whileHover\|whileTap\|initial=\|animate=" client/src/components/Dashboard.tsx client/src/components/dashboard/DashboardHero.tsx client/src/components/dashboard/DashboardStatCards.tsx client/src/components/dashboard/DashboardQuickActions.tsx
```

Expected: Dashboard.tsx ~11 (AnimatePresence in Recent Activity), Hero 0, StatCards 0, QuickActions 0.

**Step 5: Verify no hardcoded hex colors**

```bash
grep -n "#10b981\|#3b82f6\|rgba(201\|rgba(212\|rgba(207\|purple-500" client/src/components/dashboard/*.tsx
```

Expected: zero matches.

**Step 6: Verify §FE-6 fixed**

```bash
grep -n "queryKey.*auth/user" client/src/components/Dashboard.tsx
```

Expected: zero matches.

**Step 7: Run Vite build**

```bash
npx vite build
```

Expected: build succeeds.

**Step 8: Commit any remaining cleanup**

```
chore(dashboard): final cleanup — remove unused imports, verify build
```
