import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Lock, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ActionButton } from '@/components/ui/premium/ActionButton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCsrfToken } from '@/lib/queryClient';
import { toCanonicalWeight, weightUnitLabel, type UnitSystem } from '@/lib/units';

const POSES = [
  { value: 'front', label: 'Front' },
  { value: 'side_left', label: 'Side L' },
  { value: 'side_right', label: 'Side R' },
  { value: 'back', label: 'Back' },
  { value: 'other', label: 'Other' },
] as const;

type Pose = (typeof POSES)[number]['value'];

interface UploadPhotoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitSystem;
  /** When provided, the sheet uses this file directly and skips the picker step. */
  initialFile?: File | null;
}

export function UploadPhotoSheet({
  open,
  onOpenChange,
  units,
  initialFile,
}: UploadPhotoSheetProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pose, setPose] = useState<Pose | null>(null);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');

  // Reset state when sheet closes; rebuild preview when file changes
  useEffect(() => {
    if (!open) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setFile(null);
      setPreviewUrl(null);
      setPose(null);
      setWeight('');
      setBodyFat('');
      setNotes('');
    }
  }, [open]);

  // Adopt initialFile when supplied
  useEffect(() => {
    if (open && initialFile && !file) {
      adoptFile(initialFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFile]);

  function adoptFile(f: File) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(f);
    previewUrlRef.current = url;
    setFile(f);
    setPreviewUrl(url);
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) adoptFile(f);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file');
      if (!pose) throw new Error('Choose a pose first');

      const fd = new FormData();
      fd.append('image', file);
      fd.append('pose', pose);
      if (weight) {
        const kg = toCanonicalWeight(parseFloat(weight), units).toFixed(2);
        fd.append('weightAtPhotoKg', kg);
      }
      if (bodyFat) fd.append('bodyFatAtPhoto', parseFloat(bodyFat).toFixed(2));
      if (notes) fd.append('notes', notes);

      const headers: Record<string, string> = {};
      const csrf = getCsrfToken();
      if (csrf) headers['x-csrf-token'] = csrf;

      const res = await fetch('/api/biometrics/photos', {
        method: 'POST',
        headers,
        body: fd,
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/biometrics/photos'] });
      toast({
        title: 'Photo saved',
        description: 'Stored privately. Compare with future photos as you go.',
      });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = () => {
    if (!file) {
      fileInputRef.current?.click();
      return;
    }
    if (!pose) {
      toast({ title: 'Choose a pose first', variant: 'destructive' });
      return;
    }
    uploadMutation.mutate();
  };

  const Body = (
    <div className="space-y-4">
      {/* Hidden file input — capture="environment" prefers rear camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onPickFile}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/40 bg-card/40 hover:border-primary/40 hover:bg-card/60 transition-colors cursor-pointer"
        >
          <Camera className="w-10 h-10 text-primary/70" strokeWidth={1.5} />
          <div className="text-center">
            <p className="text-base font-medium text-foreground">Choose a photo</p>
            <p className="text-xs text-muted-foreground mt-1">Camera or library — your call</p>
          </div>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-card border border-border/30">
            <img
              src={previewUrl ?? ''}
              alt="Selected photo"
              className="w-full max-h-72 object-contain bg-black"
            />
            <button
              type="button"
              onClick={() => {
                if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = null;
                setFile(null);
                setPreviewUrl(null);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
              aria-label="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Pose</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pose">
              {POSES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={pose === p.value}
                  onClick={() => setPose(p.value)}
                  className={`min-h-[40px] px-4 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    pose === p.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border/40 text-foreground hover:border-primary/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="details" className="border-b-0">
              <AccordionTrigger className="text-sm text-primary hover:no-underline cursor-pointer">
                Add details
              </AccordionTrigger>
              <AccordionContent className="pt-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="photoWeight" className="text-xs text-muted-foreground">
                      Weight
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="photoWeight"
                        inputMode="decimal"
                        placeholder="0.0"
                        autoComplete="off"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="pr-10 text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        {weightUnitLabel(units)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="photoBodyFat" className="text-xs text-muted-foreground">
                      Body fat
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="photoBodyFat"
                        inputMode="decimal"
                        placeholder="0.0"
                        autoComplete="off"
                        value={bodyFat}
                        onChange={(e) => setBodyFat(e.target.value)}
                        className="pr-8 text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="photoNotes" className="text-xs text-muted-foreground">
                    Notes
                  </Label>
                  <Textarea
                    id="photoNotes"
                    placeholder="Lighting, time of day, anything you want to remember"
                    rows={3}
                    maxLength={2000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            Private to you.
          </p>
        </div>
      )}

      <div className="pt-2 flex gap-2">
        {file && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-shrink-0"
          >
            Cancel
          </Button>
        )}
        <ActionButton
          type="button"
          variant="primary"
          size="md"
          fullWidth
          loading={uploadMutation.isPending}
          disabled={!file || !pose}
          onClick={onSubmit}
        >
          {file ? 'Upload photo' : 'Choose a photo'}
        </ActionButton>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-xl font-['Playfair_Display'] font-light tracking-tight">
              Add photo
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">{Body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-['Playfair_Display'] font-light tracking-tight">
            Add photo
          </DialogTitle>
        </DialogHeader>
        {Body}
      </DialogContent>
    </Dialog>
  );
}
