import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  toCanonicalWeight,
  toCanonicalLength,
  weightUnitLabel,
  lengthUnitLabel,
  cmToIn,
  kgToLb,
  type UnitSystem,
} from '@/lib/units';
import type { BodyMetrics } from '@shared/schema';

interface LogBodyMetricsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitSystem;
  editing?: BodyMetrics | null;
}

interface FormValues {
  weight: string;
  bodyFat: string;
  neck: string;
  chest: string;
  waist: string;
  hips: string;
  bicepLeft: string;
  bicepRight: string;
  thighLeft: string;
  thighRight: string;
  calfLeft: string;
  calfRight: string;
  muscleMass: string;
  boneMass: string;
  bodyWater: string;
  visceralFat: string;
  notes: string;
}

const EMPTY: FormValues = {
  weight: '',
  bodyFat: '',
  neck: '',
  chest: '',
  waist: '',
  hips: '',
  bicepLeft: '',
  bicepRight: '',
  thighLeft: '',
  thighRight: '',
  calfLeft: '',
  calfRight: '',
  muscleMass: '',
  boneMass: '',
  bodyWater: '',
  visceralFat: '',
  notes: '',
};

/** Build initial form state from an existing row, formatted into the user's display units. */
function valuesFromEntry(e: BodyMetrics, units: UnitSystem): FormValues {
  const fmt = (kg: string | null | undefined, kind: 'weight' | 'length') => {
    if (!kg) return '';
    const n = parseFloat(kg);
    if (!Number.isFinite(n)) return '';
    if (units === 'metric') return n.toString();
    return (kind === 'weight' ? kgToLb(n) : cmToIn(n)).toFixed(2);
  };
  return {
    weight: fmt(e.weightKg, 'weight'),
    bodyFat: e.bodyFatPercentage ?? '',
    neck: fmt(e.neckCm, 'length'),
    chest: fmt(e.chestCm, 'length'),
    waist: fmt(e.waistCm, 'length'),
    hips: fmt(e.hipsCm, 'length'),
    bicepLeft: fmt(e.bicepLeftCm, 'length'),
    bicepRight: fmt(e.bicepRightCm, 'length'),
    thighLeft: fmt(e.thighLeftCm, 'length'),
    thighRight: fmt(e.thighRightCm, 'length'),
    calfLeft: fmt(e.calfLeftCm, 'length'),
    calfRight: fmt(e.calfRightCm, 'length'),
    muscleMass: fmt(e.muscleMassKg, 'weight'),
    boneMass: fmt(e.boneMassKg, 'weight'),
    bodyWater: e.bodyWaterPercentage ?? '',
    visceralFat: e.visceralFatRating != null ? String(e.visceralFatRating) : '',
    notes: e.notes ?? '',
  };
}

/** Convert form values → API payload (canonical kg/cm strings, only filled fields). */
function buildPayload(v: FormValues, units: UnitSystem): Record<string, unknown> {
  const weight = (s: string) =>
    s ? toCanonicalWeight(parseFloat(s), units).toFixed(2) : undefined;
  const length = (s: string) =>
    s ? toCanonicalLength(parseFloat(s), units).toFixed(2) : undefined;
  const pct = (s: string) => (s ? parseFloat(s).toFixed(2) : undefined);
  const intStr = (s: string) => (s ? parseInt(s, 10) : undefined);

  return {
    weightKg: weight(v.weight),
    bodyFatPercentage: pct(v.bodyFat),
    neckCm: length(v.neck),
    chestCm: length(v.chest),
    waistCm: length(v.waist),
    hipsCm: length(v.hips),
    bicepLeftCm: length(v.bicepLeft),
    bicepRightCm: length(v.bicepRight),
    thighLeftCm: length(v.thighLeft),
    thighRightCm: length(v.thighRight),
    calfLeftCm: length(v.calfLeft),
    calfRightCm: length(v.calfRight),
    muscleMassKg: weight(v.muscleMass),
    boneMassKg: weight(v.boneMass),
    bodyWaterPercentage: pct(v.bodyWater),
    visceralFatRating: intStr(v.visceralFat),
    notes: v.notes ? v.notes : undefined,
  };
}

/** Returns true iff at least ONE field has a non-empty value. Notes counts. */
function hasAnyValue(v: FormValues): boolean {
  return (Object.keys(v) as (keyof FormValues)[]).some((k) => v[k].trim() !== '');
}

