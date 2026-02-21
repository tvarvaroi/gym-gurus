import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

// User type with role
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: 'trainer' | 'client' | 'solo';
  trainerId?: string | null; // For clients - reference to their trainer
  isIndependent?: boolean; // For solo users
  onboardingCompleted?: boolean; // For solo users
  onboardingStep?: number; // For solo users
  // Subscription fields
  stripeCustomerId?: string | null;
  subscriptionStatus?: 'trialing' | 'active' | 'canceled' | 'past_due' | null;
  subscriptionTier?: 'solo' | 'trainer' | 'pro' | null;
  subscriptionCurrentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Permission types for role-based access control
export type Permission =
  // Client management
  | 'clients:view'
  | 'clients:create'
  | 'clients:edit'
  | 'clients:delete'
  // Workout management
  | 'workouts:view_all' // Trainers can see all templates
  | 'workouts:view_assigned' // Clients can see assigned workouts
  | 'workouts:create'
  | 'workouts:edit'
  | 'workouts:delete'
  | 'workouts:assign'
  | 'workouts:log' // Clients can log workout completion
  // Progress tracking
  | 'progress:view_all' // Trainers can view all client progress
  | 'progress:view_own' // Clients can view their own progress
  | 'progress:add'
  | 'progress:edit'
  | 'progress:delete'
  // Exercise library
  | 'exercises:view'
  | 'exercises:create'
  | 'exercises:edit'
  | 'exercises:delete'
  // Messaging
  | 'messages:view'
  | 'messages:send'
  // Schedule
  | 'schedule:view_all' // Trainers can see all sessions
  | 'schedule:view_own' // Clients can see their sessions
  | 'schedule:create'
  | 'schedule:edit'
  | 'schedule:delete'
  // Dashboard
  | 'dashboard:trainer'
  | 'dashboard:client'
  | 'dashboard:solo'
  // Solo user specific
  | 'ai:coach'
  | 'workouts:generate'
  | 'recovery:track'
  | 'gamification:view';

// Permission mapping for each role
const ROLE_PERMISSIONS: Record<'trainer' | 'client' | 'solo', Permission[]> = {
  trainer: [
    'clients:view',
    'clients:create',
    'clients:edit',
    'clients:delete',
    'workouts:view_all',
    'workouts:create',
    'workouts:edit',
    'workouts:delete',
    'workouts:assign',
    'progress:view_all',
    'progress:add',
    'progress:edit',
    'progress:delete',
    'exercises:view',
    'exercises:create',
    'exercises:edit',
    'exercises:delete',
    'messages:view',
    'messages:send',
    'schedule:view_all',
    'schedule:create',
    'schedule:edit',
    'schedule:delete',
    'dashboard:trainer',
  ],
  client: [
    'workouts:view_assigned',
    'workouts:log',
    'progress:view_own',
    'exercises:view',
    'messages:view',
    'messages:send',
    'schedule:view_own',
    'dashboard:client',
  ],
  solo: [
    // Solo users have independent access to most features
    'workouts:view_all',
    'workouts:create',
    'workouts:edit',
    'workouts:delete',
    'workouts:log',
    'workouts:generate', // AI-generated workouts
    'progress:view_own',
    'progress:add',
    'progress:edit',
    'exercises:view',
    'schedule:view_own',
    'schedule:create',
    'schedule:edit',
    'dashboard:solo',
    'ai:coach',
    'recovery:track',
    'gamification:view',
  ],
};

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isTrainer: boolean;
  isClient: boolean;
  isSolo: boolean;
  hasPermission: (permission: Permission) => boolean;
  refetchUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  // Get current location to check if we're on a public page
  const [location] = useLocation();

  // CRITICAL FIX: Use window.location.pathname as fallback for initial render
  // to prevent race condition where query runs before location is determined
  const currentPath = location || window.location.pathname;

  // Check if current page is public (no auth needed) - updates reactively with location changes
  const isPublicPage =
    currentPath === '/' ||
    currentPath === '/terms' ||
    currentPath === '/privacy' ||
    currentPath.startsWith('/calculators') ||
    currentPath.startsWith('/auth/') ||
    currentPath === '/preview-login' ||
    currentPath === '/test-login' ||
    currentPath === '/test-auth-login';

  // DEBUG: Log to verify public page detection
  console.log('[UserContext] currentPath:', currentPath, 'isPublicPage:', isPublicPage);

  // Fetch current user (disabled on public pages to prevent unnecessary requests)
  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    enabled: !isPublicPage, // Only run query on non-public pages
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  // Helper to check if user has a specific permission
  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role];
    return permissions.includes(permission);
  };

  const value: UserContextType = {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    isTrainer: user?.role === 'trainer',
    isClient: user?.role === 'client',
    isSolo: user?.role === 'solo',
    hasPermission,
    refetchUser: refetch,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Custom hook to use the UserContext
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Convenience hook for checking permissions
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useUser();
  return hasPermission(permission);
}

// Convenience hook for role checks
export function useRole() {
  const { isTrainer, isClient, isSolo, user } = useUser();
  return {
    isTrainer,
    isClient,
    isSolo,
    role: user?.role,
  };
}
