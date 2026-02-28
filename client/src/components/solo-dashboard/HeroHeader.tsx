import { motion } from 'framer-motion';
import { User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { XPBar } from '@/components/gamification/XPBar';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface HeroHeaderProps {
  user: any;
  gamification: any;
  fitnessProfile: any;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getMotivationalSubtitle(gamification: any, fitnessProfile: any): string {
  const streak = gamification?.currentStreakDays || 0;
  if (streak >= 7) return `${streak}-day streak! You're unstoppable.`;
  if (streak >= 3) return `${streak}-day streak! Keep the fire burning.`;
  if (fitnessProfile?.primaryGoal === 'build_muscle') return 'Time to build. Every rep counts.';
  if (fitnessProfile?.primaryGoal === 'lose_fat') return 'Stay disciplined. Results are coming.';
  return 'Ready to train?';
}

function formatGoal(goal: string | undefined): string {
  if (!goal) return '';
  const goalMap: Record<string, string> = {
    build_muscle: 'Muscle Gain',
    lose_fat: 'Fat Loss',
    strength: 'Strength',
    endurance: 'Endurance',
    general_fitness: 'General Fitness',
  };
  return goalMap[goal] || goal.replace(/_/g, ' ');
}

export function HeroHeader({ user, gamification, fitnessProfile }: HeroHeaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const greeting = getGreeting();
  const subtitle = getMotivationalSubtitle(gamification, fitnessProfile);

  const currentLevel = gamification?.currentLevel || 1;
  const totalXp = gamification?.totalXp || 0;

  const statPills: { label: string; value: string }[] = [];
  if (fitnessProfile?.weightKg)
    statPills.push({ label: 'Weight', value: `${fitnessProfile.weightKg} kg` });
  if (fitnessProfile?.heightCm)
    statPills.push({ label: 'Height', value: `${fitnessProfile.heightCm} cm` });
  if (fitnessProfile?.dailyCalorieTarget)
    statPills.push({ label: 'TDEE', value: `${fitnessProfile.dailyCalorieTarget} kcal` });
  if (currentLevel > 1) statPills.push({ label: 'Level', value: `Lv. ${currentLevel}` });
  if (fitnessProfile?.primaryGoal)
    statPills.push({ label: 'Goal', value: formatGoal(fitnessProfile.primaryGoal) });
  if (fitnessProfile?.workoutFrequencyPerWeek)
    statPills.push({
      label: 'Frequency',
      value: `${fitnessProfile.workoutFrequencyPerWeek}x/week`,
    });

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 },
      };

  return (
    <motion.div
      {...animProps}
      className="relative rounded-2xl p-6 md:p-8 bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/20 overflow-hidden"
    >
      <div className="flex flex-col-reverse md:flex-row items-center md:items-start gap-6">
        {/* Left Column — Greeting + Stats + XP */}
        <div className="flex-1 w-full text-center md:text-left">
          <p className="text-sm text-muted-foreground mb-1">{greeting},</p>
          <h1 className="text-2xl md:text-3xl font-bold font-['Playfair_Display'] mb-1">
            {user?.firstName || 'Warrior'}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>

          {/* Stats Pills */}
          {statPills.length > 0 && (
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-5">
              {statPills.map((pill) => (
                <Badge
                  key={pill.label}
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {pill.value}
                </Badge>
              ))}
            </div>
          )}

          {/* XP Bar */}
          <div className="max-w-md mx-auto md:mx-0">
            <XPBar
              totalXp={totalXp}
              currentLevel={currentLevel}
              showDetails={true}
              size="md"
              animate={!prefersReducedMotion}
            />
          </div>
        </div>

        {/* Right Column — Profile Photo */}
        <div className="relative flex-shrink-0">
          {/* Purple glow behind photo */}
          <div
            className="absolute inset-0 rounded-full blur-[40px] opacity-40"
            style={{
              background: 'radial-gradient(circle, hsl(271 81% 56% / 0.6) 0%, transparent 70%)',
            }}
          />
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={user.firstName || 'Profile'}
              className="relative w-28 h-28 md:w-40 md:h-40 rounded-full object-cover hero-photo-cutout"
            />
          ) : (
            <div className="relative w-28 h-28 md:w-40 md:h-40 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center">
              <UserIcon className="w-12 h-12 md:w-16 md:h-16 text-primary/60" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
