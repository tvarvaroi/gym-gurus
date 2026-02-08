import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy,
  Medal,
  Star,
  Flame,
  Zap,
  Target,
  Dumbbell,
  TrendingUp,
  Calendar,
  Lock,
  Crown,
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  Users
} from 'lucide-react';

// Achievement categories
const categories = [
  { id: 'all', label: 'All', icon: Trophy },
  { id: 'workout', label: 'Workouts', icon: Dumbbell },
  { id: 'strength', label: 'Strength', icon: TrendingUp },
  { id: 'consistency', label: 'Consistency', icon: Flame },
  { id: 'social', label: 'Social', icon: Users },
];

// Achievement data (simulated)
const achievements = [
  // Workout achievements
  {
    id: 'first_workout',
    title: 'First Steps',
    description: 'Complete your first workout',
    category: 'workout',
    xp: 100,
    icon: Dumbbell,
    unlocked: true,
    unlockedAt: '2024-01-15',
    rarity: 'common',
  },
  {
    id: 'workout_10',
    title: 'Getting Started',
    description: 'Complete 10 workouts',
    category: 'workout',
    xp: 250,
    icon: Dumbbell,
    unlocked: true,
    unlockedAt: '2024-01-28',
    rarity: 'common',
  },
  {
    id: 'workout_50',
    title: 'Dedicated',
    description: 'Complete 50 workouts',
    category: 'workout',
    xp: 500,
    icon: Dumbbell,
    unlocked: true,
    unlockedAt: '2024-03-10',
    rarity: 'uncommon',
  },
  {
    id: 'workout_100',
    title: 'Century Club',
    description: 'Complete 100 workouts',
    category: 'workout',
    xp: 1000,
    icon: Trophy,
    unlocked: false,
    progress: 78,
    rarity: 'rare',
  },
  {
    id: 'workout_500',
    title: 'Iron Will',
    description: 'Complete 500 workouts',
    category: 'workout',
    xp: 5000,
    icon: Crown,
    unlocked: false,
    progress: 15,
    rarity: 'legendary',
  },
  // Strength achievements
  {
    id: 'first_pr',
    title: 'Personal Best',
    description: 'Set your first personal record',
    category: 'strength',
    xp: 150,
    icon: TrendingUp,
    unlocked: true,
    unlockedAt: '2024-01-20',
    rarity: 'common',
  },
  {
    id: 'pr_10',
    title: 'Record Breaker',
    description: 'Set 10 personal records',
    category: 'strength',
    xp: 500,
    icon: Medal,
    unlocked: true,
    unlockedAt: '2024-02-15',
    rarity: 'uncommon',
  },
  {
    id: 'bodyweight_bench',
    title: 'Bodyweight Bench',
    description: 'Bench press your bodyweight',
    category: 'strength',
    xp: 750,
    icon: Award,
    unlocked: false,
    progress: 85,
    rarity: 'rare',
  },
  {
    id: 'double_bodyweight_squat',
    title: 'Leg Day Legend',
    description: 'Squat double your bodyweight',
    category: 'strength',
    xp: 1500,
    icon: Crown,
    unlocked: false,
    progress: 62,
    rarity: 'epic',
  },
  // Consistency achievements
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day workout streak',
    category: 'consistency',
    xp: 200,
    icon: Flame,
    unlocked: true,
    unlockedAt: '2024-01-22',
    rarity: 'common',
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day workout streak',
    category: 'consistency',
    xp: 1000,
    icon: Flame,
    unlocked: true,
    unlockedAt: '2024-02-22',
    rarity: 'rare',
  },
  {
    id: 'streak_100',
    title: 'Unstoppable',
    description: 'Maintain a 100-day workout streak',
    category: 'consistency',
    xp: 3000,
    icon: Sparkles,
    unlocked: false,
    progress: 45,
    rarity: 'epic',
  },
  {
    id: 'streak_365',
    title: 'Year of Iron',
    description: 'Maintain a 365-day workout streak',
    category: 'consistency',
    xp: 10000,
    icon: Crown,
    unlocked: false,
    progress: 12,
    rarity: 'legendary',
  },
  // Social achievements
  {
    id: 'share_first',
    title: 'Show Off',
    description: 'Share your first workout',
    category: 'social',
    xp: 50,
    icon: Users,
    unlocked: true,
    unlockedAt: '2024-01-18',
    rarity: 'common',
  },
  {
    id: 'leaderboard_top10',
    title: 'Top 10',
    description: 'Reach top 10 on any leaderboard',
    category: 'social',
    xp: 500,
    icon: Trophy,
    unlocked: false,
    progress: 0,
    rarity: 'rare',
  },
];

