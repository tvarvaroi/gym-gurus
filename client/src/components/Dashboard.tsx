import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, TrendingUp, Activity, Target, Clock, Plus, Download, FileText, Dumbbell, CheckCircle, Award, Zap, TrendingDown, Flame, Star } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import AnimatedButton from "./AnimatedButton"
import { NewClientButton, ClientFormModal } from "./ClientFormModal"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "../hooks/use-reduced-motion"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { StaggerContainer, StaggerItem } from "@/components/AnimationComponents"
import { memo, useState, useEffect, useMemo, useCallback } from "react"
import { useLocation } from "wouter"
import { exportClientsToCSV, exportWorkoutsToCSV } from "@/lib/exportUtils"
import { useToast } from "@/hooks/use-toast"
import LazyImage from "./LazyImage"
import { AreaChart, BarChart, LineChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useWebSocket } from "../hooks/useWebSocket"
import { WelcomeModal } from "./onboarding/WelcomeModal"
import { SetupChecklist, type ChecklistItem } from "./onboarding/SetupChecklist"
import { useUser } from "@/contexts/UserContext"
import { LoginPage } from "./LoginPage"
import { calculateWorkoutStreak, getStreakMessage, getStreakEmoji } from "@/lib/streakCalculations"
import { calculateAchievements, getNextAchievement, type BadgeCalculationData } from "@/lib/achievements"
import { AchievementGrid } from "./AchievementBadge"
import { CelebrationOverlay, useCelebration } from "./CelebrationOverlay"

// Mock chart data for demo purposes
const mockWeightProgressData = [
  { date: '4 weeks ago', weight: 195 },
  { date: '3 weeks ago', weight: 192 },
  { date: '2 weeks ago', weight: 190 },
  { date: '1 week ago', weight: 188 },
  { date: 'Today', weight: 185 },
];

const mockSessionsData = [
  { week: 'Week 1', sessions: 8, completed: 7 },
  { week: 'Week 2', sessions: 10, completed: 9 },
  { week: 'Week 3', sessions: 12, completed: 11 },
  { week: 'Week 4', sessions: 15, completed: 14 },
];

const mockClientGrowthData = [
  { month: 'Jan', clients: 5 },
  { month: 'Feb', clients: 7 },
  { month: 'Mar', clients: 9 },
  { month: 'Apr', clients: 12 },
  { month: 'May', clients: 12 },
];

// Shimmer loading component
const ShimmerCard = () => (
  <Card className="overflow-hidden">
    <div className="animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] h-32" />
  </Card>
);

// Progress Ring Component
const ProgressRing = memo(({ progress, size = 60, strokeWidth = 4, color = "text-primary" }: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={color}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-xs font-semibold">{Math.round(progress)}%</span>
    </div>
  );
});
ProgressRing.displayName = 'ProgressRing';

