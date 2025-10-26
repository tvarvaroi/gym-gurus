import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { lazy, Suspense, useState, useEffect, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, LogOut, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportClientsToCSV, exportWorkoutsToCSV } from "@/lib/exportUtils";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/AnimationComponents";

// Import critical components directly (not lazy loaded)
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import Dashboard from "@/components/Dashboard";
import ClientCard from "@/components/ClientCard";
import SearchInput from "@/components/SearchInput";
import NotFound from "@/pages/not-found";

// Lazy load only secondary pages for code splitting
const WorkoutPlans = lazy(() => import("@/pages/WorkoutPlans"));
const WorkoutBuilder = lazy(() => import("@/pages/WorkoutBuilder"));
const ExercisesPageComponent = lazy(() => import("@/pages/ExercisesPage"));
const SchedulePageComponent = lazy(() => import("@/pages/SchedulePage"));

// Loading fallback component
const LoadingFallback = memo(() => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="space-y-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
));

// Pages for different sections of the app
const HomePage = memo(() => {
  return (
    <PageTransition>
      <Dashboard />
    </PageTransition>
  );
});

const ClientsPage = memo(() => {
  
  // Temporary trainer ID for development - replace with real auth later
  const TEMP_TRAINER_ID = "demo-trainer-123";
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['/api/clients', TEMP_TRAINER_ID],
    queryFn: () => fetch(`/api/clients/${TEMP_TRAINER_ID}`).then(res => res.json()),
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep cache for 5 minutes
  });
  
  // Helper function to format session times
  const formatSessionTime = useCallback((timestamp: string | null) => {
    if (!timestamp) return "No session yet";
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Yesterday";
    if (diffDays === 0) return "Today";
    return `${diffDays} days ago`;
  }, []);
  
  // Transform database client data to match ClientCard props
  // This must be called BEFORE any conditional returns to follow React's Rules of Hooks
  const transformedClients = useMemo(() => {
    const allClients = (clients || []).map((client: any) => ({
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
    
    // Filter clients based on search query
    if (!searchQuery.trim()) return allClients;
    
    const query = searchQuery.toLowerCase();
    return allClients.filter((client: any) => 
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.goal?.toLowerCase().includes(query) ||
      client.status.toLowerCase().includes(query)
    );
  }, [clients, searchQuery, formatSessionTime]);
  
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

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight">My Clients</h1>
                <p className="text-sm sm:text-base md:text-lg font-light text-muted-foreground">Manage and track your client progress</p>
              </div>
              <Button
                variant="outline"
                onClick={() => exportClientsToCSV(clients || [])}
                disabled={!clients?.length}
                data-testid="button-export-clients"
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="text-xs sm:text-sm">Export to CSV</span>
              </Button>
            </div>
            <div className="w-full md:w-80">
              <Suspense fallback={<div className="h-10 bg-muted rounded-md animate-pulse" />}>
                <SearchInput
                  placeholder="Search clients by name, email, goal..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  debounceMs={300}
                  className="w-full"
                />
              </Suspense>
            </div>
          </div>
        </StaggerItem>
        
        <StaggerContainer delay={0.2}>
          {transformedClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg font-light text-muted-foreground">No clients yet. Add your first client to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {transformedClients.map((client: any, index: number) => (
                <StaggerItem key={client.email} index={index}>
                  <Suspense fallback={<div className="h-80 bg-card/50 rounded-xl animate-pulse" />}>
                    <ClientCard {...client} />
                  </Suspense>
                </StaggerItem>
              ))}
            </div>
          )}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
});

const WorkoutsPage = memo(() => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>
        <WorkoutPlans />
      </PageTransition>
    </Suspense>
  );
});

const ProgressPageComponent = lazy(() => import("@/pages/ProgressPage"));

function ProgressPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading progress tracking...</div>}>
      <ProgressPageComponent />
    </Suspense>
  );
}

const ExercisesPage = memo(() => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>
        <ExercisesPageComponent />
      </PageTransition>
    </Suspense>
  );
});

