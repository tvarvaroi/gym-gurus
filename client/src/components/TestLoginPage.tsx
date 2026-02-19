import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type UserRole = 'trainer' | 'client' | 'solo';

export function TestLoginPage() {
  const handleRoleSelect = (role: UserRole) => {
    window.location.href = `/api/login?role=${role}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Login - Select Role</CardTitle>
          <CardDescription>This is a simplified login page for E2E testing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => handleRoleSelect('trainer')}
            className="w-full"
            size="lg"
            aria-label="Select trainer role"
          >
            Trainer
          </Button>
          <Button
            onClick={() => handleRoleSelect('client')}
            className="w-full"
            size="lg"
            variant="outline"
            aria-label="Select client role"
          >
            Client
          </Button>
          <Button
            onClick={() => handleRoleSelect('solo')}
            className="w-full"
            size="lg"
            variant="outline"
            aria-label="Select solo role"
          >
            Solo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
