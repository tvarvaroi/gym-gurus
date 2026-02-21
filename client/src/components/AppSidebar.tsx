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
  Wand2,
  CreditCard,
  Settings,
  Apple,
  ChevronDown,
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
import { motion, AnimatePresence } from 'framer-motion';
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
  const { state } = useSidebar();

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

  // Premium animation variants
  const logoVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: {
      scale: 1.05,
      rotate: 1,
      transition: {
        type: 'spring',
        damping: 15,
        stiffness: 300,
      },
    },
  };

  const menuItemVariants = {
    initial: {
      x: 0,
      scale: 1,
    },
    hover: {
      x: 6,
      scale: 1.02,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 400,
      },
    },
    active: {
      x: 8,
      scale: 1.02,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 400,
      },
    },
  };

  const iconVariants = {
    initial: { rotate: 0, scale: 1 },
    hover: {
      rotate: 5,
      scale: 1.1,
      transition: {
        type: 'spring',
        damping: 15,
        stiffness: 300,
      },
    },
  };

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
                <motion.div
                  className="rounded-xl cursor-pointer group"
                  variants={logoVariants}
                  initial="initial"
                  whileHover="hover"
                  style={{
                    width: '82px',
                    height: '82px',
                    padding: '3px',
                    background:
                      'linear-gradient(135deg, rgba(201, 168, 85, 0.12), rgba(13, 148, 136, 0.12))',
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
                    <motion.div
                      className="absolute inset-0 rounded-lg"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(201, 168, 85, 0.3), rgba(13, 148, 136, 0.3))',
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
                    <motion.img
                      src={logoImage}
                      alt="Gym Gurus"
                      className="rounded-lg object-contain relative z-20"
                      whileHover={{ rotate: 3, scale: 1.05 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                      style={{
                        width: '76px',
                        height: '76px',
                        filter: 'brightness(1.15) contrast(1.08) saturate(0.85)',
                      }}
                    />
                  </div>
                </motion.div>
              </div>
            ) : null}

            <SidebarGroupLabel
              className={`mb-4 md:mb-8 ${isCollapsed ? 'hidden' : 'px-2 md:px-4'}`}
            >
              <motion.div
                className="flex items-center gap-2 md:gap-3 cursor-pointer"
                variants={logoVariants}
                initial="initial"
                whileHover="hover"
              >
                <div
                  className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl p-1 shrink-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(201, 168, 85, 0.12), rgba(13, 148, 136, 0.12))',
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
                  <motion.img
                    src={logoImage}
                    alt="Gym Gurus"
                    className="w-full h-full rounded-lg object-cover relative z-10"
                    whileHover={{ rotate: 3, scale: 1.05 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                    style={{ filter: 'brightness(1.15) contrast(1.08) saturate(0.85)' }}
                  />
                </div>
                <div className="flex flex-col">
                  <motion.span
                    className="text-lg md:text-xl font-extralight tracking-wide"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      background:
                        'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #e5e4e2 50%, hsl(var(--color-disciple)) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '0.2em',
                    }}
                  >
                    GYM GURUS
                  </motion.span>
                  <div
                    className="w-full h-px my-1 md:my-1.5"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(201, 168, 85, 0.6), rgba(13, 148, 136, 0.6))',
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
              </motion.div>
            </SidebarGroupLabel>

            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {menuItems.map((item, index) => {
                  const active = isActive(item.url);
                  const isMyWorkouts = isSolo && item.title === 'My Workouts';

                  return (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                            variants={menuItemVariants}
                            initial="initial"
                            animate={active ? 'active' : 'initial'}
                            whileHover="hover"
                            onHoverStart={() => setHoveredItem(item.title)}
                            onHoverEnd={() => setHoveredItem(null)}
                            className={`relative rounded-xl overflow-visible transition-colors duration-200 ${
                              hoveredItem === item.title
                                ? 'bg-muted/30'
                                : active
                                  ? 'bg-muted/50'
                                  : 'bg-transparent'
                            }`}
                            style={{ transformOrigin: 'left center' }}
                          >
                            {!isCollapsed && (
                              <motion.div
                                className="absolute left-0 top-0 w-1 h-full rounded-r-full z-10"
                                initial={{ scaleY: 0 }}
                                animate={{
                                  scaleY: active ? 1 : hoveredItem === item.title ? 0.6 : 0,
                                  opacity: active ? 1 : hoveredItem === item.title ? 0.7 : 0,
                                }}
                                transition={{
                                  type: 'spring',
                                  damping: 20,
                                  stiffness: 400,
                                  delay: index * 0.05,
                                }}
                                style={{
                                  transformOrigin: 'center',
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
                              >
                                <motion.div
                                  variants={iconVariants}
                                  initial="initial"
                                  animate={hoveredItem === item.title ? 'hover' : 'initial'}
                                  className={isCollapsed ? 'flex-shrink-0' : ''}
                                >
                                  <item.icon
                                    className={`h-5 w-5 ${active ? 'opacity-100' : 'opacity-80'}`}
                                  />
                                </motion.div>
                                {!isCollapsed && (
                                  <motion.span
                                    className={`text-base transition-colors duration-200 flex-1 ${
                                      active
                                        ? 'font-medium text-primary'
                                        : 'font-light text-foreground'
                                    }`}
                                    animate={{ fontWeight: active ? 500 : 300 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    {item.title}
                                  </motion.span>
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
                          </motion.div>
                        </TooltipTrigger>
                        {isCollapsed && (
                          <TooltipContent side="right" className="flex items-center gap-4">
                            {item.title}
                          </TooltipContent>
                        )}
                      </Tooltip>

                      {/* Collapsible workout sub-items (solo My Workouts only) */}
                      <AnimatePresence initial={false}>
                        {isMyWorkouts && workoutsOpen && !isCollapsed && (
                          <motion.div
                            key="workout-list"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="relative mt-1 mb-2 ml-2 pl-2 overflow-hidden"
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
                                myWorkouts.map((workout, wIdx) => {
                                  const isActiveWorkout =
                                    location === `/workout-builder/${workout.id}`;
                                  return (
                                    <motion.div
                                      key={workout.id}
                                      initial={{ opacity: 0, x: -6 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{
                                        delay: wIdx * 0.04,
                                        type: 'spring',
                                        stiffness: 400,
                                        damping: 30,
                                      }}
                                      whileHover={{ x: 4 }}
                                    >
                                      <a
                                        href={`/workout-builder/${workout.id}`}
                                        className={`flex items-center gap-2.5 pl-7 pr-3 py-2 mx-1 rounded-xl transition-all duration-200 group relative ${
                                          isActiveWorkout
                                            ? 'bg-purple-500/15 border border-purple-500/20 shadow-sm shadow-purple-500/10'
                                            : 'hover:bg-muted/20 border border-transparent'
                                        }`}
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
                                          <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0"
                                          />
                                        )}
                                      </a>
                                    </motion.div>
                                  );
                                })
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