export function LogBodyMetricsSheet({
  open,
  onOpenChange,
  units,
  editing,
}: LogBodyMetricsSheetProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [emptyHint, setEmptyHint] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: editing ? valuesFromEntry(editing, units) : EMPTY,
  });

  // Re-init when editing target or unit system changes
  useEffect(() => {
    form.reset(editing ? valuesFromEntry(editing, units) : EMPTY);
    setEmptyHint(false);
  }, [editing, units, open, form]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = editing ? `/api/biometrics/${editing.id}` : '/api/biometrics';
      const method = editing ? 'PUT' : 'POST';
      const res = await apiRequest(method, url, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/biometrics'] });
      toast({
        title: editing ? 'Entry updated' : 'Entry logged',
        description: editing ? 'Your changes are saved.' : 'Tracking another data point.',
      });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (v: FormValues) => {
    if (!hasAnyValue(v)) {
      setEmptyHint(true);
      return;
    }
    setEmptyHint(false);
    saveMutation.mutate(buildPayload(v, units));
  };

  const wLabel = weightUnitLabel(units);
  const lLabel = lengthUnitLabel(units);

  const Body = (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-5">
      {/* Above the fold: weight + body fat */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="weight" className="text-sm font-medium">
            Weight
          </Label>
          <div className="relative mt-1.5">
            <Input
              id="weight"
              inputMode="decimal"
              placeholder="0.0"
              autoComplete="off"
              {...form.register('weight')}
              className="pr-12 text-base"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {wLabel}
            </span>
          </div>
        </div>

        <div>
          <Label htmlFor="bodyFat" className="text-sm font-medium">
            Body fat
          </Label>
          <div className="relative mt-1.5">
            <Input
              id="bodyFat"
              inputMode="decimal"
              placeholder="0.0"
              autoComplete="off"
              {...form.register('bodyFat')}
              className="pr-12 text-base"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              %
            </span>
          </div>
        </div>
      </div>

      <Accordion type="multiple" className="border-y border-border/30">
        <AccordionItem value="measurements" className="border-b border-border/30">
          <AccordionTrigger className="text-sm text-primary hover:no-underline cursor-pointer">
            Add measurements
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Neck" name="neck" form={form} suffix={lLabel} />
              <NumField label="Waist" name="waist" form={form} suffix={lLabel} />
              <NumField label="Chest" name="chest" form={form} suffix={lLabel} />
              <NumField label="Hips" name="hips" form={form} suffix={lLabel} />
              <NumField label="Bicep L" name="bicepLeft" form={form} suffix={lLabel} />
              <NumField label="Bicep R" name="bicepRight" form={form} suffix={lLabel} />
              <NumField label="Thigh L" name="thighLeft" form={form} suffix={lLabel} />
              <NumField label="Thigh R" name="thighRight" form={form} suffix={lLabel} />
              <NumField label="Calf L" name="calfLeft" form={form} suffix={lLabel} />
              <NumField label="Calf R" name="calfRight" form={form} suffix={lLabel} />
              <NumField label="Muscle" name="muscleMass" form={form} suffix={wLabel} />
              <NumField label="Bone" name="boneMass" form={form} suffix={wLabel} />
              <NumField label="Body water" name="bodyWater" form={form} suffix="%" />
              <NumField label="Visceral fat" name="visceralFat" form={form} integer />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notes" className="border-b-0">
          <AccordionTrigger className="text-sm text-primary hover:no-underline cursor-pointer">
            Add notes
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              placeholder="How did you measure? Time of day, fasted, etc."
              rows={3}
              maxLength={2000}
              {...form.register('notes')}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {emptyHint && (
        <p className="text-sm text-amber-500" role="alert" aria-live="polite">
          Add a measurement or note to save.
        </p>
      )}

      <div className="pt-2">
        <ActionButton
          type="submit"
          variant="primary"
          size="md"
          fullWidth
          loading={saveMutation.isPending}
        >
          {editing ? 'Save changes' : 'Save entry'}
        </ActionButton>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-xl font-['Playfair_Display'] font-light tracking-tight">
              {editing ? 'Edit entry' : 'Log entry'}
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
            {editing ? 'Edit entry' : 'Log entry'}
          </DialogTitle>
        </DialogHeader>
        {Body}
      </DialogContent>
    </Dialog>
  );
}

// ─── Reusable numeric field with suffix label ───────────────────────────────
interface NumFieldProps {
  label: string;
  name: keyof FormValues;
  form: ReturnType<typeof useForm<FormValues>>;
  suffix?: string;
  integer?: boolean;
}
function NumField({ label, name, form, suffix, integer }: NumFieldProps) {
  return (
    <div>
      <Label htmlFor={name} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative mt-1">
        <Input
          id={name}
          inputMode={integer ? 'numeric' : 'decimal'}
          placeholder="0"
          autoComplete="off"
          {...form.register(name)}
          className={suffix ? 'pr-10 text-sm' : 'text-sm'}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
