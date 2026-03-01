import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { QueryErrorState } from '@/components/query-states/QueryErrorState';
import { useToast } from '@/hooks/use-toast';
import {
  Trophy,
  Star,
  Flame,
  Zap,
  Dumbbell,
  TrendingUp,
  Lock,
  Crown,
  Sparkles,
  CheckCircle2,
  Users,
  Loader2,
} from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  category: string;
  xpReward: number | null;
  rarity: string | null;
  requirementType: string | null;
  requirementValue: string | null;
  earned: boolean;
  earnedAt: string | null;
  progress: number;
}

// Achievement categories
const categories = [
  { id: 'all', label: 'All', icon: Trophy },
  { id: 'workout', label: 'Workouts', icon: Dumbbell },
  { id: 'strength', label: 'Strength', icon: TrendingUp },
  { id: 'consistency', label: 'Consistency', icon: Flame },
  { id: 'social', label: 'Social', icon: Users },
];

function getCategoryFromType(type: string | null): string {
  if (!type) return 'workout';
  if (type.includes('streak')) return 'consistency';
  if (type.includes('strength') || type.includes('1rm') || type.includes('pr')) return 'strength';
  if (type.includes('social') || type.includes('share') || type.includes('leaderboard'))
    return 'social';
  return 'workout';
}

function getAchievementIcon(category: string, rarity: string | null) {
  if (rarity === 'legendary') return Crown;
  if (rarity === 'epic') return Sparkles;
  switch (category) {
    case 'workout':
      return Dumbbell;
    case 'strength':
      return TrendingUp;
    case 'consistency':
      return Flame;
    case 'social':
      return Users;
    default:
      return Trophy;
  }
}

// Rarity colors
const rarityColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  common: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-400',
    glow: 'shadow-slate-500/20',
  },
  uncommon: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  rare: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  epic: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/20',
  },
  legendary: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20',
  },
};

