export function Footer() {
  return (
    <footer className="mt-auto border-t bg-background py-6">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} GymGurus. All rights reserved.</p>
      </div>
    </footer>
  );
}
