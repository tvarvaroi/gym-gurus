/**
 * Email backup card — Sprint 2 BATCH 5
 *
 * One toggle. Tooltip on the label explains the trigger condition accurately:
 * email fires only when push delivery fails on every device AND the type is in
 * the high-priority allowlist (server-side EMAIL_FALLBACK_HIGH_PRIORITY_TYPES).
 *
 * Default ON when the user first lands here — matches DEFAULT_PREFS.channels.email
 * which is server-side false but the migration backfill set it true if the user
 * had the legacy `email: true` flag. Either way the local state mirrors what the
 * server returned.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

export function EmailBackupCard() {
  const { data: prefs, isLoading, update } = useNotificationPreferences();
  const { toast } = useToast();

  function handleToggle(next: boolean) {
    update.mutate(
      { channels: { email: next } },
      {
        onError: (err) =>
          toast({
            title: 'Save failed',
            description: err.message,
            variant: 'destructive',
          }),
      }
    );
  }

  return (
    <Card data-testid="email-backup-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <CardTitle className="text-base flex items-center gap-1.5">
              Email backup
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex cursor-help text-muted-foreground hover:text-foreground"
                      aria-label="What is email backup?"
                    >
                      <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]" data-testid="email-backup-tooltip">
                    For high-priority alerts only (e.g. payment issues, new workout assigned),
                    GymGurus will send an email if push delivery fails on every device. You&apos;ll
                    never get duplicate alerts on both channels.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription className="text-xs">
              Failsafe channel for critical alerts when push doesn&apos;t reach a device.
            </CardDescription>
          </div>
          {isLoading || !prefs ? (
            <Skeleton className="h-6 w-11 rounded-full" />
          ) : (
            <Switch
              checked={prefs.channels.email}
              onCheckedChange={handleToggle}
              aria-label="Email backup"
              data-testid="email-backup-toggle"
              className="cursor-pointer flex-shrink-0"
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-xs">
          Eligible types: payment received, new workout assigned, session reminder. Other
          notifications stay push-only.
        </p>
      </CardContent>
    </Card>
  );
}