const MessagesPageComponent = lazy(() => import("@/pages/MessagesPage"));

function MessagesPage() {

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading messaging system...</div>}>
      <MessagesPageComponent />
    </Suspense>
  );
}

const SchedulePage = memo(() => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>
        <SchedulePageComponent />
      </PageTransition>
    </Suspense>
  );
});

function Router() {
  const [location] = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location} className="w-full">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/dashboard" component={HomePage} />
          <Route path="/clients" component={ClientsPage} />
          <Route path="/workouts" component={WorkoutsPage} />
          <Route path="/workout-builder/:id" component={WorkoutBuilder} />
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

// User menu component for authenticated users
function UserMenu() {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  if (!user) return null;

  const userData = user as any; // Type assertion for user data from API

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full" data-testid="button-user-menu">
          <User className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{userData.firstName} {userData.lastName}</p>
          <p className="text-xs text-muted-foreground">{userData.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} data-testid="button-logout">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Video cycling order - defined outside component to prevent recreations
const CATEGORY_ORDER = ["trainers", "athletes", "programs", "success"] as const;

// Authentication wrapper component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  // Always call hooks at the top level
  const [activeCategory, setActiveCategory] = useState("trainers");
  const [theme, setTheme] = useState("dark");
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
  }, []);

  // Auto-cycling effect - only run on login screen
  useEffect(() => {
    // Only auto-cycle if user is not authenticated (on login screen)
    if (isLoading || user) return;
    
    const interval = setInterval(() => {
      setActiveCategory(prev => {
        const currentIndex = CATEGORY_ORDER.indexOf(prev as any);
        const nextIndex = (currentIndex + 1) % CATEGORY_ORDER.length;
        return CATEGORY_ORDER[nextIndex];
      });
    }, 10000); // Change video every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isLoading, user, activeCategory]); // Include activeCategory to restart interval on manual changes

  // Handle category click
  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  // Effect to ensure video plays when category changes
  useEffect(() => {
    if (isLoading || user) return;
    
    // Find and play the video
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (videoElement && videoElement.paused) {
      videoElement.play().catch(() => {
        // Autoplay blocked, user interaction will be needed
      });
    }
  }, [activeCategory, isLoading, user]);

  // No need for complex useEffect, React will handle key change

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-[400px]">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Checking authentication...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (error || !user) {

    // Optimized preview videos for faster loading (720p, 15s, 1-1.5MB each)
    const videoSources = {
      trainers: "/videos/trainers-preview.mp4",
      athletes: "/videos/athletes-preview.mp4", 
      programs: "/videos/programs-preview.mp4",
      success: "/videos/success-preview.mp4"
    };

    const categories = [
      { 
        id: "trainers", 
        title: "Trainers", 
        subtitle: "Professional Management",
        description: "Expert certified trainers providing personalized guidance"
      },
      { 
        id: "athletes", 
        title: "Athletes", 
        subtitle: "Performance Tracking",
        description: "Advanced performance analytics and monitoring"
      },
      { 
        id: "programs", 
        title: "Training Programs", 
        subtitle: "Unlimited",
        description: "Customized workout programs for every fitness level"
      },
      { 
        id: "success", 
        title: "Client Success", 
        subtitle: "Guaranteed",
        description: "Proven results through data-driven methodologies"
      }
    ];

    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Video - Single video element with changing src */}
        <div className="absolute inset-0 z-0">
          <video 
            key="background-video"
            autoPlay 
            muted 
            loop 
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.8) contrast(1.1)' }}
            src={videoSources[activeCategory as keyof typeof videoSources]}
            onLoadedData={() => {
              // Ensure video plays when loaded
              const video = document.querySelector('video') as HTMLVideoElement;
              if (video && video.paused) {
                video.play().catch(() => {
                  // Autoplay might be blocked, will work after user interaction
                });
              }
            }}
          />
          
          {/* Dark overlay for dark theme */}
          <div 
            className={`absolute inset-0 bg-black transition-opacity duration-500 ${
              theme === 'dark' ? 'opacity-40' : 'opacity-0'
            }`}
          />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 min-h-screen flex flex-col text-white">
          {/* Header with logo */}
          <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-8">
            <div className="flex items-center space-x-4">
              <img 
                src="/attached_assets/generated_images/Gym_Gurus_logo_design_a80cf837.png" 
                alt="Gym Gurus Logo" 
                className="h-16 w-auto object-contain"
                data-testid="logo-gym-gurus"
              />
            </div>
            <div className="backdrop-blur-sm bg-white/10 rounded-full p-1">
              <ThemeToggle />
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 flex flex-col items-center justify-center px-8 pt-32 pb-16">
            <div className="w-full max-w-4xl space-y-16 text-center">
              
              {/* Professional Title */}
              <div className="space-y-6">
                <h2 className="text-6xl md:text-7xl font-extralight tracking-wider text-white leading-none">
                  Personal
                  <br />
                  <span className="font-light text-primary">Trainers</span>
                </h2>
                <p className="text-xl text-white/90 font-light tracking-wide max-w-2xl mx-auto">
                  Elite fitness management platform for professional trainers
                </p>
              </div>

              {/* Interactive Categories Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className={`group relative p-6 rounded-lg backdrop-blur-md border transition-all duration-300 hover-elevate ${
                      activeCategory === category.id 
                        ? 'bg-primary/30 border-primary/50 shadow-lg shadow-primary/20' 
                        : 'bg-white/10 border-white/20 hover:bg-white/20'
                    }`}
                    data-testid={`category-${category.id}`}
                  >
                    <div className="space-y-3">
                      <h3 className={`text-lg font-semibold tracking-wide transition-colors ${
                        activeCategory === category.id ? 'text-primary' : 'text-white'
                      }`}>
                        {category.title}
                      </h3>
                      <p className="text-sm text-white/80 font-light tracking-wider">
                        {category.subtitle}
                      </p>
                      <p className="text-xs text-white/70 leading-relaxed opacity-90">
                        {category.description}
                      </p>
                    </div>
                    
                    {/* Active indicator */}
                    {activeCategory === category.id && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-b-lg" />
                    )}
                  </button>
                ))}
              </div>

              {/* Active Category Info */}
              <div className="space-y-4 backdrop-blur-md bg-white/10 rounded-xl p-8 border border-white/20">
                <h3 className="text-2xl font-light text-white tracking-wide">
                  {categories.find(cat => cat.id === activeCategory)?.title}
                </h3>
                <p className="text-white/90 text-lg font-light max-w-2xl mx-auto leading-relaxed">
                  {categories.find(cat => cat.id === activeCategory)?.description}
                </p>
              </div>

              {/* Sign in section */}
              <div className="space-y-8 pt-8">
                <div className="space-y-3">
                  <p className="text-lg text-white/90 tracking-wide font-light">
                    Access your professional trainer dashboard
                  </p>
                </div>
                
                <Button 
                  onClick={() => window.location.href = '/api/login'}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white border-0 px-12 py-4 text-lg tracking-wide font-medium backdrop-blur-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
                  data-testid="button-login"
                >
                  Sign in with Replit
                </Button>
                
                <p className="text-sm text-white/70 tracking-wider font-light">
                  Secure authentication & data protection
                </p>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="relative z-20 p-8 text-center backdrop-blur-sm">
            <p className="text-sm text-white/60 tracking-wider font-light">
              © 2025 Gym Gurus - Professional Fitness Management Platform
            </p>
          </footer>
        </div>
      </div>
    );
  }

  // User is authenticated, show the main app
  return children;
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
        <AuthWrapper>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between px-3 py-3 sm:px-4 sm:py-3 md:px-6 md:py-4 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 h-14 md:h-16">
                  <SidebarTrigger data-testid="button-sidebar-toggle" className="hover-elevate" />
                  <div className="flex items-center gap-2">
                    <UserMenu />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted/20">
                  <div className="max-w-7xl mx-auto">
                    <Router />
                  </div>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </AuthWrapper>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
