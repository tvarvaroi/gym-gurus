import { motion } from 'framer-motion';
import { Crown, Star, Flame, Sparkles, Zap, Trophy } from 'lucide-react';

// Gen Z rank system based on level
export const RANKS = [
  { minLevel: 1, name: 'NPC', emoji: '🤖', icon: null, color: 'text-gray-500', bgColor: 'bg-gray-100', borderColor: 'border-gray-300' },
  { minLevel: 5, name: 'Newbie', emoji: '🌱', icon: null, color: 'text-green-500', bgColor: 'bg-green-100', borderColor: 'border-green-300' },
  { minLevel: 10, name: 'Rookie', emoji: '⭐', icon: Star, color: 'text-blue-500', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' },
  { minLevel: 20, name: 'Grinder', emoji: '💪', icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-300' },
  { minLevel: 30, name: 'Beast Mode', emoji: '🔥', icon: Flame, color: 'text-orange-500', bgColor: 'bg-orange-100', borderColor: 'border-orange-300' },
  { minLevel: 40, name: 'Sigma', emoji: '🐺', icon: null, color: 'text-purple-500', bgColor: 'bg-purple-100', borderColor: 'border-purple-300' },
  { minLevel: 50, name: 'Chad', emoji: '🗿', icon: null, color: 'text-indigo-500', bgColor: 'bg-indigo-100', borderColor: 'border-indigo-300' },
  { minLevel: 60, name: 'Main Character', emoji: '👑', icon: Crown, color: 'text-pink-500', bgColor: 'bg-pink-100', borderColor: 'border-pink-300' },
  { minLevel: 75, name: 'Built Different', emoji: '💎', icon: Sparkles, color: 'text-cyan-500', bgColor: 'bg-cyan-100', borderColor: 'border-cyan-300' },
  { minLevel: 100, name: 'GOATED', emoji: '🐐', icon: Trophy, color: 'text-amber-500', bgColor: 'bg-gradient-to-r from-amber-100 to-yellow-100', borderColor: 'border-amber-400' },
] as const;

export function getRankForLevel(level: number) {
  // Find the highest rank that the user qualifies for
  const rank = [...RANKS].reverse().find((r) => level >= r.minLevel);
  return rank || RANKS[0];
}

export function getNextRank(level: number) {
  const currentRankIndex = RANKS.findIndex((r, i) =>
    level >= r.minLevel && (i === RANKS.length - 1 || level < RANKS[i + 1].minLevel)
  );
  return RANKS[currentRankIndex + 1] || null;
}

export function getLevelsToNextRank(level: number) {
  const nextRank = getNextRank(level);
  if (!nextRank) return null;
  return nextRank.minLevel - level;
}

interface RankBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showNextRank?: boolean;
  animated?: boolean;
}

export function RankBadge({
  level,
  size = 'md',
  showLabel = true,
  showNextRank = false,
  animated = true,
}: RankBadgeProps) {
  const rank = getRankForLevel(level);
  const nextRank = getNextRank(level);
  const levelsToNext = getLevelsToNextRank(level);
  const IconComponent = rank.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const badge = (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full border-2
        ${sizeClasses[size]}
        ${rank.bgColor}
        ${rank.borderColor}
        font-medium
      `}
    >
      <span className="text-lg">{rank.emoji}</span>
      {IconComponent && <IconComponent className={`${iconSizes[size]} ${rank.color}`} />}
      {showLabel && <span className={rank.color}>{rank.name}</span>}
    </div>
  );

  if (!animated) {
    return (
      <div>
        {badge}
        {showNextRank && nextRank && (
          <p className="text-xs text-muted-foreground mt-1">
            {levelsToNext} levels to {nextRank.name} {nextRank.emoji}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {badge}
      </motion.div>
      {showNextRank && nextRank && (
        <motion.p
          className="text-xs text-muted-foreground mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {levelsToNext} levels to {nextRank.name} {nextRank.emoji}
        </motion.p>
      )}
    </div>
  );
}

// Compact rank display for leaderboards
interface CompactRankProps {
  level: number;
}

export function CompactRank({ level }: CompactRankProps) {
  const rank = getRankForLevel(level);
  return (
    <span className="inline-flex items-center gap-1">
      <span>{rank.emoji}</span>
      <span className={`text-xs font-medium ${rank.color}`}>{rank.name}</span>
    </span>
  );
}

// Rank progress component showing progress to next rank
interface RankProgressProps {
  level: number;
}

export function RankProgress({ level }: RankProgressProps) {
  const rank = getRankForLevel(level);
  const nextRank = getNextRank(level);

  if (!nextRank) {
    // At max rank
    return (
      <div className="p-4 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{rank.emoji}</span>
          <div>
            <p className={`font-bold text-lg ${rank.color}`}>{rank.name}</p>
            <p className="text-sm text-muted-foreground">Maximum rank achieved!</p>
          </div>
          <Trophy className="w-8 h-8 text-amber-500 ml-auto" />
        </div>
      </div>
    );
  }

  // Calculate progress between current and next rank
  const currentRankIndex = RANKS.findIndex((r) => r.name === rank.name);
  const currentRankMin = rank.minLevel;
  const nextRankMin = nextRank.minLevel;
  const progress = ((level - currentRankMin) / (nextRankMin - currentRankMin)) * 100;

  return (
    <div className="p-4 bg-card rounded-xl border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{rank.emoji}</span>
          <span className={`font-bold ${rank.color}`}>{rank.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${nextRank.color}`}>{nextRank.name}</span>
          <span className="text-2xl">{nextRank.emoji}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${rank.bgColor.replace('100', '500')}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            background: `linear-gradient(90deg, ${
              rank.color.includes('gray') ? '#9ca3af' :
              rank.color.includes('green') ? '#22c55e' :
              rank.color.includes('blue') ? '#3b82f6' :
              rank.color.includes('yellow') ? '#eab308' :
              rank.color.includes('orange') ? '#f97316' :
              rank.color.includes('purple') ? '#a855f7' :
              rank.color.includes('indigo') ? '#6366f1' :
              rank.color.includes('pink') ? '#ec4899' :
              rank.color.includes('cyan') ? '#06b6d4' :
              '#f59e0b'
            }, ${
              nextRank.color.includes('gray') ? '#9ca3af' :
              nextRank.color.includes('green') ? '#22c55e' :
              nextRank.color.includes('blue') ? '#3b82f6' :
              nextRank.color.includes('yellow') ? '#eab308' :
              nextRank.color.includes('orange') ? '#f97316' :
              nextRank.color.includes('purple') ? '#a855f7' :
              nextRank.color.includes('indigo') ? '#6366f1' :
              nextRank.color.includes('pink') ? '#ec4899' :
              nextRank.color.includes('cyan') ? '#06b6d4' :
              '#f59e0b'
            })`,
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground mt-2 text-center">
        Level {level} • {getLevelsToNextRank(level)} levels to {nextRank.name}
      </p>
    </div>
  );
}

// Rank up animation/celebration
interface RankUpAnimationProps {
  oldRank: typeof RANKS[number];
  newRank: typeof RANKS[number];
  onComplete?: () => void;
}

export function RankUpAnimation({ oldRank, newRank, onComplete }: RankUpAnimationProps) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      <motion.div
        className="text-center p-8 rounded-2xl bg-gradient-to-br from-background to-muted max-w-sm mx-4"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {/* Old rank fading out */}
        <motion.div
          className="text-4xl mb-4 opacity-50"
          initial={{ scale: 1, y: 0 }}
          animate={{ scale: 0.5, y: -20, opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {oldRank.emoji}
        </motion.div>

        {/* Arrow */}
        <motion.div
          className="text-2xl mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          ⬆️
        </motion.div>

        {/* New rank coming in */}
        <motion.div
          className="text-6xl mb-4"
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >
          {newRank.emoji}
        </motion.div>

        <motion.p
          className="text-2xl font-bold mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          RANK UP!
        </motion.p>

        <motion.p
          className={`text-xl font-bold ${newRank.color}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          You're now {newRank.name}!
        </motion.p>

        <motion.p
          className="text-sm text-muted-foreground mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          Tap to continue
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

export default RankBadge;
