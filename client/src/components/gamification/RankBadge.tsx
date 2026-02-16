import { motion } from 'framer-motion';
import { Crown, Star, Flame, Sparkles, Zap, Trophy, type LucideIcon } from 'lucide-react';
import { RANKS, getRankForLevel, getNextRank, getLevelsToNextRank, type Rank } from '@/lib/constants/xpRewards';

// Re-export for consumers that imported from here
export { RANKS, getRankForLevel, getNextRank, getLevelsToNextRank };

// Icon mapping for ranks (kept here since these are React components)
const RANK_ICONS: Record<string, LucideIcon | null> = {
  'Rookie': Star,
  'Grinder': Zap,
  'Beast Mode': Flame,
  'Main Character': Crown,
  'Built Different': Sparkles,
  'GOATED': Trophy,
};

function getIconForRank(rank: Rank): LucideIcon | null {
  return RANK_ICONS[rank.name] || null;
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
  const IconComponent = getIconForRank(rank);

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
          className={`h-full`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            background: `linear-gradient(90deg,
              ${rank.color.includes('gray') ? 'hsl(0 0% 61%)' :
              rank.color.includes('green') ? 'hsl(142 71% 45%)' :
              rank.color.includes('blue') ? 'hsl(221 83% 53%)' :
              rank.color.includes('yellow') ? 'hsl(48 96% 53%)' :
              rank.color.includes('orange') ? 'hsl(25 95% 53%)' :
              rank.color.includes('purple') ? 'hsl(271 91% 65%)' :
              rank.color.includes('indigo') ? 'hsl(239 84% 67%)' :
              rank.color.includes('pink') ? 'hsl(330 81% 60%)' :
              rank.color.includes('cyan') ? 'hsl(187 96% 42%)' :
              'hsl(38 92% 50%)'},
              ${nextRank.color.includes('gray') ? 'hsl(0 0% 61%)' :
              nextRank.color.includes('green') ? 'hsl(142 71% 45%)' :
              nextRank.color.includes('blue') ? 'hsl(221 83% 53%)' :
              nextRank.color.includes('yellow') ? 'hsl(48 96% 53%)' :
              nextRank.color.includes('orange') ? 'hsl(25 95% 53%)' :
              nextRank.color.includes('purple') ? 'hsl(271 91% 65%)' :
              nextRank.color.includes('indigo') ? 'hsl(239 84% 67%)' :
              nextRank.color.includes('pink') ? 'hsl(330 81% 60%)' :
              nextRank.color.includes('cyan') ? 'hsl(187 96% 42%)' :
              'hsl(38 92% 50%)'})`,
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
  oldRank: Rank;
  newRank: Rank;
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
