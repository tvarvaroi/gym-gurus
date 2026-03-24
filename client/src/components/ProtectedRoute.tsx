import { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useUser, type Permission } from '@/contexts/UserContext';
import { getRoleDisplayName, type InternalRole } from '@/lib/roles';
import { Loader2, AlertCircle } from 'lucide-react';

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

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in duration-300">
        <div className="space-y-6 text-center">
          <div className="relative inline-block">
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          </div>
          <p className="text-base font-light text-muted-foreground/80 animate-pulse">
            Checking permissions...
          </p>
        </div>
      </div>
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
    <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-md w-full space-y-8 text-center p-8">
        {/* Error Icon */}
        <div className="relative inline-block">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-destructive/20 via-destructive/10 to-transparent flex items-center justify-center animate-pulse">
            <AlertCircle className="h-12 w-12 text-destructive/60" />
          </div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-destructive/10 to-transparent blur-xl animate-pulse" />
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h2 className="text-2xl font-light text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
            Access Denied
          </h2>
          <p
            className="text-base font-light text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
          >
            {requiredRole && (
              <>
                This page is only accessible to{' '}
                <span className="font-medium text-foreground">
                  {requiredRole === 'trainer' ? 'Gurus' : 'Disciples'}
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
          </p>
          <p
            className="text-sm text-muted-foreground/70 animate-in fade-in duration-300"
            style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
          >
            Current role:{' '}
            <span className="font-medium text-foreground">
              {getRoleDisplayName(userRole as InternalRole)}
            </span>
          </p>
        </div>

        {/* Action Button */}
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-medium transition-colors duration-200"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
