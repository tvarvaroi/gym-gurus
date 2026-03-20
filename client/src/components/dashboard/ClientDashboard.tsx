/**
 * ClientDashboard — Disciple role dashboard (Phase 3A rewrite)
 *
 * Mirrors the Guru DashboardHero combined pattern:
 * - Compact hero with NumberTicker stats (Assigned / Completed / Streak)
 * - Entrance-only blur orbs (no repeat: Infinity)
 * - All colours via hsl(var(--primary)) — role-aware (teal for Disciple)
 * - Zero framer-motion on stat cards (CSS transitions only)
 * - StaggerContainer/StaggerItem → plain divs with animate-in
 *
 * Preserved from original:
 * - All data fetching (profile, workouts, progress, sessions, gamification)
 * - Workout streak + achievement calculations
 * - Celebration overlay + milestone triggers
 * - XP / Level card
 * - Profile, Workouts, Sessions sections
 */

import { useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  TrendingUp,
  Activity,
  Target,
  Dumbbell,
  Award,
  Flame,
  Trophy,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/contexts/UserContext';
import { NumberTicker } from '@/components/ui/number-ticker';
import { calculateWorkoutStreak, getStreakMessage } from '@/lib/streakCalculations';
import {
  calculateAchievements,
  getNextAchievement,
  type BadgeCalculationData,
} from '@/lib/achievements';
import { getRankForLevel } from '@/lib/constants/xpRewards';
import { AchievementGrid } from '../AchievementBadge';
import { CelebrationOverlay, useCelebration } from '../CelebrationOverlay';
import { QueryErrorState } from '@/components/query-states/QueryErrorState';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  activityLevel?: string;
  goal?: string;
  status?: string;
}

interface ClientWorkout {
  id: string;
  name: string;
  completed?: boolean;
  completedAt?: string;
  exercises?: { id: string }[];
}

interface ProgressEntry {
  weight?: number;
}

interface Session {
  id: string;
  scheduledAt: string;
  type?: string;
  status?: string;
}

interface GamificationProfile {
  currentLevel: number;
  totalXp: number;
  xpToNextLevel: number;
  totalWorkoutsCompleted: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const [, navigate] = useLocation();
  const { user: currentUser } = useUser();
  const { celebration, celebrate, hide } = useCelebration();

  // ── Data fetching ────────────────────────────────────────────────────────

