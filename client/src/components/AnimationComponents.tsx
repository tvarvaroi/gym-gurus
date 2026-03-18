import { memo } from 'react';

// Shared page transition component
export const PageTransition = memo(({ children }: { children: React.ReactNode }) => (
  <div className="animate-in fade-in duration-200">{children}</div>
));
PageTransition.displayName = 'PageTransition';

// Shared stagger container component
export const StaggerContainer = memo(
  ({
    children,
    delay = 0,
    className,
  }: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
  }) => {
    return (
      <div
        className={`animate-in fade-in duration-200 ${className || ''}`}
        style={delay ? { animationDelay: `${delay * 1000}ms` } : undefined}
      >
        {children}
      </div>
    );
  }
);
StaggerContainer.displayName = 'StaggerContainer';

// Shared stagger item component
export const StaggerItem = memo(
  ({ children, index = 0 }: { children: React.ReactNode; index?: number }) => {
    return (
      <div
        className="animate-in fade-in duration-200"
        style={
          index ? { animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' } : undefined
        }
      >
        {children}
      </div>
    );
  }
);
StaggerItem.displayName = 'StaggerItem';
