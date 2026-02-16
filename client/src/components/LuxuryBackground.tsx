/**
 * Luxury Background Component
 * Provides consistent premium background effects across all pages
 */

import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
export function LuxuryBackground({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'subtle' }) {
  const { isClient } = useUser();

  // Role-specific colors using CSS variables
  // Use static role colors for consistency
  const roleColors = isClient
    ? {
        primary: 'hsl(var(--color-disciple))',
        secondary: 'hsl(var(--color-disciple-secondary))',
        glow: 'hsl(var(--color-disciple) / 0.08)'
      }
    : {
        primary: 'hsl(var(--color-guru))',
        secondary: 'hsl(var(--color-guru-secondary))',
        glow: 'hsl(var(--color-guru) / 0.08)'
      };

  return (
    <div className="relative min-h-screen">
      {/* Dark Base Background */}
      <div
        className="fixed inset-0 -z-50"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(10, 10, 10, 0.95) 100%)',
        }}
      />

      {/* Role-Specific Ambient Glows (entrance-only, no infinite animations) */}
      {variant === 'default' && (
        <>
          <motion.div
            className="fixed w-[600px] h-[600px] rounded-full pointer-events-none -z-40"
            style={{
              background: `radial-gradient(circle, ${roleColors.glow} 0%, transparent 70%)`,
              top: '10%',
              left: '10%',
              filter: 'blur(120px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          <motion.div
            className="fixed w-[600px] h-[600px] rounded-full pointer-events-none -z-40"
            style={{
              background: `radial-gradient(circle, ${roleColors.glow} 0%, transparent 70%)`,
              bottom: '10%',
              right: '10%',
              filter: 'blur(120px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
          />
        </>
      )}

      {/* Subtle Noise Texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none -z-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Static accent dots (replaced 12 infinite particle animations) */}
      {variant === 'default' && [...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="fixed rounded-full pointer-events-none -z-30"
          style={{
            width: '1px',
            height: '1px',
            background: i % 2 === 0
              ? `linear-gradient(135deg, ${roleColors.primary}, ${roleColors.secondary})`
              : 'linear-gradient(135deg, hsl(var(--achievement-silver)), hsl(0 0% 100%))',
            boxShadow: i % 2 === 0
              ? `0 0 8px ${roleColors.glow}`
              : '0 0 5px hsl(var(--achievement-silver) / 0.3)',
            left: `${15 + i * 14}%`,
            top: `${10 + i * 15}%`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1.5, delay: i * 0.2 }}
        />
      ))}

      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
}
