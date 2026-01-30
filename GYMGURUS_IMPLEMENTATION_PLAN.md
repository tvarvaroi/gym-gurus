# GymGurus Implementation Plan - Dual-Sided Architecture

## 🎯 **The Answer to Your Question**

**You asked:** "Are we going to have multiple pages some for trainers some for clients?"

**Answer:** **YES, but not how you think!** ✨

You'll have:
- ✅ **ONE unified app** (not two separate apps)
- ✅ **Same pages/routes** that show different content based on user role
- ✅ **Some unique pages** per role (like `/clients` trainer-only, `/my-progress` client-only)
- ✅ **Shared navigation** that adapts to show relevant items only

**This is NOT confusing because:**
1. Users never see both interfaces - they only see THEIR role's view
2. Navigation is tailored - trainers see "My Clients", clients see "My Workouts"
3. Same familiar structure - both have Dashboard, Messages, Schedule
4. Clear visual indicators - subtle color/badge differences

---

## 📊 **Visual Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                      USER LOGS IN                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─────── Role: TRAINER ────────┐
                 │                              │
                 │        ┌─────────────────────┼────────────────┐
                 │        │  TRAINER INTERFACE  │                │
                 │        ├─────────────────────┘                │
                 │        │                                      │
                 │        │  Sidebar:                            │
                 │        │  ├── Dashboard                       │
                 │        │  ├── My Clients   ← Trainer Only    │
                 │        │  ├── Workout Plans                   │
                 │        │  ├── Exercise Library                │
                 │        │  ├── Messages                        │
                 │        │  └── Schedule                        │
                 │        │                                      │
                 │        │  Dashboard Shows:                    │
                 │        │  ├── Client Stats (18 active)        │
                 │        │  ├── Upcoming Sessions               │
                 │        │  ├── Recent Activity                 │
                 │        │  └── Revenue Analytics               │
                 │        │                                      │
                 │        └──────────────────────────────────────┘
                 │
                 │
                 └─────── Role: CLIENT ─────────┐
                                                 │
                         ┌───────────────────────┼────────────────┐
                         │  CLIENT INTERFACE     │                │
                         ├───────────────────────┘                │
                         │                                        │
                         │  Sidebar:                              │
                         │  ├── Dashboard                         │
                         │  ├── My Workouts   ← Client Only      │
                         │  ├── My Progress   ← Client Only      │
                         │  ├── Messages                          │
                         │  └── Schedule                          │
                         │                                        │
                         │  Dashboard Shows:                      │
                         │  ├── Today's Workout                   │
                         │  ├── Progress Summary                  │
                         │  ├── Next Session with Trainer         │
                         │  └── Recent Activity                   │
                         │                                        │
                         └────────────────────────────────────────┘
