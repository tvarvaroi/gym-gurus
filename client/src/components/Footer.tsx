import { useLocation } from 'wouter';

export function Footer() {
  const [location] = useLocation();
  const hideOnMobile = location === '/solo/coach';

  return (
    <footer
      className={`mt-auto border-t bg-background py-6 ${hideOnMobile ? 'hidden md:block' : ''}`}
    >
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} GymGurus. All rights reserved.</p>
      </div>
    </footer>
  );
}
