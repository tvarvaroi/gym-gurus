import { motion } from 'framer-motion';
import { Lock, Trophy, Star, Flame, Target, Dumbbell, Users, Scale, Compass, Utensils } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface AchievementCardProps {
  name: string;
  description: string;
  category: string;
  xpReward: number;
  earned: boolean;
  earnedAt?: Date | string | null;
  progress: number;
  isHidden?: boolean;
  badgeIcon?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

// Icon mapping for achievement badges
const BADGE_ICONS: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  flame: Flame,
  target: Target,
  dumbbell: Dumbbell,
  users: Users,
  scale: Scale,
  compass: Compass,
  utensils: Utensils,
  // Add more as needed
};

// Category colors
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  consistency: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-300' },
  strength: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-300' },
  volume: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300' },
  exploration: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-300' },
  social: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-300' },
  nutrition: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-300' },
};

export function AchievementCard({
  name,
  description,
  category,
  xpReward,
  earned,
  earnedAt,
  progress,
  isHidden = false,
  badgeIcon = 'trophy',
  size = 'md',
  onClick,
}: AchievementCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const IconComponent = BADGE_ICONS[badgeIcon] || Trophy;
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.consistency;

  const sizeClasses = {
    sm: { card: 'p-3', icon: 'w-8 h-8', title: 'text-sm', desc: 'text-xs' },
    md: { card: 'p-4', icon: 'w-12 h-12', title: 'text-base', desc: 'text-sm' },
    lg: { card: 'p-6', icon: 'w-16 h-16', title: 'text-lg', desc: 'text-base' },
  };

  const { card, icon, title, desc } = sizeClasses[size];

  // If hidden and not earned, show locked state
  if (isHidden && !earned) {
    return (
      <motion.div
        className={`relative rounded-xl border-2 border-dashed border-muted ${card} opacity-50`}
        whileHover={{ scale: 1.02 }}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className={`${icon} rounded-full bg-muted flex items-center justify-center`}>
            <Lock className="w-1/2 h-1/2 text-muted-foreground" />
          </div>
          <div>
            <h4 className={`font-bold ${title}`}>???</h4>
            <p className={`${desc} text-muted-foreground`}>Hidden Achievement</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`relative rounded-xl border-2 ${earned ? colors.border : 'border-muted'} ${card} ${
        earned ? colors.bg : 'bg-card'
      } ${onClick ? 'cursor-pointer' : ''}`}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      onClick={onClick}
    >
      {/* Earned Glow Effect */}
      {earned && (
        <motion.div
          className="absolute inset-0 rounded-xl opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${colors.text.replace('text-', '')} 0%, transparent 70%)`,
          }}
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity }}
        />
      )}

      <div className="flex items-start gap-3 relative z-10">
        {/* Badge Icon */}
        <div
          className={`${icon} rounded-full flex items-center justify-center ${
            earned ? colors.bg : 'bg-muted'
          }`}
        >
          <IconComponent
            className={`w-1/2 h-1/2 ${earned ? colors.text : 'text-muted-foreground'}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`font-bold ${title} truncate ${earned ? colors.text : ''}`}>{name}</h4>
            <span className={`text-xs font-medium ${colors.text}`}>+{xpReward} XP</span>
          </div>

          <p className={`${desc} text-muted-foreground mt-0.5 line-clamp-2`}>{description}</p>

          {/* Progress Bar (if not earned) */}
          {!earned && progress > 0 && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
              <span className="text-xs text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
          )}

          {/* Earned Date */}
          {earned && earnedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Earned{' '}
              {new Date(earnedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Achievement unlock popup
interface AchievementUnlockModalProps {
  achievement: {
    name: string;
    description: string;
    category: string;
    xpReward: number;
    badgeIcon?: string;
  };
  onClose: () => void;
}

export function AchievementUnlockModal({ achievement, onClose }: AchievementUnlockModalProps) {
  const IconComponent = BADGE_ICONS[achievement.badgeIcon || 'trophy'] || Trophy;
  const colors = CATEGORY_COLORS[achievement.category] || CATEGORY_COLORS.consistency;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card p-8 rounded-2xl text-center max-w-sm mx-4 relative overflow-hidden"
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${colors.text.replace('text-', '')} 0%, transparent 70%)`,
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <motion.div
            className={`w-20 h-20 mx-auto mb-4 rounded-full ${colors.bg} flex items-center justify-center`}
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, -5, 5, 0],
            }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <IconComponent className={`w-10 h-10 ${colors.text}`} />
          </motion.div>

          <h2 className="text-2xl font-bold mb-2">Achievement Unlocked!</h2>
          <h3 className={`text-xl font-bold ${colors.text} mb-2`}>{achievement.name}</h3>
          <p className="text-muted-foreground mb-4">{achievement.description}</p>

          <div className="flex items-center justify-center gap-2 mb-6">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="text-lg font-bold text-yellow-500">+{achievement.xpReward} XP</span>
          </div>

          <button
            onClick={onClose}
            className={`w-full py-3 ${colors.bg} ${colors.text} rounded-lg font-bold border-2 ${colors.border}`}
          >
            Awesome!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default AchievementCard;
