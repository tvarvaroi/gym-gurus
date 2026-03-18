import { Link } from 'wouter';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
  href?: string;
  className?: string;
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const trendColors = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  flat: 'text-muted-foreground/40',
};

export function StatCard({ label, value, unit, icon, trend, href, className }: StatCardProps) {
  const content = (
    <div
      className={cn(
        'bg-card rounded-2xl border border-border/20 p-3 md:p-5',
        'transition-colors duration-200 animate-in fade-in slide-in-from-bottom-2 duration-300',
        href && 'cursor-pointer hover:border-primary/30',
        className
      )}
    >
      <div className="flex items-center justify-between mb-1.5 md:mb-2">
        <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">
          {label}
        </p>
        {icon && <div className="text-primary/40 flex-shrink-0">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-2xl md:text-3xl font-bold tabular-nums">{value}</p>
        {unit && <span className="text-xs text-muted-foreground/40 font-medium">{unit}</span>}
        {trend && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs ml-auto',
              trendColors[trend.direction]
            )}
          >
            {(() => {
              const Icon = trendIcons[trend.direction];
              return <Icon className="w-3 h-3" />;
            })()}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
