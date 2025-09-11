import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import Dashboard from "@/components/Dashboard";
import ClientCard from "@/components/ClientCard";
import WorkoutCard from "@/components/WorkoutCard";
import ProgressChart from "@/components/ProgressChart";
import ExerciseCard from "@/components/ExerciseCard";
import MessageThread from "@/components/MessageThread";
import CalendarView from "@/components/CalendarView";
import NotFound from "@/pages/not-found";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useReducedMotion } from "./hooks/use-reduced-motion";

// Pages for different sections of the app
function HomePage() {
  return (
    <PageTransition>
      <Dashboard />
    </PageTransition>
  );
}

// Premium page transition components
const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.6
    }}
  >
    {children}
  </motion.div>
);

const StaggerContainer = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        delay,
        staggerChildren: 0.1,
        delayChildren: 0.2 + delay
      }}
    >
      {children}
    </motion.div>
  );
};

const StaggerItem = ({ children, index = 0 }: { children: React.ReactNode; index?: number }) => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 300,
        delay: index * 0.1
      }}
    >
      {children}
    </motion.div>
  );
};

function ClientsPage() {
  
  // Temporary trainer ID for development - replace with real auth later
  const TEMP_TRAINER_ID = "demo-trainer-123";
  
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['/api/clients', TEMP_TRAINER_ID],
    queryFn: () => fetch(`/api/clients/${TEMP_TRAINER_ID}`).then(res => res.json())
  });
  
  // Show loading state
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-light tracking-tight">My Clients</h1>
              <p className="text-lg font-light text-muted-foreground">Loading client data...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-card/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-light tracking-tight">My Clients</h1>
              <p className="text-lg font-light text-red-500">Error loading clients. Please try again.</p>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }
  
  // Helper function to format session times
  const formatSessionTime = (timestamp: string | null) => {
    if (!timestamp) return "No session yet";
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Yesterday";
    if (diffDays === 0) return "Today";
    return `${diffDays} days ago`;
  };
  
  // Transform database client data to match ClientCard props
  const transformedClients = (clients || []).map((client: any) => ({
    client: client, // Pass full client object
    trainerId: TEMP_TRAINER_ID, // Pass trainerId for edit functionality
    name: client.name,
    email: client.email,
    goal: client.goal,
    progress: Math.floor(Math.random() * 100), // Temporary - will implement real progress tracking
    lastSession: formatSessionTime(client.lastSession),
    status: client.status,
    nextSession: client.nextSession ? new Date(client.nextSession).toLocaleDateString() : undefined
  }));

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-light tracking-tight">My Clients</h1>
              <p className="text-lg font-light text-muted-foreground">Manage and track your client progress</p>
            </div>
          </div>
        </StaggerItem>
        
        <StaggerContainer delay={0.2}>
          {transformedClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg font-light text-muted-foreground">No clients yet. Add your first client to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {transformedClients.map((client: any, index: number) => (
                <StaggerItem key={client.email} index={index}>
                  <ClientCard {...client} />
                </StaggerItem>
              ))}
            </div>
          )}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}

