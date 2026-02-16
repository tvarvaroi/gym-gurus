import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QueryErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Shared error state for React Query failures.
 * Shows a friendly error message with retry button.
 * Use `compact` for inline errors within existing layouts.
 */
export function QueryErrorState({
  error,
  onRetry,
  title,
  className,
  compact = false,
}: QueryErrorStateProps) {
  const isNetworkError = error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('NetworkError') ||
    error?.message?.includes('net::');

  const errorTitle = title || (isNetworkError ? 'Connection Error' : 'Something went wrong');
  const errorMessage = isNetworkError
    ? 'Unable to reach the server. Check your connection and try again.'
    : error?.message || 'An unexpected error occurred. Please try again.';

  const Icon = isNetworkError ? WifiOff : AlertCircle;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20', className)}>
        <Icon className="h-5 w-5 text-destructive flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{errorTitle}</p>
          <p className="text-xs text-muted-foreground truncate">{errorMessage}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('border-destructive/20', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon className="h-7 w-7 text-destructive" />
        </div>
        <div className="text-center space-y-1 max-w-sm">
          <h3 className="text-base font-medium">{errorTitle}</h3>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Wrapper for loading + error + empty states around React Query data.
 * Renders children only when data is available.
 */
interface QueryStateWrapperProps {
  isLoading: boolean;
  error: Error | null;
  data: unknown;
  onRetry?: () => void;
  loadingFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function QueryStateWrapper({
  isLoading,
  error,
  data,
  onRetry,
  loadingFallback,
  emptyFallback,
  children,
  className,
}: QueryStateWrapperProps) {
  if (isLoading) {
    return <>{loadingFallback || <DefaultLoadingState />}</>;
  }

  if (error) {
    return <QueryErrorState error={error} onRetry={onRetry} className={className} />;
  }

  const isEmpty = data === null || data === undefined ||
    (Array.isArray(data) && data.length === 0);

  if (isEmpty && emptyFallback) {
    return <>{emptyFallback}</>;
  }

  return <>{children}</>;
}

function DefaultLoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
