/**
 * ImportProgressCard — Sprint 5 BATCH 5
 *
 * The single most user-visible component of the Apple Health import flow.
 * Users live here for 30s–3min during parsing, so UX polish weight is highest.
 * Renders five states: uploaded → parsing → completed | failed | cancelled.
 *
 * BATCH 4 Decision 3 (hybrid escalation):
 *   0–60s on page: live polling progress, no escalation
 *   60s+ on page: "Still working" card appears alongside progress, with
 *                 opportunistic push permission prompt (NOT at mount)
 *
 * BATCH 4 Decision 4 (typed error classes):
 *   Storage error → Retry button (file is fine, parse path choked)
 *   Parse error   → Re-upload button (file is corrupt) + help link
 *   Empty result  → No retry; only Delete + help link
 *
 * BATCH 4 Decision 5 (re-import duplicate semantics):
 *   Inline counter on completion: "X new records imported, Y duplicates skipped"
 *   "Why are some records duplicates?" → opens AppleHealthHelpModal
 *
 * Polling cadence locked at 5 seconds (BATCH 5 sub-question 2 verification:
 * apple-health routes mount under writeRateLimit = 30 req/min; 5s polling =
 * 12 req/min, 40% saturation, comfortable headroom for retries / navigation).
 *
 * Touch targets: all interactive elements ≥44px. Action buttons use
 * size="lg" (h-11 = 44px). Status pill is presentational only (no tap target
 * required).
 *
 * a11y: status updates announced via role="status" + aria-live="polite" on
 * the parsing-progress region. Terminal-state announcements use aria-live so
 * screen readers hear completion without waiting for a tab change.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertCircle,
  RotateCw,
  Upload,
  Bell,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  PushPermissionPrompt,
  shouldShowPushPrompt,
} from '@/components/notifications/PushPermissionPrompt';
import { AppleHealthHelpModal } from './AppleHealthHelpModal';

// ─── Polling cadence (locked per sub-question 2 verification) ───────────────
const POLL_INTERVAL_MS = 5_000; // 5s — under 30/min writeRateLimit cap
const ESCALATION_THRESHOLD_MS = 60_000; // 60s — BATCH 4 D3

// ─── Status enum (mirrors APPLE_HEALTH_IMPORT_STATUSES in shared/schema.ts) ──
type ImportStatus = 'uploaded' | 'parsing' | 'completed' | 'failed' | 'cancelled';
const TERMINAL_STATUSES: ReadonlySet<ImportStatus> = new Set<ImportStatus>([
  'completed',
  'failed',
  'cancelled',
]);

interface AppleHealthImportRow {
  id: string;
  userId: string;
  fileSizeBytes: number;
  fileR2Key: string | null;
  status: ImportStatus;
  recordsParsed: number;
  recordsIngestedWorkout: number;
  recordsIngestedSleep: number;
  recordsIngestedVitals: number;
  recordsIngestedBody: number;
  recordsSkippedDuplicate: number;
  recordsSkippedUnparseable: number;
  errorMessage: string | null;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ─── Error class mapping (BATCH 4 D4) ───────────────────────────────────────
type ErrorClass = 'storage' | 'parse' | 'empty' | 'unknown';

interface ClassifiedError {
  class: ErrorClass;
  copy: string;
  /** The raw error_message stays available behind a "Show details" expander. */
  rawMessage: string;
}

/**
 * Maps the raw error_message string to a user-facing class. Heuristic — keeps
 * the small set of classes from BATCH 4 D4. Default to 'parse' (most common
 * failure class for malformed exports) so unknown errors get the most
 * actionable copy (re-upload).
 */
function classifyError(row: AppleHealthImportRow): ClassifiedError | null {
  const totalIngested =
    row.recordsIngestedWorkout +
    row.recordsIngestedSleep +
    row.recordsIngestedVitals +
    row.recordsIngestedBody;

  // Empty-result class fires on status='completed' with zero ingested AND zero
  // duplicates (a user who already imported and re-imported produces "5
  // duplicates skipped" — that's not the empty class).
  if (row.status === 'completed' && totalIngested === 0 && row.recordsSkippedDuplicate === 0) {
    return {
      class: 'empty',
      copy: 'No supported records were found. Make sure you exported full Health data — see help.',
      rawMessage: '',
    };
  }

  if (row.status !== 'failed') return null;
  const msg = row.errorMessage ?? '';
  const lower = msg.toLowerCase();

  if (
    /no file storage key|file no longer available|r2|storage|s3|getobject|putobject/i.test(lower)
  ) {
    return {
      class: 'storage',
      copy: "We couldn't read your uploaded file. This is a server-side issue — please retry.",
      rawMessage: msg,
    };
  }
  if (/sax|parse|xml|invalid input syntax|zip parse|export\.xml|unzipper/i.test(lower)) {
    return {
      class: 'parse',
      copy: "We couldn't parse your export.xml. The file may be incomplete or from an unsupported iOS version. Try re-exporting.",
      rawMessage: msg,
    };
  }
  // Default to parse — it's the most actionable class for unknown errors.
  return {
    class: 'unknown',
    copy: 'Something went wrong during import. Try re-uploading your export.',
    rawMessage: msg,
  };
}