  const {
    data: clientData,
    isLoading: clientDataLoading,
    error: clientError,
  } = useQuery<ClientProfile>({
    queryKey: ['/api/client/profile'],
    queryFn: async () => {
      const response = await fetch('/api/client/profile', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch client data');
      return response.json();
    },
  });

  const { data: clientWorkouts, isLoading: workoutsLoading } = useQuery<ClientWorkout[]>({
    queryKey: [`/api/clients/${clientData?.id}/workouts`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientData?.id}/workouts`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch workouts');
      return response.json();
    },
    enabled: !!clientData?.id,
  });

  const { data: clientProgress } = useQuery<ProgressEntry[]>({
    queryKey: [`/api/progress/${clientData?.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/progress/${clientData?.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch progress');
      return response.json();
    },
    enabled: !!clientData?.id,
  });

  const { data: clientSessions } = useQuery<Session[]>({
    queryKey: [`/api/clients/${clientData?.id}/sessions`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientData?.id}/sessions`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    enabled: !!clientData?.id,
  });

  const { data: gamification, isLoading: gamificationLoading } = useQuery<GamificationProfile>({
    queryKey: ['/api/gamification/profile'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const initGamification = useMutation({
    mutationFn: () => apiRequest('POST', '/api/gamification/initialize'),
  });

  useEffect(() => {
    if (!gamificationLoading && !gamification && !initGamification.isPending) {
      initGamification.mutate();
    }
  }, [gamificationLoading, gamification, initGamification.isPending]);

  // ── Derived state ────────────────────────────────────────────────────────

  const upcomingSessions =
    clientSessions?.filter((s) => new Date(s.scheduledAt) > new Date()).slice(0, 3) || [];

  const recentProgress = clientProgress?.slice(0, 5) || [];
  const latestWeight =
    recentProgress.length > 0
      ? (recentProgress[0] as ProgressEntry & { weight?: number })?.weight
      : clientData?.weight;

  const completedWorkouts = clientWorkouts?.filter((w) => w.completed)?.length || 0;
  const totalWorkouts = clientWorkouts?.length || 0;

  const completedWorkoutDates =
    clientWorkouts?.filter((w) => w.completedAt)?.map((w) => w.completedAt!) || [];
  const streakData = calculateWorkoutStreak(completedWorkoutDates);
  const streakMessage = getStreakMessage(streakData.currentStreak, streakData.isStreakActive);

  const achievementData: BadgeCalculationData = {
    completedWorkouts,
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    totalWorkouts,
    progressEntries: clientProgress?.length || 0,
  };
  const achievements = calculateAchievements(achievementData);
  const nextAchievement = getNextAchievement(achievements);
  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  // ── Celebrations ─────────────────────────────────────────────────────────

  const triggerCelebrations = useCallback(() => {
    if (streakData.currentStreak === 3 && streakData.isStreakActive)
      celebrate('3-Day Streak!', "You're building momentum!", 'flame');
    else if (streakData.currentStreak === 7 && streakData.isStreakActive)
      celebrate('7-Day Streak!', 'One week strong! Keep it up!', 'zap');
    else if (streakData.currentStreak === 14 && streakData.isStreakActive)
      celebrate('2-Week Champion!', "You're on fire!", 'trophy');
    else if (streakData.currentStreak === 30 && streakData.isStreakActive)
      celebrate('30-Day Streak!', "You're unstoppable!", 'trophy');

    if (completedWorkouts === 1)
      celebrate('First Workout!', 'Great start to your journey!', 'star');
    else if (completedWorkouts === 10)
      celebrate('10 Workouts!', "You're getting stronger!", 'award');
    else if (completedWorkouts === 50)
      celebrate('50 Workouts!', 'Half century! Amazing!', 'trophy');
  }, [streakData.currentStreak, streakData.isStreakActive, completedWorkouts, celebrate]);

  useEffect(() => {
    triggerCelebrations();
  }, [triggerCelebrations]);

  // ── Error state ──────────────────────────────────────────────────────────

  if (clientError) {
    return <QueryErrorState error={clientError} onRetry={() => window.location.reload()} />;
  }

  // ── Hero stats ───────────────────────────────────────────────────────────

  const heroStats = [
    { value: totalWorkouts, label: 'Assigned Workouts' },
    { value: completedWorkouts, label: 'Completed' },
    { value: streakData.currentStreak, label: 'Streak Days' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden animate-in fade-in duration-300"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--primary) / 0.10) 40%, transparent 100%)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Metallic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/50" />

        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.8) 30%, hsl(var(--primary)) 50%, hsl(var(--primary) / 0.6) 80%, transparent 100%)',
          }}
        />

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.5) 30%, hsl(var(--primary) / 0.7) 50%, hsl(var(--primary) / 0.5) 70%, transparent 100%)',
          }}
        />

        {/* Inner glow border */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            boxShadow:
              'inset 0 1px 2px rgba(255, 255, 255, 0.08), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
          }}
        />

        {/* Radial lighting */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.06) 0%, transparent 50%)',
          }}
        />

        {/* Entrance-only blur orbs — no infinite animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-8 right-8 w-64 h-64 rounded-full"
            style={{
              background:
                'radial-gradient(circle, hsl(var(--primary) / 0.30) 0%, hsl(var(--primary) / 0.08) 60%, transparent 100%)',
              filter: 'blur(40px)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute bottom-8 left-8 w-72 h-72 rounded-full"
            style={{
              background:
                'radial-gradient(circle, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.06) 60%, transparent 100%)',
              filter: 'blur(50px)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.8, scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 md:px-8 py-10 text-white">
          {/* Disciple badge — top left */}
          <div
            className="absolute top-6 left-6 flex items-center gap-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 animate-in fade-in slide-in-from-left-3 duration-500"
            style={{
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span
              className="text-xs font-medium tracking-wider uppercase"
              style={{ letterSpacing: '0.15em' }}
            >
              Disciple
            </span>
          </div>

          {/* Main content block — single entrance animation */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-5 w-full"
          >
            {/* Greeting with ornamental flanking lines */}
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] w-8 bg-gradient-to-r from-transparent via-white/40 to-white/60" />
              <p
                className="text-sm sm:text-base font-light text-white/90 tracking-widest uppercase"
                style={{ letterSpacing: '0.2em' }}
              >
                Welcome back,{' '}
                <span className="font-normal bg-gradient-to-r from-primary via-white to-white bg-clip-text text-transparent">
                  {currentUser?.firstName || clientData?.name?.split(' ')[0] || 'there'}
                </span>
              </p>
              <div className="h-[1px] w-8 bg-gradient-to-l from-transparent via-white/40 to-white/60" />
            </div>

            {/* Playfair title */}
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-extralight leading-none"
              style={{
                letterSpacing: '-0.02em',
                textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              <span className="block" style={{ fontFamily: "'Playfair Display', serif" }}>
                Your
              </span>
              <span
                className="block font-light bg-gradient-to-r from-primary via-white/80 to-white bg-clip-text text-transparent"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  letterSpacing: '0.05em',
                }}
              >
                Fitness Journey
              </span>
            </h1>

            {/* Goal badge */}
            {clientData?.goal && (
              <div className="flex items-center justify-center">
                <div
                  className="flex items-center gap-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md px-5 py-2 rounded-full border border-white/20"
                  style={{
                    boxShadow:
                      '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-light text-white/90 tracking-wide">
                    Goal: {clientData.goal}
                  </span>
                </div>
              </div>
            )}

            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-3 py-1">
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
              <div
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{
                  boxShadow: '0 0 8px hsl(var(--primary) / 0.6)',
                }}
              />
              <div className="h-[1px] w-16 bg-gradient-to-l from-transparent via-primary to-transparent" />
            </div>

            {/* Stats row */}
            <div className="flex items-start justify-center">
              {heroStats.map((stat, i) => (
                <div key={stat.label} className="flex items-start">
                  {i > 0 && (
                    <div className="w-px h-10 bg-white/15 mx-6 md:mx-10 mt-1 flex-shrink-0" />
                  )}
                  <div className="text-center">
                    {clientDataLoading || workoutsLoading ? (
                      <Skeleton className="h-9 w-12 mx-auto bg-white/10" />
                    ) : (
                      <NumberTicker
                        value={stat.value}
                        className="text-3xl sm:text-4xl font-extralight tabular-nums text-white"
                      />
                    )}
                    <p
                      className="text-[10px] uppercase tracking-widest text-white/60 mt-1.5"
                      style={{ letterSpacing: '0.15em' }}
                    >
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs — 2 buttons, clear hierarchy */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Button
                className="relative bg-gradient-to-r from-white via-white to-white/95 text-primary hover:from-white hover:to-white font-medium px-8 sm:px-10 h-11 rounded-xl tracking-wide uppercase text-sm overflow-hidden hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                onClick={() => navigate('/workouts')}
              >
                <Dumbbell className="w-4 h-4 mr-2" />
                Start Workout
              </Button>
              <Button
                variant="outline"
                className="relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md border border-white/30 text-white hover:from-white/10 hover:to-white/5 font-medium px-8 sm:px-10 h-11 rounded-xl tracking-wide uppercase text-sm gap-2 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                onClick={() => navigate('/schedule')}
              >
                View Schedule
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-300">
        {/* Weight / Height */}
        <Card className="group relative overflow-hidden min-h-[180px] border border-primary/20 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-xl hover:shadow-lg hover:border-primary/40 hover:-translate-y-1.5 active:scale-[0.97] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-light tracking-wide text-foreground/90">
              Current Weight
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-colors duration-300">
              <Activity className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative space-y-3">
            {clientDataLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <div className="text-4xl font-extralight tracking-tight">
                  {latestWeight ? (
                    <>
                      {latestWeight}
                      <span className="text-xl text-muted-foreground/60 ml-1.5 font-light">kg</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/60">Not set</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/70">
                  Height:{' '}
                  <span className="text-primary">
                    {clientData?.height ? `${clientData.height} cm` : 'Not set'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground/50">Managed by your trainer</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* My Workouts */}
        <Card
          className="group relative overflow-hidden min-h-[180px] border border-primary/20 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-xl hover:shadow-lg hover:border-primary/40 hover:-translate-y-1.5 active:scale-[0.97] transition-all duration-300 cursor-pointer"
          onClick={() => navigate('/workouts')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-light tracking-wide text-foreground/90">
              My Workouts
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative space-y-3">
            {workoutsLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <div className="text-4xl font-extralight tracking-tight">{totalWorkouts}</div>
                <p className="text-xs text-muted-foreground/70">
                  {completedWorkouts > 0 ? (
                    <span className="text-primary">
                      {Math.round((completedWorkouts / totalWorkouts) * 100)}% completed
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">Ready to start</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground/50 group-hover:text-primary/70 transition-colors">
                  Click to view workouts
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Progress Entries */}
        <Card
          className="group relative overflow-hidden min-h-[180px] border border-primary/20 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-xl hover:shadow-lg hover:border-primary/40 hover:-translate-y-1.5 active:scale-[0.97] transition-all duration-300 cursor-pointer"
          onClick={() => navigate('/progress')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-light tracking-wide text-foreground/90">
              Progress Entries
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative space-y-3">
            <>
              <div className="text-4xl font-extralight tracking-tight">
                {clientProgress?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground/70">
                {(clientProgress?.length || 0) > 0 ? (
                  <span className="text-primary">Tracking journey</span>
                ) : (
                  <span className="text-muted-foreground/60">View progress</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground/50 group-hover:text-primary/70 transition-colors">
                Click to view progress
              </p>
            </>
          </CardContent>
        </Card>

        {/* Workout Streak */}
        <Card className="group relative overflow-hidden min-h-[180px] border border-primary/20 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-xl hover:shadow-lg hover:border-primary/40 hover:-translate-y-1.5 active:scale-[0.97] transition-all duration-300">
          {/* Active streak glow */}
          {streakData.isStreakActive && streakData.currentStreak > 0 && (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-yellow-500/5 to-transparent animate-pulse" />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-light tracking-wide text-foreground/90 flex items-center gap-1.5">
              Workout Streak
            </CardTitle>
            <div
              className={`p-2.5 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
                streakData.isStreakActive
                  ? 'bg-orange-500/15 border-orange-500/30 group-hover:bg-orange-500/25'
                  : 'bg-primary/10 border-primary/20 group-hover:bg-primary/15'
              }`}
            >
              <Flame
                className={`h-5 w-5 ${
                  streakData.isStreakActive ? 'text-orange-500 animate-pulse' : 'text-primary'
                }`}
              />
            </div>
          </CardHeader>
          <CardContent className="relative space-y-3">
            {workoutsLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <div className="text-4xl font-extralight tracking-tight">
                  {streakData.currentStreak}
                  <span className="text-xl text-muted-foreground/60 ml-1.5 font-light">
                    {streakData.currentStreak === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/70">
                  {streakData.longestStreak > streakData.currentStreak ? (
                    <span className="text-primary">Best: {streakData.longestStreak} days</span>
                  ) : (
                    <span className="text-muted-foreground/60">{streakMessage}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground/50">
                  {streakData.isStreakActive ? 'Keep it going!' : 'Start a new streak today'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── XP & Level Card ──────────────────────────────────────────────── */}
      {gamification && (
        <Card className="border border-primary/20 overflow-hidden animate-in fade-in duration-300">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5" />
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-light text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="text-primary">Your Level</span>
                </h3>
                <span className="text-2xl">
                  {gamification.currentLevel >= 75
                    ? '💎'
                    : gamification.currentLevel >= 50
                      ? '👑'
                      : gamification.currentLevel >= 30
                        ? '🔥'
                        : gamification.currentLevel >= 10
                          ? '⭐'
                          : '🌱'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-3xl font-extralight text-primary">
                    {gamification.currentLevel || 1}
                  </p>
                  <p className="text-xs text-muted-foreground/70 font-light">Level</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-extralight text-primary">
                    {gamification.totalXp || 0}
                  </p>
                  <p className="text-xs text-muted-foreground/70 font-light">Total XP</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-extralight text-primary">
                    {gamification.totalWorkoutsCompleted || 0}
                  </p>
                  <p className="text-xs text-muted-foreground/70 font-light">Workouts</p>
                </div>
              </div>
              {/* XP Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground/70 font-light">XP to next level</span>
                  <span className="font-light text-primary">
                    {gamification.xpToNextLevel || 0} XP needed
                  </span>
                </div>
                <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-[width] duration-800 ease-out"
                    style={{
                      width: `${
                        gamification.xpToNextLevel > 0
                          ? Math.min(
                              ((gamification.totalXp || 0) /
                                ((gamification.totalXp || 0) +
                                  (gamification.xpToNextLevel || 50))) *
                                100,
                              100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              {(gamification.currentLevel || 1) > 1 &&
                (() => {
                  const rank = getRankForLevel(gamification.currentLevel || 1);
                  return (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-light text-muted-foreground/80">
                        Rank:{' '}
                        <span className="text-primary">
                          {rank.emoji} {rank.name}
                        </span>
                      </span>
                    </div>
                  );
                })()}
            </CardContent>
          </div>
        </Card>
      )}

      {/* ─── Achievements ─────────────────────────────────────────────────── */}
      {!workoutsLoading && (
        <Card className="border border-primary/20 animate-in fade-in duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-primary">Your Achievements</span>
            </CardTitle>
            <CardDescription>
              {unlockedAchievements.length} of {achievements.length} achievements unlocked
            </CardDescription>
          </CardHeader>
          <CardContent>
            {achievements.length > 0 ? (
              <>
                <AchievementGrid achievements={achievements} showProgress={true} />
                {nextAchievement && (
                  <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in duration-300">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{nextAchievement.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">Next Achievement</h4>
                        <p className="text-sm text-muted-foreground">{nextAchievement.title}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-[width] duration-1000 ease-out"
                              style={{
                                width: `${Math.min(
                                  ((nextAchievement.progress || 0) / nextAchievement.requirement) *
                                    100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">
                            {nextAchievement.progress || 0}/{nextAchievement.requirement}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Complete workouts to start earning achievements!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Profile ──────────────────────────────────────────────────────── */}
      {clientData && (
        <Card className="border border-border/30 animate-in fade-in duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              My Profile
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/70">
              Managed by your trainer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="text-lg font-semibold">
                  {clientData.age ? `${clientData.age} years` : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="text-lg font-semibold capitalize">{clientData.gender || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activity Level</p>
                <p className="text-lg font-semibold capitalize">
                  {clientData.activityLevel || 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={clientData.status === 'active' ? 'bg-primary' : ''}>
                  {clientData.status || 'Not set'}
                </Badge>
              </div>
            </div>
            {clientData.goal && (
              <div>
                <p className="text-sm text-muted-foreground">My Goal</p>
                <p className="text-base mt-1">{clientData.goal}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Assigned Workouts ────────────────────────────────────────────── */}
      <Card className="border border-border/30 animate-in fade-in duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            My Workout Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientWorkouts && clientWorkouts.length > 0 ? (
            <>
              <div className="space-y-3">
                {clientWorkouts.slice(0, 3).map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{workout.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {workout.exercises?.length || 0} exercises
                      </p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/workouts')}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
              {clientWorkouts.length > 3 && (
                <Button
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => navigate('/workouts')}
                >
                  View all {clientWorkouts.length} workouts
                </Button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center py-6 text-center space-y-2">
              <Dumbbell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No workouts assigned yet</p>
              <p className="text-xs text-muted-foreground/60">
                Your trainer will assign workout plans here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Upcoming Sessions ────────────────────────────────────────────── */}
      <Card className="border border-border/30 animate-in fade-in duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length > 0 ? (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{session.type || 'Training Session'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.scheduledAt).toLocaleDateString()} at{' '}
                      {new Date(session.scheduledAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Badge className="bg-primary">{session.status || 'Scheduled'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center space-y-2">
              <Calendar className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No upcoming sessions</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => navigate('/schedule')}
              >
                View Schedule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Celebration Overlay ──────────────────────────────────────────── */}
      <CelebrationOverlay
        show={celebration.show}
        title={celebration.title}
        subtitle={celebration.subtitle}
        icon={celebration.icon}
        onComplete={hide}
      />
    </div>
  );
}
