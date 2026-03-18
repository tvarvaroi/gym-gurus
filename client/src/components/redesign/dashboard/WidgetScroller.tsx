import { Link } from 'wouter';
import { MessageSquare, Zap, Dumbbell, Apple, TrendingUp, Calculator } from 'lucide-react';

const WIDGETS = [
  { icon: MessageSquare, label: 'AI Coach', href: '/solo/coach', color: 'text-purple-400' },
  { icon: Zap, label: 'Generate', href: '/solo/generate', color: 'text-amber-400' },
  { icon: Dumbbell, label: 'Workouts', href: '/workouts', color: 'text-blue-400' },
  { icon: Apple, label: 'Nutrition', href: '/solo/nutrition', color: 'text-green-400' },
  { icon: TrendingUp, label: 'Progress', href: '/progress', color: 'text-teal-400' },
  {
    icon: Calculator,
    label: 'Calculators',
    href: '/dashboard/calculators',
    color: 'text-orange-400',
  },
] as const;

export function WidgetScroller() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground/50 font-medium">
          Quick Access
        </span>
      </div>

      {/* Mobile: 3-column grid for readability */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        {WIDGETS.map((widget) => {
          const Icon = widget.icon;
          return (
            <Link key={widget.label} href={widget.href}>
              <div className="h-[72px] bg-card rounded-2xl border border-border/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/30 transition-colors">
                <Icon className={`w-5 h-5 ${widget.color}`} />
                <span className="text-xs text-muted-foreground/60 font-medium">{widget.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop: 6-column grid */}
      <div className="hidden md:grid md:grid-cols-6 gap-2">
        {WIDGETS.map((widget) => {
          const Icon = widget.icon;
          return (
            <Link key={widget.label} href={widget.href}>
              <div className="bg-card rounded-2xl border border-border/20 p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/30 group transition-colors">
                <Icon
                  className={`w-6 h-6 ${widget.color} group-hover:scale-110 transition-transform`}
                />
                <span className="text-xs text-muted-foreground/60 group-hover:text-foreground transition-colors font-medium">
                  {widget.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
