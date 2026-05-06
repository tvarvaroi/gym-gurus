/**
 * WellnessRitual — Sprint 3 BATCH 4
 *
 * State A of the wellness state machine: the actual check-in form.
 * Six sliders + three pill toggles + optional notes + sticky CTA.
 *
 * Mobile keyboard handling (Decision 6, BATCH 3): when the textarea takes
 * focus on mobile, scrollIntoView with a 100ms delay lets the keyboard
 * animation start before we measure the viewport. Without the delay, the
 * scroll lands wrong because the visual viewport hasn't shrunk yet.
 *
 * Real iOS Safari verification of this behavior is the pre-merge gate
 * (devtools mobile emulation does NOT replicate the keyboard animation
 * timing).
 *
 * The 6 sliders map to the wellness schema's 1–10 fields (BATCH 1 migration):
 *   energy → energyLevel
 *   mood → moodScore
 *   stress → stressLevel              (algorithm inverts; UI shows raw 1–10)
 *   sleep quality → sleepQualitySubjective
 *   motivation → motivationLevel
 *   soreness → sorenessOverall        (algorithm inverts; UI shows raw 1–10)
 *
 * The 3 toggles map to the wellness schema's behavior booleans:
 *   hydrationGoalMet, steppedOutside, meditationCompleted
 *
 * Stress and soreness sliders are numerically inverted by the readiness
 * algorithm (high stress → low score), but the UI is NOT inverted —
 * the user sees raw 1–10 and the slider direction is consistent across
 * all 6 (right = "more"). Inversion is a backend concern; surfacing it
 * in the UI would be confusing.
 *
 * "Save with empty form" is gated by hasAnyValue() — at least one slider
 * touched, one toggle set, or notes present. Matches the schema-level
 * .refine() in insertDailyWellnessLogSchema.
 *
 * See docs/specs/2026-05-06-sprint-3-wellness-ui-design.md.
 */

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Battery,
  BatteryLow,
  Zap,
  Smile,
  Frown,
  CheckCircle2,
  Flame,
  Cloud,
  Moon,
  CloudRain,
  Sun,
  Sparkles,
  Droplet,
  Wind,
  Brain,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { ActionButton } from '@/components/ui/premium/ActionButton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { WellnessSlider } from './WellnessSlider';

interface WellnessRitualProps {
  /** Called with the API response after a successful submit. State B uses this. */
  onSubmitted: (response: SubmitResponse) => void;
}

interface SubmitResponse {
  entry: {
    id: string;
    date: string;
    readinessScore: number | null;
  };
  isNewInsert: boolean;
  streak: { current: number; longest: number; isNewStreakStart: boolean };
  xpAwarded: number;
}

interface FormState {
  energy: number;
  mood: number;
  stress: number;
  sleepQuality: number;
  motivation: number;
  soreness: number;
  hydrationGoalMet: boolean;
  steppedOutside: boolean;
  meditationCompleted: boolean;
  notes: string;
  // Track which sliders the user actually touched. A slider parked at the
  // default 5 should NOT count as "user provided this value" — the readiness
  // algorithm uses null to flag missing inputs, which drives the future
  // "connect a wearable" upsell. Better data hygiene than treating defaults
  // as deliberate.
  touched: {
    energy: boolean;
    mood: boolean;
    stress: boolean;
    sleepQuality: boolean;
    motivation: boolean;
    soreness: boolean;
  };
}

const DEFAULT_SLIDER = 5;

const INITIAL: FormState = {
  energy: DEFAULT_SLIDER,
  mood: DEFAULT_SLIDER,
  stress: DEFAULT_SLIDER,
  sleepQuality: DEFAULT_SLIDER,
  motivation: DEFAULT_SLIDER,
  soreness: DEFAULT_SLIDER,
  hydrationGoalMet: false,
  steppedOutside: false,
  meditationCompleted: false,
  notes: '',
  touched: {
    energy: false,
    mood: false,
    stress: false,
    sleepQuality: false,
    motivation: false,
    soreness: false,
  },
};

