import { motion } from 'framer-motion';
import { Star, Zap } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

// Get badge color based on level ranges
function getLevelColor(level: number): { bg: string; border: string; text: string; glow: string } {
  if (level >= 100) {
    return {
      bg: 'from-purple-500 to-pink-500',
      border: 'border-purple-400',
      text: 'text-purple-100',
      glow: 'shadow-purple-500/50',
    };
  }
  if (level >= 75) {
    return {
      bg: 'from-yellow-400 to-orange-500',
      border: 'border-yellow-400',
      text: 'text-yellow-100',
      glow: 'shadow-yellow-500/50',
    };
  }
  if (level >= 50) {
    return {
      bg: 'from-blue-500 to-cyan-500',
      border: 'border-blue-400',
      text: 'text-blue-100',
      glow: 'shadow-blue-500/50',
    };
  }
  if (level >= 25) {
    return {
      bg: 'from-green-500 to-emerald-500',
      border: 'border-green-400',
      text: 'text-green-100',
      glow: 'shadow-green-500/50',
    };
  }
  if (level >= 10) {
    return {
      bg: 'from-gray-500 to-gray-600',
      border: 'border-gray-400',
      text: 'text-gray-100',
      glow: 'shadow-gray-500/50',
    };
  }
  return {
    bg: 'from-stone-400 to-stone-500',
    border: 'border-stone-300',
    text: 'text-stone-100',
    glow: 'shadow-stone-500/30',
  };
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
};

export function LevelBadge({ level, size = 'md', showLabel = false, animated = true }: LevelBadgeProps) {
  const colors = getLevelColor(level);
  const isHighLevel = level >= 50;

  const badge = (
    <div
      className={`
        relative ${sizeClasses[size]} rounded-full
        bg-gradient-to-br ${colors.bg}
        border-2 ${colors.border}
        flex items-center justify-center
        font-bold ${colors.text}
        shadow-lg ${colors.glow}
      `}
    >
      {/* Inner glow effect */}
      <div className="absolute inset-0 rounded-full bg-white/20 blur-sm" />

      {/* Level number */}
      <span className="relative z-10">{level}</span>

      {/* Stars for high levels */}
      {isHighLevel && (
        <>
          <Star
            className={`absolute -top-1 -right-1 ${size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} text-yellow-300 fill-yellow-300`}
          />
          {level >= 75 && (
            <Star
              className={`absolute -top-1 -left-1 ${size === 'lg' ? 'w-3 h-3' : 'w-2 h-2'} text-yellow-300 fill-yellow-300`}
            />
          )}
          {level >= 100 && (
            <Zap
              className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} text-yellow-300 fill-yellow-300`}
            />
          )}
        </>
      )}
    </div>
  );

  if (!animated) {
    return (
      <div className={showLabel ? 'flex items-center gap-2' : ''}>
        {badge}
        {showLabel && <span className="text-sm font-medium text-muted-foreground">Level {level}</span>}
      </div>
    );
  }

  return (
    <div className={showLabel ? 'flex items-center gap-2' : ''}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {badge}
      </motion.div>
      {showLabel && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm font-medium text-muted-foreground"
        >
          Level {level}
        </motion.span>
      )}
    </div>
  );
}

// Level up animation component
export function LevelUpAnimation({ newLevel, onComplete }: { newLevel: number; onComplete?: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  const colors = getLevelColor(newLevel);

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      <motion.div
        className="text-center"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {/* Burst effect */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r ${colors.bg} rounded-full blur-3xl opacity-50`}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 1, repeat: prefersReducedMotion ? 0 : Infinity }}
        />

        <motion.div
          className="relative"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{ duration: 0.5, repeat: prefersReducedMotion ? 0 : Infinity }}
        >
          <LevelBadge level={newLevel} size="lg" animated={false} />
        </motion.div>

        <motion.p
          className="text-4xl font-bold text-white mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          LEVEL UP!
        </motion.p>

        <motion.p
          className="text-xl text-white/80 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          You reached Level {newLevel}
        </motion.p>

        <motion.p
          className="text-sm text-white/60 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Tap to continue
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

export default LevelBadge;
