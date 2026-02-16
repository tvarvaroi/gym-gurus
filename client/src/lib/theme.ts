/**
 * GymGurus Premium Design System
 * All colors now reference CSS custom properties for proper role-based theming
 * ✅ TICKET-11: Refactored to eliminate hardcoded hex values
 */

import type { InternalRole, RoleThemeKey } from './roles';
import { getRoleThemeKey } from './roles';

export const theme = {
  // Color Palette - Now using CSS custom properties that update automatically based on role
  colors: {
    // All role themes now reference the same CSS variables
    // The actual color values are defined in index.css with role-specific overrides
    guru: {
      primary: 'hsl(var(--primary))',
      accent: 'hsl(var(--accent))',
      foreground: 'hsl(var(--primary-foreground))',
      gradient: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
      glow: 'hsl(var(--primary) / 0.08)',
      glowStrong: 'hsl(var(--primary) / 0.25)',
    },

    disciple: {
      primary: 'hsl(var(--primary))',
      accent: 'hsl(var(--accent))',
      foreground: 'hsl(var(--primary-foreground))',
      gradient: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
      glow: 'hsl(var(--primary) / 0.08)',
      glowStrong: 'hsl(var(--primary) / 0.25)',
    },

    ronin: {
      primary: 'hsl(var(--primary))',
      accent: 'hsl(var(--accent))',
      foreground: 'hsl(var(--primary-foreground))',
      gradient: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
      glow: 'hsl(var(--primary) / 0.08)',
      glowStrong: 'hsl(var(--primary) / 0.25)',
    },

    // Neutral Colors - Using CSS variables where applicable
    neutral: {
      white: 'hsl(0 0% 100%)',
      platinum: 'hsl(var(--muted))',
      gray100: 'hsl(0 0% 96%)',
      gray200: 'hsl(var(--border))',
      gray300: 'hsl(0 0% 70%)',
      gray400: 'hsl(0 0% 60%)',
      gray500: 'hsl(var(--muted-foreground))',
      gray600: 'hsl(0 0% 40%)',
      gray700: 'hsl(0 0% 29%)',
      gray800: 'hsl(0 0% 16%)',
      gray900: 'hsl(0 0% 10%)',
      black: 'hsl(0 0% 0%)',
    },

    // Background Colors - Using CSS variables
    background: {
      primary: 'hsl(var(--background))',
      secondary: 'hsl(var(--card))',
      tertiary: 'hsl(var(--muted))',
      elevated: 'hsl(var(--card) / 0.7)',
      glass: 'hsl(var(--card) / 0.8)',
      gradient: 'linear-gradient(135deg, hsl(var(--background)), hsl(var(--card)))',
    },
  },

  // Typography
  typography: {
    fonts: {
      display: "'Playfair Display', serif",
      body: "'Cormorant Garamond', serif",
      ui: "var(--font-sans)",
    },

    sizes: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem', // 48px
      '6xl': '3.75rem', // 60px
      '7xl': '4.5rem', // 72px
      '8xl': '6rem', // 96px
    },

    letterSpacing: {
      tight: '-0.03em',
      normal: '0',
      wide: '0.02em',
      wider: '0.05em',
      widest: '0.15em',
      ultra: '0.25em',
      mega: '0.4em',
    },
  },

  // Effects
  effects: {
    // Glassmorphism
    glass: {
      light: 'backdrop-filter: blur(24px); background: hsl(var(--card) / 0.6);',
      medium: 'backdrop-filter: blur(30px); background: hsl(var(--card) / 0.7);',
      heavy: 'backdrop-filter: blur(40px); background: hsl(var(--card) / 0.8);',
    },

    // Shadows - Using CSS variables for dynamic colors
    shadow: {
      sm: '0 2px 8px hsl(var(--foreground) / 0.1)',
      md: '0 8px 24px hsl(var(--foreground) / 0.15)',
      lg: '0 12px 40px hsl(var(--foreground) / 0.2)',
      xl: '0 20px 60px hsl(var(--foreground) / 0.25)',
      '2xl': '0 30px 80px hsl(var(--foreground) / 0.3)',

      // Role-specific shadows use CSS variables
      guru: '0 12px 30px hsl(var(--primary) / 0.4)',
      disciple: '0 12px 30px hsl(var(--primary) / 0.4)',
      ronin: '0 12px 30px hsl(var(--primary) / 0.4)',
    },

    // Borders - Using CSS variables
    border: {
      subtle: '1px solid hsl(var(--border) / 0.5)',
      light: '1px solid hsl(var(--border))',
      medium: '1px solid hsl(var(--border) / 1.2)',
      guru: '1px solid hsl(var(--primary) / 0.35)',
      disciple: '1px solid hsl(var(--primary) / 0.35)',
      ronin: '1px solid hsl(var(--primary) / 0.35)',
    },

    // Shine/Highlight overlays
    shine: {
      subtle: 'linear-gradient(135deg, hsl(0 0% 100% / 0.03) 0%, transparent 60%)',
      medium: 'linear-gradient(135deg, hsl(0 0% 100% / 0.08) 0%, transparent 60%)',
      strong: 'linear-gradient(135deg, hsl(0 0% 100% / 0.15) 0%, transparent 60%)',
    },

    // Noise texture
    noise: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
  },

  // Spacing
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
    '4xl': '6rem', // 96px
    '5xl': '8rem', // 128px
  },

  // Border Radius
  radius: {
    sm: 'var(--radius)', // 0.5rem / 8px
    md: '0.75rem', // 12px
    lg: '1rem', // 16px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '2rem', // 32px
    full: '9999px',
  },

  // Animations
  animations: {
    duration: {
      fast: '200ms',
      normal: '300ms',
      slow: '500ms',
      slower: '700ms',
      slowest: '1000ms',
    },

    easing: {
      smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      linear: 'linear',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
} as const;

// Helper function to get role-specific colors by theme key
// Now all roles use the same CSS variables, which update based on body class
export const getRoleTheme = (themeKey: RoleThemeKey) => {
  return theme.colors[themeKey];
};

// Helper function to get role-specific colors by internal role
export const getRoleThemeByRole = (role: InternalRole) => {
  return theme.colors[getRoleThemeKey(role)];
};

// Helper for gradient text - uses CSS variables
export const gradientText = (themeKey?: RoleThemeKey) => ({
  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

// Helper for glassmorphism card - uses CSS variables
export const glassCard = (themeKey?: RoleThemeKey) => {
  return {
    backdropFilter: 'blur(30px)',
    background: 'hsl(var(--card) / 0.7)',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 25px 50px -12px hsl(var(--foreground) / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.02)',
  };
};

// Helper for role-specific glow effect - uses CSS variables
export const roleGlow = () => ({
  boxShadow: '0 0 20px hsl(var(--primary) / 0.2), 0 0 40px hsl(var(--primary) / 0.1)',
});

// Helper for role-specific border - uses CSS variables
export const roleBorder = () => ({
  borderColor: 'hsl(var(--primary) / 0.3)',
});

// Helper for role-specific gradient background - uses CSS variables
export const roleGradient = () => ({
  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
});