```

---

## 🗂️ **Current vs New File Structure**

### Current Structure (Trainer-Only):
```
client/src/
├── pages/
│   ├── Dashboard.tsx         # Trainer dashboard
│   ├── ClientsPage.tsx       # Trainer's client list
│   ├── WorkoutPlans.tsx      # Trainer's workout templates
│   ├── ExercisesPage.tsx     # Exercise library
│   ├── MessagesPage.tsx      # Messages
│   └── SchedulePage.tsx      # Schedule
```

### New Structure (Dual-Sided):
```
client/src/
├── contexts/
│   └── UserContext.tsx       # NEW: Manage user role
│
├── pages/
│   ├── Dashboard.tsx         # MODIFIED: Shows TrainerDashboard OR ClientDashboard
│   │
│   ├── trainer/              # NEW: Trainer-specific pages
│   │   ├── ClientsPage.tsx
│   │   ├── ClientDetailsPage.tsx
│   │   ├── WorkoutBuilder.tsx
│   │   └── AnalyticsPage.tsx
│   │
│   ├── client/               # NEW: Client-specific pages
│   │   ├── MyWorkoutsPage.tsx
│   │   ├── MyProgressPage.tsx
│   │   └── WorkoutLoggerPage.tsx
│   │
│   └── shared/               # Shared pages (role-adaptive)
│       ├── WorkoutsPage.tsx       # Shows different content per role
│       ├── MessagesPage.tsx       # Filtered by relationship
│       ├── SchedulePage.tsx       # Shows relevant sessions
│       └── ExercisesPage.tsx      # Trainer edits, client views
│
├── components/
│   ├── trainer/              # Trainer-specific components
│   │   ├── ClientList.tsx
│   │   ├── ClientCard.tsx
│   │   ├── WorkoutTemplateBuilder.tsx
│   │   └── ClientProgressView.tsx
│   │
│   ├── client/               # Client-specific components
│   │   ├── AssignedWorkoutCard.tsx
│   │   ├── WorkoutLogger.tsx
│   │   ├── ProgressChart.tsx
│   │   └── TrainerInfo.tsx
│   │
│   └── shared/               # Shared components
│       ├── AppSidebar.tsx    # MODIFIED: Role-based menu
│       ├── WorkoutCard.tsx   # MODIFIED: Different actions per role
│       └── MessageThread.tsx
│
└── hooks/
    ├── useUserRole.ts        # NEW: Hook to access user role
    └── usePermission.ts      # NEW: Check permissions
