import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getXpToNextLevel } from '@/lib/constants/xpRewards';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useToast } from '@/hooks/use-toast';

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

async function resizeImage(file: File, maxSize = 800): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85);
    };
    img.src = URL.createObjectURL(file);
  });
}

export function HeroHeader({ user, gamification, fitnessProfile }: HeroHeaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImage(file, 800);

      const formData = new FormData();
      formData.append('image', resized, 'profile.jpg');

      const response = await fetch('/api/settings/profile-image-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');

      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      toast({ title: 'Photo updated!' });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Failed to upload photo',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      e.target.value = '';
    }
  }

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
        <div className="relative flex-shrink-0">
          {/* Glow behind photo */}
          <div
            className="absolute inset-0 blur-[40px] opacity-25 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 60%)',
            }}
          />

          {user?.profileImageUrl ? (
            <label className="relative cursor-pointer group block">
              <img
                src={user.profileImageUrl}
                alt={user.firstName || 'Profile'}
                className="relative w-28 h-28 md:w-44 md:h-44 rounded-2xl object-cover hero-photo-cutout"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-200">
                <div className="opacity-0 group-hover:opacity-100 text-center transition-opacity">
                  <Camera className="w-5 h-5 text-white mx-auto mb-1" />
                  <span className="text-[10px] text-white/80">Change</span>
                </div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          ) : (
            <label className="relative cursor-pointer group block">
              <div className="w-28 h-28 md:w-44 md:h-44 rounded-2xl border-2 border-dashed border-border/30 hover:border-primary/40 flex flex-col items-center justify-center gap-2 transition-colors">
                <Camera className="w-7 h-7 text-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                  Upload
                </span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          )}
        </div>
      </div>
    </motion.div>
  );
}
