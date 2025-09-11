import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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

// Pages for different sections of the app
function HomePage() {
  return <Dashboard />;
}

function ClientsPage() {
  // todo: remove mock functionality
  const mockClients = [
    {
      name: "Sarah Johnson",
      email: "sarah.j@email.com", 
      goal: "Lose 20 lbs and build muscle",
      progress: 78,
      lastSession: "2 days ago",
      status: "active" as const,
      nextSession: "Tomorrow 3:00 PM"
    },
    {
      name: "Mike Chen",
      email: "mike.chen@email.com",
      goal: "Marathon training preparation", 
      progress: 92,
      lastSession: "Yesterday",
      status: "active" as const,
      nextSession: "Friday 6:00 AM"
    },
    {
      name: "Emma Davis",
      email: "emma.davis@email.com",
      goal: "Post-injury rehabilitation",
      progress: 45,
      lastSession: "5 days ago", 
      status: "paused" as const
    },
    {
      name: "Alex Rodriguez",
      email: "alex.r@email.com",
      goal: "Strength and conditioning", 
      progress: 65,
      lastSession: "3 days ago",
      status: "active" as const,
      nextSession: "Monday 4:00 PM"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Clients</h1>
          <p className="text-muted-foreground">Manage and track your client progress</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockClients.map((client, index) => (
          <ClientCard key={index} {...client} />
        ))}
      </div>
    </div>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workout Plans</h1>
          <p className="text-muted-foreground">Create and manage personalized workout routines</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockWorkouts.map((workout, index) => (
          <WorkoutCard key={index} {...workout} />
        ))}
      </div>
    </div>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progress Tracking</h1>
        <p className="text-muted-foreground">Monitor client progress and achievements</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgressChart
          title="Weight Progress"
          description="Client weight tracking over time"
          data={weightData}
          type="line"
          metric="Weight (lbs)"
          trend={{ value: 6.1, direction: "down", period: "vs last month" }}
        />
        <ProgressChart
          title="Weekly Workouts"
          description="Number of completed workouts per week"
          data={workoutData}
          type="bar"
          metric="Workouts completed"
          trend={{ value: 25, direction: "up", period: "vs last month" }}
        />
      </div>
    </div>
  );
}

function ExercisesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Exercise Library</h1>
        <p className="text-muted-foreground">Browse and add exercises to your workout plans</p>
      </div>
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
    </div>
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
  return (
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
              <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-6">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
