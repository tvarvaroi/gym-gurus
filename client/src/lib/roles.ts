/**
 * Role Configuration
 *
 * Maps internal database role values to display names and theme info.
 * Internal values (trainer, client, solo) remain unchanged in DB/API.
 */

export type InternalRole = 'trainer' | 'client' | 'solo';
export type RoleThemeKey = 'guru' | 'disciple' | 'ronin';

export interface RoleConfig {
  displayName: string;
  tagline: string;
  themeKey: RoleThemeKey;
  cssClass: string;
}

export const ROLE_CONFIG: Record<InternalRole, RoleConfig> = {
  trainer: {
    displayName: 'Guru',
    tagline: 'Master & Guide',
    themeKey: 'guru',
    cssClass: 'role-guru',
  },
  client: {
    displayName: 'Disciple',
    tagline: 'Student & Warrior',
    themeKey: 'disciple',
    cssClass: 'role-disciple',
  },
  solo: {
    displayName: 'Ronin',
    tagline: 'Lone Warrior',
    themeKey: 'ronin',
    cssClass: 'role-ronin',
  },
} as const;

export function getRoleDisplayName(role: InternalRole): string {
  return ROLE_CONFIG[role].displayName;
}

export function getRoleTagline(role: InternalRole): string {
  return ROLE_CONFIG[role].tagline;
}

export function getRoleCssClass(role: InternalRole): string {
  return ROLE_CONFIG[role].cssClass;
}

export function getRoleThemeKey(role: InternalRole): RoleThemeKey {
  return ROLE_CONFIG[role].themeKey;
}

/** All CSS classes used for role theming */
export const ALL_ROLE_CSS_CLASSES = ['role-guru', 'role-disciple', 'role-ronin'] as const;

// ---------------------------------------------------------------------------
// Plan display names — maps DB/Stripe tier IDs to human-readable labels.
// Never show raw tier IDs to users; always use getPlanDisplayName().
// ---------------------------------------------------------------------------
export const PLAN_DISPLAY_NAMES: Record<string, string> = {
  free: 'Free Trial',
  FreeTrial: 'Free Trial',
  solo: 'Ronin',
  Solo: 'Ronin',
  solo_ai: 'Ronin AI',
  Solo_ai: 'Ronin AI',
  trainer: 'Guru',
  Guru: 'Guru',
  pro: 'Pro Guru',
  ProGuru: 'Pro Guru',
};

export function getPlanDisplayName(tier: string | null | undefined): string {
  if (!tier) return '';
  return PLAN_DISPLAY_NAMES[tier] ?? tier;
}