```

---

## 🔨 **Concrete Implementation**

### Step 1: Add Role to User Schema

```typescript
// shared/schema.ts - UPDATE
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),

  // NEW: Add role field
  role: text("role", { enum: ['trainer', 'client'] })
    .notNull()
    .default('client'),

  // NEW: For clients - link to their trainer
  trainerId: varchar("trainer_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
```

### Step 2: Create User Context

```typescript
// client/src/contexts/UserContext.tsx - NEW FILE
import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@shared/schema';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isTrainer: boolean;
  isClient: boolean;
  hasPermission: (permission: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  // Fetch current user from API
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  const value: UserContextType = {
    user: user || null,
    isLoading,
    isTrainer: user?.role === 'trainer',
    isClient: user?.role === 'client',
    hasPermission: (permission: string) => {
      // We'll expand this later with granular permissions
      if (!user) return false;

      const permissions: Record<string, string[]> = {
        'clients:view': ['trainer'],
        'clients:manage': ['trainer'],
        'workouts:create': ['trainer'],
        'workouts:assign': ['trainer'],
        'workouts:log': ['client'],
        'progress:view_all': ['trainer'],
        'progress:view_own': ['client', 'trainer'],
      };

      return permissions[permission]?.includes(user.role) || false;
    },
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserRole() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserProvider');
  }
  return context;
}
```

### Step 3: Update App.tsx to Include UserProvider

```typescript
// client/src/App.tsx - ADD UserProvider
import { UserProvider } from './contexts/UserContext';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthWrapper>
          <UserProvider>  {/* NEW: Wrap app with UserProvider */}
            <SidebarProvider>
              <div className="flex h-screen">
                <AppSidebar />
                <main>
                  <Router />
                </main>
              </div>
            </SidebarProvider>
          </UserProvider>
        </AuthWrapper>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

### Step 4: Create Role-Based Dashboards

```typescript
// client/src/components/trainer/TrainerDashboard.tsx - NEW FILE
import { useQuery } from '@tanstack/react-query';
import { ClientCard } from './ClientCard';
import { StatsCard } from '../shared/StatsCard';

export function TrainerDashboard() {
  const { data: clients } = useQuery({ queryKey: ['/api/clients'] });
  const { data: stats } = useQuery({ queryKey: ['/api/trainer/stats'] });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trainer Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard title="Active Clients" value={stats?.activeClients || 0} />
        <StatsCard title="This Week's Sessions" value={stats?.weekSessions || 0} />
        <StatsCard title="Workout Templates" value={stats?.workoutTemplates || 0} />
        <StatsCard title="Revenue (MTD)" value={`$${stats?.revenue || 0}`} />
      </div>

      {/* Recent Clients */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Client Activity</h2>
        <div className="grid grid-cols-3 gap-4">
          {clients?.slice(0, 6).map(client => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

```typescript
// client/src/components/client/ClientDashboard.tsx - NEW FILE
import { useQuery } from '@tanstack/react-query';
import { useUserRole } from '@/contexts/UserContext';
import { WorkoutCard } from '../shared/WorkoutCard';
import { ProgressChart } from './ProgressChart';

export function ClientDashboard() {
  const { user } = useUserRole();
  const { data: workouts } = useQuery({
    queryKey: ['/api/workouts/assigned', user?.id]
  });
  const { data: nextSession } = useQuery({
    queryKey: ['/api/sessions/next', user?.id]
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Dashboard</h1>

      {/* Next Session */}
      {nextSession && (
        <div className="p-6 bg-primary/10 rounded-lg">
          <h2 className="text-xl font-semibold">Next Session</h2>
          <p>{nextSession.date} at {nextSession.time}</p>
          <p>with {nextSession.trainerName}</p>
        </div>
      )}

      {/* Today's Workout */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Today's Workout</h2>
        {workouts?.[0] ? (
          <WorkoutCard workout={workouts[0]} />
        ) : (
          <p>No workout assigned for today</p>
        )}
      </div>

      {/* Progress Summary */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Progress This Month</h2>
        <ProgressChart clientId={user?.id} />
      </div>
    </div>
  );
}
```

```typescript
// client/src/pages/Dashboard.tsx - MODIFY
import { useUserRole } from '@/contexts/UserContext';
import { TrainerDashboard } from '@/components/trainer/TrainerDashboard';
import { ClientDashboard } from '@/components/client/ClientDashboard';

export default function Dashboard() {
  const { isTrainer, isClient, isLoading } = useUserRole();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Show appropriate dashboard based on role
  if (isTrainer) return <TrainerDashboard />;
  if (isClient) return <ClientDashboard />;

  return <div>Invalid user role</div>;
}
```

### Step 5: Update Sidebar for Role-Based Navigation

```typescript
// client/src/components/AppSidebar.tsx - MODIFY
import { useUserRole } from '@/contexts/UserContext';

const trainerMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "My Clients", url: "/clients", icon: Users },
  { title: "Workout Plans", url: "/workouts", icon: Dumbbell },
  { title: "Exercise Library", url: "/exercises", icon: BookOpen },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Schedule", url: "/schedule", icon: Calendar },
];

const clientMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "My Workouts", url: "/workouts", icon: Dumbbell },
  { title: "My Progress", url: "/progress", icon: TrendingUp },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Schedule", url: "/schedule", icon: Calendar },
];

export default function AppSidebar() {
  const { isTrainer } = useUserRole();
  const menuItems = isTrainer ? trainerMenuItems : clientMenuItems;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
```

### Step 6: Create Route Guards

```typescript
// client/src/components/ProtectedRoute.tsx - NEW FILE
import { ReactNode } from 'react';
import { Navigate } from 'wouter';
import { useUserRole } from '@/contexts/UserContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'trainer' | 'client';
  requirePermission?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requirePermission
}: ProtectedRouteProps) {
  const { user, isTrainer, isClient, hasPermission, isLoading } = useUserRole();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check role requirement
  if (requiredRole === 'trainer' && !isTrainer) {
    return <Navigate to="/" />;
  }

  if (requiredRole === 'client' && !isClient) {
    return <Navigate to="/" />;
  }

  // Check permission requirement
  if (requirePermission && !hasPermission(requirePermission)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

// Convenience wrappers
export function TrainerRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole="trainer">{children}</ProtectedRoute>;
}

export function ClientRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole="client">{children}</ProtectedRoute>;
}
```

### Step 7: Update Router with Protected Routes

```typescript
// client/src/App.tsx - UPDATE Router
import { TrainerRoute, ClientRoute } from './components/ProtectedRoute';

