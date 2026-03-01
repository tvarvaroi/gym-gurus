import { useLocation } from 'wouter';
import { Home, MessageSquare, Dumbbell, TrendingUp, Menu } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

const TABS = [
  { label: 'Home', icon: Home, href: '/solo' },
  { label: 'Coach', icon: MessageSquare, href: '/solo/coach' },
  { label: 'Workout', icon: Dumbbell, href: '/solo/generate' },
  { label: 'Progress', icon: TrendingUp, href: '/progress' },
] as const;

export default function MobileBottomNav() {
  const [location, navigate] = useLocation();
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border/30">
      <div
        className="grid grid-cols-5 h-16"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {TABS.map(({ label, icon: Icon, href }) => {
          const isActive = location === href || (href === '/solo' && location === '/solo');
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground/60'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isActive && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center gap-1 text-muted-foreground/60 transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
