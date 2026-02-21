// Minimal non-lazy test component
export default function TestAuthLogin() {
  console.log('[TestAuthLogin] Rendering!');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-4 text-foreground">Test Auth Login</h1>
        <p className="text-muted-foreground">
          This is a minimal test component to verify routing works.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">Current URL: {window.location.href}</p>
      </div>
    </div>
  );
}
