import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  helpText?: string;
  className?: string;
  animated?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  helpText,
  className,
  animated = true,
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed border-border/50 glass-strong shadow-premium', className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
        {/* Icon with Glow */}
        <div className="relative inline-block">
          <div className={animated ? 'animate-in zoom-in duration-300' : ''}>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          </div>
          {animated && (
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          )}
        </div>

        {/* Text Content */}
        <div className="text-center space-y-2 max-w-md">
          <h3 className="text-lg font-light">{title}</h3>
          <p className="text-sm font-light text-muted-foreground/80">{description}</p>
        </div>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {action && (
              <div className="transition-transform hover:scale-105 active:scale-95">
                <Button
                  onClick={action.onClick}
                  className="shadow-premium hover:shadow-premium-lg transition-all duration-300"
                >
                  {action.label}
                </Button>
              </div>
            )}
            {secondaryAction && (
              <div className="transition-transform hover:scale-105 active:scale-95">
                <Button
                  variant="outline"
                  onClick={secondaryAction.onClick}
                  className="hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
                >
                  {secondaryAction.label}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        {helpText && (
          <p className="text-xs font-light text-muted-foreground/60 max-w-sm text-center">
            {helpText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
