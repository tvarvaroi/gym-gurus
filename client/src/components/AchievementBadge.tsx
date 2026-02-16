import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Achievement, TIER_COLORS } from "@/lib/achievements";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export function AchievementBadge({ achievement, size = 'md', showProgress = false }: AchievementBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const tierColor = TIER_COLORS[achievement.tier];

  const sizeClasses = {
    sm: 'w-12 h-12 text-xl',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-20 h-20 text-3xl',
  };

  const progressPercentage = achievement.progress
    ? Math.min((achievement.progress / achievement.requirement) * 100, 100)
    : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className="relative inline-flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: achievement.unlocked ? 5 : 0 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {/* Badge container */}
            <div
              className={`
                relative ${sizeClasses[size]} rounded-full
                flex items-center justify-center
                ${achievement.unlocked
                  ? `bg-gradient-to-br ${tierColor.bg} ${tierColor.border} border-2 shadow-premium-lg ${tierColor.glow}`
                  : 'bg-muted/30 border-2 border-muted/50 opacity-50'
                }
                backdrop-blur-sm transition-all duration-300
              `}
            >
              {/* Shine effect for unlocked badges */}
              {achievement.unlocked && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-full pointer-events-none"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Badge content */}
              {achievement.unlocked ? (
                <span className="relative z-10 drop-shadow-lg">{achievement.icon}</span>
              ) : (
                <Lock className="h-6 w-6 text-muted-foreground/50" />
              )}

              {/* Progress ring for locked badges */}
              {!achievement.unlocked && showProgress && progressPercentage > 0 && (
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-muted"
                  />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                    strokeDashoffset={2 * Math.PI * 45 * (1 - progressPercentage / 100)}
                    strokeLinecap="round"
                    className="text-cyan-500"
                    initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - progressPercentage / 100) }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
              )}

              {/* Sparkle animation for newly unlocked */}
              {achievement.unlocked && achievement.unlockedAt && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-white rounded-full"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                        x: [0, (i - 1) * 20],
                        y: [0, -20 + i * 10],
                      }}
                      transition={{
                        duration: 1,
                        delay: i * 0.1,
                        repeat: prefersReducedMotion ? 0 : Infinity,
                        repeatDelay: 2,
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{achievement.icon}</span>
              <h4 className="font-semibold">{achievement.title}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{achievement.description}</p>
            {!achievement.unlocked && showProgress && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{achievement.progress || 0} / {achievement.requirement}</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
            {achievement.unlocked && achievement.unlockedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Unlocked: {achievement.unlockedAt.toLocaleDateString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AchievementGridProps {
  achievements: Achievement[];
  maxDisplay?: number;
  showProgress?: boolean;
}

export function AchievementGrid({ achievements, maxDisplay, showProgress = true }: AchievementGridProps) {
  const displayAchievements = maxDisplay
    ? achievements.slice(0, maxDisplay)
    : achievements;

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Achievements</h3>
          <p className="text-sm text-muted-foreground">
            {unlockedCount} of {totalCount} unlocked
          </p>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < Math.ceil((unlockedCount / totalCount) * 5)
                  ? 'bg-cyan-500'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {displayAchievements.map((achievement) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            showProgress={showProgress}
          />
        ))}
      </div>
    </div>
  );
}
