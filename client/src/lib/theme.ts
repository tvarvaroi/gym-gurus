/**
 * GymGurus Premium Design System
 * Inspired by the luxury login page aesthetic
 */

export const theme = {
  // Color Palette
  colors: {
    // Trainer Theme - Gold/Bronze
    trainer: {
      primary: '#c9a855',
      secondary: '#d4af37',
      tertiary: '#b8935e',
      gradient: 'linear-gradient(135deg, #c9a855, #d4af37, #b8935e)',
      glow: 'rgba(201, 168, 85, 0.08)',
      glowStrong: 'rgba(201, 168, 85, 0.25)',
    },

    // Client Theme - Teal/Cyan
    client: {
      primary: '#0d9488',
      secondary: '#14b8a6',
      tertiary: '#0f766e',
      gradient: 'linear-gradient(135deg, #0d9488, #14b8a6, #0f766e)',
      glow: 'rgba(13, 148, 136, 0.08)',
      glowStrong: 'rgba(13, 148, 136, 0.25)',
    },

    // Neutral Colors
    neutral: {
      platinum: '#e5e4e2',
      white: '#ffffff',
      gray100: '#f5f5f5',
      gray200: '#d4d4d4',
      gray300: '#b3b3b3',
      gray400: '#999999',
      gray500: '#808080',
      gray600: '#666666',
      gray700: '#4a4a4a',
      gray800: '#2a2a2a',
      gray900: '#1a1a1a',
      black: '#000000',
    },

    // Background Colors
    background: {
      primary: '#000000',
      secondary: '#0a0a0a',
      tertiary: '#0f0f0f',
      elevated: 'rgba(15, 15, 15, 0.7)',
      glass: 'rgba(10, 10, 10, 0.8)',
      gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 30%, #0f0f0f 60%, #050505 100%)',
    },
  },

  // Typography
  typography: {
    fonts: {
      display: "'Playfair Display', serif",
      body: "'Cormorant Garamond', serif",
      ui: "'Inter', sans-serif",
    },

    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem', // 60px
      '7xl': '4.5rem',  // 72px
      '8xl': '6rem',    // 96px
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
      light: 'backdrop-filter: blur(24px); background: rgba(15, 15, 15, 0.6);',
      medium: 'backdrop-filter: blur(30px); background: rgba(10, 10, 10, 0.7);',
      heavy: 'backdrop-filter: blur(40px); background: rgba(5, 5, 5, 0.8);',
    },

    // Shadows
    shadow: {
      sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
      md: '0 8px 24px rgba(0, 0, 0, 0.4)',
      lg: '0 12px 40px rgba(0, 0, 0, 0.5)',
      xl: '0 20px 60px rgba(0, 0, 0, 0.6)',
      '2xl': '0 30px 80px rgba(0, 0, 0, 0.7)',

      // Role-specific shadows
      trainer: '0 12px 30px rgba(201, 168, 85, 0.4)',
      client: '0 12px 30px rgba(13, 148, 136, 0.4)',
    },

    // Borders
    border: {
      subtle: '1px solid rgba(255, 255, 255, 0.06)',
      light: '1px solid rgba(255, 255, 255, 0.08)',
      medium: '1px solid rgba(255, 255, 255, 0.12)',
      trainer: '1px solid rgba(201, 168, 85, 0.35)',
      client: '1px solid rgba(13, 148, 136, 0.35)',
    },

    // Shine/Highlight overlays
    shine: {
      subtle: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
      medium: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
      strong: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 60%)',
    },

    // Noise texture
    noise: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
  },

  // Spacing
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
    '4xl': '6rem',   // 96px
    '5xl': '8rem',   // 128px
  },

  // Border Radius
  radius: {
    sm: '0.5rem',    // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '2rem',   // 32px
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

// Helper function to get role-specific colors
export const getRoleTheme = (role: 'trainer' | 'client') => {
  return theme.colors[role];
};

// Helper for gradient text
export const gradientText = (role: 'trainer' | 'client') => ({
  background: theme.colors[role].gradient,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

// Helper for glassmorphism card
export const glassCard = (role?: 'trainer' | 'client') => {
  const baseStyle = {
    backdropFilter: 'blur(30px)',
    background: 'rgba(15, 15, 15, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
  };

  if (role === 'trainer') {
    return {
      ...baseStyle,
      background: 'linear-gradient(135deg, rgba(201, 168, 85, 0.08), rgba(184, 147, 94, 0.06))',
      border: '1px solid rgba(201, 168, 85, 0.25)',
      boxShadow: '0 25px 50px -12px rgba(201, 168, 85, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    };
  }

  if (role === 'client') {
    return {
      ...baseStyle,
      background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08), rgba(20, 184, 166, 0.06))',
      border: '1px solid rgba(13, 148, 136, 0.25)',
      boxShadow: '0 25px 50px -12px rgba(13, 148, 136, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    };
  }

  return baseStyle;
};
