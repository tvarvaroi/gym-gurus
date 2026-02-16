import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp, Activity, Target, Dumbbell, Award, Flame } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { StaggerContainer, StaggerItem } from "@/components/AnimationComponents"
import { useLocation } from "wouter"
import { useUser } from "@/contexts/UserContext"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { calculateWorkoutStreak, getStreakMessage, getStreakEmoji } from "@/lib/streakCalculations"
import { calculateAchievements, getNextAchievement, type BadgeCalculationData } from "@/lib/achievements"
import { AchievementGrid } from "../AchievementBadge"
import { CelebrationOverlay, useCelebration } from "../CelebrationOverlay"

export default function ClientDashboard() {
  const [, navigate] = useLocation();
  const { user: currentUser } = useUser();
  const { celebration, celebrate, hide } = useCelebration();
  const prefersReducedMotion = useReducedMotion();

  // Fetch client data
  const { data: clientData, isLoading: clientDataLoading } = useQuery({
    queryKey: ['/api/client/profile'],
    queryFn: async () => {
      const response = await fetch('/api/client/profile', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch client data');
      return response.json();
    },
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
    enabled: !!clientData?.id,
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
    enabled: !!clientData?.id,
  });

  // Fetch client's upcoming sessions
  const { data: clientSessions } = useQuery({
    queryKey: [`/api/clients/${clientData?.id}/sessions`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientData?.id}/sessions`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    enabled: !!clientData?.id,
  });

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
              transition={{ duration: 8, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-10 left-10 w-48 h-48 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, rgba(20, 184, 166, 0.05) 100%)' }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 6, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut", delay: 1 }}
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
                transition={{ duration: 10, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
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
                transition={{ duration: 10, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
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
                transition={{ duration: 10, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
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
                transition={{ duration: 10, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
              />
              {/* Animated fire glow for active streaks */}
              {streakData.isStreakActive && streakData.currentStreak > 0 && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-orange-500/15 via-yellow-500/10 to-transparent"
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
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
