import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role: 'trainer' | 'client' | 'solo';
  emailVerified: boolean;
  authProvider: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'trainer' | 'client' | 'solo';
}

interface AuthResponse {
  user: User;
}

export function useUser() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch current user
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            return null; // Not authenticated
          }
          throw new Error('Failed to fetch user');
        }

        const data = await response.json();
        return data.user;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      return response.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data.user);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      return response.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data.user);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      setLocation('/auth/login');
    },
  });

  return {
    user,
    isLoading,
    error,
    login: async (credentials: LoginCredentials) => {
      try {
        await loginMutation.mutateAsync(credentials);
        return { ok: true };
      } catch (error: any) {
        return {
          ok: false,
          message: error.message || 'Login failed',
        };
      }
    },
    register: async (data: RegisterData) => {
      try {
        await registerMutation.mutateAsync(data);
        return { ok: true };
      } catch (error: any) {
        return {
          ok: false,
          message: error.message || 'Registration failed',
        };
      }
    },
    logout: () => logoutMutation.mutate(),
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
