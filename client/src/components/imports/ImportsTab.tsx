/**
 * ImportsTab — Sprint 5 BATCH 5
 *
 * Tab orchestrator for /settings?tab=imports (mounted in BATCH 6 — this
 * component only renders the tab body).
 *
 * Three states:
 *   - Empty: no imports yet → show AppleHealthUploadFlow only
 *   - In-flight: a non-terminal import exists → ImportProgressCard for it +
 *                history list of past completed/failed imports
 *   - History-only: completed/failed imports only → upload affordance + history
 *
 * BATCH 4 sub-question 6 (concurrent imports cap at 1): when a non-terminal
 * import exists, the upload affordance is hidden and replaced with
 * "Import already in progress" pointer to the in-flight ImportProgressCard.
 *
 * BATCH 4 D1 (canonical home in Settings): this is where the upload UI lives.
 * The /biometrics empty-state hint card (BATCH 6) points HERE.
 *
 * Pagination: GET /api/apple-health/imports defaults to 25 most-recent. The
 * list isn't paginated in v1 (pagination would be a BATCH 6 enhancement if
 * users accumulate >25 import attempts, which is unlikely).
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
  Trash2,
  Plus,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AppleHealthUploadFlow } from './AppleHealthUploadFlow';
import { ImportProgressCard } from './ImportProgressCard';

type ImportStatus = 'uploaded' | 'parsing' | 'completed' | 'failed' | 'cancelled';
const TERMINAL_STATUSES: ReadonlySet<ImportStatus> = new Set<ImportStatus>([
  'completed',
  'failed',
  'cancelled',
]);

interface AppleHealthImportRow {
  id: string;
  status: ImportStatus;
  recordsParsed: number;
  recordsIngestedWorkout: number;
  recordsIngestedSleep: number;
  recordsIngestedVitals: number;
  recordsIngestedBody: number;
  recordsSkippedDuplicate: number;
  errorMessage: string | null;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ─── Sub-component: history row ─────────────────────────────────────────────

interface HistoryRowProps {
  row: AppleHealthImportRow;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  busy: boolean;
}

function HistoryRow({ row, onRetry, onDelete, onSelect, busy }: HistoryRowProps) {
  const totalIngested =
    row.recordsIngestedWorkout +
    row.recordsIngestedSleep +
    row.recordsIngestedVitals +
    row.recordsIngestedBody;

  const StatusIcon =
    row.status === 'completed' ? CheckCircle2 : row.status === 'failed' ? XCircle : AlertCircle;

  const dateLabel = row.completedAt ?? row.createdAt;
  const formattedDate = new Date(dateLabel).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="bg-card border-border/40 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <StatusIcon
              className={
                row.status === 'completed'
                  ? 'h-4 w-4 shrink-0 text-emerald-500'
                  : row.status === 'failed'
                    ? 'text-destructive h-4 w-4 shrink-0'
                    : 'text-muted-foreground h-4 w-4 shrink-0'
              }
              aria-hidden
            />
            <p className="text-foreground truncate text-sm font-medium">{formattedDate}</p>
          </div>
          {row.status === 'completed' && (
            <p className="text-muted-foreground text-xs">
              <span className="text-foreground font-semibold">{totalIngested}</span> records
              {row.recordsSkippedDuplicate > 0 && (
                <>
                  , <span className="text-foreground">{row.recordsSkippedDuplicate}</span>{' '}
                  duplicates
                </>
              )}
              {row.dateRangeStart && row.dateRangeEnd && (
                <>
                  {' · '}
                  {row.dateRangeStart} → {row.dateRangeEnd}
                </>
              )}
            </p>
          )}
          {row.status === 'failed' && row.errorMessage && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{row.errorMessage}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {row.status === 'failed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRetry(row.id)}
              disabled={busy}
              className="h-11 cursor-pointer"
              data-testid={`retry-${row.id}`}
            >
              <RotateCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Retry
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSelect(row.id)}
            className="h-11 cursor-pointer"
            data-testid={`details-${row.id}`}
          >
            Details
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(row.id)}
            disabled={busy}
            className="text-muted-foreground h-11 cursor-pointer"
            aria-label="Delete this import"
            data-testid={`delete-${row.id}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function ImportsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showUploadFlow, setShowUploadFlow] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const importsQuery = useQuery<AppleHealthImportRow[]>({
    queryKey: ['/api/apple-health/imports'],
    queryFn: async () => {
      const res = await fetch('/api/apple-health/imports', { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch imports (${res.status})`);
      return res.json();
    },
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/apple-health/imports/${id}/retry`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/apple-health/imports'] });
      toast({ title: 'Retrying import — processing will start shortly.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/apple-health/imports/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/apple-health/imports'] });
    },
    onError: (err) => {
      toast({
        title: 'Failed to delete import',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    },
  });

  // ─── Derived state ────────────────────────────────────────────────────────
  // Wrap `imports` in useMemo so the `?? []` fallback returns a stable
  // reference when data is undefined (otherwise a fresh array on every
  // render would invalidate the downstream useMemos for inFlight/history,
  // wasting work during the loading state).
  const imports = useMemo(() => importsQuery.data ?? [], [importsQuery.data]);
  const inFlight = useMemo(
    () => imports.find((r) => !TERMINAL_STATUSES.has(r.status)) ?? null,
    [imports]
  );
  const history = useMemo(() => imports.filter((r) => TERMINAL_STATUSES.has(r.status)), [imports]);

  // ─── Loading state ────────────────────────────────────────────────────────
  if (importsQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading imports…
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────────
  // No imports of any kind. Show the upload flow inline as the primary content.
  if (imports.length === 0) {
    return <AppleHealthUploadFlow />;
  }

  // ─── User explicitly entered upload flow from history view ────────────────
  if (showUploadFlow) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setShowUploadFlow(false)} className="cursor-pointer">
          ← Back to imports
        </Button>
        <AppleHealthUploadFlow
          onImportCreated={() => {
            // Stay on the upload flow — it transitions to ImportProgressCard
            // internally once the import_id is known.
          }}
        />
      </div>
    );
  }

  // ─── User selected a specific import from history (details view) ──────────
  if (selectedImportId) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setSelectedImportId(null)}
          className="cursor-pointer"
        >
          ← Back to imports
        </Button>
        <ImportProgressCard
          importId={selectedImportId}
          onDeleted={() => {
            setSelectedImportId(null);
            queryClient.invalidateQueries({ queryKey: ['/api/apple-health/imports'] });
          }}
          onReupload={() => {
            setSelectedImportId(null);
            setShowUploadFlow(true);
          }}
        />
      </div>
    );
  }

  // ─── Default: history list with optional in-flight card ───────────────────
  return (
    <div className="space-y-6">
      {/* Header with upload affordance OR concurrent-import notice */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-['Playfair_Display'] text-foreground text-2xl">
            Apple Health imports
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {history.length} previous import{history.length === 1 ? '' : 's'}
          </p>
        </div>
        {inFlight ? (
          <div className="bg-primary/5 border-primary/20 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
            <Clock className="text-primary h-4 w-4" aria-hidden />
            <span className="text-foreground">An import is in progress</span>
          </div>
        ) : (
          <Button
            size="lg"
            onClick={() => setShowUploadFlow(true)}
            className="cursor-pointer"
            data-testid="new-import"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            New import
          </Button>
        )}
      </div>

      {/* In-flight ImportProgressCard at top */}
      {inFlight && (
        <ImportProgressCard
          importId={inFlight.id}
          onReupload={() => setShowUploadFlow(true)}
          onDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/apple-health/imports'] });
          }}
        />
      )}

      {/* History list */}
      {history.length > 0 && (
        <div className="space-y-3">
          {!inFlight && (
            <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              History
            </h3>
          )}
          {history.map((row) => (
            <HistoryRow
              key={row.id}
              row={row}
              onRetry={(id) => retryMutation.mutate(id)}
              onDelete={(id) => setPendingDeleteId(id)}
              onSelect={(id) => setSelectedImportId(id)}
              busy={retryMutation.isPending || deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Playfair_Display']">
              Delete this import?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the import record from your history. The biometric data already imported
              from this file (sleep, workouts, body metrics, vitals) will stay in your trends — only
              the import attempt itself is deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId) {
                  deleteMutation.mutate(pendingDeleteId);
                  setPendingDeleteId(null);
                }
              }}
              className="cursor-pointer"
              data-testid="confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
