/**
 * AppleHealthUploadFlow — Sprint 5 BATCH 5
 *
 * Five-step user flow per BATCH 4 D2:
 *   Step 1: instructions (platform-detected — iOS shows numbered checklist;
 *           desktop shows drag-drop + collapsible "Get from iPhone" section)
 *   Step 2: file selection (drag-drop on desktop; file picker on mobile)
 *   Step 3: upload progress (multipart POST with XHR for actual % progress —
 *           fetch() doesn't expose upload progress; XMLHttpRequest does)
 *   Step 4-5: handed off to ImportProgressCard (parsing → terminal)
 *
 * The flow is a single component with internal step state. Steps 4-5 mount
 * ImportProgressCard via the returned import_id.
 *
 * Client-side validation (pre-upload, friendly errors):
 *   - Max file size: 200MB (matches server-side multer limit)
 *   - Extension: .zip
 *   - These are UX hints, not security — server-side multer + appleHealth.ts
 *     filter is the security boundary.
 *
 * Platform detection drives Step 1 instructions and Step 2 affordance:
 *   - 'ios' / 'ipad-desktop-mode' (iOS-shape): inline numbered checklist;
 *     Step 2 renders a tap-to-pick button (drag-drop is meaningless on touch).
 *     The instructions explicitly tell the user to "tap Browse → Files" since
 *     iOS Safari's default picker may surface Photos first.
 *   - 'desktop': drag-drop zone primary; file-picker fallback button.
 *     Collapsible "Get this from your iPhone" section reveals the iOS-flow
 *     instructions for the cross-device path.
 *   - 'android': simplified file-picker affordance. Standard Android picker
 *     handles .zip cleanly; no inline instructions needed.
 *
 * a11y: file input is the source of truth for keyboard navigation. The
 * drag-drop zone is a visual layer; clicking/keyboard-focusing the affordance
 * triggers the input's click(). Drag/drop interactions are mouse-only by
 * platform constraint.
 */
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  ChevronDown,
  ChevronUp,
  FileArchive,
  AlertCircle,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCsrfToken } from '@/lib/queryClient';
import { detectPlatform, isIosShape, type Platform } from '@/lib/platformDetect';
import { ImportProgressCard } from './ImportProgressCard';

const MAX_BYTES = 200 * 1024 * 1024; // 200MB — matches server multer limit

interface UploadResult {
  import: {
    id: string;
    status: string;
  };
}

// ─── Sub-component: iOS-flow numbered checklist ─────────────────────────────

function IosInstructions() {
  return (
    <ol className="text-foreground space-y-3 text-sm">
      <li className="flex gap-3">
        <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          1
        </span>
        <span>
          Open the <span className="font-medium">Health</span> app on your iPhone.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          2
        </span>
        <span>
          Tap your profile picture (top-right) →{' '}
          <span className="font-medium">Export All Health Data</span>.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          3
        </span>
        <span>
          When asked where to save, choose <span className="font-medium">Files</span> (e.g. iCloud
          Drive or On My iPhone).
        </span>
      </li>
      <li className="flex gap-3">
        <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          4
        </span>
        <span>
          Come back here. Tap <span className="font-medium">Choose file</span> below, then tap{' '}
          <span className="font-medium">Browse</span> and select{' '}
          <span className="font-medium">export.zip</span> from the Files app (NOT from Photos).
        </span>
      </li>
    </ol>
  );
}

// ─── Sub-component: drag-drop zone (desktop) ────────────────────────────────

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