export function WellnessRitual({ onSubmitted }: WellnessRitualProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [emptyHint, setEmptyHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const setSlider = (key: keyof FormState['touched']) => (value: number) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      touched: { ...prev.touched, [key]: true },
    }));
    if (emptyHint) setEmptyHint(false);
  };

  const toggleBehavior = (key: 'hydrationGoalMet' | 'steppedOutside' | 'meditationCompleted') => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
    if (emptyHint) setEmptyHint(false);
  };

  const hasAnyValue = (s: FormState): boolean =>
    s.touched.energy ||
    s.touched.mood ||
    s.touched.stress ||
    s.touched.sleepQuality ||
    s.touched.motivation ||
    s.touched.soreness ||
    s.hydrationGoalMet ||
    s.steppedOutside ||
    s.meditationCompleted ||
    s.notes.trim().length > 0;

  const buildPayload = (s: FormState): Record<string, unknown> => ({
    energyLevel: s.touched.energy ? s.energy : undefined,
    moodScore: s.touched.mood ? s.mood : undefined,
    stressLevel: s.touched.stress ? s.stress : undefined,
    sleepQualitySubjective: s.touched.sleepQuality ? s.sleepQuality : undefined,
    motivationLevel: s.touched.motivation ? s.motivation : undefined,
    sorenessOverall: s.touched.soreness ? s.soreness : undefined,
    hydrationGoalMet: s.hydrationGoalMet || undefined,
    steppedOutside: s.steppedOutside || undefined,
    meditationCompleted: s.meditationCompleted || undefined,
    notes: s.notes.trim() ? s.notes.trim() : undefined,
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>): Promise<SubmitResponse> => {
      const res = await apiRequest('POST', '/api/wellness/log', payload);
      return res.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/wellness/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wellness/streak'] });
      toast({
        title: response.isNewInsert ? "You're checked in." : 'Updated.',
        description: response.xpAwarded > 0 ? `+${response.xpAwarded} XP` : undefined,
      });
      onSubmitted(response);
    },
    onError: (err: unknown) => {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!hasAnyValue(form)) {
      setEmptyHint(true);
      return;
    }
    setEmptyHint(false);
    submitMutation.mutate(buildPayload(form));
  };

  // Decision 6: 100ms delay lets the mobile keyboard start animating in
  // before scrollIntoView measures the viewport. Without the delay, the
  // scroll target is calculated against the pre-keyboard viewport and
  // lands ~200px off in real iOS Safari. Devtools mobile emulation does
  // NOT replicate this — verify on real device before merging.
  const handleNotesFocus = () => {
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-32 md:pb-8">
      {/* ─── Sliders ─────────────────────────────────────────────────────── */}
      <div className="space-y-4 md:space-y-5">
        <WellnessSlider
          label="Energy"
          ariaLabel="Energy level, 1 to 10"
          value={form.energy}
          onChange={setSlider('energy')}
          lowIcon={BatteryLow}
          highIcon={Zap}
        />
        <WellnessSlider
          label="Mood"
          ariaLabel="Mood, 1 to 10"
          value={form.mood}
          onChange={setSlider('mood')}
          lowIcon={CloudRain}
          highIcon={Sun}
        />
        <WellnessSlider
          label="Stress"
          ariaLabel="Stress level, 1 to 10. Higher number means more stress."
          value={form.stress}
          onChange={setSlider('stress')}
          lowIcon={Smile}
          highIcon={Frown}
        />
        <WellnessSlider
          label="Sleep quality"
          ariaLabel="Sleep quality, 1 to 10"
          value={form.sleepQuality}
          onChange={setSlider('sleepQuality')}
          lowIcon={Cloud}
          highIcon={Moon}
        />
        <WellnessSlider
          label="Motivation"
          ariaLabel="Motivation, 1 to 10"
          value={form.motivation}
          onChange={setSlider('motivation')}
          lowIcon={Battery}
          highIcon={Sparkles}
        />
        <WellnessSlider
          label="Soreness"
          ariaLabel="Soreness, 1 to 10. Higher number means more sore."
          value={form.soreness}
          onChange={setSlider('soreness')}
          lowIcon={CheckCircle2}
          highIcon={Flame}
        />
      </div>

      {/* ─── Behavior toggles (pill cluster) ────────────────────────────── */}
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium px-1">
          Today
        </h3>
        {/* TODO §DS-7: extract to <RolePill> when filter chips, toggle pills, and selection chips converge. */}
        <div className="flex flex-wrap gap-2">
          <BehaviorToggle
            on={form.hydrationGoalMet}
            onChange={() => toggleBehavior('hydrationGoalMet')}
            icon={Droplet}
            label="Hit my water goal"
          />
          <BehaviorToggle
            on={form.steppedOutside}
            onChange={() => toggleBehavior('steppedOutside')}
            icon={Wind}
            label="Stepped outside"
          />
          <BehaviorToggle
            on={form.meditationCompleted}
            onChange={() => toggleBehavior('meditationCompleted')}
            icon={Brain}
            label="Meditated"
          />
        </div>
      </div>

      {/* ─── Notes accordion ────────────────────────────────────────────── */}
      <Accordion type="single" collapsible className="border-y border-border/30">
        <AccordionItem value="notes" className="border-b-0">
          <AccordionTrigger className="text-sm text-primary hover:no-underline cursor-pointer">
            Add a note
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              ref={textareaRef}
              placeholder="Anything else worth remembering about today? (optional)"
              rows={3}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, notes: e.target.value }));
                if (emptyHint && e.target.value.trim().length > 0) setEmptyHint(false);
              }}
              onFocus={handleNotesFocus}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Inline empty hint */}
      {emptyHint && (
        <p className="text-sm text-amber-500 px-1" role="alert" aria-live="polite">
          Touch a slider, flip a toggle, or add a note to save.
        </p>
      )}

      {/* ─── Submit CTA ──────────────────────────────────────────────────── */}
      {/* Desktop: in-flow button. Mobile: sticky to viewport bottom so the keyboard never occludes. */}
      <div className="hidden md:flex justify-end">
        <ActionButton
          variant="primary"
          size="md"
          onClick={handleSubmit}
          loading={submitMutation.isPending}
          icon={<Sparkles className="w-4 h-4" />}
        >
          See my readiness
        </ActionButton>
      </div>
      {/* Mobile sticky CTA. bottom-20 clears the 64px MobileBottomNav (z-50) by 16px.
          Using z-40 keeps us under the bottom nav (z-50) on purpose — the nav must
          stay clickable; the CTA sits above it visually via vertical position, not
          stacking. Trying bottom-4 + z-[60] caused the CTA to overlap nav buttons. */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitMutation.isPending}
        aria-label="See my readiness"
        className="md:hidden fixed bottom-20 left-4 right-4 z-40 min-h-[52px] rounded-full bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <Sparkles className="w-4 h-4" />
        {submitMutation.isPending ? 'Saving…' : 'See my readiness'}
      </button>
    </div>
  );
}

// ─── Inline pill toggle ────────────────────────────────────────────────────
// TODO §DS-7: extract to <RolePill> when filter chips, toggle pills, and selection chips converge.
interface BehaviorToggleProps {
  on: boolean;
  onChange: () => void;
  icon: typeof Droplet;
  label: string;
}
function BehaviorToggle({ on, onChange, icon: Icon, label }: BehaviorToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`min-h-[44px] px-4 rounded-full text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
        on
          ? 'bg-primary text-primary-foreground'
          : 'bg-card border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40'
      }`}
    >
      <Icon className={`w-4 h-4 ${on ? '' : 'opacity-70'}`} aria-hidden="true" />
      {label}
    </button>
  );
}
