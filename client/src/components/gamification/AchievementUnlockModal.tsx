import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, X, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  unlockedAt?: Date;
}

interface AchievementUnlockModalProps {
  achievement: Achievement | null;
  isOpen: boolean;
  onClose: () => void;
  onShare?: () => void;
}

const rarityConfig = {
  common: {
    label: 'Common',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    glowColor: 'rgba(156, 163, 175, 0.3)',
    gradient: 'from-gray-400 to-gray-500',
  },
  uncommon: {
    label: 'Uncommon',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-400',
    glowColor: 'rgba(34, 197, 94, 0.3)',
    gradient: 'from-green-400 to-emerald-500',
  },
  rare: {
    label: 'Rare',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-400',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    gradient: 'from-blue-400 to-cyan-500',
  },
  epic: {
    label: 'Epic',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-400',
    glowColor: 'rgba(147, 51, 234, 0.5)',
    gradient: 'from-purple-400 to-pink-500',
  },
  legendary: {
    label: 'Legendary',
    color: 'text-amber-600',
    bgColor: 'bg-gradient-to-br from-amber-100 to-yellow-100',
    borderColor: 'border-amber-400',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    gradient: 'from-amber-400 via-yellow-400 to-orange-500',
  },
};

export function AchievementUnlockModal({
  achievement,
  isOpen,
  onClose,
  onShare,
}: AchievementUnlockModalProps) {
  const prefersReducedMotion = useReducedMotion();
  if (!achievement) return null;

  const config = rarityConfig[achievement.rarity];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-md mx-4"
            initial={{ scale: 0.5, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.5, y: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 z-20 p-2 bg-background rounded-full shadow-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Card with glow effect */}
            <div
              className={`relative rounded-2xl border-2 ${config.borderColor} overflow-hidden`}
              style={{
                boxShadow: `0 0 60px ${config.glowColor}, 0 0 100px ${config.glowColor}`,
              }}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-10`} />

              {/* Animated particles for legendary */}
              {achievement.rarity === 'legendary' && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-amber-400 rounded-full"
                      initial={{
                        x: Math.random() * 400,
                        y: 400,
                        opacity: 0,
                      }}
                      animate={{
                        y: -20,
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2 + Math.random() * 2,
                        repeat: prefersReducedMotion ? 0 : Infinity,
                        delay: Math.random() * 2,
                        ease: 'easeOut',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="relative bg-background/95 p-6">
                {/* Header */}
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                      <Trophy className="w-4 h-4" />
                      <span className="text-sm font-medium">Achievement Unlocked!</span>
                    </div>
                  </motion.div>

                  {/* Icon */}
                  <motion.div
                    className={`w-24 h-24 mx-auto mb-4 rounded-2xl border-4 ${config.borderColor} ${config.bgColor} flex items-center justify-center shadow-lg`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  >
                    <motion.span
                      className="text-5xl"
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: prefersReducedMotion ? 0 : Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      {achievement.icon}
                    </motion.span>
                  </motion.div>

                  {/* Name */}
                  <motion.h2
                    className="text-2xl font-bold mb-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {achievement.name}
                  </motion.h2>

                  {/* Rarity */}
                  <motion.div
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${config.bgColor} ${config.color} text-sm font-medium mb-3`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Star className="w-3 h-3" />
                    {config.label}
                  </motion.div>

                  {/* Description */}
                  <motion.p
                    className="text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    {achievement.description}
                  </motion.p>
                </div>

                {/* XP Reward */}
                <motion.div
                  className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl p-4 mb-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span className="font-medium">XP Earned</span>
                    </div>
                    <motion.span
                      className="text-2xl font-bold text-primary"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8, type: 'spring' }}
                    >
                      +{achievement.xpReward}
                    </motion.span>
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                  className="flex gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  {onShare && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={onShare}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  )}
                  <Button className="flex-1" onClick={onClose}>
                    Awesome!
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast-style achievement notification (for less intrusive display)
interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
}

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const config = rarityConfig[achievement.rarity];

  return (
    <motion.div
      className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl border-2 ${config.borderColor} bg-background shadow-xl max-w-sm`}
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      style={{
        boxShadow: `0 0 20px ${config.glowColor}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-lg ${config.bgColor} flex items-center justify-center`}
        >
          <span className="text-2xl">{achievement.icon}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium">Achievement Unlocked</span>
          </div>
          <p className="font-bold text-sm">{achievement.name}</p>
          <p className="text-xs text-muted-foreground">+{achievement.xpReward} XP</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// Achievement queue manager for multiple unlocks
interface AchievementQueueProps {
  achievements: Achievement[];
  onDismiss: (id: string) => void;
  mode?: 'modal' | 'toast';
}

export function AchievementQueue({
  achievements,
  onDismiss,
  mode = 'toast',
}: AchievementQueueProps) {
  const currentAchievement = achievements[0];

  if (!currentAchievement) return null;

  if (mode === 'modal') {
    return (
      <AchievementUnlockModal
        achievement={currentAchievement}
        isOpen={true}
        onClose={() => onDismiss(currentAchievement.id)}
      />
    );
  }

  return (
    <AnimatePresence>
      <AchievementToast
        key={currentAchievement.id}
        achievement={currentAchievement}
        onClose={() => onDismiss(currentAchievement.id)}
      />
    </AnimatePresence>
  );
}

export default AchievementUnlockModal;
