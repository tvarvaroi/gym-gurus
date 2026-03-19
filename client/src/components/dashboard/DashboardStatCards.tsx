import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NumberTicker } from '@/components/ui/number-ticker';

export interface StatItem {
  label: string;
  value: string;
  icon: any;
  trend: string;
  change: string;
  changeType: string;
  color: string;
  bgGlow: string;
}

interface DashboardStatCardsProps {
  stats: StatItem[];
  onNavigate: (path: string) => void;
}

const DashboardStatCards = memo(({ stats, onNavigate }: DashboardStatCardsProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
    {stats.map((stat) => (
      <Card
        key={stat.label}
        className={`
          relative overflow-hidden cursor-pointer
          bg-gradient-to-br ${stat.bgGlow}
          glass border-border/40
          hover:shadow-lg hover:border-primary/30 hover:-translate-y-1.5
          active:scale-[0.97]
          transition-all duration-300 group
        `}
        onClick={() => {
          if (stat.label === 'Active Clients') onNavigate('/clients');
          if (stat.label === 'Workout Plans') onNavigate('/workouts');
          if (stat.label === 'Sessions This Week') onNavigate('/schedule');
        }}
      >
        {/* Hover glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
            {stat.label}
          </CardTitle>
          <div className="relative">
            <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-all duration-300">
              <stat.icon
                className={`h-5 w-5 ${stat.color} transition-all duration-500 group-hover:scale-125 group-hover:rotate-12`}
              />
            </div>
            {stat.changeType === 'increase' && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <NumberTicker
              value={Number(stat.value) || 0}
              className="text-4xl font-extralight tabular-nums"
            />
          </div>
          <p className="text-xs text-muted-foreground/60 mt-2">{stat.trend}</p>
        </CardContent>
      </Card>
    ))}
  </div>
));

DashboardStatCards.displayName = 'DashboardStatCards';

export default DashboardStatCards;
