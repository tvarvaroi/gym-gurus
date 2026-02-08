import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { getXpToNextLevel, getGenZRank } from '@/lib/constants/xpRewards';

interface XPBarProps {
  totalXp: number;
  currentLevel: number;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export function XPBar({
  totalXp,
  currentLevel,
  showDetails = true,
  size = 'md',
  animate = true,
}: XPBarProps) {
  const { current, required, progress } = getXpToNextLevel(totalXp);
  const rank = getGenZRank(currentLevel);

  const sizeClasses = {
    sm: { bar: 'h-2', text: 'text-xs', icon: 'w-3 h-3' },
    md: { bar: 'h-3', text: 'text-sm', icon: 'w-4 h-4' },
    lg: { bar: 'h-4', text: 'text-base', icon: 'w-5 h-5' },
  };

  const { bar, text, icon } = sizeClasses[size];

  return (
    <div className="w-full">
      {showDetails && (
        <div className={`flex items-center justify-between mb-1 ${text}`}>
          <div className="flex items-center gap-2">
            <span className={rank.color}>{rank.emoji}</span>
            <span className="font-bold">Level {currentLevel}</span>
            <span className="text-muted-foreground">{rank.rank}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className={`${icon} text-yellow-500`} />
            <span className="font-medium">
              {current.toLocaleString()} / {required.toLocaleString()} XP
            </span>
          </div>
        </div>
      )}

      {/* XP Bar */}
      <div className={`w-full bg-secondary rounded-full overflow-hidden ${bar}`}>
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"
          initial={animate ? { width: 0 } : { width: `${progress}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {showDetails && (
        <div className={`flex justify-between mt-1 ${text} text-muted-foreground`}>
          <span>{Math.round(progress)}% to Level {currentLevel + 1}</span>
          <span>{(required - current).toLocaleString()} XP needed</span>
        </div>
      )}
    </div>
  );
}

// Compact XP display for headers/sidebars
export function XPBadge({ totalXp, currentLevel }: { totalXp: number; currentLevel: number }) {
  const rank = getGenZRank(currentLevel);
  const { progress } = getXpToNextLevel(totalXp);

  return (
    <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full">
      <span className="text-lg">{rank.emoji}</span>
      <div className="flex flex-col">
        <span className="text-xs font-bold">Lv.{currentLevel}</span>
        <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Level up celebration component
interface LevelUpCelebrationProps {
  newLevel: number;
  onClose: () => void;
}

export function LevelUpCelebration({ newLevel, onClose }: LevelUpCelebrationProps) {
  const rank = getGenZRank(newLevel);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card p-8 rounded-2xl text-center max-w-sm mx-4"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="text-6xl mb-4"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -10, 10, 0],
          }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          {rank.emoji}
        </motion.div>

        <h2 className="text-3xl font-bold mb-2">LEVEL UP!</h2>
        <p className="text-xl text-muted-foreground mb-4">
          You've reached <span className={`font-bold ${rank.color}`}>Level {newLevel}</span>
        </p>

        <div className={`text-lg font-bold ${rank.color} mb-4`}>{rank.rank}</div>

        <p className="text-sm text-muted-foreground mb-6">{rank.description}</p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold"
        >
          Keep Grinding! 💪
        </button>
      </motion.div>
    </motion.div>
  );
}

export default XPBar;
