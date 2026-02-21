// Minimal test login page to debug redirect issue
export function TestMinimalLogin() {
  console.log('[TestMinimalLogin] Component rendering!');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-4">Test Login Page</h1>
        <p className="text-muted-foreground">
          This is a minimal test page to debug the redirect issue.
        </p>
        <p className="mt-4 text-sm">Current URL: {window.location.href}</p>
      </div>
    </div>
  );
}
