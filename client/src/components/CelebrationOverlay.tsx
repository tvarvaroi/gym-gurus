import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Trophy, Star, Sparkles, Award, Flame, Zap } from "lucide-react";

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
}

interface CelebrationOverlayProps {
  show: boolean;
  title: string;
  subtitle?: string;
  icon?: 'trophy' | 'star' | 'sparkles' | 'award' | 'flame' | 'zap';
  onComplete?: () => void;
  duration?: number;
}

const ICONS = {
  trophy: Trophy,
  star: Star,
  sparkles: Sparkles,
  award: Award,
  flame: Flame,
  zap: Zap,
};

const CONFETTI_COLORS = [
  '#06b6d4', // cyan-500
  '#14b8a6', // teal-500
  '#0d9488', // teal-600
  '#fbbf24', // amber-400
  '#f59e0b', // amber-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
];

export function CelebrationOverlay({
  show,
  title,
  subtitle,
  icon = 'trophy',
  onComplete,
  duration = 3000,
}: CelebrationOverlayProps) {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const Icon = ICONS[icon];

  useEffect(() => {
    if (show) {
      // Generate confetti particles
      const particles: ConfettiParticle[] = [];
      for (let i = 0; i < 50; i++) {
        particles.push({
          id: i,
          x: Math.random() * 100,
          y: -10,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: Math.random() * 10 + 5,
          rotation: Math.random() * 360,
          velocityX: (Math.random() - 0.5) * 2,
          velocityY: Math.random() * 2 + 1,
        });
      }
      setConfetti(particles);

      // Auto-hide after duration
      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setConfetti([]);
    }
  }, [show, duration, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop with gradient */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Confetti */}
          {confetti.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                backgroundColor: particle.color,
                left: `${particle.x}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
              }}
              initial={{
                y: particle.y,
                rotate: particle.rotation,
                opacity: 1,
              }}
              animate={{
                y: [particle.y, window.innerHeight + 50],
                x: [0, particle.velocityX * 100],
                rotate: [particle.rotation, particle.rotation + 720],
                opacity: [1, 0.8, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                ease: "easeIn",
              }}
            />
          ))}

          {/* Central celebration card */}
          <motion.div
            className="relative z-10 bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-xl rounded-3xl shadow-premium-lg border border-cyan-500/30 p-8 max-w-md mx-4 pointer-events-auto"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-teal-500/20 to-purple-500/20 rounded-3xl blur-2xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Content */}
            <div className="relative z-10 text-center space-y-4">
              {/* Icon with animation */}
              <motion.div
                className="flex justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200,
                  damping: 12,
                }}
              >
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full blur-2xl opacity-50"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <div className="relative bg-gradient-to-br from-cyan-500 via-teal-500 to-cyan-400 p-6 rounded-full shadow-premium-lg">
                    <Icon className="h-12 w-12 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>

              {/* Title with gradient and animation */}
              <motion.h2
                className="text-3xl font-bold bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {title}
              </motion.h2>

              {/* Subtitle */}
              {subtitle && (
                <motion.p
                  className="text-lg text-muted-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {subtitle}
                </motion.p>
              )}

              {/* Sparkle effects */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  style={{
                    top: `${20 + Math.sin(i * 60 * (Math.PI / 180)) * 100}px`,
                    left: `${50 + Math.cos(i * 60 * (Math.PI / 180)) * 100}px`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: 0.5 + i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Additional sparkle burst */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 0,
                }}
                animate={{
                  x: Math.cos((i * 30 * Math.PI) / 180) * 300,
                  y: Math.sin((i * 30 * Math.PI) / 180) * 300,
                  opacity: 0,
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.3,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for easy celebration triggering
export function useCelebration() {
  const [celebration, setCelebration] = useState<{
    show: boolean;
    title: string;
    subtitle?: string;
    icon?: 'trophy' | 'star' | 'sparkles' | 'award' | 'flame' | 'zap';
  }>({
    show: false,
    title: '',
  });

  const celebrate = (
    title: string,
    subtitle?: string,
    icon?: 'trophy' | 'star' | 'sparkles' | 'award' | 'flame' | 'zap'
  ) => {
    setCelebration({ show: true, title, subtitle, icon });
  };

  const hide = () => {
    setCelebration((prev) => ({ ...prev, show: false }));
  };

  return {
    celebration,
    celebrate,
    hide,
  };
}
