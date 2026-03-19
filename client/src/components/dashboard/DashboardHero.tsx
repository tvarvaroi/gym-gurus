import { memo } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumberTicker } from '@/components/ui/number-ticker';

interface DashboardHeroProps {
  user: any;
  isConnected: boolean;
  greeting: string;
  activeClients: number;
  completedSessionsThisWeek: number;
  upcomingSessions: number;
  onNavigate: (path: string) => void;
  onAddClient: () => void;
}

const DashboardHero = memo(
  ({
    user,
    isConnected,
    greeting,
    activeClients,
    completedSessionsThisWeek,
    upcomingSessions,
    onNavigate,
    onAddClient,
  }: DashboardHeroProps) => {
    const stats = [
      { value: activeClients, label: 'Active Clients' },
      { value: completedSessionsThisWeek, label: 'Sessions This Week' },
      { value: upcomingSessions, label: 'Upcoming Today' },
    ];

    return (
      <div className="relative rounded-2xl border border-border/20 bg-gradient-to-br from-primary/8 via-background to-background overflow-hidden animate-in fade-in duration-300">
        {/* Top accent line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="px-6 py-8 md:px-8">
          {/* Greeting row */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {greeting},{' '}
              <span className="text-foreground font-medium">{user?.firstName || 'Trainer'}</span>
            </p>
            <div
              className="flex items-center gap-1.5"
              title={isConnected ? 'Real-time sync active' : 'Reconnecting to server...'}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`}
              />
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-start justify-center gap-0 mb-8">
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex items-start">
                {i > 0 && (
                  <div className="w-px h-10 bg-border/40 mx-6 md:mx-8 mt-1 flex-shrink-0" />
                )}
                <div className="text-center">
                  <NumberTicker
                    value={stat.value}
                    className="text-4xl font-extralight tabular-nums text-foreground"
                  />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div className="flex items-center gap-3">
            <Button size="sm" className="h-9 text-sm gap-1.5" onClick={onAddClient}>
              <Plus className="w-3.5 h-3.5" />
              Add Client
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm gap-1.5"
              onClick={() => onNavigate('/workouts')}
            >
              Create Workout
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

DashboardHero.displayName = 'DashboardHero';

export default DashboardHero;
