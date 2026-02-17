import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, TrendingDown, Dumbbell, Award, Flame, Star, Target, Plus, Download, AlertCircle } from "lucide-react"
import { NewClientButton, ClientFormModal } from "./ClientFormModal"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "../hooks/use-reduced-motion"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { memo, useState, useMemo, useCallback } from "react"
import { useLocation } from "wouter"
import { exportClientsToCSV, exportWorkoutsToCSV } from "@/lib/exportUtils"
import { useToast } from "@/hooks/use-toast"
import { useWebSocket } from "../hooks/useWebSocket"
import { WelcomeModal } from "./onboarding/WelcomeModal"
import { SetupChecklist, type ChecklistItem } from "./onboarding/SetupChecklist"
import { useUser } from "@/contexts/UserContext"
import { LoginPage } from "./LoginPage"
import { DashboardSkeleton } from "./skeletons/DashboardSkeleton"
import ClientDashboard from "./dashboard/ClientDashboard"
import DashboardHero from "./dashboard/DashboardHero"
import DashboardStatCards from "./dashboard/DashboardStatCards"
import DashboardQuickActions from "./dashboard/DashboardQuickActions"
import DashboardCharts from "./dashboard/DashboardCharts"

// Needs Attention Card — shows clients requiring follow-up
const NeedsAttentionCard = memo(() => {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<{ alerts: Array<{ clientId: string; clientName: string; reason: string; severity: 'warning' | 'urgent'; lastSession: string | null }> }>({
    queryKey: ['/api/dashboard/needs-attention'],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const alerts = data?.alerts || [];

  if (isLoading || alerts.length === 0) return null;

  return (
    <Card className="glass border-border/40 border-l-4 border-l-amber-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Needs Attention
          </CardTitle>
          <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
            {alerts.length} client{alerts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.clientId}
              onClick={() => navigate(`/clients/${alert.clientId}`)}
              className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${alert.severity === 'urgent' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{alert.clientName}</p>
                  <p className="text-xs text-muted-foreground">{alert.reason}</p>
                </div>
              </div>
              <TrendingDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
NeedsAttentionCard.displayName = 'NeedsAttentionCard';

const Dashboard = memo(() => {
  const prefersReducedMotion = useReducedMotion();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isClient, isTrainer, user: currentUser } = useUser();
  const [showClientModal, setShowClientModal] = useState(false);

  // Fetch authenticated user
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

  // If user is a client, render the dedicated ClientDashboard component
  if (isClient) {
    return <ClientDashboard />;
  }

  // Fetch onboarding progress
  const { data: onboardingProgress } = useQuery({
    queryKey: ['/api/onboarding/progress'],
    queryFn: async () => {
      const response = await fetch('/api/onboarding/progress', { credentials: 'include' });
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

  const handleWelcomeComplete = async (selectedGoal: string) => {
    localStorage.setItem('gymgurus_welcome_completed', 'true');
    try {
      await updateOnboardingMutation.mutateAsync({ welcomeModalCompleted: true, selectedGoal });
    } catch {
      // Modal is already dismissed via localStorage even if API fails
    }
  };

  const handleChecklistDismiss = async () => {
    try {
      await updateOnboardingMutation.mutateAsync({ onboardingCompletedAt: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/progress'] });
    } catch (error) {
      console.error('Failed to dismiss checklist:', error);
      toast({ title: "Error", description: "Failed to dismiss checklist. Please try again.", variant: "destructive" });
    }
  };

  // Real-time updates via WebSocket
  const { isConnected } = useWebSocket({
    onMessage: useCallback((message: any) => {
      switch (message.type) {
        case 'client_updated':
        case 'client_created':
        case 'client_deleted':
          queryClient.invalidateQueries({ queryKey: ['/api/clients', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/charts', user?.id] });
          break;
        case 'workout_updated':
        case 'workout_created':
        case 'workout_deleted':
          queryClient.invalidateQueries({ queryKey: ['/api/workouts', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/charts', user?.id] });
          break;
        case 'session_updated':
        case 'session_created':
        case 'session_completed':
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/charts', user?.id] });
          break;
      }
    }, [queryClient, user?.id, toast]),
  });

  // Fetch data
  const { data: clients, isLoading: loadingClients, error: clientsError } = useQuery({
    queryKey: ['/api/clients', user?.id, 'noPagination'],
    queryFn: () => fetch(`/api/clients/${user?.id}?noPagination=true`).then(res => res.json()),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!user?.id,
  });

  const { data: workouts } = useQuery({
    queryKey: ['/api/workouts'],
    queryFn: () => fetch('/api/workouts').then(res => res.json()),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!user?.id,
  });

  const { data: dashboardStats, isLoading: loadingStats, error: statsError } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: () => fetch('/api/dashboard/stats').then(res => res.json()),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!user?.id,
  });

  const { data: chartData } = useQuery({
    queryKey: ['/api/dashboard/charts'],
    queryFn: () => fetch('/api/dashboard/charts').then(res => res.json()),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!user?.id,
  });

  // Derived state
  const currentStreak = chartData?.trainerStreak || 0;
  const weeklyGoal = 10;
  const weeklyProgress = ((dashboardStats?.completedSessionsThisWeek || 0) / weeklyGoal) * 100;

  const totalSessionsCompleted = useMemo(() => {
    const sessionsData = chartData?.sessionsData || [];
    return sessionsData.reduce((sum: number, w: any) => sum + (w.completed || 0), 0);
  }, [chartData?.sessionsData]);

  const trainerAchievements = useMemo(() => [
    { icon: Flame, title: `${currentStreak}-Day Streak`, description: "Consecutive active days", unlocked: currentStreak >= 3, glow: currentStreak >= 7 },
    { icon: Star, title: "10 Clients", description: "Reach 10 active clients", unlocked: (dashboardStats?.activeClients || 0) >= 10 },
    { icon: Target, title: "50 Sessions", description: "Complete 50 sessions", unlocked: totalSessionsCompleted >= 50 },
    { icon: Award, title: "100 Workouts", description: "Create 100 workout plans", unlocked: (dashboardStats?.totalWorkouts || 0) >= 100 },
  ], [currentStreak, dashboardStats?.activeClients, dashboardStats?.totalWorkouts, totalSessionsCompleted]);

  const stats = useMemo(() => [
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
  ], [loadingStats, dashboardStats, workouts]);

  const quickActions = useMemo(() => [
    { label: "Add Client", icon: Users, action: "add-client", color: "bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800", description: "Register new client" },
    { label: "Create Workout", icon: Plus, action: "create-workout", color: "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800", description: "Design new plan" },
    { label: "Export Data", icon: Download, action: "export", color: "bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800", description: "Download CSV files" },
    { label: "View Schedule", icon: Calendar, action: "schedule", color: "bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800", description: "Today's sessions" },
  ], []);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'create-workout':
        navigate('/workouts');
        break;
      case 'export':
        if (clients?.length) {
          exportClientsToCSV(clients);
          toast({ title: "Clients Exported", description: `Exported ${clients.length} clients to CSV` });
        }
        if (workouts?.length) {
          exportWorkoutsToCSV(workouts);
          toast({ title: "Workouts Exported", description: `Exported ${workouts.length} workout plans to CSV` });
        }
        break;
      case 'schedule':
        navigate('/schedule');
        break;
    }
  }, [clients, workouts, navigate, toast]);

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
  }, [dashboardStats?.recentActivity, formatTimeAgo]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const checklistItems: ChecklistItem[] = useMemo(() => [
    { id: 'add-client', title: 'Add your first client', description: 'Start by adding a client to your roster', completed: onboardingProgress?.addedFirstClient || false, action: () => setShowClientModal(true), actionLabel: 'Add Client' },
    { id: 'create-workout', title: 'Create a workout plan', description: 'Design your first custom workout', completed: onboardingProgress?.createdFirstWorkout || false, action: () => navigate('/workouts'), actionLabel: 'Create' },
    { id: 'assign-workout', title: 'Assign a workout to a client', description: 'Connect a workout plan with a client', completed: onboardingProgress?.assignedFirstWorkout || false, action: () => navigate('/clients'), actionLabel: 'Go to Clients' },
    { id: 'schedule-session', title: 'Schedule your first session', description: 'Book a training session with a client', completed: onboardingProgress?.scheduledFirstSession || false, action: () => navigate('/schedule'), actionLabel: 'Schedule' },
  ], [onboardingProgress, navigate]);

  const welcomeDismissedLocally = localStorage.getItem('gymgurus_welcome_completed') === 'true';
  const showWelcomeModal = onboardingProgress && !onboardingProgress.welcomeModalCompleted && !welcomeDismissedLocally;
  const showChecklist = onboardingProgress?.welcomeModalCompleted && !onboardingProgress?.onboardingCompletedAt && checklistItems.some(item => !item.completed);

  // Early returns
  if (!userLoading && !user) return <LoginPage />;
  if (loadingStats || loadingClients) return <DashboardSkeleton />;

  if (clientsError || statsError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-medium">Failed to load dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {(clientsError || statsError)?.message || 'Unable to fetch dashboard data. Please try again.'}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WelcomeModal open={showWelcomeModal || false} onComplete={handleWelcomeComplete} userName={user?.firstName} />
      {showChecklist && <SetupChecklist items={checklistItems} onDismiss={handleChecklistDismiss} />}
      <ClientFormModal mode="create" trainerId={user?.id || ''} open={showClientModal} onOpenChange={setShowClientModal} />

      <DashboardHero
        isTrainer={isTrainer}
        prefersReducedMotion={prefersReducedMotion}
        user={user}
        isConnected={isConnected}
        greeting={greeting}
        activeClients={dashboardStats?.activeClients || 0}
        onNavigate={navigate}
      />

      <DashboardStatCards stats={stats} prefersReducedMotion={prefersReducedMotion} onNavigate={navigate} />

      <NeedsAttentionCard />

      <DashboardQuickActions
        quickActions={quickActions}
        onQuickAction={handleQuickAction}
        user={user}
        trainerAchievements={trainerAchievements}
        currentStreak={currentStreak}
        weeklyProgress={weeklyProgress}
        weeklyGoal={weeklyGoal}
        completedSessionsThisWeek={dashboardStats?.completedSessionsThisWeek || 0}
        performanceInsight={chartData?.performanceInsight}
      />

      <DashboardCharts chartData={chartData} onNavigate={navigate} />

      {/* Recent Activity */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-light" data-testid="text-recent-activity-title">
            Recent Activity
          </CardTitle>
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
                      <p className="font-medium" data-testid={`text-client-${index}`}>{activity.client}</p>
                      <p className="text-sm text-muted-foreground font-light">{activity.action}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs font-light bg-muted/50">{activity.time}</Badge>
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
