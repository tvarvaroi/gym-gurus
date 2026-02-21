/**
 * Role-based theming for authentication pages
 * Returns accent colors for login/register pages based on selected role
 */

export type AuthRole = 'trainer' | 'client' | 'solo';

export interface RoleTheme {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  gradient: string;
  name: string;
  displayName: string;
}

export const roleThemes: Record<AuthRole, RoleTheme> = {
  trainer: {
    primary: '#c9a855', // Gold
    primaryHover: '#b8973d',
    primaryLight: '#f5e6c3',
    gradient: 'linear-gradient(135deg, #c9a855 0%, #d4b870 100%)',
    name: 'Guru',
    displayName: 'Trainer (Guru)',
  },
  client: {
    primary: '#0d9488', // Teal
    primaryHover: '#0f766e',
    primaryLight: '#ccfbf1',
    gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
    name: 'Disciple',
    displayName: 'Client (Disciple)',
  },
  solo: {
    primary: '#a855f7', // Purple
    primaryHover: '#9333ea',
    primaryLight: '#f3e8ff',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
    name: 'Ronin',
    displayName: 'Solo (Ronin)',
  },
};

/**
 * Get theme for a role, with fallback to solo
 */
export function getRoleTheme(role?: string | null): RoleTheme {
  if (!role || !(role in roleThemes)) {
    return roleThemes.solo;
  }
  return roleThemes[role as AuthRole];
}

/**
 * Get CSS custom properties for role theme
 */
export function getRoleThemeStyles(role?: string | null): React.CSSProperties {
  const theme = getRoleTheme(role);
  return {
    '--auth-primary': theme.primary,
    '--auth-primary-hover': theme.primaryHover,
    '--auth-primary-light': theme.primaryLight,
  } as React.CSSProperties;
}