// ─── Sub-component: status pill ─────────────────────────────────────────────

interface StatusPillProps {
  status: ImportStatus;
}

function StatusPill({ status }: StatusPillProps) {
  const map: Record<ImportStatus, { label: string; className: string; Icon: typeof Clock }> = {
    uploaded: {
      label: 'Queued',
      className: 'bg-muted text-muted-foreground',
      Icon: Clock,
    },
    parsing: {
      label: 'Processing',
      className: 'bg-primary/10 text-primary',
      Icon: Loader2,
    },
    completed: {
      label: 'Complete',
      className: 'bg-emerald-500/10 text-emerald-500',
      Icon: CheckCircle2,
    },
    failed: {
      label: 'Failed',
      className: 'bg-destructive/10 text-destructive',
      Icon: XCircle,
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-muted text-muted-foreground',
      Icon: AlertCircle,
    },
  };
  const { label, className, Icon } = map[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        className
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', status === 'parsing' && 'animate-spin')} aria-hidden />
      {label}
    </span>
  );
}

// ─── Sub-component: counters ────────────────────────────────────────────────

interface CountersProps {
  row: AppleHealthImportRow;
  variant: 'live' | 'final';
}

function Counters({ row, variant }: CountersProps) {
  const types = [
    { label: 'Workouts', value: row.recordsIngestedWorkout },
    { label: 'Sleep', value: row.recordsIngestedSleep },
    { label: 'Vitals', value: row.recordsIngestedVitals },
    { label: 'Body', value: row.recordsIngestedBody },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {types.map(({ label, value }) => (
        <div key={label} className="bg-card/50 border-border/40 rounded-lg border p-3 text-center">
          <div className="font-['Playfair_Display'] text-foreground text-2xl">{value}</div>
          <div className="text-muted-foreground mt-0.5 text-xs">{label}</div>
        </div>
      ))}
      {variant === 'final' && row.recordsSkippedDuplicate > 0 && (
        <div className="bg-muted/40 col-span-2 rounded-lg p-3 text-center sm:col-span-4">
          <div className="text-muted-foreground text-xs">
            <span className="text-foreground font-medium">{row.recordsSkippedDuplicate}</span>{' '}
            duplicates skipped (already imported)
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export interface ImportProgressCardProps {
  /** The import id to poll. */
  importId: string;
  /** Called when the user clicks "Re-upload" after a parse failure. Parent
   *  decides whether to delete the failed import row + return to upload form. */
  onReupload?: () => void;
  /** Called when the user clicks "Delete this attempt" on an empty-result. */
  onDeleted?: () => void;
}

export function ImportProgressCard({ importId, onReupload, onDeleted }: ImportProgressCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [pushPromptOpen, setPushPromptOpen] = useState(false);
  const [showRawError, setShowRawError] = useState(false);
  // Local clock for the escalation timer. Updated each second WHILE the
  // import is in-flight AND elapsed-since-createdAt is under the threshold.
  // After threshold crosses, the interval stops; escalated stays true.
  const [now, setNow] = useState<number>(() => Date.now());

  const queryKey = useMemo(() => ['/api/apple-health/imports', importId], [importId]);

  // ─── Polling query ────────────────────────────────────────────────────────
  // Cadence locked at 5s (POLL_INTERVAL_MS). Stops polling on terminal state.
  const { data: row, isLoading } = useQuery<AppleHealthImportRow>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/apple-health/imports/${importId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch import (${res.status})`);
      }
      return res.json();
    },
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return POLL_INTERVAL_MS;
      return TERMINAL_STATUSES.has(data.status) ? false : POLL_INTERVAL_MS;
    },
    // Refetch on window focus during active import (user comes back to the tab)
    refetchOnWindowFocus: (q) => {
      const data = q.state.data;
      return !!data && !TERMINAL_STATUSES.has(data.status);
    },
  });

  // ─── Escalation timer based on server-side createdAt ──────────────────────
  // Use row.createdAt (set when the user uploaded) rather than local time so a
  // user who navigates away mid-import and returns sees the escalation card if
  // their TOTAL wait exceeds the threshold — not a fresh 60s countdown each
  // visit. This mirrors how the user perceives the wait: they uploaded N
  // minutes ago, regardless of which tab is currently in front.
  const createdAtMs = row?.createdAt ? new Date(row.createdAt).getTime() : null;
  const elapsedMs = createdAtMs !== null ? now - createdAtMs : 0;
  const inFlight = !!row && !TERMINAL_STATUSES.has(row.status);
  const escalated = inFlight && elapsedMs >= ESCALATION_THRESHOLD_MS;

  // Tick the local clock every second WHILE the import is in-flight AND the
  // threshold hasn't been crossed yet. Once crossed, the interval stops and
  // `escalated` stays true (no need to keep re-rendering for the seconds
  // counter — the escalation card is steady-state). This avoids
  // unnecessary renders during the long tail of multi-minute imports.
  useEffect(() => {
    if (!inFlight) return;
    if (createdAtMs === null) return;
    if (Date.now() - createdAtMs >= ESCALATION_THRESHOLD_MS) return;
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [inFlight, createdAtMs]);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/apple-health/imports/${importId}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Import cancelled' });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/apple-health/imports/${importId}/retry`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Retrying import — processing will start shortly.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/apple-health/imports/${importId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/apple-health/imports'] });
      onDeleted?.();
    },
  });

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isLoading || !row) {
    return (
      <div className="bg-card border-border/40 rounded-lg border p-6">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading import status…
        </div>
      </div>
    );
  }

  // ─── Terminal: completed (success OR empty result) ────────────────────────
  if (row.status === 'completed') {
    const errClass = classifyError(row);
    if (errClass?.class === 'empty') {
      // Empty-result class — completed but zero records
      return (
        <div
          role="status"
          aria-live="polite"
          className="bg-card border-border/40 rounded-lg border p-6"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-['Playfair_Display'] text-foreground text-xl">
                Import finished, but no records landed
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">{errClass.copy}</p>
            </div>
            <StatusPill status={row.status} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setHelpModalOpen(true)}
              className="cursor-pointer"
            >
              <HelpCircle className="mr-2 h-4 w-4" aria-hidden />
              How to export full Health data
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-muted-foreground cursor-pointer"
            >
              Delete this attempt
            </Button>
          </div>
          <AppleHealthHelpModal open={helpModalOpen} onOpenChange={setHelpModalOpen} />
        </div>
      );
    }

    // Success — at least one record landed
    const totalNew =
      row.recordsIngestedWorkout +
      row.recordsIngestedSleep +
      row.recordsIngestedVitals +
      row.recordsIngestedBody;
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-card border-border/40 rounded-lg border p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-['Playfair_Display'] text-foreground text-xl">
              {totalNew > 0 ? 'Import complete' : 'Already up to date'}
            </h3>
            {row.dateRangeStart && row.dateRangeEnd && (
              <p className="text-muted-foreground mt-1 text-sm">
                {row.dateRangeStart} → {row.dateRangeEnd}
              </p>
            )}
          </div>
          <StatusPill status={row.status} />
        </div>

        <div className="mb-4">
          <div className="text-foreground mb-2 text-sm">
            <span className="text-foreground font-semibold">{totalNew}</span> new record
            {totalNew === 1 ? '' : 's'} imported
            {row.recordsSkippedDuplicate > 0 && (
              <span className="text-muted-foreground">
                ,{' '}
                <span className="text-foreground font-semibold">{row.recordsSkippedDuplicate}</span>{' '}
                duplicate{row.recordsSkippedDuplicate === 1 ? '' : 's'} skipped
              </span>
            )}
          </div>
          {row.recordsSkippedDuplicate > 0 && (
            <button
              type="button"
              onClick={() => setHelpModalOpen(true)}
              className="text-primary hover:text-primary/80 relative cursor-pointer text-xs underline-offset-4 hover:underline before:absolute before:-inset-3 before:content-['']"
              data-testid="help-link-duplicates"
            >
              Why are some records duplicates?
            </button>
          )}
        </div>

        <Counters row={row} variant="final" />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="cursor-pointer">
            <a href="/biometrics?tab=trends">
              <TrendingUp className="mr-2 h-4 w-4" aria-hidden />
              View your trends
            </a>
          </Button>
        </div>

        <AppleHealthHelpModal open={helpModalOpen} onOpenChange={setHelpModalOpen} />
      </div>
    );
  }

  // ─── Terminal: failed ─────────────────────────────────────────────────────
  if (row.status === 'failed') {
    const errClass = classifyError(row);
    return (
      <div
        role="alert"
        aria-live="polite"
        className="bg-card border-destructive/40 rounded-lg border p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-['Playfair_Display'] text-foreground text-xl">Import failed</h3>
            <p className="text-muted-foreground mt-1 text-sm">{errClass?.copy}</p>
          </div>
          <StatusPill status={row.status} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {errClass?.class === 'storage' && (
            <Button
              size="lg"
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="cursor-pointer"
            >
              <RotateCw className="mr-2 h-4 w-4" aria-hidden />
              {retryMutation.isPending ? 'Retrying…' : 'Retry'}
            </Button>
          )}
          {(errClass?.class === 'parse' || errClass?.class === 'unknown') && (
            <>
              <Button size="lg" onClick={() => onReupload?.()} className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" aria-hidden />
                Re-upload
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setHelpModalOpen(true)}
                className="cursor-pointer"
              >
                <HelpCircle className="mr-2 h-4 w-4" aria-hidden />
                Help
              </Button>
            </>
          )}
          <Button
            size="lg"
            variant="ghost"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="text-muted-foreground cursor-pointer"
          >
            Delete
          </Button>
        </div>

        {errClass?.rawMessage && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowRawError((v) => !v)}
              className="text-muted-foreground hover:text-foreground relative cursor-pointer text-xs underline-offset-4 hover:underline before:absolute before:-inset-3 before:content-['']"
            >
              {showRawError ? 'Hide details' : 'Show details'}
            </button>
            {showRawError && (
              <pre className="bg-muted/40 text-muted-foreground mt-2 max-h-40 overflow-auto rounded p-3 text-xs whitespace-pre-wrap">
                {errClass.rawMessage}
              </pre>
            )}
          </div>
        )}

        <AppleHealthHelpModal open={helpModalOpen} onOpenChange={setHelpModalOpen} />
      </div>
    );
  }

  // ─── Terminal: cancelled ──────────────────────────────────────────────────
  if (row.status === 'cancelled') {
    return (
      <div className="bg-card border-border/40 rounded-lg border p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-['Playfair_Display'] text-foreground text-xl">Import cancelled</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              You stopped this import. Records that were already processed before you cancelled have
              been kept.
            </p>
          </div>
          <StatusPill status={row.status} />
        </div>
        <Counters row={row} variant="final" />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            variant="ghost"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="text-muted-foreground cursor-pointer"
          >
            Delete this attempt
          </Button>
        </div>
      </div>
    );
  }

  // ─── In-flight: uploaded or parsing ───────────────────────────────────────
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="bg-card border-border/40 rounded-lg border p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-['Playfair_Display'] text-foreground text-xl">
            {row.status === 'uploaded' ? 'Queued for processing' : 'Processing your import'}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {row.status === 'uploaded'
              ? 'Your file is waiting in the queue. Processing usually starts within 30 seconds.'
              : 'Reading your Apple Health export. Typical imports take 30 seconds to 3 minutes.'}
          </p>
        </div>
        <StatusPill status={row.status} />
      </div>

      {row.status === 'parsing' && row.recordsParsed > 0 && (
        <div className="text-muted-foreground mb-4 text-sm">
          <span className="text-foreground font-semibold">
            {row.recordsParsed.toLocaleString()}
          </span>{' '}
          records processed so far
        </div>
      )}

      {/* Per-type counters update live as the cron flushes ingest results */}
      <Counters row={row} variant="live" />

      {/* Cancel button — only during in-flight state */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          variant="ghost"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          className="text-muted-foreground cursor-pointer"
          data-testid="import-cancel"
        >
          {cancelMutation.isPending ? 'Cancelling…' : 'Cancel'}
        </Button>
      </div>

      {/* 60s+ escalation card (BATCH 4 D3) */}
      {escalated && (
        <div className="bg-primary/5 border-primary/20 mt-6 rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <Bell className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="flex-1">
              <p className="text-foreground text-sm font-medium">
                Still working — you can leave this page
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                We'll notify you when your import is complete. Your imports list will keep this
                progress visible if you come back.
              </p>
              {shouldShowPushPrompt() && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setPushPromptOpen(true)}
                  className="mt-3 cursor-pointer"
                  data-testid="escalation-notify-me"
                >
                  <Bell className="mr-2 h-4 w-4" aria-hidden />
                  Notify me
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <PushPermissionPrompt open={pushPromptOpen} onOpenChange={setPushPromptOpen} />
    </div>
  );
}
