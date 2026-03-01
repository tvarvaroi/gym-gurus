import { useState } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Camera, Loader2 } from 'lucide-react';
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

export function HeroHeader({ user, gamification, fitnessProfile }: HeroHeaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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

    setUploading(true);
    setProgress(0);

    let blobToUpload: Blob = file;
    let bgRemoved = false;

    try {
      // Try background removal
      const { removeBackground } = await import('@imgly/background-removal');
      const processedBlob = await removeBackground(file, {
        progress: (_key: string, current: number, total: number) => {
          setProgress(Math.round((current / total) * 100));
        },
      });
      blobToUpload = processedBlob;
      bgRemoved = true;
    } catch (bgError) {
      console.warn('Background removal unavailable, uploading original:', bgError);
    }

    try {
      // Upload the image (processed or original)
      const formData = new FormData();
      formData.append('image', blobToUpload, bgRemoved ? 'profile.png' : file.name);

      const response = await fetch('/api/settings/profile-image-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');

      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      toast({
        title: bgRemoved ? 'Photo updated!' : 'Photo updated (without background removal)',
        description: bgRemoved
          ? 'Background removed successfully.'
          : 'Background removal was unavailable.',
      });
    } catch (uploadError) {
      console.error('Photo upload failed:', uploadError);
      toast({
        title: 'Failed to upload photo',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset file input so same file can be re-selected
      e.target.value = '';
    }
  }

  // Detect if photo is a processed PNG (transparent bg)
  const hasProcessedPhoto =
    user?.profileImageUrl &&
    (user.profileImageUrl.includes('.webp') ||
      user.profileImageUrl.includes('.png') ||
      user.profileImageUrl.startsWith('data:'));

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

        {/* Right — Profile Photo (clickable for upload) */}
        <div className="flex-shrink-0">
          <label className="relative cursor-pointer group block">
            {user?.profileImageUrl ? (
              <>
                <div className="relative">
                  {/* Subtle glow behind photo */}
                  <div
                    className="absolute inset-0 blur-[50px] opacity-20"
                    style={{
                      background:
                        'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%)',
                    }}
                  />
                  <img
                    src={user.profileImageUrl}
                    alt={user.firstName || 'Profile'}
                    className={`relative w-[100px] h-[100px] md:w-[180px] md:h-[180px] ${
                      hasProcessedPhoto
                        ? 'object-contain'
                        : 'rounded-full object-cover border-2 border-primary/40'
                    }`}
                  />
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-200">
                  <div className="opacity-0 group-hover:opacity-100 text-center transition-opacity">
                    <Camera className="w-6 h-6 text-white mx-auto mb-1" />
                    <span className="text-xs text-white font-medium">Change</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-[100px] h-[100px] md:w-[180px] md:h-[180px] rounded-full border-2 border-dashed border-primary/40 flex flex-col items-center justify-center gap-1 hover:border-primary/60 transition-colors">
                <Camera className="w-8 h-8 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Upload</span>
              </div>
            )}

            {/* Upload progress overlay */}
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center z-10">
                <Loader2 className="w-6 h-6 text-white animate-spin mb-2" />
                <span className="text-xs text-white font-medium">
                  {progress < 50 ? 'Loading AI...' : 'Removing background...'}
                </span>
                <div className="w-16 h-1 bg-white/20 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>
    </motion.div>
  );
}