// Rarity colors
const rarityColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  common: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', glow: 'shadow-slate-500/20' },
  uncommon: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  rare: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
  epic: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
  legendary: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
};

export default function Achievements() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);

  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalXP = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extralight tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
              <Trophy className="h-8 w-8 text-amber-400" />
            </div>
            <span className="font-light bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">Achievements</span>
          </h1>
          <p className="text-muted-foreground font-light">Unlock achievements and earn XP rewards</p>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="text-center px-4 py-2 rounded-xl bg-card/50 border border-border/50">
            <p className="text-2xl font-light text-amber-400">{unlockedCount}/{achievements.length}</p>
            <p className="text-xs text-muted-foreground">Unlocked</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-card/50 border border-border/50">
            <p className="text-2xl font-light text-purple-400">{totalXP.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">XP Earned</p>
          </div>
        </div>
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
              className={selectedCategory === category.id
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
        <AnimatePresence mode="popLayout">
          {filteredAchievements.map((achievement, index) => {
            const rarity = rarityColors[achievement.rarity];
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
                    achievement.unlocked
                      ? `${rarity.bg} ${rarity.border} hover:shadow-lg ${rarity.glow}`
                      : 'bg-card/30 border-border/30 opacity-60 hover:opacity-80'
                  }`}
                  onClick={() => setSelectedAchievement(
                    selectedAchievement === achievement.id ? null : achievement.id
                  )}
                >
                  {/* Rarity indicator */}
                  {achievement.unlocked && (
                    <div className={`absolute top-0 right-0 px-2 py-1 text-xs font-medium capitalize ${rarity.bg} ${rarity.text} rounded-bl-lg`}>
                      {achievement.rarity}
                    </div>
                  )}

                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`relative p-3 rounded-xl ${
                        achievement.unlocked ? rarity.bg : 'bg-muted/30'
                      }`}>
                        {achievement.unlocked ? (
                          <achievement.icon className={`h-6 w-6 ${rarity.text}`} />
                        ) : (
                          <Lock className="h-6 w-6 text-muted-foreground" />
                        )}
                        {achievement.unlocked && (
                          <motion.div
                            className="absolute inset-0 rounded-xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                              background: `radial-gradient(circle, ${
                                achievement.rarity === 'legendary' ? 'rgba(251, 191, 36, 0.3)' :
                                achievement.rarity === 'epic' ? 'rgba(168, 85, 247, 0.3)' :
                                achievement.rarity === 'rare' ? 'rgba(59, 130, 246, 0.3)' :
                                achievement.rarity === 'uncommon' ? 'rgba(34, 197, 94, 0.3)' :
                                'rgba(148, 163, 184, 0.3)'
                              }, transparent 70%)`
                            }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium truncate ${
                          achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {achievement.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {achievement.description}
                        </p>

                        {/* Progress or Date */}
                        {achievement.unlocked ? (
                          <div className="flex items-center gap-2 mt-2 text-xs">
                            <CheckCircle2 className={`h-3 w-3 ${rarity.text}`} />
                            <span className="text-muted-foreground">
                              Unlocked {new Date(achievement.unlockedAt!).toLocaleDateString()}
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
                          <Zap className={`h-3 w-3 ${achievement.unlocked ? 'text-amber-400' : 'text-muted-foreground'}`} />
                          <span className={`text-xs font-medium ${
                            achievement.unlocked ? 'text-amber-400' : 'text-muted-foreground'
                          }`}>
                            {achievement.xp.toLocaleString()} XP
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {selectedAchievement === achievement.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 mt-4 border-t border-border/50">
                            <div className="text-sm text-muted-foreground space-y-2">
                              <p>
                                <strong>Category:</strong> {
                                  categories.find(c => c.id === achievement.category)?.label
                                }
                              </p>
                              <p>
                                <strong>Rarity:</strong> <span className={`capitalize ${rarity.text}`}>
                                  {achievement.rarity}
                                </span>
                              </p>
                              {!achievement.unlocked && (
                                <p className="text-amber-400">
                                  Keep going! You're {achievement.progress}% there.
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

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