function Router() {
  return (
    <Switch>
      {/* Shared routes - adaptive content */}
      <Route path="/" component={Dashboard} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/schedule" component={SchedulePage} />

      {/* Trainer-only routes */}
      <Route path="/clients">
        <TrainerRoute>
          <ClientsPage />
        </TrainerRoute>
      </Route>

      <Route path="/clients/:id">
        <TrainerRoute>
          <ClientDetailsPage />
        </TrainerRoute>
      </Route>

      <Route path="/workout-builder/:id">
        <TrainerRoute>
          <WorkoutBuilder />
        </TrainerRoute>
      </Route>

      {/* Client-only routes */}
      <Route path="/my-progress">
        <ClientRoute>
          <MyProgressPage />
        </ClientRoute>
      </Route>

      <Route path="/workouts/:id/log">
        <ClientRoute>
          <WorkoutLoggerPage />
        </ClientRoute>
      </Route>

      {/* Role-adaptive routes */}
      <Route path="/workouts" component={WorkoutsPage} />
      <Route path="/exercises" component={ExercisesPage} />

      <Route component={NotFound} />
    </Switch>
  );
}
```

---

## 🎨 **Visual Differentiation (Subtle)**

```typescript
// Add subtle visual indicators

// In Header or Sidebar
export function RoleBadge() {
  const { isTrainer, isClient } = useUserRole();

  return (
    <div className="flex items-center gap-2">
      {isTrainer && (
        <Badge className="bg-blue-500">
          <Users className="w-3 h-3 mr-1" />
          Trainer
        </Badge>
      )}
      {isClient && (
        <Badge className="bg-green-500">
          <User className="w-3 h-3 mr-1" />
          Client
        </Badge>
      )}
    </div>
  );
}
```

---

## 📋 **Implementation Checklist**

### Week 1: Foundation
- [ ] Add `role` field to users table (migration)
- [ ] Create UserContext with role management
- [ ] Create useUserRole hook
- [ ] Update authentication to return role
- [ ] Create ProtectedRoute component

### Week 2: Navigation & Dashboard
- [ ] Split Dashboard into TrainerDashboard & ClientDashboard
- [ ] Update AppSidebar with role-based menus
- [ ] Add role badge/indicator in header
- [ ] Test role switching

### Week 3: Trainer Pages
- [ ] Keep existing ClientsPage (trainer-only)
- [ ] Keep existing WorkoutBuilder (trainer-only)
- [ ] Add analytics/reports page (trainer-only)

### Week 4: Client Pages
- [ ] Create MyWorkoutsPage (shows assigned workouts)
- [ ] Create MyProgressPage (personal progress tracking)
- [ ] Create WorkoutLoggerPage (log workouts)
- [ ] Create TrainerInfoCard (show their trainer)

### Week 5: Adaptive Pages
- [ ] Update WorkoutsPage to be role-adaptive
- [ ] Update MessagesPage to filter by relationship
- [ ] Update SchedulePage to show relevant sessions
- [ ] Update ExercisesPage (trainer edits, client views)

### Week 6: Polish & Testing
- [ ] Add permission system checks throughout
- [ ] Test all trainer flows
- [ ] Test all client flows
- [ ] Add role switcher for testing
- [ ] Update documentation

---

## 🎯 **Summary**

**To answer your question directly:**

✅ **YES**, you'll have some pages specific to trainers and some to clients

✅ **BUT** it's ONE app with smart routing, NOT two separate apps

✅ **BENEFIT**: Same look & feel, shared components, easier maintenance

✅ **USER EXPERIENCE**: Clean and intuitive - users only see what's relevant to them

✅ **THIS IS THE INDUSTRY STANDARD** - used by Trainerize, MyPTHub, TrueCoach, Everfit

**Would you like me to start implementing this? We can begin with Step 1 (database schema) and Step 2 (UserContext), then test it by splitting the Dashboard.**
