import type { Variants, Transition } from 'framer-motion';

/**
 * Premium animation presets for luxury calculator UI
 * Uses smooth easing curves for elegant transitions
 */

// Luxury easing curve (similar to iOS animations)
export const luxuryEasing = [0.22, 1, 0.36, 1];

// Premium transition with luxury easing
export const premiumTransition: Transition = {
  duration: 0.5,
  ease: luxuryEasing,
};

// Fast premium transition for quick interactions
export const fastPremiumTransition: Transition = {
  duration: 0.3,
  ease: luxuryEasing,
};

/**
 * Fade in from bottom with slide up
 */
export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: premiumTransition,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: fastPremiumTransition,
  },
};

/**
 * Fade in from top with slide down
 */
export const fadeInDown: Variants = {
  initial: {
    opacity: 0,
    y: -20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: premiumTransition,
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: fastPremiumTransition,
  },
};

/**
 * Simple fade in/out
 */
export const fadeIn: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: premiumTransition,
  },
  exit: {
    opacity: 0,
    transition: fastPremiumTransition,
  },
};

/**
 * Scale up with fade for emphasis
 */
export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: premiumTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: fastPremiumTransition,
  },
};

/**
 * Stagger children animations for lists/grids
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

/**
 * Fast stagger for dense UIs
 */
export const fastStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

/**
 * Scale on hover for interactive elements
 */
export const scaleOnHover = {
  whileHover: {
    scale: 1.05,
    transition: fastPremiumTransition,
  },
  whileTap: {
    scale: 0.98,
    transition: { duration: 0.1, ease: luxuryEasing },
  },
};

/**
 * Lift up on hover (for cards)
 */
export const liftOnHover = {
  whileHover: {
    y: -8,
    scale: 1.02,
    transition: premiumTransition,
  },
  whileTap: {
    y: -4,
    scale: 1.01,
    transition: { duration: 0.1, ease: luxuryEasing },
  },
};

/**
 * Subtle scale on hover
 */
export const subtleScale = {
  whileHover: {
    scale: 1.02,
    transition: fastPremiumTransition,
  },
  whileTap: {
    scale: 0.99,
    transition: { duration: 0.1, ease: luxuryEasing },
  },
};

/**
 * Glow pulse animation for premium elements
 */
export const glowPulse: Variants = {
  animate: {
    boxShadow: [
      '0 0 20px hsl(var(--primary) / 0.2), 0 0 40px hsl(var(--primary) / 0.1)',
      '0 0 30px hsl(var(--primary) / 0.3), 0 0 60px hsl(var(--primary) / 0.15)',
      '0 0 20px hsl(var(--primary) / 0.2), 0 0 40px hsl(var(--primary) / 0.1)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Shimmer effect for loading states
 */
export const shimmer: Variants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Slide in from right
 */
export const slideInRight: Variants = {
  initial: {
    opacity: 0,
    x: 50,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: premiumTransition,
  },
  exit: {
    opacity: 0,
    x: -50,
    transition: fastPremiumTransition,
  },
};

/**
 * Slide in from left
 */
export const slideInLeft: Variants = {
  initial: {
    opacity: 0,
    x: -50,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: premiumTransition,
  },
  exit: {
    opacity: 0,
    x: 50,
    transition: fastPremiumTransition,
  },
};

/**
 * Rotate and scale for icon interactions
 */
export const rotateScale = {
  whileHover: {
    rotate: 360,
    scale: 1.1,
    transition: {
      duration: 0.6,
      ease: luxuryEasing,
    },
  },
};

/**
 * Gentle bounce on mount
 */
export const bounceIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.3,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

/**
 * Number counter animation
 */
export const numberCounter = (from: number, to: number, duration = 0.6) => ({
  initial: { value: from },
  animate: {
    value: to,
    transition: {
      duration,
      ease: luxuryEasing,
    },
  },
});

/**
 * Progress bar fill animation
 */
export const progressFill = (duration = 0.8) => ({
  initial: { scaleX: 0 },
  animate: {
    scaleX: 1,
    transition: {
      duration,
      ease: luxuryEasing,
    },
  },
});
