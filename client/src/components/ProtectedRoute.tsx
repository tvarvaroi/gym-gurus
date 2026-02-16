import { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useUser, type Permission } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'trainer' | 'client';
  requirePermission?: Permission;
  fallbackPath?: string;
}

/**
 * ProtectedRoute component for role-based access control
 *
 * Usage examples:
 *
 * // Require trainer role
 * <ProtectedRoute requiredRole="trainer">
 *   <ClientListPage />
 * </ProtectedRoute>
 *
 * // Require specific permission
 * <ProtectedRoute requirePermission="workouts:create">
 *   <WorkoutBuilder />
 * </ProtectedRoute>
 *
 * // Require both role and permission
 * <ProtectedRoute requiredRole="trainer" requirePermission="clients:edit">
 *   <EditClientPage />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({
  children,
  requiredRole,
  requirePermission,
  fallbackPath = '/',
}: ProtectedRouteProps) {
  const { user, isLoading, isTrainer, isClient, hasPermission } = useUser();
  const prefersReducedMotion = useReducedMotion();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-[60vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="space-y-6 text-center">
          <motion.div
            className="relative inline-block"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
          >
            <Loader2 className="h-12 w-12 text-primary mx-auto" />
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <motion.p
            className="text-base font-light text-muted-foreground/80"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
          >
            Checking permissions...
          </motion.p>
        </div>
      </motion.div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect to="/api/login" />;
  }

  // Check role requirement
  if (requiredRole) {
    if (requiredRole === 'trainer' && !isTrainer) {
      return <UnauthorizedAccess userRole={user.role} requiredRole={requiredRole} />;
    }
    if (requiredRole === 'client' && !isClient) {
      return <UnauthorizedAccess userRole={user.role} requiredRole={requiredRole} />;
    }
  }

  // Check permission requirement
  if (requirePermission && !hasPermission(requirePermission)) {
    return <UnauthorizedAccess userRole={user.role} requiredPermission={requirePermission} />;
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}

// Unauthorized access component
function UnauthorizedAccess({
  userRole,
  requiredRole,
  requiredPermission,
}: {
  userRole: 'trainer' | 'client';
  requiredRole?: 'trainer' | 'client';
  requiredPermission?: Permission;
}) {
  return (
    <motion.div
      className="flex items-center justify-center min-h-[60vh]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-md w-full space-y-8 text-center p-8">
        {/* Error Icon */}
        <div className="relative inline-block">
          <motion.div
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-destructive/20 via-destructive/10 to-transparent flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
          >
            <AlertCircle className="h-12 w-12 text-destructive/60" />
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-destructive/10 to-transparent blur-xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <motion.h2
            className="text-2xl font-light text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Access Denied
          </motion.h2>
          <motion.p
            className="text-base font-light text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {requiredRole && (
              <>
                This page is only accessible to{' '}
                <span className="font-medium text-foreground">
                  {requiredRole === 'trainer' ? 'trainers' : 'clients'}
                </span>
                .
              </>
            )}
            {requiredPermission && (
              <>
                You don't have permission to access this feature.
                <br />
                <span className="text-sm text-muted-foreground/70">
                  Required: {requiredPermission}
                </span>
              </>
            )}
          </motion.p>
          <motion.p
            className="text-sm text-muted-foreground/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Current role: <span className="font-medium text-foreground">{userRole}</span>
          </motion.p>
        </div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-medium transition-colors duration-200"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
