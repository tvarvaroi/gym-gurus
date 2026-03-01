import { motion } from 'framer-motion';
import { User as UserIcon } from 'lucide-react';
import { getXpToNextLevel } from '@/lib/constants/xpRewards';
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
  if (streak >= 7) return `${streak}-day streak — you're unstoppable`;
  if (streak >= 3) return `${streak}-day streak — keep the fire burning`;
  if (fitnessProfile?.primaryGoal === 'build_muscle') return 'Time to build. Every rep counts.';
  if (fitnessProfile?.primaryGoal === 'lose_fat') return 'Stay disciplined. Results are coming.';
  return 'Ready to train?';
}

export function HeroHeader({ user, gamification, fitnessProfile }: HeroHeaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const greeting = getGreeting();
  const subtitle = getMotivationalSubtitle(gamification, fitnessProfile);

  const currentLevel = gamification?.currentLevel || 1;
  const totalXp = gamification?.totalXp || 0;
  const xpProgress = getXpToNextLevel(totalXp);

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      };

  // Build stats array — only include metrics that exist
  const stats: { label: string; value: string; unit?: string; xpBar?: boolean }[] = [];
  if (fitnessProfile?.weightKg)
    stats.push({ label: 'Weight', value: `${fitnessProfile.weightKg}`, unit: 'kg' });
  if (fitnessProfile?.heightCm)
    stats.push({ label: 'Height', value: `${fitnessProfile.heightCm}`, unit: 'cm' });
  if (fitnessProfile?.dailyCalorieTarget)
    stats.push({ label: 'kcal/day', value: `${fitnessProfile.dailyCalorieTarget}` });
  stats.push({ label: 'Level', value: `${currentLevel}`, xpBar: true });

  return (
    <motion.div {...animProps} className="pt-4">
      <div className="flex flex-col-reverse md:flex-row items-center md:items-start gap-8">
        {/* Left — Greeting, Name, Subtitle, Stats */}
        <div className="flex-1 w-full text-center md:text-left">
          <p className="text-sm uppercase tracking-widest text-muted-foreground font-medium mb-2">
            {greeting}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold font-['Playfair_Display'] leading-tight mb-2">
            {user?.firstName || 'Warrior'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>

          {/* Stats row */}
          <div className="flex items-center justify-center md:justify-start gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <div key={stat.label} className="flex items-center gap-6 md:gap-8">
                {index > 0 && <div className="h-8 w-px bg-border/30 -ml-6 md:-ml-8" />}
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-2xl font-bold tabular-nums leading-none">
                    {stat.value}
                    {stat.unit && (
                      <span className="text-sm font-normal text-muted-foreground ml-0.5">
                        {stat.unit}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mt-1">
                    {stat.label}
                  </span>
                  {/* Inline XP bar under Level */}
                  {stat.xpBar && (
                    <div className="w-16 h-[2px] bg-muted rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, xpProgress.progress)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Profile Photo */}
        <div className="flex-shrink-0">
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={user.firstName || 'Profile'}
              className="w-[100px] h-[100px] md:w-[180px] md:h-[180px] rounded-full object-cover border-2 border-primary/40"
            />
          ) : (
            <div className="w-[100px] h-[100px] md:w-[180px] md:h-[180px] rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center">
              <UserIcon className="w-10 h-10 md:w-16 md:h-16 text-primary/50" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
