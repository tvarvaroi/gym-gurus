import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  titleAccent: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ icon, title, titleAccent, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="p-1.5 md:p-2 rounded-xl bg-primary/10 flex-shrink-0">
        <div className="h-5 w-5 md:h-7 md:w-7 text-primary">{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl md:text-3xl font-['Playfair_Display'] font-extralight tracking-tight">
          {title}{' '}
          <span className="font-light bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {titleAccent}
          </span>
        </h1>
        {subtitle && (
          <p className="hidden md:block text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
