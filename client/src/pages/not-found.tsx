import { Home, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';

export default function NotFound() {
  const { user } = useUser();
  const homeUrl = user ? '/dashboard' : '/';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md animate-in fade-in slide-in-from-bottom-3 duration-500">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center animate-pulse">
          <Dumbbell className="h-10 w-10 text-primary/60" />
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-foreground">404</h1>
          <p className="text-lg text-muted-foreground font-light">This page took a rest day</p>
          <p className="text-sm text-muted-foreground/70">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Button size="lg" onClick={() => (window.location.href = homeUrl)}>
          <Home className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
