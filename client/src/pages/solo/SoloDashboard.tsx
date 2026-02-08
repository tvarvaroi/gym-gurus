import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Dumbbell,
  Bot,
  Zap,
  TrendingUp,
  Utensils,
  Flame,
  Calendar,
  Trophy,
  Target,
  ChevronRight,
  Play,
  Clock,
  Activity,
  Heart,
  Sparkles,
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

// Quick Action Card Component
interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  gradient: string;
  delay?: number;
}

function QuickActionCard({ icon, title, description, href, gradient, delay = 0 }: QuickActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Link href={href}>
        <a className="block">
          <div className={`relative overflow-hidden rounded-xl p-5 ${gradient} text-white hover:scale-[1.02] transition-transform cursor-pointer`}>
            <div className="relative z-10">
              <div className="mb-3">{icon}</div>
              <h3 className="font-bold text-lg mb-1">{title}</h3>
              <p className="text-sm opacity-90">{description}</p>
            </div>
            <div className="absolute right-2 bottom-2 opacity-20">
              <ChevronRight className="w-12 h-12" />
            </div>
          </div>
        </a>
      </Link>
    </motion.div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtext && <p className="text-xs text-primary">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

// Today's Workout Card
function TodaysWorkoutCard() {
  // This would fetch from API in production
  const todayWorkout = {
    name: 'Push Day - Chest & Shoulders',
    exercises: 6,
    estimatedTime: 45,
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-6 border border-primary/30"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Today's Workout</p>
          <h2 className="text-xl font-bold">{todayWorkout.name}</h2>
        </div>
        <div className="p-3 bg-primary/20 rounded-xl">
          <Dumbbell className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span>{todayWorkout.exercises} exercises</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>~{todayWorkout.estimatedTime} min</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {todayWorkout.muscleGroups.map((muscle) => (
          <span
            key={muscle}
            className="px-2 py-1 bg-primary/20 rounded-full text-xs font-medium"
          >
            {muscle}
          </span>
        ))}
      </div>

      <Link href="/workout/start">
        <a className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
          <Play className="w-5 h-5" />
          Start Workout
        </a>
      </Link>
    </motion.div>
  );
}

// Gamification Summary Card
function GamificationCard() {
  // This would fetch from useGamification hook in production
  const stats = {
    level: 12,
    xp: 2450,
    xpToNext: 3000,
    streak: 7,
    rank: 'Fire',
    rankEmoji: '🔥',
  };

  const xpProgress = (stats.xp / stats.xpToNext) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card rounded-xl p-6 border border-border/50"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Your Progress
        </h3>
        <Link href="/gamification">
          <a className="text-sm text-primary hover:underline">View All</a>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{stats.level}</p>
          <p className="text-xs text-muted-foreground">Level</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-orange-500">{stats.streak}</p>
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </div>
        <div className="text-center">
          <p className="text-2xl">{stats.rankEmoji}</p>
          <p className="text-xs text-muted-foreground">{stats.rank}</p>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">XP Progress</span>
          <span className="font-medium">{stats.xp} / {stats.xpToNext}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Recovery Status Card (Mini version)
function RecoveryStatusCard() {
  const muscleStatus = [
    { name: 'Chest', recovery: 100, color: 'bg-green-500' },
    { name: 'Back', recovery: 85, color: 'bg-green-400' },
    { name: 'Legs', recovery: 45, color: 'bg-yellow-500' },
    { name: 'Shoulders', recovery: 70, color: 'bg-green-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-xl p-6 border border-border/50"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          Recovery Status
        </h3>
        <Link href="/analytics/recovery">
          <a className="text-sm text-primary hover:underline">Details</a>
        </Link>
      </div>

      <div className="space-y-3">
        {muscleStatus.map((muscle) => (
          <div key={muscle.name}>
            <div className="flex justify-between text-sm mb-1">
              <span>{muscle.name}</span>
              <span className={muscle.recovery === 100 ? 'text-green-500' : 'text-muted-foreground'}>
                {muscle.recovery}%
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full ${muscle.color} rounded-full transition-all`}
                style={{ width: `${muscle.recovery}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Weekly Activity Overview
function WeeklyActivityCard() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activity = [true, true, false, true, true, false, false]; // Example: completed days
  const today = 4; // Friday (0-indexed)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-xl p-6 border border-border/50"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          This Week
        </h3>
        <span className="text-sm text-muted-foreground">4/5 workouts</span>
      </div>

      <div className="flex justify-between">
        {days.map((day, index) => (
          <div key={day} className="flex flex-col items-center gap-2">
            <span className={`text-xs ${index === today ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
              {day}
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                activity[index]
                  ? 'bg-green-500 text-white'
                  : index <= today
                  ? 'bg-secondary text-muted-foreground'
                  : 'bg-secondary/50 text-muted-foreground/50'
              }`}
            >
              {activity[index] ? '✓' : index + 1}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// AI Coach Suggestion Card
function AICoachSuggestion() {
  const suggestion = {
    type: 'tip',
    message: "Based on your recent workouts, consider adding more posterior chain work. Your back and hamstrings could use some extra volume this week.",
    action: 'Generate Back Workout',
    actionHref: '/ai/generate?focus=back',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-gradient-to-br from-violet-500/20 to-purple-500/10 rounded-xl p-6 border border-violet-500/30"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-violet-500/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Coach Suggestion
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{suggestion.message}</p>
          <Link href={suggestion.actionHref}>
            <a className="inline-flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300">
              {suggestion.action}
              <ChevronRight className="w-4 h-4" />
            </a>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// Main Solo Dashboard Component
export function SoloDashboard() {
  const { user } = useUser();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        <h1 className="text-2xl font-bold">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! 💪
        </h1>
        <p className="text-muted-foreground">Ready to crush your workout today?</p>
      </motion.div>

      {/* Today's Workout */}
      <TodaysWorkoutCard />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <QuickActionCard
          icon={<Bot className="w-6 h-6" />}
          title="AI Coach"
          description="Get personalized advice"
          href="/ai/chat"
          gradient="bg-gradient-to-br from-violet-600 to-purple-600"
          delay={0.1}
        />
        <QuickActionCard
          icon={<Zap className="w-6 h-6" />}
          title="Generate Workout"
          description="AI-powered workout"
          href="/ai/generate"
          gradient="bg-gradient-to-br from-cyan-600 to-blue-600"
          delay={0.15}
        />
        <QuickActionCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="My Progress"
          description="View analytics"
          href="/analytics"
          gradient="bg-gradient-to-br from-green-600 to-emerald-600"
          delay={0.2}
        />
        <QuickActionCard
          icon={<Utensils className="w-6 h-6" />}
          title="Meal Plan"
          description="AI diet planning"
          href="/ai/meals"
          gradient="bg-gradient-to-br from-orange-600 to-amber-600"
          delay={0.25}
        />
      </div>

      {/* AI Coach Suggestion */}
      <AICoachSuggestion />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label="This Week"
          value="4"
          subtext="workouts"
          color="bg-orange-500/10"
        />
        <StatCard
          icon={<Dumbbell className="w-5 h-5 text-blue-500" />}
          label="Volume"
          value="12.5k"
          subtext="kg lifted"
          color="bg-blue-500/10"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-yellow-500" />}
          label="PRs"
          value="3"
          subtext="this month"
          color="bg-yellow-500/10"
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-green-500" />}
          label="Streak"
          value="7"
          subtext="days"
          color="bg-green-500/10"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        <GamificationCard />
        <RecoveryStatusCard />
      </div>

      {/* Weekly Activity */}
      <WeeklyActivityCard />

      {/* Connect with Trainer CTA (optional) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-card rounded-xl p-6 border border-dashed border-border"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium mb-1">Want professional guidance?</h3>
            <p className="text-sm text-muted-foreground">
              Connect with a certified trainer for personalized coaching
            </p>
          </div>
          <Link href="/find-trainer">
            <a className="px-4 py-2 bg-secondary rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
              Find a Trainer
            </a>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default SoloDashboard;
