import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getXpToNextLevel } from '@/lib/constants/xpRewards';
import { formatNum } from '@/lib/format';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useToast } from '@/hooks/use-toast';

interface HeroHeaderProps {
  user: any;
  gamification: any;
  fitnessProfile: any;
  computedTdee?: number;
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

async function resizeImage(file: File, maxSize = 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/png'
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    // Use data: URL instead of blob: URL to comply with CSP
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function HeroHeader({ user, gamification, fitnessProfile, computedTdee }: HeroHeaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

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
  const stats: { label: string; value: string; unit?: string; xpBar?: boolean; href: string }[] =
    [];
  if (fitnessProfile?.weightKg)
    stats.push({
      label: 'Weight',
      value: formatNum(fitnessProfile.weightKg),
      unit: 'kg',
      href: '/settings',
    });
  if (fitnessProfile?.heightCm)
    stats.push({
      label: 'Height',
      value: formatNum(fitnessProfile.heightCm),
      unit: 'cm',
      href: '/settings',
    });
  const kcalValue = fitnessProfile?.dailyCalorieTarget || computedTdee;
  if (kcalValue)
    stats.push({
      label: 'kcal/day',
      value: formatNum(kcalValue),
      href: '/dashboard/calculators/tdee',
    });
  stats.push({ label: 'Level', value: `${currentLevel}`, xpBar: true, href: '/solo/achievements' });

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const resized = await resizeImage(file, 1024);

      const formData = new FormData();
      formData.append('image', resized, 'profile.png');

      const response = await fetch('/api/settings/profile-image-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');

      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      toast({ title: 'Photo updated — background removed!' });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Failed to upload photo',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const hasPhoto = !!user?.profileImageUrl;

  return (
    <motion.div {...animProps} className="relative pt-4" style={{ overflow: 'visible' }}>
      <div className="relative">
        {/* Left column — determines section height */}
        <div className={`text-center lg:text-left ${hasPhoto ? 'pr-0 lg:pr-[140px]' : ''}`}>
          <p className="text-sm uppercase tracking-widest text-muted-foreground font-medium mb-2">
            {greeting}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold font-['Playfair_Display'] leading-tight mb-2">
            {user?.firstName || 'Warrior'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>

          {/* Stats row */}
          <div className="flex items-center justify-center lg:justify-start gap-6 lg:gap-8">
            {stats.map((stat, index) => (
              <div key={stat.label} className="flex items-center gap-6 lg:gap-8">
                {index > 0 && <div className="h-8 w-px bg-border/30 -ml-6 lg:-ml-8" />}
                <Link href={stat.href}>
                  <a className="flex flex-col items-center lg:items-start cursor-pointer group hover:bg-white/[0.03] rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors">
                    <span className="text-2xl font-bold tabular-nums leading-none group-hover:text-primary transition-colors">
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
                  </a>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Photo — absolutely positioned, overflows downward */}
        {hasPhoto ? (
          <div className="absolute right-0 bottom-0 translate-y-[15%] z-0 hidden lg:block">
            <label className="relative cursor-pointer group block">
              {/* Ambient glow */}
              <div
                className="absolute inset-[-30px] blur-[60px] opacity-20"
                style={{
                  background:
                    'radial-gradient(circle, hsl(var(--primary) / 0.7) 0%, transparent 60%)',
                }}
              />
              <img
                src={user.profileImageUrl}
                alt={user.firstName || 'Profile'}
                className="relative h-[180px] lg:h-[260px] w-auto object-contain"
                style={{
                  filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.6))',
                }}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/50 rounded-full px-3 py-1.5 backdrop-blur-sm flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <span className="text-xs text-white">Change</span>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />

              {/* Processing overlay */}
              {uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  <div className="bg-black/70 rounded-2xl px-6 py-4 backdrop-blur-sm flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <span className="text-xs text-white/80 font-medium">
                      Removing background...
                    </span>
                    <span className="text-[10px] text-white/40 mt-1">This may take a moment</span>
                  </div>
                </div>
              )}
            </label>
          </div>
        ) : (
          <div className="absolute right-0 top-0 hidden lg:block">
            <label className="relative cursor-pointer group block">
              <div className="w-44 h-44 rounded-2xl border-2 border-dashed border-border/30 hover:border-primary/40 flex flex-col items-center justify-center gap-2 transition-colors">
                <Camera className="w-7 h-7 text-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                  Upload
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />

              {/* Processing overlay for empty state */}
              {uploading && (
                <div className="absolute inset-0 rounded-2xl bg-black/70 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <span className="text-xs text-white/80 font-medium">Removing background...</span>
                  <span className="text-[10px] text-white/40 mt-1">This may take a moment</span>
                </div>
              )}
            </label>
          </div>
        )}
      </div>

      {/* Mobile photo — normal flow, centered above text */}
      {hasPhoto && (
        <div className="flex justify-center mb-4 lg:hidden">
          <label className="relative cursor-pointer group block">
            <img
              src={user.profileImageUrl}
              alt={user.firstName || 'Profile'}
              className="h-[160px] w-auto object-contain"
              style={{
                filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.6))',
              }}
            />
            <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/50 rounded-full px-3 py-1.5 backdrop-blur-sm flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-white" />
                <span className="text-xs text-white">Change</span>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </label>
        </div>
      )}
      {!hasPhoto && (
        <div className="flex justify-center mb-4 lg:hidden">
          <label className="relative cursor-pointer group block">
            <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-border/30 hover:border-primary/40 flex flex-col items-center justify-center gap-2 transition-colors">
              <Camera className="w-7 h-7 text-muted-foreground/40" />
              <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                Upload
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </label>
        </div>
      )}
    </motion.div>
  );
}
