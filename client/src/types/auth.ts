/**
 * AuthUser — canonical frontend type for the authenticated user.
 * Re-exports User from UserContext so consumers can import from @/types
 * without a direct dependency on the context module.
 */
export type { User as AuthUser } from '@/contexts/UserContext';
