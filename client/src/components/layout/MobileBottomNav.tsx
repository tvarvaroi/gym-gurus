import { useLocation } from 'wouter';
import { Home, MessageSquare, Dumbbell, TrendingUp, Menu } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

const TABS = [
  { label: 'Home', icon: Home, href: '/solo', match: ['/solo', '/dashboard'] },
  { label: 'Coach', icon: MessageSquare, href: '/solo/coach', match: ['/solo/coach'] },
  { label: 'Workout', icon: Dumbbell, href: '/solo/generate', match: ['/solo/generate', '/workouts'] },
  { label: 'Progress', icon: TrendingUp, href: '/progress', match: ['/progress'] },
] as const;

export default function MobileBottomNav() {
  const [location, navigate] = useLocation();
  const { toggleSidebar } = useSidebar();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border/30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 h-16">
        {TABS.map((tab) => {
          const { label, icon: Icon, href } = tab;
          const isActive = tab.match.some((m) => location === m || location.startsWith(m + '/'));
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground/60'
              }`}
            >
              <div
                className={`relative p-1 rounded-lg transition-colors ${isActive ? 'bg-primary/10' : ''}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center gap-1 text-muted-foreground/60 transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-xs font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
