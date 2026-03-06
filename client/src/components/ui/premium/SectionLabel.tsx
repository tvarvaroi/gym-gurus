import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionLabelProps {
  label: string;
  action?: { label: string; href: string };
  className?: string;
}

export function SectionLabel({ label, action, className }: SectionLabelProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground/50 font-medium">
        {label}
      </span>
      {action && (
        <Link href={action.href}>
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer">
            {action.label}
            <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      )}
    </div>
  );
}