// Achievement Badge Component
const AchievementBadge = memo(({ icon: Icon, title, description, unlocked = false, glow = false }: {
  icon: any;
  title: string;
  description: string;
  unlocked?: boolean;
  glow?: boolean;
}) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="relative"
  >
    <Card className={`
      transition-all duration-300 cursor-pointer
      ${unlocked ? 'bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/50' : 'bg-muted/30 border-muted'}
      ${glow ? 'shadow-[0_0_20px_rgba(139,92,246,0.5)] animate-pulse-glow' : ''}
    `}>
      <CardContent className="p-4 text-center space-y-2">
        <div className={`
          mx-auto w-12 h-12 rounded-full flex items-center justify-center
          ${unlocked ? 'bg-gradient-to-br from-primary to-purple-500' : 'bg-muted'}
        `}>
          <Icon className={`h-6 w-6 ${unlocked ? 'text-white' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className={`font-semibold text-sm ${unlocked ? '' : 'text-muted-foreground'}`}>{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
));
AchievementBadge.displayName = 'AchievementBadge';

const Dashboard = memo(() => {
  const prefersReducedMotion = useReducedMotion();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isClient, isTrainer, user: currentUser } = useUser();
  const [showClientModal, setShowClientModal] = useState(false);
  const { celebration, celebrate, hide } = useCelebration();

  // Fetch authenticated user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    }
  });

  // Fetch client data if user is a client
  const { data: clientData, isLoading: clientDataLoading } = useQuery({
    queryKey: ['/api/client/profile'],
    queryFn: async () => {
      const response = await fetch('/api/client/profile', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch client data');
      return response.json();
    },
    enabled: isClient,
  });

  // Fetch client's assigned workouts
  const { data: clientWorkouts, isLoading: workoutsLoading } = useQuery({
    queryKey: [`/api/clients/${clientData?.id}/workouts`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientData?.id}/workouts`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch workouts');
      return response.json();
    },
    enabled: isClient && !!clientData?.id,
  });

  // Fetch client's progress data
  const { data: clientProgress, isLoading: progressLoading } = useQuery({
    queryKey: [`/api/progress/${clientData?.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/progress/${clientData?.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch progress');
      return response.json();
    },
    enabled: isClient && !!clientData?.id,
  });

  // Fetch client's upcoming sessions
  const { data: clientSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: [`/api/clients/${clientData?.id}/sessions`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientData?.id}/sessions`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    enabled: isClient && !!clientData?.id,
  });

  // If user is a client, render client dashboard with teal color scheme
  if (isClient) {
    const upcomingSessions = clientSessions?.filter((session: any) =>
      new Date(session.scheduledAt) > new Date()
    ).slice(0, 3) || [];

    const recentProgress = clientProgress?.slice(0, 5) || [];
    const latestWeight = recentProgress.length > 0 ? recentProgress[0]?.weight : clientData?.weight;

    // Calculate workout completion percentage
    const completedWorkouts = clientWorkouts?.filter((w: any) => w.completed)?.length || 0;
    const totalWorkouts = clientWorkouts?.length || 0;
    const workoutCompletionPercentage = totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;

    // Calculate workout streak
    const completedWorkoutDates = clientWorkouts
      ?.filter((w: any) => w.completedAt)
      ?.map((w: any) => w.completedAt) || [];
    const streakData = calculateWorkoutStreak(completedWorkoutDates);
    const streakMessage = getStreakMessage(streakData.currentStreak, streakData.isStreakActive);
    const streakEmoji = getStreakEmoji(streakData.currentStreak);

    // Calculate achievements
    const achievementData: BadgeCalculationData = {
      completedWorkouts,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      totalWorkouts,
      progressEntries: clientProgress?.length || 0,
    };
    const achievements = calculateAchievements(achievementData);
    const nextAchievement = getNextAchievement(achievements);
    const unlockedAchievements = achievements.filter(a => a.unlocked);

    // Auto-trigger celebrations for milestones
    useEffect(() => {
      // Check for streak milestones
      if (streakData.currentStreak === 3 && streakData.isStreakActive) {
        celebrate("3-Day Streak!", "You're building momentum! 🔥", "flame");
      } else if (streakData.currentStreak === 7 && streakData.isStreakActive) {
        celebrate("7-Day Streak!", "One week strong! Keep it up! ⚡", "zap");
      } else if (streakData.currentStreak === 14 && streakData.isStreakActive) {
        celebrate("2-Week Champion!", "You're on fire! 💪", "trophy");
      } else if (streakData.currentStreak === 30 && streakData.isStreakActive) {
        celebrate("30-Day Streak!", "You're unstoppable! 👑", "trophy");
      } else if (streakData.currentStreak === 100 && streakData.isStreakActive) {
        celebrate("100-Day Streak!", "Legendary achievement! 💎", "trophy");
      }

      // Check for workout completion milestones
      if (completedWorkouts === 1) {
        celebrate("First Workout!", "Great start to your journey! 🎯", "star");
      } else if (completedWorkouts === 10) {
        celebrate("10 Workouts!", "You're getting stronger! 💪", "award");
      } else if (completedWorkouts === 50) {
        celebrate("50 Workouts!", "Half century! Amazing! 🏅", "trophy");
      } else if (completedWorkouts === 100) {
        celebrate("100 Workouts!", "You're a champion! 🥇", "trophy");
      }
    }, [streakData.currentStreak, streakData.isStreakActive, completedWorkouts, celebrate]);

    return (
      <StaggerContainer className="space-y-8">
        <StaggerItem>
          {/* Enhanced Client Hero Header with Teal Theme */}
          <motion.div
            className="relative h-72 sm:h-80 rounded-3xl overflow-hidden backdrop-blur-3xl shadow-premium-lg border border-cyan-500/20"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(20, 184, 166, 0.15) 50%, rgba(13, 148, 136, 0.1) 100%)',
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Animated background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute top-10 right-10 w-64 h-64 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, rgba(6, 182, 212, 0.05) 100%)' }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute bottom-10 left-10 w-48 h-48 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, rgba(20, 184, 166, 0.05) 100%)' }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />
            </div>
            <div className="relative h-full flex flex-col justify-center items-center text-center px-6 text-white z-10">
              <motion.h1
                className="text-4xl md:text-6xl font-extralight tracking-tight mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Welcome Back, <span className="font-light bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-300 bg-clip-text text-transparent">
                  {currentUser?.firstName || clientData?.name?.split(' ')[0] || 'Client'}
                </span>
              </motion.h1>
              <motion.p
                className="text-lg font-light text-white/90 mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Your fitness journey continues
              </motion.p>
              {clientData?.goal && (
                <motion.div
                  className="mt-4 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-sm font-light text-white/95 flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-400" />
                    Goal: {clientData.goal}
                  </p>
                </motion.div>
              )}
              {/* Quick Action Buttons */}
              <motion.div
                className="mt-6 flex flex-wrap gap-3 justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => navigate('/workouts')}
                >
                  <Dumbbell className="h-4 w-4 mr-2" />
                  Start Workout
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
                  onClick={() => navigate('/progress')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Track Progress
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
                  onClick={() => navigate('/schedule')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </StaggerItem>

        {/* Premium Client Stats Overview - Uniform Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <motion.div whileHover={{ y: -8, scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
              <Card className="group relative overflow-hidden h-[180px] border border-cyan-500/30 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-2xl shadow-premium-lg hover:shadow-premium-xl hover:border-cyan-400/50 transition-all duration-500">
                {/* Animated gradient overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
                {/* Shimmer effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                </div>
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-light tracking-wide text-foreground/90">Current Weight</CardTitle>
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 backdrop-blur-sm border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors duration-300">
                    <Activity className="h-5 w-5 text-cyan-500" />
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  {clientDataLoading ? (
                    <Skeleton className="h-10 w-24" />
                  ) : (
                    <>
                      <div className="text-4xl font-extralight tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                        {latestWeight || clientData?.weight || 'N/A'}
                        <span className="text-xl text-muted-foreground/60 ml-1.5 font-light">kg</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-light">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                        <p className="text-muted-foreground/70 px-2">
                          Height: <span className="text-cyan-500/90">{clientData?.height || 'N/A'} cm</span>
                        </p>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                      </div>
                      <p className="text-[10px] font-light text-muted-foreground/50 text-center">Managed by your trainer</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <motion.div whileHover={{ y: -8, scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
              <Card className="group relative overflow-hidden h-[180px] border border-cyan-500/30 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-2xl shadow-premium-lg hover:shadow-premium-xl hover:border-cyan-400/50 transition-all duration-500 cursor-pointer" onClick={() => navigate('/workouts')}>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                </div>
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-light tracking-wide text-foreground/90">My Workouts</CardTitle>
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 backdrop-blur-sm border border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all duration-300">
                    <Dumbbell className="h-5 w-5 text-cyan-500" />
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  {workoutsLoading ? (
                    <Skeleton className="h-10 w-24" />
                  ) : (
                    <>
                      <div className="text-4xl font-extralight tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                        {clientWorkouts?.length || 0}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-light">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                        <p className="text-muted-foreground/70 px-2">
                          {workoutCompletionPercentage > 0 && (
                            <span className="text-cyan-500">{Math.round(workoutCompletionPercentage)}% completed</span>
                          )}
                          {workoutCompletionPercentage === 0 && <span className="text-muted-foreground/60">Ready to start</span>}
                        </p>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                      </div>
                      <p className="text-[10px] font-light text-muted-foreground/50 text-center group-hover:text-cyan-500/70 transition-colors">Click to view workouts</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <motion.div whileHover={{ y: -8, scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
              <Card className="group relative overflow-hidden h-[180px] border border-cyan-500/30 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-2xl shadow-premium-lg hover:shadow-premium-xl hover:border-cyan-400/50 transition-all duration-500 cursor-pointer" onClick={() => navigate('/progress')}>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                </div>
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-light tracking-wide text-foreground/90">Progress Entries</CardTitle>
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 backdrop-blur-sm border border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all duration-300">
                    <TrendingUp className="h-5 w-5 text-cyan-500" />
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  {progressLoading ? (
                    <Skeleton className="h-10 w-24" />
                  ) : (
                    <>
                      <div className="text-4xl font-extralight tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                        {clientProgress?.length || 0}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-light">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                        <p className="text-muted-foreground/70 px-2">
                          {clientProgress?.length > 0 ? <span className="text-cyan-500">Tracking journey</span> : <span className="text-muted-foreground/60">View progress</span>}
                        </p>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                      </div>
                      <p className="text-[10px] font-light text-muted-foreground/50 text-center group-hover:text-cyan-500/70 transition-colors">Click to view progress</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <motion.div whileHover={{ y: -8, scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
              <Card className="group relative overflow-hidden h-[180px] border border-cyan-500/30 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-2xl shadow-premium-lg hover:shadow-premium-xl hover:border-cyan-400/50 transition-all duration-500">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
                {/* Animated fire glow for active streaks */}
                {streakData.isStreakActive && streakData.currentStreak > 0 && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-orange-500/15 via-yellow-500/10 to-transparent"
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                </div>
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-light tracking-wide text-foreground/90 flex items-center gap-1.5">
                    Workout Streak
                    {streakData.isStreakActive && <span className="text-base">{streakEmoji}</span>}
                  </CardTitle>
                  <div className={`p-2.5 rounded-xl backdrop-blur-sm border transition-all duration-300 ${streakData.isStreakActive ? 'bg-orange-500/20 border-orange-500/30 group-hover:bg-orange-500/30' : 'bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/20'}`}>
                    <Flame className={`h-5 w-5 ${streakData.isStreakActive ? 'text-orange-500 animate-pulse' : 'text-cyan-500'}`} />
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  {workoutsLoading ? (
                    <Skeleton className="h-10 w-24" />
                  ) : (
                    <>
                      <div className="text-4xl font-extralight tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                        {streakData.currentStreak}
                        <span className="text-xl text-muted-foreground/60 ml-1.5 font-light">
                          {streakData.currentStreak === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-light">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                        <p className="text-muted-foreground/70 px-2">
                          {streakData.longestStreak > streakData.currentStreak ? (
                            <span className="text-cyan-500/90">Best: {streakData.longestStreak} days</span>
                          ) : (
                            <span className="text-muted-foreground/60">{streakMessage}</span>
                          )}
                        </p>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                      </div>
                      <p className="text-[10px] font-light text-muted-foreground/50 text-center">{streakData.isStreakActive ? 'Keep it going!' : 'Start a new streak today'}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </StaggerItem>
        </div>

        {/* Achievements Section */}
        {!workoutsLoading && (
          <StaggerItem>
            <Card className="glass-strong shadow-premium border border-cyan-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-cyan-500" />
                  <span className="bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-400 bg-clip-text text-transparent">
                    Your Achievements
                  </span>
                </CardTitle>
                <CardDescription>
                  {unlockedAchievements.length} of {achievements.length} achievements unlocked
                </CardDescription>
              </CardHeader>
              <CardContent>
                {achievements.length > 0 ? (
                  <>
                    <AchievementGrid achievements={achievements} showProgress={true} />

                    {/* Next Achievement Teaser */}
                    {nextAchievement && (
                      <motion.div
                        className="mt-6 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-teal-500/10 to-cyan-500/10 border border-cyan-500/20"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{nextAchievement.icon}</div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">Next Achievement</h4>
                            <p className="text-sm text-muted-foreground">{nextAchievement.title}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-500"
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${Math.min(
                                      ((nextAchievement.progress || 0) / nextAchievement.requirement) * 100,
                                      100
                                    )}%`,
                                  }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground font-medium">
                                {nextAchievement.progress || 0}/{nextAchievement.requirement}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Complete workouts to start earning achievements!
                  </p>
                )}
              </CardContent>
            </Card>
          </StaggerItem>
        )}

        {/* Client Profile Details */}
        {clientData && (
          <StaggerItem>
            <Card className="glass-strong shadow-premium client-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-teal-500" />
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
                    <p className="text-lg font-semibold">{clientData.age || 'N/A'} years</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="text-lg font-semibold capitalize">{clientData.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Activity Level</p>
                    <p className="text-lg font-semibold capitalize">{clientData.activityLevel || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={clientData.status === 'active' ? 'bg-teal-500' : ''}>
                      {clientData.status || 'N/A'}
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
          </StaggerItem>
        )}

        {/* Assigned Workouts */}
        {clientWorkouts && clientWorkouts.length > 0 && (
          <StaggerItem>
            <Card className="glass-strong shadow-premium client-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-teal-500" />
                  My Workout Plans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clientWorkouts.slice(0, 3).map((workout: any, idx: number) => (
                    <div key={workout.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium">{workout.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {workout.exercises?.length || 0} exercises
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="client-gradient hover:opacity-90"
                        onClick={() => navigate('/workouts')}
                      >
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
              </CardContent>
            </Card>
          </StaggerItem>
        )}

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <StaggerItem>
            <Card className="glass-strong shadow-premium client-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-teal-500" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingSessions.map((session: any) => (
                    <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium">{session.type || 'Training Session'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.scheduledAt).toLocaleDateString()} at{' '}
                          {new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge className="bg-teal-500">
                        {session.status || 'Scheduled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}

        {/* Celebration Overlay */}
        <CelebrationOverlay
          show={celebration.show}
          title={celebration.title}
          subtitle={celebration.subtitle}
          icon={celebration.icon}
          onComplete={hide}
        />
      </StaggerContainer>
    );
  }

  // Fetch onboarding progress
  const { data: onboardingProgress } = useQuery({
    queryKey: ['/api/onboarding/progress'],
    queryFn: async () => {
      const response = await fetch('/api/onboarding/progress', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch onboarding progress');
      return response.json();
    },
    enabled: !!user,
  });

  // Mutation to update onboarding progress
  const updateOnboardingMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch('/api/onboarding/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update onboarding progress');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/progress'] });
    },
  });

  // Handle welcome modal completion - close immediately, persist in background
  const handleWelcomeComplete = async (selectedGoal: string) => {
    // Persist to localStorage immediately so modal doesn't reappear on page reload
    localStorage.setItem('gymgurus_welcome_completed', 'true');
    try {
      await updateOnboardingMutation.mutateAsync({
        welcomeModalCompleted: true,
        selectedGoal,
      });
    } catch {
      // Modal is already dismissed via localStorage even if API fails
    }
  };

  // Handle checklist dismissal
  const handleChecklistDismiss = async () => {
    try {
      await updateOnboardingMutation.mutateAsync({
        onboardingCompletedAt: new Date().toISOString(),
      });
      // Refresh the page to hide the checklist
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/progress'] });
    } catch (error) {
      console.error('Failed to dismiss checklist:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss checklist. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Real-time updates via WebSocket
  const { isConnected } = useWebSocket({
    onMessage: useCallback((message: any) => {
      // Invalidate relevant queries when data changes
      switch (message.type) {
        case 'client_updated':
        case 'client_created':
        case 'client_deleted':
          queryClient.invalidateQueries({ queryKey: ['/api/clients', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats', user?.id] });
          break;
        case 'workout_updated':
        case 'workout_created':
        case 'workout_deleted':
          queryClient.invalidateQueries({ queryKey: ['/api/workouts', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats', user?.id] });
          break;
        case 'session_updated':
        case 'session_created':
        case 'session_completed':
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats', user?.id] });
          break;
      }
    }, [queryClient, user?.id, toast]),
  });

  // Fetch real client data for stats with automatic refetching
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ['/api/clients', user?.id, 'noPagination'],
    queryFn: () => fetch(`/api/clients/${user?.id}?noPagination=true`).then(res => res.json()),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when user focuses window
    enabled: !!user?.id,
  });

  // Fetch workouts for stats with automatic refetching
  const { data: workouts } = useQuery({
    queryKey: ['/api/workouts', user?.id],
    queryFn: () => fetch(`/api/workouts/${user?.id}`).then(res => res.json()),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!user?.id,
  });

  // Fetch comprehensive dashboard stats with automatic refetching
  const { data: dashboardStats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/dashboard/stats', user?.id],
    queryFn: () => fetch(`/api/dashboard/stats/${user?.id}`).then(res => res.json()),
    staleTime: 10 * 1000, // Fresh for 10 seconds
    refetchInterval: 15 * 1000, // Auto-refetch every 15 seconds
    refetchOnWindowFocus: true,
    enabled: !!user?.id,
  });

  // Calculate streak (mock data for now - would come from backend)
  const currentStreak = 5; // Days
  const weeklyGoal = 10; // Sessions
  const weeklyProgress = ((dashboardStats?.completedSessionsThisWeek || 0) / weeklyGoal) * 100;

  // Achievements (mock - would come from backend)
  const achievements = [
    { icon: Flame, title: "5-Day Streak", description: "Train 5 days in a row", unlocked: currentStreak >= 5, glow: currentStreak >= 5 },
    { icon: Star, title: "10 Clients", description: "Reach 10 active clients", unlocked: (dashboardStats?.activeClients || 0) >= 10 },
    { icon: Target, title: "50 Sessions", description: "Complete 50 sessions", unlocked: false },
    { icon: Award, title: "100 Workouts", description: "Create 100 workout plans", unlocked: false },
  ];

  const stats = [
    {
      label: "Active Clients",
      value: loadingStats ? "--" : (dashboardStats?.activeClients || 0).toString(),
      icon: Users,
      trend: `${dashboardStats?.totalClients || 0} total clients`,
      change: "",
      changeType: "increase",
      color: "text-emerald-600",
      bgGlow: "from-emerald-500/20 to-emerald-500/5"
    },
    {
      label: "Sessions This Week",
      value: loadingStats ? "--" : (dashboardStats?.completedSessionsThisWeek || 0).toString(),
      icon: Calendar,
      trend: `${dashboardStats?.upcomingSessions || 0} upcoming`,
      change: "",
      changeType: "increase",
      color: "text-blue-600",
      bgGlow: "from-blue-500/20 to-blue-500/5"
    },
    {
      label: "Workout Plans",
      value: loadingStats ? "--" : (dashboardStats?.totalWorkouts || workouts?.length || 0).toString(),
      icon: Dumbbell,
      trend: "Active plans",
      change: "",
      changeType: "increase",
      color: "text-purple-600",
      bgGlow: "from-purple-500/20 to-purple-500/5"
    },
  ]

  const quickActions = [
    {
      label: "Add Client",
      icon: Users,
      action: "add-client",
      color: "bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800",
      description: "Register new client"
    },
    {
      label: "Create Workout",
      icon: Plus,
      action: "create-workout",
      color: "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
      description: "Design new plan"
    },
    {
      label: "Export Data",
      icon: Download,
      action: "export",
      color: "bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800",
      description: "Download CSV files"
    },
    {
      label: "View Schedule",
      icon: Calendar,
      action: "schedule",
      color: "bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800",
      description: "Today's sessions"
    },
  ]

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create-workout':
        navigate('/workouts');
        break;
      case 'export':
        if (clients?.length) {
          exportClientsToCSV(clients);
          toast({
            title: "Clients Exported",
            description: `Exported ${clients.length} clients to CSV`,
          });
        }
        if (workouts?.length) {
          exportWorkoutsToCSV(workouts);
          toast({
            title: "Workouts Exported",
            description: `Exported ${workouts.length} workout plans to CSV`,
          });
        }
        break;
      case 'schedule':
        navigate('/schedule');
        break;
    }
  }

  const formatTimeAgo = useCallback((date: string | Date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }, []);

  const recentActivities = useMemo(() => {
    return dashboardStats?.recentActivity?.map((activity: any) => ({
      client: 'Training Session',
      action: activity.description,
      time: formatTimeAgo(activity.time),
      icon: Calendar,
    })) || [
      { client: "Welcome!", action: "Start by adding your first client", time: "Just now", icon: Users },
    ]
  }, [dashboardStats?.recentActivity, formatTimeAgo])

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Setup checklist items based on onboarding progress
  const checklistItems: ChecklistItem[] = useMemo(() => [
    {
      id: 'add-client',
      title: 'Add your first client',
      description: 'Start by adding a client to your roster',
      completed: onboardingProgress?.addedFirstClient || false,
      action: () => setShowClientModal(true),
      actionLabel: 'Add Client',
    },
    {
      id: 'create-workout',
      title: 'Create a workout plan',
      description: 'Design your first custom workout',
      completed: onboardingProgress?.createdFirstWorkout || false,
      action: () => navigate('/workouts'),
      actionLabel: 'Create',
    },
    {
      id: 'assign-workout',
      title: 'Assign a workout to a client',
      description: 'Connect a workout plan with a client',
      completed: onboardingProgress?.assignedFirstWorkout || false,
      action: () => navigate('/clients'),
      actionLabel: 'Go to Clients',
    },
    {
      id: 'schedule-session',
      title: 'Schedule your first session',
      description: 'Book a training session with a client',
      completed: onboardingProgress?.scheduledFirstSession || false,
      action: () => navigate('/schedule'),
      actionLabel: 'Schedule',
    },
  ], [onboardingProgress, navigate]);

  // Show welcome modal if not completed (check both API and localStorage)
  const welcomeDismissedLocally = localStorage.getItem('gymgurus_welcome_completed') === 'true';
  const showWelcomeModal = onboardingProgress && !onboardingProgress.welcomeModalCompleted && !welcomeDismissedLocally;

  // Show checklist if welcome modal completed but onboarding not finished
  const showChecklist = onboardingProgress?.welcomeModalCompleted &&
                        !onboardingProgress?.onboardingCompletedAt &&
                        checklistItems.some(item => !item.completed);

  // Show premium login page if not authenticated
  if (!userLoading && !user) {
    return <LoginPage />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Modal - First time user onboarding */}
      <WelcomeModal
        open={showWelcomeModal || false}
        onComplete={handleWelcomeComplete}
        userName={user?.firstName}
      />

      {/* Setup Checklist - Show after welcome modal */}
      {showChecklist && (
        <SetupChecklist
          items={checklistItems}
          onDismiss={handleChecklistDismiss}
        />
      )}

      {/* Client Form Modal - Controlled for checklist action */}
      <ClientFormModal
        mode="create"
        trainerId={user?.id || ''}
        open={showClientModal}
        onOpenChange={setShowClientModal}
      />

      {/* Personalized Hero Section - Ultra Premium Luxury Design */}
      <motion.div
        className={`relative h-80 sm:h-96 md:h-[28rem] rounded-3xl overflow-hidden group ${isTrainer ? 'trainer-border' : 'client-border'}`}
        style={{
          background: 'linear-gradient(135deg, rgba(201, 168, 85, 0.25) 0%, rgba(207, 176, 95, 0.28) 25%, rgba(13, 148, 136, 0.28) 75%, rgba(13, 148, 136, 0.25) 100%)',
          willChange: 'transform',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        whileHover={{ scale: 1.005 }}
      >
        {/* Premium metallic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/50 group-hover:from-black/30 transition-all duration-700" />

        {/* Elegant top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(201, 168, 85, 0.8) 20%, rgba(201, 168, 85, 1) 50%, rgba(13, 148, 136, 1) 50%, rgba(13, 148, 136, 0.8) 80%, transparent 100%)',
          }}
        />

        {/* Corner ornamental accents */}
        <div className="absolute top-0 left-0 w-32 h-32 opacity-20">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M0,0 L100,0 L100,20 Q50,20 20,50 Q20,50 20,100 L0,100 Z" fill="url(#cornerGradient)" />
            <defs>
              <linearGradient id="cornerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(201, 168, 85, 0.6)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20 rotate-180">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M0,0 L100,0 L100,20 Q50,20 20,50 Q20,50 20,100 L0,100 Z" fill="url(#cornerGradient2)" />
            <defs>
              <linearGradient id="cornerGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(13, 148, 136, 0.6)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Luxury noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          }}
        />

        {/* Premium radial gradient lighting */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.08) 0%, transparent 50%)',
          }}
        />

        {/* Bottom elegant accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(201, 168, 85, 0.6) 30%, rgba(201, 168, 85, 0.8) 50%, rgba(13, 148, 136, 0.8) 50%, rgba(13, 148, 136, 0.6) 70%, transparent 100%)',
          }}
        />

        {/* Premium inner glow border */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.08), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
          }}
        />

        {/* Luxury animated orbs with sophisticated gradients */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Primary gold/teal orb - top right */}
          <motion.div
            className="absolute top-10 right-10 w-64 h-64 rounded-full blur-3xl"
            style={{
              background: isTrainer
                ? 'radial-gradient(circle, rgba(201, 168, 85, 0.35) 0%, rgba(212, 184, 106, 0.15) 50%, transparent 100%)'
                : 'radial-gradient(circle, rgba(13, 148, 136, 0.35) 0%, rgba(20, 184, 166, 0.15) 50%, transparent 100%)',
              filter: 'blur(40px)',
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.7, 0.4],
              x: [0, 30, 0],
              y: [0, -20, 0]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Secondary orb - bottom left */}
          <motion.div
            className="absolute bottom-10 left-10 w-80 h-80 rounded-full blur-3xl"
            style={{
              background: isTrainer
                ? 'radial-gradient(circle, rgba(212, 184, 106, 0.3) 0%, rgba(201, 168, 85, 0.1) 50%, transparent 100%)'
                : 'radial-gradient(circle, rgba(20, 184, 166, 0.3) 0%, rgba(13, 148, 136, 0.1) 50%, transparent 100%)',
              filter: 'blur(50px)',
            }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.3, 0.6, 0.3],
              x: [0, -30, 0],
              y: [0, 20, 0]
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />

          {/* Center accent orb */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl"
            style={{
              background: isTrainer
                ? 'radial-gradient(circle, rgba(201, 168, 85, 0.25) 0%, rgba(201, 168, 85, 0.08) 50%, transparent 100%)'
                : 'radial-gradient(circle, rgba(13, 148, 136, 0.25) 0%, rgba(13, 148, 136, 0.08) 50%, transparent 100%)',
              filter: 'blur(45px)',
            }}
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />

          {/* Additional accent orbs for depth */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full blur-2xl"
            style={{
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              x: [0, 20, 0],
              y: [0, -15, 0]
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />

          <motion.div
            className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-2xl"
            style={{
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, transparent 70%)',
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.4, 0.2],
              x: [0, -15, 0],
              y: [0, 15, 0]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5
            }}
          />
        </div>

        <div className="relative h-full flex flex-col justify-center items-center text-center px-4 sm:px-6 md:px-8 text-white z-10">
          {/* Premium badge - Elite Status */}
          <motion.div
            className="absolute top-6 left-6 flex items-center gap-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            style={{
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#c9a855] to-[#0d9488]" />
            <span className="text-xs font-medium tracking-wider uppercase" style={{ letterSpacing: '0.15em' }}>
              Elite Trainer
            </span>
          </motion.div>

          {/* Real-time connection status */}
          <motion.div
            className="absolute top-6 right-6 flex items-center gap-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            style={{
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
            title={isConnected ? 'Real-time sync active' : 'Reconnecting to server...'}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} style={{
              boxShadow: isConnected ? '0 0 8px rgba(52, 211, 153, 0.6)' : 'none',
            }} />
            <span className="text-xs font-medium text-white/90 tracking-wider uppercase" style={{ letterSpacing: '0.1em' }}>
              {isConnected ? 'Synced' : 'Reconnecting'}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-6"
          >
            {/* Luxury greeting with ornamental line */}
            <div className="flex flex-col items-center gap-3">
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="h-[1px] w-8 bg-gradient-to-r from-transparent via-white/40 to-white/60" />
                <motion.p
                  className="text-sm sm:text-base font-light text-white/90 tracking-widest uppercase"
                  style={{ letterSpacing: '0.2em' }}
                >
                  {greeting}, <span className="font-normal bg-gradient-to-r from-[#c9a855] via-white to-[#0d9488] bg-clip-text text-transparent">{user?.firstName || 'Trainer'}</span>
                </motion.p>
                <div className="h-[1px] w-8 bg-gradient-to-l from-transparent via-white/40 to-white/60" />
              </motion.div>
            </div>

            {/* Premium title with metallic effect */}
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extralight leading-none"
              data-testid="text-dashboard-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7 }}
              style={{
                letterSpacing: '-0.02em',
                textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              <span className="block" style={{ fontFamily: "'Playfair Display', serif" }}>Your</span>
              <span
                className="block font-light bg-gradient-to-r from-[#c9a855] via-[#e5e4e2] to-[#0d9488] bg-clip-text text-transparent"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  letterSpacing: '0.05em',
                }}
              >
                Fitness Studio
              </span>
            </motion.h1>

            {/* Decorative divider */}
            <motion.div
              className="flex items-center justify-center gap-3 py-2"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-[#c9a855] to-transparent" />
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#c9a855] to-[#0d9488]" style={{
                boxShadow: '0 0 8px rgba(201, 168, 85, 0.6)',
              }} />
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-[#0d9488] to-transparent" />
            </motion.div>

            <motion.p
              className="text-base sm:text-lg md:text-xl font-light text-white/95 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              style={{
                letterSpacing: '0.02em',
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
              }}
            >
              You're doing <span className="font-medium bg-gradient-to-r from-[#c9a855] to-[#0d9488] bg-clip-text text-transparent">exceptional</span> work! {dashboardStats?.activeClients || 0} clients trust your expertise this week.
            </motion.p>
          </motion.div>
          {prefersReducedMotion ? (
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <NewClientButton
                trainerId={user?.id}
                className="relative bg-gradient-to-r from-white via-white to-white/95 text-primary hover:from-white hover:to-white font-medium px-8 sm:px-10 h-12 rounded-xl tracking-wide uppercase text-sm overflow-hidden group"
                style={{
                  boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                  letterSpacing: '0.1em',
                }}
              />
              <AnimatedButton
                variant="outline"
                size="lg"
                className="relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md border border-white/30 text-white hover:from-white/10 hover:to-white/5 font-medium px-8 sm:px-10 h-12 rounded-xl tracking-wide uppercase text-sm"
                data-testid="button-create-workout"
                onClick={() => navigate('/workouts')}
                style={{
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  letterSpacing: '0.1em',
                }}
              >
                Create Workout
              </AnimatedButton>
            </div>
          ) : (
            <motion.div
              className="flex flex-col sm:flex-row gap-4 mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
                <NewClientButton
                  trainerId={user?.id}
                  className="relative bg-gradient-to-r from-white via-white to-white/95 text-primary hover:from-white hover:to-white font-medium px-8 sm:px-10 h-12 rounded-xl tracking-wide uppercase text-sm overflow-hidden group"
                  style={{
                    boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                    letterSpacing: '0.1em',
                  }}
                />
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
                <AnimatedButton
                  variant="outline"
                  size="lg"
                  className="relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md border border-white/30 text-white hover:from-white/10 hover:to-white/5 font-medium px-8 sm:px-10 h-12 rounded-xl tracking-wide uppercase text-sm"
                  data-testid="button-create-workout"
                  onClick={() => navigate('/workouts')}
                  style={{
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    letterSpacing: '0.1em',
                  }}
                >
                  Create Workout
                </AnimatedButton>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Stats Grid - 2 columns per row */}
      <StaggerContainer delay={0.1}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <StaggerItem key={stat.label} index={index}>
                <motion.div
                  whileHover={{ y: -6, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Card
                    className={`
                      relative overflow-hidden cursor-pointer
                      bg-gradient-to-br ${stat.bgGlow}
                      glass border-border/40
                      hover:shadow-premium-lg hover:border-primary/30
                      transition-all duration-500 group
                    `}
                    onClick={() => {
                      if (stat.label === "Active Clients") navigate('/clients');
                      if (stat.label === "Workout Plans") navigate('/workouts');
                      if (stat.label === "Sessions This Week") navigate('/schedule');
                    }}
                    data-testid={`card-stat-${index}`}
                  >
                    {/* Enhanced glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Animated border glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />

                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                        {stat.label}
                      </CardTitle>
                      <div className="relative">
                        <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-all duration-300">
                          <stat.icon className={`h-5 w-5 ${stat.color} transition-all duration-500 group-hover:scale-125 group-hover:rotate-12`} />
                        </div>
                        {stat.changeType === "increase" && (
                          <motion.div
                            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full"
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [1, 0.6, 1]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline justify-between">
                        <motion.div
                          className="text-4xl font-extralight tracking-tight"
                          data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 + index * 0.1, duration: 0.5, type: "spring" }}
                        >
                          {stat.value}
                        </motion.div>
                        {stat.change && (
                          <Badge variant="secondary" className="text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25 transition-colors duration-300">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {stat.change}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 font-light group-hover:text-foreground/70 transition-colors duration-300">
                        {stat.trend}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
                </StaggerItem>
              ))}
        </div>
      </StaggerContainer>

      {/* Two-Column Layout: Quick Actions + Progress Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Quick Actions + Achievements (3/5 width) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Actions - Enhanced Premium Design */}
          <Card className="glass-strong border-border/40 hover:border-primary/20 transition-all duration-500">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-light tracking-tight">Quick Actions</CardTitle>
                <Badge variant="secondary" className="font-light text-xs bg-primary/10 text-primary border-primary/20">
                  <Zap className="h-3 w-3 mr-1 animate-pulse" />
                  Shortcuts
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {quickActions.map((action, index) => (
                  action.action === 'add-client' ? (
                    <motion.div
                      key={action.action}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <NewClientButton
                        trainerId={user?.id}
                        className="w-full h-full p-0"
                      />
                    </motion.div>
                  ) : (
                    <motion.button
                      key={action.action}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickAction(action.action)}
                      className={`
                        relative overflow-hidden
                        ${action.color}
                        text-white rounded-xl p-4
                        shadow-lg hover:shadow-2xl
                        transition-all duration-300
                        flex flex-col items-center justify-center gap-2
                        group
                      `}
                      data-testid={`quick-action-${action.action}`}
                    >
                      {/* Shine effect on hover */}
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                      <action.icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 relative z-10" />
                      <span className="text-xs font-medium leading-tight text-center relative z-10">{action.label}</span>
                    </motion.button>
                  )
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievements - Compact */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-light">Achievements</CardTitle>
                <Badge variant="outline" className="font-light text-xs">
                  {achievements.filter(a => a.unlocked).length} / {achievements.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {achievements.map((achievement, index) => (
                  <AchievementBadge key={index} {...achievement} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Compact Progress Widgets (2/5 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Streak Counter Card - More Compact */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-sm border-orange-500/30">
            <CardContent className="p-4 text-center space-y-2">
              <div className="flex justify-center">
                <div className="relative">
                  <Flame className="h-12 w-12 text-orange-500 animate-pulse" />
                  <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {currentStreak}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold">{currentStreak}-Day Streak!</h3>
                <p className="text-xs text-muted-foreground">Keep it up</p>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Goal Progress - Compact */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-light">Weekly Goal</CardTitle>
              <CardDescription className="text-xs">
                {dashboardStats?.completedSessionsThisWeek || 0} / {weeklyGoal} sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-center">
                <ProgressRing progress={weeklyProgress} size={60} strokeWidth={5} color="text-primary" />
              </div>
              <p className="text-[10px] text-center text-muted-foreground">
                {weeklyProgress >= 100 ? "🎉 Goal achieved!" : `${Math.round(weeklyGoal - (dashboardStats?.completedSessionsThisWeek || 0))} to go`}
              </p>
            </CardContent>
          </Card>

          {/* Performance Insight - Compact */}
          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-sm border-emerald-500/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-emerald-600">Performance Insight</h3>
              </div>
              <p className="text-xs leading-relaxed">
                +15% client engagement this month. Your personalized approach is working!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analytics Charts - 2 Column Layout for Better Space Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Weight Progress */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-light">Client Progress</CardTitle>
            <CardDescription className="text-xs">Average weight loss trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mockWeightProgressData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  domain={[180, 200]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value} lbs`, 'Weight']}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorWeight)"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Progress</span>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none">
                <TrendingDown className="h-3 w-3 mr-1" />
                -10 lbs
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Sessions */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-light">Weekly Sessions</CardTitle>
            <CardDescription className="text-xs">Scheduled vs completed</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockSessionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="week"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => value === 'sessions' ? 'Scheduled' : 'Completed'}
                />
                <Bar dataKey="sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion Rate</span>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none">
                93%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Client Growth - Spans 2 columns for better visibility */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-light">Client Growth</CardTitle>
            <CardDescription className="text-xs">Monthly new clients</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mockClientGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  domain={[0, 15]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value}`, 'Clients']}
                />
                <Line
                  type="monotone"
                  dataKey="clients"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={{ fill: '#a855f7', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Growth Rate</span>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-none">
                <TrendingUp className="h-3 w-3 mr-1" />
                +140%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-light" data-testid="text-recent-activity-title">
            Recent Activity
          </CardTitle>
          <CardDescription className="text-base font-light">
            Latest updates from your studio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <AnimatePresence>
              {recentActivities.map((activity: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-all duration-200 group cursor-pointer"
                  data-testid={`activity-${index}`}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors">
                      {activity.icon && <activity.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium" data-testid={`text-client-${index}`}>
                        {activity.client}
                      </p>
                      <p className="text-sm text-muted-foreground font-light">
                        {activity.action}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs font-light bg-muted/50">
                    {activity.time}
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  )
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
