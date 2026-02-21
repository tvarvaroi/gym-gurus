import { QueryClient, QueryFunction, MutationCache, QueryCache } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Read CSRF token from cookie for state-changing requests.
 */
export function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  // Include CSRF token on state-changing requests
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (stateChangingMethods.includes(method.toUpperCase())) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = 'returnNull' | 'throw';
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join('/') as string, {
      credentials: 'include',
    });

    if (unauthorizedBehavior === 'returnNull' && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Global error handler for 401 responses
let redirecting401 = false;
function handle401Error(error: unknown) {
  if (error instanceof Error && error.message.startsWith('401:')) {
    const pathname = window.location.pathname;
    // Don't redirect if already on a public page (landing, legal, calculators, login pages)
    const isPublicPage =
      pathname === '/' ||
      pathname === '/terms' ||
      pathname === '/privacy' ||
      pathname.startsWith('/calculators') ||
      pathname === '/preview-login' ||
      pathname === '/test-login' ||
      pathname === '/test-auth-login' ||
      pathname.startsWith('/auth/');

    // Only redirect once and only if not on a public page
    if (!redirecting401 && !isPublicPage) {
      redirecting401 = true;
      // Store the current URL so user can return after re-login
      sessionStorage.setItem('returnUrl', pathname + window.location.search);
      window.location.href = '/';
    }
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => handle401Error(error),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      handle401Error(error);
      // Show a global error toast for mutations without their own onError handler
      const is401 = error instanceof Error && error.message.startsWith('401:');
      if (!is401 && !mutation.options.onError) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: message.replace(/^\d+:\s*/, ''), // Strip HTTP status prefix
        });
      }
    },
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: 'throw' }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 60 * 1000, // Data is fresh for 60 seconds (increased for better performance)
      gcTime: 30 * 60 * 1000, // Cache garbage collected after 30 minutes (increased for better caching)
      retry: (failureCount, error) => {
        // Don't retry on 401 (authentication) errors
        if (error instanceof Error && error.message.startsWith('401:')) {
          return false;
        }
        // Retry other errors up to 2 times
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 1, // Retry failed mutations once
      retryDelay: 1000,
    },
  },
});
