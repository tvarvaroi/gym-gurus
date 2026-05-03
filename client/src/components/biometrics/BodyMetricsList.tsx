import { useState } from 'react';
import { format, isThisYear } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PremiumCard } from '@/components/ui/premium/PremiumCard';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { BodyMetrics } from '@shared/schema';
import { displayWeight, displayLength, displayPercent, type UnitSystem } from '@/lib/units';

interface BodyMetricsListProps {
  entries: BodyMetrics[];
  units: UnitSystem;
  onEdit?: (entry: BodyMetrics) => void;
  onDelete?: (id: string) => Promise<void> | void;
  readOnly?: boolean;
}

interface MeasurementRow {
  label: string;
  cm: string | null;
}

function getMeasurementRows(e: BodyMetrics, units: UnitSystem): MeasurementRow[] {
  const rows: MeasurementRow[] = [
    { label: 'Neck', cm: e.neckCm },
    { label: 'Chest', cm: e.chestCm },
    { label: 'Waist', cm: e.waistCm },
    { label: 'Hips', cm: e.hipsCm },
    { label: 'Bicep L', cm: e.bicepLeftCm },
    { label: 'Bicep R', cm: e.bicepRightCm },
    { label: 'Thigh L', cm: e.thighLeftCm },
    { label: 'Thigh R', cm: e.thighRightCm },
    { label: 'Calf L', cm: e.calfLeftCm },
    { label: 'Calf R', cm: e.calfRightCm },
  ];
  return rows
    .filter((r) => r.cm != null && r.cm !== '')
    .map((r) => ({ label: r.label, cm: displayLength(r.cm, units) }));
}

function hasAnyMeasurement(e: BodyMetrics): boolean {
  return Boolean(
    e.neckCm ||
    e.chestCm ||
    e.waistCm ||
    e.hipsCm ||
    e.bicepLeftCm ||
    e.bicepRightCm ||
    e.thighLeftCm ||
    e.thighRightCm ||
    e.calfLeftCm ||
    e.calfRightCm ||
    e.muscleMassKg ||
    e.boneMassKg ||
    e.visceralFatRating != null ||
    e.bodyWaterPercentage
  );
}

interface EntryCardProps {
  entry: BodyMetrics;
  units: UnitSystem;
  isMostRecent: boolean;
  onEdit?: (entry: BodyMetrics) => void;
  onAskDelete?: (id: string) => void;
  readOnly?: boolean;
}

function EntryCard({ entry, units, isMostRecent, onEdit, onAskDelete, readOnly }: EntryCardProps) {
  const measurementRows = getMeasurementRows(entry, units);
  const hasDetails = hasAnyMeasurement(entry) || Boolean(entry.notes);
  const weightNum = entry.weightKg ? parseFloat(entry.weightKg) : null;
  const bodyFatNum = entry.bodyFatPercentage ? parseFloat(entry.bodyFatPercentage) : null;

  const weightDisplay = weightNum != null ? displayWeight(weightNum, units, 1) : null;
  const bodyFatDisplay = bodyFatNum != null ? displayPercent(bodyFatNum, 1) : null;

  return (
    <PremiumCard variant="default" padding="md">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {weightDisplay && (
              <span className="text-2xl md:text-3xl font-light tracking-tight text-foreground">
                {/* NumberTicker on most-recent only — restraint per design.
                    TODO Sprint 4+: animate from previous entry's value to the
                    current value (e.g. 82.0 → 82.5) instead of 0 → 82.5. The
                    0-start gives a momentary empty-state feel which is wrong
                    for "your data". Pass `startValue={prevWeightKg}` once the
                    list has access to the second-most-recent entry. */}
                {isMostRecent && weightNum != null ? (
                  <>
                    <NumberTicker
                      value={units === 'metric' ? weightNum : weightNum / 0.45359237}
                      decimalPlaces={1}
                    />
                    <span className="ml-1 text-base text-muted-foreground font-normal">
                      {units === 'metric' ? 'kg' : 'lb'}
                    </span>
                  </>
                ) : (
                  weightDisplay
                )}
              </span>
            )}
            {bodyFatDisplay && (
              <>
                {weightDisplay && <span className="text-muted-foreground/60 text-lg">·</span>}
                <span className="text-lg md:text-xl font-light text-muted-foreground">
                  {bodyFatDisplay}
                </span>
              </>
            )}
            {!weightDisplay && !bodyFatDisplay && (
              <span className="text-base text-muted-foreground italic">(measurements only)</span>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {format(
              new Date(entry.recordedAt),
              isThisYear(new Date(entry.recordedAt)) ? 'MMM d · h:mm a' : 'MMM d, yyyy · h:mm a'
            )}
          </p>
        </div>
        {!readOnly && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg cursor-pointer"
                aria-label="Entry actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              <button
                onClick={() => onEdit?.(entry)}
                className="flex items-center w-full gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer text-left"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => onAskDelete?.(entry.id)}
                className="flex items-center w-full gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/10 hover:text-destructive cursor-pointer text-left"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {hasDetails && (
        <Accordion type="single" collapsible className="mt-3">
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="text-sm text-primary hover:no-underline cursor-pointer py-2">
              Show all measurements
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              {measurementRows.length > 0 && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {measurementRows.map((r) => (
                    <div key={r.label} className="flex justify-between">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="text-foreground tabular-nums">{r.cm}</span>
                    </div>
                  ))}
                  {entry.muscleMassKg && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Muscle</span>
                      <span className="text-foreground tabular-nums">
                        {displayWeight(entry.muscleMassKg, units)}
                      </span>
                    </div>
                  )}
                  {entry.boneMassKg && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bone</span>
                      <span className="text-foreground tabular-nums">
                        {displayWeight(entry.boneMassKg, units)}
                      </span>
                    </div>
                  )}
                  {entry.bodyWaterPercentage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Body water</span>
                      <span className="text-foreground tabular-nums">
                        {displayPercent(entry.bodyWaterPercentage)}
                      </span>
                    </div>
                  )}
                  {entry.visceralFatRating != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Visceral fat</span>
                      <span className="text-foreground tabular-nums">
                        {entry.visceralFatRating}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {entry.notes && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {entry.notes}
                  </p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </PremiumCard>
  );
}

export function BodyMetricsList({
  entries,
  units,
  onEdit,
  onDelete,
  readOnly,
}: BodyMetricsListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-24 md:pb-6">
        {entries.map((e, idx) => (
          <EntryCard
            key={e.id}
            entry={e}
            units={units}
            isMostRecent={idx === 0}
            onEdit={onEdit}
            onAskDelete={(id) => setDeleteId(id)}
            readOnly={readOnly}
          />
        ))}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This is permanent. The entry will be removed from your history and trends.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              onClick={async () => {
                if (deleteId && onDelete) {
                  await onDelete(deleteId);
                }
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
