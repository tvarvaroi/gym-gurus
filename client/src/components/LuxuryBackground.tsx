/**
 * Luxury Background Component
 * Provides consistent premium background effects across all pages
 */

import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';

export function LuxuryBackground({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'subtle' }) {
  const { isClient } = useUser();

  // Role-specific colors
  const roleColors = isClient
    ? { primary: '#0d9488', secondary: '#14b8a6', glow: 'rgba(13, 148, 136, 0.08)' }
    : { primary: '#c9a855', secondary: '#d4af37', glow: 'rgba(201, 168, 85, 0.08)' };

  return (
    <div className="relative min-h-screen">
      {/* Dark Base Background */}
      <div
        className="fixed inset-0 -z-50"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(10, 10, 10, 0.95) 100%)',
        }}
      />

      {/* Animated Role-Specific Ambient Glows */}
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
            animate={{
              opacity: [0.3, 0.5, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="fixed w-[600px] h-[600px] rounded-full pointer-events-none -z-40"
            style={{
              background: `radial-gradient(circle, ${roleColors.glow} 0%, transparent 70%)`,
              bottom: '10%',
              right: '10%',
              filter: 'blur(120px)',
            }}
            animate={{
              opacity: [0.3, 0.5, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
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

      {/* Floating Luxury Particles */}
      {variant === 'default' && [...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="fixed rounded-full pointer-events-none -z-30"
          style={{
            width: Math.random() > 0.7 ? '1.5px' : '1px',
            height: Math.random() > 0.7 ? '1.5px' : '1px',
            background: i % 2 === 0
              ? `linear-gradient(135deg, ${roleColors.primary}, ${roleColors.secondary})`
              : 'linear-gradient(135deg, #e5e4e2, #ffffff)',
            boxShadow: i % 2 === 0
              ? `0 0 8px ${roleColors.primary}40`
              : '0 0 5px rgba(229, 228, 226, 0.3)',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -120, 0],
            opacity: [0, 0.5, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 8,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
}
