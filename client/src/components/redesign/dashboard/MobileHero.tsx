import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, Play } from 'lucide-react';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useToast } from '@/hooks/use-toast';
import { formatVolume } from '@/lib/format';

interface MobileHeroProps {
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
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function MobileHero({ user, gamification, fitnessProfile }: MobileHeroProps) {
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  // Deduplicated — same query keys as ActionZone and useSoloDashboardData; no new network calls
  const { data: soloStats } = useQuery<any>({
    queryKey: ['/api/solo/stats'],
    retry: false,
    staleTime: 2 * 60 * 1000,
  });
  const { data: todayWorkout } = useQuery<any>({
    queryKey: ['/api/solo/today-workout'],
    retry: false,
    staleTime: 60 * 1000,
  });

  const greeting = getGreeting();
  const subtitle = getMotivationalSubtitle(gamification, fitnessProfile);
  const hasPhoto = !!user?.profileImageUrl;

  // Stats — sourced from already-fetched data
  const totalWorkouts = gamification?.totalWorkoutsCompleted ?? soloStats?.totalWorkouts ?? 0;
  const streak = gamification?.currentStreakDays ?? 0;
  const weeklyVolume = soloStats?.weeklyVolumeKg ?? 0;
  const rankValue =
    gamification?.rankGenZ ||
    (gamification?.currentLevel != null ? `Level ${gamification.currentLevel}` : '—');

  // Action button logic (mirrors ActionZone)
  const workout = todayWorkout?.workout || todayWorkout?.suggestedWorkout;
  const isCompleted = workout?.status === 'completed';
  const workoutHref =
    workout && !isCompleted
      ? `/workout-execution/${workout.workoutId || workout.id}`
      : '/solo/generate';
  const workoutLabel = workout && !isCompleted ? "Start Today's Workout" : 'Generate Workout';

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      };

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
    } catch {
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

  const stats = [
    { value: String(totalWorkouts), label: 'TOTAL WORKOUTS' },
    { value: String(streak), label: 'STREAK', suffix: streak === 1 ? 'day' : 'days' },
    { value: formatVolume(weeklyVolume), label: 'THIS WEEK', suffix: 'kg' },
    { value: rankValue, label: 'RANK' },
  ];

  return (
    <motion.div {...animProps} className="pt-3 md:pt-0 relative z-10">
      {/* Mobile: compact inline avatar + greeting — unchanged */}
      <div className="flex items-center gap-4 md:hidden">
        <label className="relative cursor-pointer group flex-shrink-0">
          {hasPhoto ? (
            <img
              src={user.profileImageUrl}
              alt={user.firstName || 'Profile'}
              className="w-14 h-14 rounded-full object-cover object-top ring-2 ring-primary/20"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
              <Camera className="w-5 h-5 text-primary/40" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
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
        <div className="flex-1 min-w-0">
          <p className="text-xs tracking-widest text-muted-foreground/50 font-medium">{greeting}</p>
          <h1 className="text-xl font-bold font-['Playfair_Display'] leading-tight truncate">
            {user?.firstName || 'Warrior'}
          </h1>
          <p className="text-xs text-muted-foreground/60 truncate">{subtitle}</p>
        </div>
      </div>

      {/* Desktop: elevated card with photo bleeding out of bottom-right */}
      <div
        className="hidden md:block relative rounded-2xl border border-border/20 bg-card shadow-lg"
        style={{ overflow: 'visible' }}
      >
        {/* Card content — right padding reserves space for photo */}
        <div className={`p-6 lg:p-8 ${hasPhoto ? 'pr-[180px] lg:pr-[250px]' : ''}`}>
          {/* Greeting */}
          <p className="text-xs tracking-[0.2em] uppercase text-white/40 mb-2">{greeting}</p>

          {/* Name */}
          <h1 className="text-5xl lg:text-6xl font-bold font-['Playfair_Display'] leading-tight mb-2">
            {user?.firstName || 'Warrior'}
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-white/50 mb-6">{subtitle}</p>

          {/* Stats row */}
          <div className="flex items-start mb-6">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`flex-1 ${i > 0 ? 'pl-4 lg:pl-6 border-l border-white/10' : ''} ${i < stats.length - 1 ? 'pr-4 lg:pr-6' : ''}`}
              >
                <div className="text-2xl font-bold text-white leading-none">
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-sm font-normal text-white/50 ml-1">{stat.suffix}</span>
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-white/50 mt-1.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Action button — Link styled as button (avoids <a><button> nesting) */}
          <Link
            href={workoutHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(43_54%_55%)] text-[hsl(0_0%_8%)] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Play className="w-4 h-4" />
            {workoutLabel}
          </Link>
        </div>

        {/* Photo — absolute bottom-right, 20% bleeds below card edge */}
        {hasPhoto ? (
          <div className="absolute right-0 bottom-0 translate-y-[20%] z-10">
            <label className="relative cursor-pointer group block">
              <div
                className="absolute inset-[-30px] blur-[60px] opacity-20 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, hsl(var(--primary) / 0.7) 0%, transparent 60%)',
                }}
              />
              <img
                src={user.profileImageUrl}
                alt={user.firstName || 'Profile'}
                className="relative h-[220px] lg:h-[320px] w-auto max-w-[150px] lg:max-w-[220px] object-contain"
                style={{
                  filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.6))',
                  maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
                }}
              />
              {/* Change photo badge — emerges from photo bottom on hover */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                <div className="bg-black/70 rounded-full px-3 py-1.5 backdrop-blur-sm flex items-center gap-1.5 border border-white/10 shadow-lg whitespace-nowrap">
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <span className="text-xs text-white font-medium">Change photo</span>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
              {uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  <div className="bg-black/70 rounded-2xl px-6 py-4 backdrop-blur-sm flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                    <span className="text-xs text-white/80 font-medium">
                      Removing background...
                    </span>
                  </div>
                </div>
              )}
            </label>
          </div>
        ) : (
          /* No photo: dashed upload zone centered in the right side */
          <div className="absolute right-6 lg:right-8 top-1/2 -translate-y-1/2">
            <label className="relative cursor-pointer group block">
              <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-border/30 hover:border-primary/40 flex flex-col items-center justify-center gap-2 transition-colors">
                <Camera className="w-7 h-7 text-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                  Upload Photo
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

        {/* Gradient at card bottom-right to soften photo bleed transition */}
        {hasPhoto && (
          <div
            className="absolute bottom-0 right-0 w-[200px] lg:w-[280px] h-6 rounded-br-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(to top, hsl(var(--card)) 0%, transparent 100%)',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