function DropZone({ onFile, disabled }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`bg-card border-border/40 hover:border-primary/40 hover:bg-primary/5 relative flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        dragOver ? 'border-primary bg-primary/10' : ''
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      data-testid="dropzone"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          // Reset so the same file can be re-selected after a validation reject
          e.target.value = '';
        }}
      />
      <FileArchive className="text-muted-foreground h-10 w-10" aria-hidden />
      <div>
        <p className="text-foreground text-sm font-medium">
          Drop your <span className="font-semibold">export.zip</span> here
        </p>
        <p className="text-muted-foreground mt-1 text-xs">or click to browse</p>
      </div>
    </button>
  );
}

// ─── Sub-component: mobile file picker affordance ───────────────────────────

interface MobilePickerProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

function MobilePicker({ onFile, disabled }: MobilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      <Button
        size="lg"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="cursor-pointer"
        data-testid="mobile-pick-file"
      >
        <Upload className="mr-2 h-4 w-4" aria-hidden />
        Choose file
      </Button>
    </>
  );
}

// ─── Sub-component: collapsible iOS instructions for desktop ────────────────

function DesktopIosCollapsible() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-border/40 rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted/40 relative flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm">
          <Smartphone className="text-muted-foreground h-4 w-4" aria-hidden />
          How to get this file from your iPhone
        </span>
        {open ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" aria-hidden />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" aria-hidden />
        )}
      </button>
      {open && (
        <div className="border-border/40 border-t p-4">
          <IosInstructions />
        </div>
      )}
    </div>
  );
}

// ─── Validation ─────────────────────────────────────────────────────────────

interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateFile(file: File): ValidationResult {
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(0);
    return {
      ok: false,
      error: `Your file is ${mb} MB. Maximum size is 200 MB. Try exporting a smaller date range from Health.`,
    };
  }
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return {
      ok: false,
      error: 'Please upload the .zip file from Apple Health (not a single .xml or other format).',
    };
  }
  return { ok: true };
}

// ─── Main component ─────────────────────────────────────────────────────────

export interface AppleHealthUploadFlowProps {
  /** Called once a fresh import row is created. Parent typically transitions
   *  to displaying the in-flight ImportProgressCard via this id. */
  onImportCreated?: (importId: string) => void;
}

type Step = 'pick' | 'uploading' | 'progress';

export function AppleHealthUploadFlow({ onImportCreated }: AppleHealthUploadFlowProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('pick');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [importId, setImportId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const platform: Platform = detectPlatform().platform;

  // ─── XHR-based upload to capture upload progress ────────────────────────────
  // fetch() doesn't expose upload progress events. XMLHttpRequest does. The
  // CSRF token + credentials are added manually here (no apiRequest helper).
  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/apple-health/upload');
        xhr.withCredentials = true;
        const csrf = getCsrfToken();
        if (csrf) xhr.setRequestHeader('x-csrf-token', csrf);

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadPercent(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText) as UploadResult);
            } catch (err) {
              reject(new Error(`Failed to parse server response: ${(err as Error).message}`));
            }
          } else {
            // Try to parse server-side error message
            let errMsg = `Upload failed (${xhr.status})`;
            try {
              const body = JSON.parse(xhr.responseText) as { error?: string };
              if (body.error) errMsg = body.error;
            } catch {
              // ignore parse failure — keep generic message
            }
            reject(new Error(errMsg));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.send(formData);
      });
    },
    onSuccess: (result) => {
      setImportId(result.import.id);
      setStep('progress');
      // Invalidate the imports list so the parent (ImportsTab) sees the new row
      queryClient.invalidateQueries({ queryKey: ['/api/apple-health/imports'] });
      onImportCreated?.(result.import.id);
    },
    onError: (err) => {
      setStep('pick');
      setUploadPercent(0);
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    },
  });

  function handleFile(file: File) {
    const validation = validateFile(file);
    if (!validation.ok) {
      setValidationError(validation.error ?? 'Invalid file');
      return;
    }
    setValidationError(null);
    setStep('uploading');
    setUploadPercent(0);
    uploadMutation.mutate(file);
  }

  // ─── Render: progress state (handed off to ImportProgressCard) ────────────
  if (step === 'progress' && importId) {
    return (
      <ImportProgressCard
        importId={importId}
        onReupload={() => {
          setImportId(null);
          setStep('pick');
        }}
        onDeleted={() => {
          setImportId(null);
          setStep('pick');
        }}
      />
    );
  }

  // ─── Render: uploading state ──────────────────────────────────────────────
  if (step === 'uploading') {
    return (
      <div className="bg-card border-border/40 rounded-lg border p-6">
        <h3 className="font-['Playfair_Display'] text-foreground mb-2 text-xl">
          Uploading your export…
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {uploadPercent}% — please keep this page open until upload completes.
        </p>
        <div
          className="bg-muted relative h-2 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={uploadPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="bg-primary absolute inset-y-0 left-0 transition-all"
            style={{ width: `${uploadPercent}%` }}
          />
        </div>
        <div className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          Once upload finishes, processing starts within ~30 seconds.
        </div>
      </div>
    );
  }

  // ─── Render: pick state (default) ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-['Playfair_Display'] text-foreground mb-2 text-2xl">
          Import your Apple Health data
        </h2>
        <p className="text-muted-foreground text-sm">
          Bring years of sleep, workouts, body metrics, and vitals from your iPhone into your
          GymGurus history. Your data stays private — only you can see it.
        </p>
      </div>

      {/* Platform-detected Step 1 instructions */}
      {isIosShape(platform) ? (
        <div className="bg-card border-border/40 rounded-lg border p-6">
          <h3 className="text-foreground mb-4 text-sm font-semibold uppercase tracking-wide">
            How to export from Apple Health
          </h3>
          <IosInstructions />
        </div>
      ) : platform === 'android' ? null : (
        <DesktopIosCollapsible />
      )}

      {/* Step 2: file selection — affordance varies by platform */}
      <div>
        {isIosShape(platform) || platform === 'android' ? (
          <div className="flex justify-center">
            <MobilePicker onFile={handleFile} disabled={uploadMutation.isPending} />
          </div>
        ) : (
          <DropZone onFile={handleFile} disabled={uploadMutation.isPending} />
        )}
      </div>

      {validationError && (
        <div
          role="alert"
          className="bg-destructive/10 border-destructive/40 flex items-start gap-3 rounded-lg border p-4"
        >
          <AlertCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="text-destructive text-sm">{validationError}</p>
        </div>
      )}
    </div>
  );
}
