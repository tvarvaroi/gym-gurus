import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NumberTicker } from '@/components/ui/number-ticker';
import { cn } from '@/lib/utils';

interface WorkoutSession {
  id: number;
  workoutName: string;
  date: string;
  totalVolumeKg: number;
  workoutType: string | null;
}

interface StreakCalendarProps {
  className?: string;
  /** Number of weeks to show (default 12) */
  weeks?: number;
  /** Hide the consistency stats below the calendar */
  hideStats?: boolean;
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

export function StreakCalendar({ className, weeks = 12, hideStats }: StreakCalendarProps) {
  const { data: sessions = [] } = useQuery<WorkoutSession[]>({
    queryKey: ['/api/solo/workout-sessions', weeks],
    queryFn: async () => {
      const res = await fetch(`/api/solo/workout-sessions?weeks=${weeks}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch sessions');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const { dayMap, maxVolume, grid, totalWorkouts, currentStreak, bestStreak } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Build day → sessions map
    const map = new Map<string, { names: string[]; volume: number }>();
    for (const s of sessions) {
      const key = s.date.slice(0, 10);
      const existing = map.get(key);
      if (existing) {
        existing.names.push(s.workoutName);
        existing.volume += s.totalVolumeKg;
      } else {
        map.set(key, { names: [s.workoutName], volume: s.totalVolumeKg });
      }
    }

    // Find max volume for intensity scaling
    let maxVol = 0;
    map.forEach((d) => {
      if (d.volume > maxVol) maxVol = d.volume;
    });

    // Build grid: weeks × 7 days (Mon=0, Sun=6)
    // End at end of this week, go back `weeks` weeks
    const endDate = new Date(now);
    // Set to Sunday of this week
    const dayOfWeek = endDate.getDay(); // 0=Sun
    const daysUntilSun = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    endDate.setDate(endDate.getDate() + daysUntilSun);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - weeks * 7 + 1);
    // Adjust to Monday
    const startDay = startDate.getDay();
    if (startDay !== 1) {
      const diff = startDay === 0 ? -6 : 1 - startDay;
      startDate.setDate(startDate.getDate() + diff);
    }

    const gridData: { date: string; isToday: boolean; isFuture: boolean }[][] = [];
    const current = new Date(startDate);
    for (let w = 0; w < weeks; w++) {
      const week: { date: string; isToday: boolean; isFuture: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().slice(0, 10);
        week.push({
          date: dateStr,
          isToday: dateStr === todayStr,
          isFuture: current > now,
        });
        current.setDate(current.getDate() + 1);
      }
      gridData.push(week);
    }

    // Calculate streaks
    // Sort unique workout dates descending
    const workoutDates = Array.from(new Set(sessions.map((s) => s.date.slice(0, 10))))
      .sort()
      .reverse();
    let currStreak = 0;
    let bestStr = 0;

    if (workoutDates.length > 0) {
      // Current streak: count consecutive days from today backwards
      const checkDate = new Date(now);
      checkDate.setHours(0, 0, 0, 0);

      // Allow today or yesterday as streak start
      const todayKey = checkDate.toISOString().slice(0, 10);
      const yesterday = new Date(checkDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().slice(0, 10);

      let streakDate: Date;
      if (map.has(todayKey)) {
        streakDate = new Date(checkDate);
      } else if (map.has(yesterdayKey)) {
        streakDate = new Date(yesterday);
      } else {
        streakDate = new Date(0); // no active streak
      }

      if (streakDate.getTime() > 0) {
        const d = new Date(streakDate);
        while (map.has(d.toISOString().slice(0, 10))) {
          currStreak++;
          d.setDate(d.getDate() - 1);
        }
      }

      // Best streak: scan all dates ascending
      const asc = [...workoutDates].reverse();
      let tempStreak = 1;
      bestStr = 1;
      for (let i = 1; i < asc.length; i++) {
        const prev = new Date(asc[i - 1]);
        const curr = new Date(asc[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > bestStr) bestStr = tempStreak;
        } else {
          tempStreak = 1;
        }
      }
    }

    return {
      dayMap: map,
      maxVolume: maxVol,
      grid: gridData,
      totalWorkouts: sessions.length,
      currentStreak: currStreak,
      bestStreak: bestStr,
    };
  }, [sessions, weeks]);

  const getIntensity = (volume: number): number => {
    if (maxVolume === 0 || volume === 0) return 0;
    const ratio = volume / maxVolume;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Calendar grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-1 pt-0">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="h-[14px] text-[9px] text-muted-foreground/50 leading-[14px] select-none"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => {
              const entry = dayMap.get(day.date);
              const intensity = entry ? getIntensity(entry.volume) : 0;

              return (
                <div
                  key={day.date}
                  className={cn(
                    'w-[14px] h-[14px] rounded-[3px] transition-colors',
                    day.isFuture && 'opacity-20',
                    day.isToday && 'ring-1 ring-primary/60',
                    intensity === 0 && 'bg-white/[0.04]',
                    intensity === 1 && 'bg-primary/20',
                    intensity === 2 && 'bg-primary/40',
                    intensity === 3 && 'bg-primary/65',
                    intensity === 4 && 'bg-primary/90'
                  )}
                  title={
                    entry
                      ? `${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${entry.names.join(', ')} — ${Math.round(entry.volume)} kg`
                      : new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                  }
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
        <span>Less</span>
        <div className="w-[10px] h-[10px] rounded-[2px] bg-white/[0.04]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/20" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/40" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/65" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/90" />
        <span>More</span>
      </div>

      {/* Consistency stats */}
      {!hideStats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <p className="text-lg font-bold">
              <NumberTicker value={totalWorkouts} className="text-lg font-bold" />
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              Workouts ({weeks}w)
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <p className="text-lg font-bold">
              <NumberTicker value={currentStreak} className="text-lg font-bold" />
              <span className="text-xs font-light text-muted-foreground ml-0.5">d</span>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              Current Streak
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <p className="text-lg font-bold">
              <NumberTicker value={bestStreak} className="text-lg font-bold" />
              <span className="text-xs font-light text-muted-foreground ml-0.5">d</span>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              Best Streak
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
