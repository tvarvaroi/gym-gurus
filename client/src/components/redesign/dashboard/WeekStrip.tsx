import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Check } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface WeekStripProps {
  weeklyActivity: any;
}

function getTypeDotColor(type: string | null): string {
  switch (type?.toLowerCase()) {
    case 'push': return 'bg-red-500';
    case 'pull': return 'bg-blue-500';
    case 'legs': return 'bg-green-500';
    case 'upper': return 'bg-amber-500';
    case 'lower': return 'bg-teal-500';
    case 'full': case 'full_body': return 'bg-purple-500';
    default: return 'bg-primary';
  }
}

export function WeekStrip({ weeklyActivity }: WeekStripProps) {
  const prefersReducedMotion = useReducedMotion();
  const richDays: any[] = weeklyActivity?.richDays || [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.getDate();
  });

  const animProps = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: 0.1 } };

  return (
    <Link href="/schedule">
      <motion.a {...animProps} className="block cursor-pointer group">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground/50 font-medium">
            This Week
          </span>
          <span className="text-xs text-muted-foreground/30 group-hover:text-primary transition-colors">
            Schedule →
          </span>
        </div>

        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => {
            const richDay = richDays[i];
            const dayName = richDay?.day || dayNames[i];
            const status = richDay?.status || 'rest';
            const sessions: any[] = richDay?.sessions || [];
            const isToday = i === todayIndex;
            const hasWorkout = status === 'completed' && sessions.length > 0;
            const workoutType = sessions[0]?.workoutType || null;

            return (
              <div
                key={i}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-colors ${
                  isToday ? 'bg-primary/10 ring-1 ring-primary/30' : hasWorkout ? 'bg-white/[0.03]' : ''
                }`}
              >
                <span className={`text-[10px] uppercase tracking-wider ${isToday ? 'text-primary font-bold' : 'text-muted-foreground/40'}`}>
                  {dayName}
                </span>
                <span className={`text-sm font-bold tabular-nums mt-0.5 ${
                  isToday ? 'text-primary' : hasWorkout ? 'text-foreground' : 'text-muted-foreground/20'
                }`}>
                  {weekDates[i]}
                </span>

                {/* Workout indicator */}
                <div className="mt-1.5 h-4 flex items-center justify-center">
                  {hasWorkout ? (
                    <div className={`w-3.5 h-3.5 rounded-full ${getTypeDotColor(workoutType)} flex items-center justify-center`}>
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  ) : isToday && status === 'today_pending' ? (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  ) : status === 'planned' ? (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/10" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.a>
    </Link>
  );
}
