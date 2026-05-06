import {
  Calendar,
  Dumbbell,
  Home,
  Users,
  TrendingUp,
  BookOpen,
  Calculator,
  Sparkles,
  Trophy,
  Heart,
  HeartPulse,
  Wand2,
  CreditCard,
  Settings,
  Apple,
  ChevronDown,
  Layers,
  Activity,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarMenuAction,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png';
import { useState, useEffect, memo } from 'react';
import { useLocation } from 'wouter';
import { useUser } from '@/contexts/UserContext';
import { useQuery } from '@tanstack/react-query';

// Trainer menu items - Full platform access
const trainerMenuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'My Clients',
    url: '/clients',
    icon: Users,
  },
  {
    title: 'Workout Plans',
    url: '/workouts',
    icon: Dumbbell,
  },
  {
    title: 'Programs',
    url: '/programs',
    icon: Layers,
  },
  {
    title: 'Exercise Library',
    url: '/exercises',
    icon: BookOpen,
  },
  {
    title: 'Calculators',
    url: '/dashboard/calculators',
    icon: Calculator,
  },
  {
    title: 'Body',
    url: '/biometrics',
    icon: Activity,
  },
  // Sprint 3 BATCH 6 — Wellness sits between Body and Schedule in all 3 role
  // menus (self-tracking cluster: Progress → Body → Wellness → Schedule).
  // Using HeartPulse, not Heart (Heart is already taken by Recovery in the
  // Ronin menu — keeping icons distinct prevents the sidebar from showing
  // two near-identical glyphs back to back).
  {
    title: 'Wellness',
    url: '/wellness',
    icon: HeartPulse,
  },
  {
    title: 'Schedule',
    url: '/schedule',
    icon: Calendar,
  },
  {
    title: 'AI Coach',
    url: '/solo/coach',
    icon: Sparkles,
  },
  {
    title: 'Nutrition Planner',
    url: '/solo/nutrition',
    icon: Apple,
  },
  {
    title: 'Payments',
    url: '/payments',
    icon: CreditCard,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
];

// Client menu items - Focused on personal training
const clientMenuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'My Workouts',
    url: '/workouts',
    icon: Dumbbell,
  },
  {
    title: 'Programs',
    url: '/programs',
    icon: Layers,
  },
  {
    title: 'My Progress',
    url: '/progress',
    icon: TrendingUp,
  },
  {
    title: 'Calculators',
    url: '/dashboard/calculators',
    icon: Calculator,
  },
  {
    title: 'Body',
    url: '/biometrics',
    icon: Activity,
  },
  // Sprint 3 BATCH 6 — Wellness sits between Body and Schedule in all 3 role
  // menus (self-tracking cluster: Progress → Body → Wellness → Schedule).
  // Using HeartPulse, not Heart (Heart is already taken by Recovery in the
  // Ronin menu — keeping icons distinct prevents the sidebar from showing
  // two near-identical glyphs back to back).
  {
    title: 'Wellness',
    url: '/wellness',
    icon: HeartPulse,
  },
  {
    title: 'Schedule',
    url: '/schedule',
    icon: Calendar,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
];

// Solo user menu items - Independent training with AI features
const soloMenuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'AI Coach',
    url: '/solo/coach',
    icon: Sparkles,
  },
  {
    title: 'Generate Workout',
    url: '/solo/generate',
    icon: Wand2,
  },
  {
    title: 'Nutrition Planner',
    url: '/solo/nutrition',
    icon: Apple,
  },
  {
    title: 'My Workouts',
    url: '/workouts',
    icon: Dumbbell,
  },
  {
    title: 'Programs',
    url: '/programs',
    icon: Layers,
  },
  {
    title: 'My Progress',
    url: '/progress',
    icon: TrendingUp,
  },
  {
    title: 'Recovery',
    url: '/solo/recovery',
    icon: Heart,
  },
  {
    title: 'Achievements',
    url: '/solo/achievements',
    icon: Trophy,
  },
  {
    title: 'Calculators',
    url: '/dashboard/calculators',
    icon: Calculator,
  },
  {
    title: 'Body',
    url: '/biometrics',
    icon: Activity,
  },
  // Sprint 3 BATCH 6 — Wellness sits between Body and Schedule in all 3 role
  // menus (self-tracking cluster: Progress → Body → Wellness → Schedule).
  // Using HeartPulse, not Heart (Heart is already taken by Recovery in the
  // Ronin menu — keeping icons distinct prevents the sidebar from showing
  // two near-identical glyphs back to back).
  {
    title: 'Wellness',
    url: '/wellness',
    icon: HeartPulse,
  },
  {
    title: 'Schedule',
    url: '/schedule',
    icon: Calendar,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
];

