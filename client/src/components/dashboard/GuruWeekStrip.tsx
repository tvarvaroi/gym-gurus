import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Check, Calendar } from 'lucide-react';

interface WeekDay {
  date: string;
  dayName: string;
  dateNumber: number;
  completedSessions: number;
  scheduledSessions: number;
  totalSessions: number;
}

export function GuruWeekStrip() {
  const { data, isLoading } = useQuery<{ days: WeekDay[] }>({
    queryKey: ['/api/dashboard/week-activity'],
    staleTime: 2 * 60 * 1000,
  });

  const days = data?.days || [];

  // Determine today's index (0=Mon, 6=Sun)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  if (isLoading || days.length === 0) return null;

  return (
    <Link href="/schedule">
      <a className="block cursor-pointer group animate-in fade-in slide-in-from-bottom-1 duration-300">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground/50 font-medium flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            This Week
          </span>
          <span className="text-xs text-muted-foreground/30 group-hover:text-primary transition-colors">
            Schedule →
          </span>
        </div>

        <div className="flex gap-1 rounded-xl border border-border/20 bg-card p-2">
          {days.map((day, i) => {
            const isToday = i === todayIndex;
            const hasCompleted = day.completedSessions > 0;
            const hasScheduled = day.scheduledSessions > 0;

            return (
              <div
                key={day.date}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-colors ${
                  isToday
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : hasCompleted
                      ? 'bg-white/[0.03]'
                      : ''
                }`}
              >
                <span
                  className={`text-[10px] uppercase tracking-wider ${
                    isToday ? 'text-primary font-bold' : 'text-muted-foreground/40'
                  }`}
                >
                  {day.dayName}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums mt-0.5 ${
                    isToday
                      ? 'text-primary'
                      : hasCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground/20'
                  }`}
                >
                  {day.dateNumber}
                </span>

                {/* Session indicator */}
                <div className="mt-1.5 h-4 flex items-center justify-center">
                  {hasCompleted ? (
                    <div className="flex items-center gap-0.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                      {day.completedSessions > 1 && (
                        <span className="text-[9px] text-primary font-bold ml-0.5">
                          {day.completedSessions}
                        </span>
                      )}
                    </div>
                  ) : hasScheduled ? (
                    <div className="w-2 h-2 rounded-full border border-muted-foreground/30" />
                  ) : isToday ? (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/10" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </a>
    </Link>
  );
}