export default function Achievements() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const { toast } = useToast();
  const toastsShownRef = useRef(false);

  const {
    data: achievements = [],
    isLoading,
    error,
  } = useQuery<Achievement[]>({
    queryKey: ['/api/gamification/achievements'],
  });

  // Show toasts for recently unlocked achievements (first load only)
  useEffect(() => {
    if (toastsShownRef.current || achievements.length === 0) return;
    toastsShownRef.current = true;

    const now = Date.now();
    const newlyUnlocked = achievements.filter((a) => {
      if (!a.earned || !a.earnedAt) return false;
      const earnedTime = new Date(a.earnedAt).getTime();
      // Unlocked within the last 10 seconds (retroactive awards)
      return now - earnedTime < 10_000;
    });

    newlyUnlocked.slice(0, 5).forEach((a, i) => {
      setTimeout(() => {
        toast({
          title: 'Achievement Unlocked!',
          description: `${a.name}${a.xpReward ? ` (+${a.xpReward} XP)` : ''}`,
        });
      }, i * 400);
    });
  }, [achievements, toast]);

  // Map achievements with computed categories
  const mappedAchievements = achievements.map((a) => ({
    ...a,
    category: a.category || getCategoryFromType(a.requirementType),
  }));

  const filteredAchievements =
    selectedCategory === 'all'
      ? mappedAchievements
      : mappedAchievements.filter((a) => a.category === selectedCategory);

  const earnedCount = mappedAchievements.filter((a) => a.earned).length;
  const totalXP = mappedAchievements
    .filter((a) => a.earned)
    .reduce((sum, a) => sum + (a.xpReward || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted/60 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-20 bg-muted rounded-lg animate-pulse" />
            <div className="h-9 w-20 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card/30 border-border/30">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-48 bg-muted/60 rounded animate-pulse" />
                  </div>
                </div>
                <Progress value={0} className="h-1.5 opacity-30" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <QueryErrorState error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extralight tracking-tight font-['Playfair_Display'] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
              <Trophy className="h-8 w-8 text-amber-400" />
            </div>
            <span className="font-light bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
              Achievements
            </span>
          </h1>
          <p className="text-muted-foreground font-light">
            Unlock achievements and earn XP rewards
          </p>
        </div>

        {/* Stats — only show when achievements are defined */}
        {mappedAchievements.length > 0 && (
          <div className="flex gap-4">
            <div className="text-center px-4 py-2 rounded-xl bg-card/50 border border-border/50">
              <p className="text-2xl font-light text-amber-400">
                {earnedCount}/{mappedAchievements.length}
              </p>
              <p className="text-xs text-muted-foreground">Unlocked</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-card/50 border border-border/50">
              <p className="text-2xl font-light text-purple-400">{totalXP.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Category Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className={
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-600 hover:to-yellow-600'
                  : 'border-border/50 hover:border-amber-500/30 hover:bg-amber-500/10'
              }
            >
              <category.icon className="h-4 w-4 mr-2" />
              {category.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Achievements Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filteredAchievements.length === 0 && (
          <div className="col-span-full flex flex-col items-center py-12 text-center space-y-3">
            <Trophy className="h-12 w-12 text-muted-foreground/30" />
            <div className="space-y-1">
              <p className="text-base font-medium text-muted-foreground">No achievements found</p>
              <p className="text-sm text-muted-foreground/60">
                Complete workouts and hit milestones to unlock achievements
              </p>
            </div>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {filteredAchievements.map((achievement, index) => {
            const rarityKey = achievement.rarity || 'common';
            const rarity = rarityColors[rarityKey] || rarityColors.common;
            const AchIcon = getAchievementIcon(achievement.category, achievement.rarity);
            return (
              <motion.div
                key={achievement.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
                    achievement.earned
                      ? `${rarity.bg} ${rarity.border} hover:shadow-lg ${rarity.glow}`
                      : 'bg-card/30 border-border/30 opacity-60 hover:opacity-80'
                  }`}
                  onClick={() =>
                    setSelectedAchievement(
                      selectedAchievement === achievement.id ? null : achievement.id
                    )
                  }
                >
                  {/* Rarity indicator */}
                  {achievement.earned && (
                    <div
                      className={`absolute top-0 right-0 px-2 py-1 text-xs font-medium capitalize ${rarity.bg} ${rarity.text} rounded-bl-lg`}
                    >
                      {rarityKey}
                    </div>
                  )}

                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={`relative p-3 rounded-xl ${
                          achievement.earned ? rarity.bg : 'bg-muted/30'
                        }`}
                      >
                        {achievement.earned ? (
                          <AchIcon className={`h-6 w-6 ${rarity.text}`} />
                        ) : (
                          <Lock className="h-6 w-6 text-muted-foreground" />
                        )}
                        {achievement.earned && (
                          <motion.div
                            className="absolute inset-0 rounded-xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{
                              duration: 2,
                              repeat: prefersReducedMotion ? 0 : Infinity,
                            }}
                            style={{
                              background: `radial-gradient(circle, ${
                                rarityKey === 'legendary'
                                  ? 'rgba(251, 191, 36, 0.3)'
                                  : rarityKey === 'epic'
                                    ? 'rgba(168, 85, 247, 0.3)'
                                    : rarityKey === 'rare'
                                      ? 'rgba(59, 130, 246, 0.3)'
                                      : rarityKey === 'uncommon'
                                        ? 'rgba(34, 197, 94, 0.3)'
                                        : 'rgba(148, 163, 184, 0.3)'
                              }, transparent 70%)`,
                            }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-medium truncate ${
                            achievement.earned ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {achievement.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {achievement.description}
                        </p>

                        {/* Progress or Date */}
                        {achievement.earned ? (
                          <div className="flex items-center gap-2 mt-2 text-xs">
                            <CheckCircle2 className={`h-3 w-3 ${rarity.text}`} />
                            <span className="text-muted-foreground">
                              Unlocked{' '}
                              {achievement.earnedAt
                                ? new Date(achievement.earnedAt).toLocaleDateString()
                                : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="text-muted-foreground">{achievement.progress}%</span>
                            </div>
                            <Progress value={achievement.progress} className="h-1.5" />
                          </div>
                        )}

                        {/* XP Reward */}
                        <div className="flex items-center gap-1 mt-2">
                          <Zap
                            className={`h-3 w-3 ${achievement.earned ? 'text-amber-400' : 'text-muted-foreground'}`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              achievement.earned ? 'text-amber-400' : 'text-muted-foreground'
                            }`}
                          >
                            {(achievement.xpReward || 0).toLocaleString()} XP
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inline expansion removed — uses Dialog instead */}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Achievement Detail Dialog */}
      <Dialog
        open={selectedAchievement !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAchievement(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {(() => {
            const achievement = mappedAchievements.find((a) => a.id === selectedAchievement);
            if (!achievement) return null;
            const rarityKey = achievement.rarity || 'common';
            const rarity = rarityColors[rarityKey] || rarityColors.common;
            const AchIcon = getAchievementIcon(achievement.category, achievement.rarity);
            const rarityPercent: Record<string, string> = {
              common: '85%',
              uncommon: '40%',
              rare: '15%',
              epic: '5%',
              legendary: '1%',
            };
            return (
              <>
                <DialogHeader className="text-center items-center">
                  <div className={`p-4 rounded-2xl ${rarity.bg} mb-2`}>
                    {achievement.earned ? (
                      <AchIcon className={`h-10 w-10 ${rarity.text}`} />
                    ) : (
                      <Lock className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <DialogTitle className="text-xl font-medium">{achievement.name}</DialogTitle>
                  <DialogDescription className="text-sm">
                    {achievement.description}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {/* Rarity & Category badges */}
                  <div className="flex items-center justify-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${rarity.bg} ${rarity.text} border ${rarity.border}`}
                    >
                      {rarityKey} ({rarityPercent[rarityKey] || '?'} of users)
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground">
                      {categories.find((c) => c.id === achievement.category)?.label ||
                        achievement.category}
                    </span>
                  </div>

                  {/* XP Reward */}
                  <div className="flex items-center justify-center gap-2">
                    <Zap
                      className={`h-4 w-4 ${achievement.earned ? 'text-amber-400' : 'text-muted-foreground'}`}
                    />
                    <span
                      className={`text-sm font-medium ${achievement.earned ? 'text-amber-400' : 'text-muted-foreground'}`}
                    >
                      {(achievement.xpReward || 0).toLocaleString()} XP
                    </span>
                  </div>

                  {/* Earned or Progress */}
                  {achievement.earned ? (
                    <div className="text-center space-y-1 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-medium text-green-400">Unlocked</span>
                      </div>
                      {achievement.earnedAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(achievement.earnedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-border/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{achievement.progress}%</span>
                      </div>
                      <Progress value={achievement.progress} className="h-2" />
                      <p className="text-xs text-amber-400 text-center mt-1">
                        {achievement.progress >= 75
                          ? "Almost there! You're so close!"
                          : achievement.progress >= 50
                            ? 'Great progress — keep pushing!'
                            : 'Keep going, every workout counts!'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Rarity Legend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-light flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              Rarity Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(rarityColors).map(([rarity, colors]) => (
                <div key={rarity} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors.bg} border ${colors.border}`} />
                  <span className={`text-sm capitalize ${colors.text}`}>{rarity}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