function WorkoutsPage() {
  // todo: remove mock functionality
  const mockWorkouts = [
    {
      title: "Upper Body Strength",
      description: "Focus on building upper body muscle and strength",
      duration: 45,
      difficulty: "Intermediate" as const,
      exercises: [
        { name: "Bench Press", sets: 4, reps: "8-10", weight: "135 lbs" },
        { name: "Pull-ups", sets: 3, reps: "6-8" },
        { name: "Overhead Press", sets: 3, reps: "10-12", weight: "95 lbs" },
        { name: "Barbell Rows", sets: 3, reps: "8-10", weight: "115 lbs" }
      ],
      assignedTo: 8,
      createdDate: "3 days ago",
      category: "Strength"
    },
    {
      title: "Cardio Blast",
      description: "High-intensity interval training for fat burning",
      duration: 30,
      difficulty: "Advanced" as const,
      exercises: [
        { name: "Burpees", sets: 4, reps: "45 sec" },
        { name: "Mountain Climbers", sets: 4, reps: "30 sec" },
        { name: "Jump Squats", sets: 4, reps: "20 reps" }
      ],
      assignedTo: 12,
      createdDate: "1 week ago", 
      category: "Cardio"
    },
    {
      title: "Lower Body Power",
      description: "Build leg strength and explosive power",
      duration: 50,
      difficulty: "Intermediate" as const,
      exercises: [
        { name: "Squats", sets: 4, reps: "10-12", weight: "185 lbs" },
        { name: "Deadlifts", sets: 3, reps: "8-10", weight: "225 lbs" },
        { name: "Lunges", sets: 3, reps: "12 each leg" }
      ],
      assignedTo: 6,
      createdDate: "5 days ago",
      category: "Strength"
    }
  ];

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-light tracking-tight">Workout Plans</h1>
              <p className="text-lg font-light text-muted-foreground">Create and manage personalized workout routines</p>
            </div>
          </div>
        </StaggerItem>
        
        <StaggerContainer delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockWorkouts.map((workout, index) => (
              <StaggerItem key={index} index={index}>
                <WorkoutCard {...workout} />
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}

function ProgressPage() {
  // todo: remove mock functionality
  const weightData = [
    { date: 'Jan 1', value: 180 },
    { date: 'Jan 8', value: 178 },
    { date: 'Jan 15', value: 176 },
    { date: 'Jan 22', value: 175 },
    { date: 'Jan 29', value: 173 },
    { date: 'Feb 5', value: 171 },
    { date: 'Feb 12', value: 169 }
  ];

  const workoutData = [
    { date: 'Week 1', value: 3 },
    { date: 'Week 2', value: 4 },
    { date: 'Week 3', value: 3 },
    { date: 'Week 4', value: 5 },
    { date: 'Week 5', value: 4 },
    { date: 'Week 6', value: 6 }
  ];

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div>
            <h1 className="text-4xl font-light tracking-tight">Progress Tracking</h1>
            <p className="text-lg font-light text-muted-foreground">Monitor client progress and achievements</p>
          </div>
        </StaggerItem>
        
        <StaggerContainer delay={0.2}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <StaggerItem index={0}>
              <ProgressChart
                title="Weight Progress"
                description="Client weight tracking over time"
                data={weightData}
                type="line"
                metric="Weight (lbs)"
                trend={{ value: 6.1, direction: "down", period: "vs last month" }}
              />
            </StaggerItem>
            <StaggerItem index={1}>
              <ProgressChart
                title="Weekly Workouts"
                description="Number of completed workouts per week"
                data={workoutData}
                type="bar"
                metric="Workouts completed"
                trend={{ value: 25, direction: "up", period: "vs last month" }}
              />
            </StaggerItem>
          </div>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}

function ExercisesPage() {
  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div>
            <h1 className="text-4xl font-light tracking-tight">Exercise Library</h1>
            <p className="text-lg font-light text-muted-foreground">Browse and add exercises to your workout plans</p>
          </div>
        </StaggerItem>
        
        <StaggerContainer delay={0.2}>
          <StaggerItem>
            <ExerciseCard
              name="Barbell Squat"
              description="A compound exercise targeting the lower body and core"
              category="Strength"
              difficulty="Intermediate"
              muscleGroups={["Quadriceps", "Glutes", "Hamstrings", "Core"]}
              equipment={["Barbell", "Squat Rack"]}
              instructions={[
                "Stand with feet shoulder-width apart",
                "Place barbell on upper back",
                "Lower body by bending knees and hips",
                "Keep chest up and back straight",
                "Lower until thighs are parallel to ground",
                "Push through heels to return to starting position"
              ]}
            />
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}

function MessagesPage() {
  // todo: remove mock functionality
  const sampleMessages = [
    {
      id: "1",
      senderId: "client1", 
      senderName: "Sarah Johnson",
      content: "Hi! I completed yesterday's workout. The squats felt great!",
      timestamp: "10:30 AM",
      isTrainer: false
    },
    {
      id: "2",
      senderId: "trainer1",
      senderName: "Trainer",
      content: "That's awesome! How did your knees feel during the movement?",
      timestamp: "10:35 AM", 
      isTrainer: true
    },
    {
      id: "3",
      senderId: "client1",
      senderName: "Sarah Johnson", 
      content: "Much better than last week. No pain at all. Should I increase the weight next time?",
      timestamp: "10:37 AM",
      isTrainer: false
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Communicate with your clients</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MessageThread
          clientName="Sarah Johnson"
          messages={sampleMessages}
          unreadCount={2}
        />
      </div>
    </div>
  );
}

function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Schedule</h1>
        <p className="text-muted-foreground">Manage appointments and training sessions</p>
      </div>
      <CalendarView />
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location} className="w-full">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/clients" component={ClientsPage} />
          <Route path="/workouts" component={WorkoutsPage} />
          <Route path="/progress" component={ProgressPage} />
          <Route path="/exercises" component={ExercisesPage} />
          <Route path="/messages" component={MessagesPage} />
          <Route path="/schedule" component={SchedulePage} />
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  // Custom sidebar width for fitness application
  const style = {
    "--sidebar-width": "20rem",       // 320px for better content
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="hover-elevate" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-background via-background to-muted/20">
                <div className="max-w-7xl mx-auto">
                  <Router />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
