import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, TrendingUp, MessageSquare, Activity, Target, Clock, Plus, Download, FileText, Dumbbell, CheckCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import AnimatedButton from "./AnimatedButton"
import { NewClientButton } from "./ClientFormModal"
import { motion } from "framer-motion"
import { useReducedMotion } from "../hooks/use-reduced-motion"
import { useQuery } from "@tanstack/react-query"
import { StaggerContainer, StaggerItem } from "@/components/AnimationComponents"
import { memo, useState, useEffect } from "react"
import { useLocation } from "wouter"
import { exportClientsToCSV, exportWorkoutsToCSV } from "@/lib/exportUtils"
import { useToast } from "@/hooks/use-toast"

const Dashboard = memo(() => {
  const prefersReducedMotion = useReducedMotion();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Temporary trainer ID for development - replace with real auth later
  const TEMP_TRAINER_ID = "demo-trainer-123";
  
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  
  // Lazy load hero image
  useEffect(() => {
    const img = new Image();
    img.src = '/attached_assets/generated_images/Diverse_fitness_gym_hero_4eec9aff.png';
    img.onload = () => {
      setHeroImageLoaded(true);
    };
  }, []);
  
  // Fetch real client data for stats - with noPagination for backwards compatibility
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ['/api/clients', TEMP_TRAINER_ID, 'noPagination'],
    queryFn: () => fetch(`/api/clients/${TEMP_TRAINER_ID}?noPagination=true`).then(res => res.json()),
    staleTime: 60 * 1000, // Fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  // Fetch workouts for stats
  const { data: workouts } = useQuery({
    queryKey: ['/api/workouts', TEMP_TRAINER_ID],
    queryFn: () => fetch(`/api/workouts/${TEMP_TRAINER_ID}`).then(res => res.json()),
  });
  
  // Fetch comprehensive dashboard stats
  const { data: dashboardStats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/dashboard/stats', TEMP_TRAINER_ID],
    queryFn: () => fetch(`/api/dashboard/stats/${TEMP_TRAINER_ID}`).then(res => res.json()),
    staleTime: 30 * 1000, // Fresh for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  });
  
  const stats = [
    { 
      label: "Active Clients", 
      value: loadingStats ? "--" : (dashboardStats?.activeClients || 0).toString(), 
      icon: Users, 
      trend: `${dashboardStats?.totalClients || 0} total clients`,
      color: "text-emerald-600"
    },
    { 
      label: "Sessions This Week", 
      value: loadingStats ? "--" : (dashboardStats?.completedSessionsThisWeek || 0).toString(), 
      icon: Calendar, 
      trend: `${dashboardStats?.upcomingSessions || 0} upcoming`,
      color: "text-blue-600"
    },
    { 
      label: "Workout Plans", 
      value: loadingStats ? "--" : (dashboardStats?.totalWorkouts || workouts?.length || 0).toString(), 
      icon: Dumbbell, 
      trend: "Active plans",
      color: "text-purple-600"
    },
    { 
      label: "Messages", 
      value: loadingStats ? "--" : (dashboardStats?.unreadMessages || 0).toString(), 
      icon: MessageSquare, 
      trend: dashboardStats?.unreadMessages > 0 ? "Unread messages" : "All read",
      color: "text-orange-600"
    },
  ]

  // Quick actions for common tasks
  const quickActions = [
    {
      label: "Add Client",
      icon: Users,
      action: "add-client",
      color: "bg-emerald-600 hover:bg-emerald-700",
      description: "Register new client"
    },
    {
      label: "Create Workout",
      icon: Plus,
      action: "create-workout",
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Design new plan"
    },
    {
      label: "Export Data",
      icon: Download,
      action: "export",
      color: "bg-purple-600 hover:bg-purple-700",
      description: "Download CSV files"
    },
    {
      label: "View Schedule",
      icon: Calendar,
      action: "schedule",
      color: "bg-orange-600 hover:bg-orange-700",
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
      // Add-client is handled by the NewClientButton component
    }
  }

  // Format recent activities from dashboard stats
  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  const recentActivities = dashboardStats?.recentActivity?.map((activity: any) => ({
    client: activity.type === 'session' ? 'Training Session' : 'Client Message',
    action: activity.description,
    time: formatTimeAgo(activity.time),
    icon: activity.type === 'session' ? Calendar : MessageSquare,
  })) || [
    { client: "Welcome!", action: "Start by adding your first client", time: "Just now", icon: Users },
  ]

  return (
    <div className="space-y-6">
      {/* Hero Section - Apple-inspired minimalist design */}
      {!heroImageLoaded ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : (
        <div 
          className="relative h-80 rounded-xl bg-cover bg-center overflow-hidden"
          style={{ 
            backgroundImage: `url(/attached_assets/generated_images/Diverse_fitness_gym_hero_4eec9aff.png)`,
            willChange: 'transform'
          }}
        >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="relative h-full flex flex-col justify-center items-center text-center px-8 text-white">
          <h1 className="text-5xl font-light tracking-tight mb-4" data-testid="text-dashboard-title">
            Your Fitness Studio
          </h1>
          <p className="text-xl font-light mb-8 text-white/80 max-w-2xl">
            Elevate your training practice with intelligent client management and progress tracking.
          </p>
          {prefersReducedMotion ? (
            <div className="flex gap-4">
              <NewClientButton 
                trainerId={TEMP_TRAINER_ID}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-8 h-11"
              />
              <AnimatedButton 
                variant="outline" 
                size="lg" 
                className="bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/10 font-medium px-8" 
                data-testid="button-create-workout"
                onClick={() => navigate('/workouts')}
              >
                Create Workout
              </AnimatedButton>
            </div>
          ) : (
            <motion.div 
              className="flex gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <NewClientButton 
                trainerId={TEMP_TRAINER_ID}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-8 h-11"
              />
              <AnimatedButton 
                variant="outline" 
                size="lg" 
                className="bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/10 font-medium px-8" 
                data-testid="button-create-workout"
                onClick={() => navigate('/workouts')}
              >
                Create Workout
              </AnimatedButton>
            </motion.div>
          )}
        </div>
        </div>
      )}

      {/* Stats Grid - Enhanced with real-time data */}
      <StaggerContainer delay={0.1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StaggerItem key={stat.label} index={index}>
            <Card 
              className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group cursor-pointer" 
              onClick={() => {
                if (stat.label === "Active Clients") navigate('/clients');
                if (stat.label === "Workout Plans") navigate('/workouts');
                if (stat.label === "Messages") navigate('/messages');
                if (stat.label === "Sessions This Week") navigate('/schedule');
              }}
              data-testid={`card-stat-${index}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color} transition-transform group-hover:scale-110`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light tracking-tight" data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-light">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Quick Actions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-light tracking-tight">Quick Actions</h2>
          <Badge variant="secondary" className="font-light">
            <Activity className="h-3 w-3 mr-1" />
            Shortcuts
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            action.action === 'add-client' ? (
              <NewClientButton
                key={action.action}
                trainerId={TEMP_TRAINER_ID}
                trigger={
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 group bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className={`p-3 rounded-xl ${action.color} text-white transition-transform group-hover:scale-110`}>
                          <action.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium">{action.label}</p>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                }
              />
            ) : (
              <Card 
                key={action.action}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 group bg-card/50 backdrop-blur-sm border-border/50"
                onClick={() => handleQuickAction(action.action)}
                data-testid={`quick-action-${action.action}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className={`p-3 rounded-xl ${action.color} text-white transition-transform group-hover:scale-110`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          ))}
        </div>
      </div>

      {/* Recent Activity - Enhanced with icons */}
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
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-xl hover-elevate transition-all duration-200" data-testid={`activity-${index}`}>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-muted/50">
                    {activity.icon && <activity.icon className="h-4 w-4 text-muted-foreground" />}
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
});

export default Dashboard;