const AppSidebar = memo(() => {
  const [location] = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [workoutsOpen, setWorkoutsOpen] = useState(() => location.startsWith('/workout-builder/'));
  const { isTrainer, isClient, isSolo } = useUser();
  const { state, isMobile, setOpenMobile } = useSidebar();

  // Auto-open My Workouts dropdown when navigating to a workout builder page
  useEffect(() => {
    if (location.startsWith('/workout-builder/')) {
      setWorkoutsOpen(true);
    }
  }, [location]);

  // Fetch saved workouts for solo sidebar dropdown
  const { data: myWorkouts = [] } = useQuery<{ id: string; title: string }[]>({
    queryKey: ['/api/workouts'],
    enabled: isSolo,
    staleTime: 30 * 1000,
    select: (data: any[]) => data.map((w) => ({ id: w.id, title: w.title })),
  });

  // Select menu items based on user role
  const menuItems = isTrainer ? trainerMenuItems : isSolo ? soloMenuItems : clientMenuItems;
  const isCollapsed = state === 'collapsed';

  const isActive = (url: string) => {
    if (url === '/dashboard' || url === '/solo') {
      // Dashboard routes use exact match to avoid false positives
      return location === url;
    }
    // All other routes use prefix matching so sub-routes highlight parent
    return location === url || location.startsWith(url + '/');
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar
        collapsible="icon"
        className="border-r border-border/50 bg-sidebar/95 backdrop-blur-xl"
        aria-label="Main navigation"
      >
        <SidebarContent className="pt-8">
          <SidebarGroup>
            {/* Logo section - conditional rendering based on collapse state */}
            {isCollapsed ? (
              // Collapsed: Show only logo image at top with 3px spacing
              <div
                className="mb-4 flex justify-center w-full"
                style={{
                  marginTop: '-30px', // pt-8 (32px) - 30px = 2px top spacing
                  display: 'flex !important',
                  visibility: 'visible !important',
                }}
              >
                <div
                  className="rounded-xl cursor-pointer group hover:scale-105 hover:rotate-1 transition-transform duration-300"
                  style={{
                    width: '82px',
                    height: '82px',
                    padding: '3px',
                    background:
                      'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.08))',
                    backdropFilter: 'blur(24px)',
                    boxShadow:
                      '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {/* Inner container for image and effects - exactly 76px */}
                  <div
                    className="relative rounded-lg overflow-hidden"
                    style={{
                      width: '76px',
                      height: '76px',
                    }}
                  >
                    {/* Animated border on hover - theme colored */}
                    <div
                      className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background:
                          'linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.2))',
                        filter: 'blur(2px)',
                      }}
                    />
                    <div
                      className="absolute inset-0 rounded-lg z-10"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
                      }}
                    />
                    <img
                      src={logoImage}
                      alt="Gym Gurus"
                      className="rounded-lg object-contain relative z-20 group-hover:rotate-3 group-hover:scale-105 transition-transform duration-300"
                      style={{
                        width: '76px',
                        height: '76px',
                        filter: 'brightness(1.15) contrast(1.08) saturate(0.85)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <SidebarGroupLabel
              className={`mb-4 md:mb-8 ${isCollapsed ? 'hidden' : 'px-2 md:px-4'}`}
            >
              <div className="flex items-center gap-2 md:gap-3 cursor-pointer group hover:scale-[1.03] hover:rotate-[0.5deg] transition-transform duration-300">
                <div
                  className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl p-1 shrink-0"
                  style={{
                    background:
                      'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.08))',
                    backdropFilter: 'blur(24px)',
                    boxShadow:
                      '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {/* Glass shine */}
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
                    }}
                  />
                  <img
                    src={logoImage}
                    alt="Gym Gurus"
                    className="w-full h-full rounded-lg object-cover relative z-10 group-hover:rotate-3 group-hover:scale-105 transition-transform duration-300"
                    style={{ filter: 'brightness(1.15) contrast(1.08) saturate(0.85)' }}
                  />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-lg md:text-xl font-extralight tracking-wide group-hover:scale-105 transition-transform duration-300 origin-left"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      background:
                        'linear-gradient(90deg, hsl(var(--primary)) 0%, #e5e4e2 50%, hsl(var(--primary) / 0.6) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '0.2em',
                    }}
                  >
                    GYM GURUS
                  </span>
                  <div
                    className="w-full h-px my-1 md:my-1.5"
                    style={{
                      background:
                        'linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary) / 0.3))',
                    }}
                  />
                  <span
                    className="text-xs font-light tracking-widest"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      color: '#999',
                      letterSpacing: '0.3em',
                    }}
                  >
                    ELITE FITNESS
                  </span>
                </div>
              </div>
            </SidebarGroupLabel>

            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {menuItems.map((item) => {
                  const active = isActive(item.url);
                  const isMyWorkouts = isSolo && item.title === 'My Workouts';

                  return (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onMouseEnter={() => setHoveredItem(item.title)}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={`relative rounded-xl overflow-visible transition-all duration-200 ${
                              active
                                ? 'translate-x-2 scale-[1.02] bg-muted/50'
                                : hoveredItem === item.title
                                  ? 'translate-x-1.5 scale-[1.01] bg-muted/30'
                                  : 'bg-transparent'
                            }`}
                            style={{ transformOrigin: 'left center' }}
                          >
                            {!isCollapsed && (
                              <div
                                className="absolute left-0 top-0 w-1 h-full rounded-r-full z-10 transition-all duration-200 origin-center"
                                style={{
                                  transform: `scaleY(${active ? 1 : hoveredItem === item.title ? 0.6 : 0})`,
                                  opacity: active ? 1 : hoveredItem === item.title ? 0.7 : 0,
                                  background:
                                    'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)',
                                }}
                              />
                            )}

                            <SidebarMenuButton
                              asChild
                              className={`h-11 ${isCollapsed ? 'w-full !px-0' : 'px-4'} font-light rounded-xl transition-all duration-200 border-0 ${
                                active ? 'bg-primary/10 text-primary' : 'hover:bg-transparent'
                              }`}
                            >
                              <a
                                href={item.url}
                                data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}
                                className={`flex items-center w-full ${isCollapsed ? 'justify-center !px-0' : 'gap-3 px-4'}`}
                                onClick={() => isMobile && setOpenMobile(false)}
                              >
                                <div
                                  className={`transition-transform duration-200 ${
                                    hoveredItem === item.title ? 'rotate-[5deg] scale-110' : ''
                                  } ${isCollapsed ? 'flex-shrink-0' : ''}`}
                                >
                                  <item.icon
                                    className={`h-5 w-5 ${active ? 'opacity-100' : 'opacity-80'}`}
                                  />
                                </div>
                                {!isCollapsed && (
                                  <span
                                    className={`text-base transition-all duration-200 flex-1 ${
                                      active
                                        ? 'font-medium text-primary'
                                        : 'font-light text-foreground'
                                    }`}
                                  >
                                    {item.title}
                                  </span>
                                )}
                              </a>
                            </SidebarMenuButton>

                            {/* Chevron toggle for My Workouts dropdown (solo only) */}
                            {isMyWorkouts && !isCollapsed && (
                              <SidebarMenuAction
                                onClick={(e) => {
                                  e.preventDefault();
                                  setWorkoutsOpen((o) => !o);
                                }}
                                className={`right-2 rounded-lg transition-all duration-200 ${
                                  workoutsOpen
                                    ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400'
                                    : 'hover:bg-muted/40 text-muted-foreground/60'
                                }`}
                              >
                                <ChevronDown
                                  className={`h-3.5 w-3.5 transition-transform duration-300 ${workoutsOpen ? 'rotate-180' : ''}`}
                                />
                              </SidebarMenuAction>
                            )}
                          </div>
                        </TooltipTrigger>
                        {isCollapsed && (
                          <TooltipContent side="right" className="flex items-center gap-4">
                            {item.title}
                          </TooltipContent>
                        )}
                      </Tooltip>

                      {/* Collapsible workout sub-items (solo My Workouts only) */}
                      {isMyWorkouts && !isCollapsed && (
                        <div
                          className={`relative mt-1 mb-2 ml-2 pl-2 overflow-hidden transition-all duration-200 ease-in-out ${
                            workoutsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          {/* Vertical connector line */}
                          <div className="absolute left-[18px] top-1 bottom-3 w-px bg-gradient-to-b from-purple-500/50 via-purple-500/20 to-transparent" />

                          <div className="space-y-0.5">
                            {myWorkouts.length === 0 ? (
                              <div className="flex items-center gap-2 pl-7 py-2">
                                <span className="text-[11px] text-muted-foreground/50 font-light italic">
                                  No workouts yet
                                </span>
                              </div>
                            ) : (
                              myWorkouts.map((workout) => {
                                const isActiveWorkout =
                                  location === `/workout-builder/${workout.id}`;
                                return (
                                  <div
                                    key={workout.id}
                                    className="hover:translate-x-1 transition-transform duration-200"
                                  >
                                    <a
                                      href={`/workout-builder/${workout.id}`}
                                      className={`flex items-center gap-2.5 pl-7 pr-3 py-2 mx-1 rounded-xl transition-all duration-200 group relative ${
                                        isActiveWorkout
                                          ? 'bg-purple-500/15 border border-purple-500/20 shadow-sm shadow-purple-500/10'
                                          : 'hover:bg-muted/20 border border-transparent'
                                      }`}
                                      onClick={() => isMobile && setOpenMobile(false)}
                                    >
                                      {/* Connector dot */}
                                      <div
                                        className={`absolute left-2 w-2 h-2 rounded-full border-2 flex-shrink-0 transition-all duration-200 ${
                                          isActiveWorkout
                                            ? 'bg-purple-400 border-purple-400 shadow-sm shadow-purple-400/50'
                                            : 'bg-background border-muted-foreground/30 group-hover:border-muted-foreground/60'
                                        }`}
                                      />

                                      {/* Icon */}
                                      <div
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                          isActiveWorkout
                                            ? 'bg-purple-500/20 shadow-inner'
                                            : 'bg-muted/20 group-hover:bg-muted/40'
                                        }`}
                                      >
                                        <Dumbbell
                                          className={`w-3.5 h-3.5 transition-colors duration-200 ${
                                            isActiveWorkout
                                              ? 'text-purple-400'
                                              : 'text-muted-foreground/50 group-hover:text-muted-foreground/80'
                                          }`}
                                        />
                                      </div>

                                      {/* Title */}
                                      <span
                                        className={`text-[13px] truncate flex-1 transition-colors duration-200 ${
                                          isActiveWorkout
                                            ? 'font-medium text-purple-300'
                                            : 'font-light text-muted-foreground/70 group-hover:text-foreground'
                                        }`}
                                      >
                                        {workout.title}
                                      </span>

                                      {/* Active dot indicator */}
                                      {isActiveWorkout && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0 animate-in zoom-in duration-200" />
                                      )}
                                    </a>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
});

AppSidebar.displayName = 'AppSidebar';

export default AppSidebar;
