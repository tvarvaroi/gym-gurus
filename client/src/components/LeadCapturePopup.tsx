import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Calculator, BookOpen, Sparkles } from 'lucide-react';
import { useLeadCapture } from '@/hooks/useLeadCapture';
import { useIsMobile } from '@/hooks/use-mobile';
import { trackEvent } from '@/lib/analytics';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LeadCapturePopupProps {
  trigger: 'calculator-result' | 'scroll' | 'return-visitor';
  title?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  /** For the calculator-result trigger: pass `true` once a calculation finishes */
  calculationComplete?: boolean;
}

// ---------------------------------------------------------------------------
// Default copy per trigger
// ---------------------------------------------------------------------------

const DEFAULTS: Record<
  LeadCapturePopupProps['trigger'],
  { title: string; description: string; ctaText: string; icon: typeof Calculator }
> = {
  'calculator-result': {
    title: 'Save your results',
    description:
      'Create a free account to keep your calculations, track progress over time, and unlock personalized recommendations.',
    ctaText: 'Create a free account',
    icon: Calculator,
  },
  scroll: {
    title: 'Get the full workout guide',
    description:
      'Join free to access our complete library of workout plans, exercise guides, and AI-powered coaching tools.',
    ctaText: 'Join free',
    icon: BookOpen,
  },
  'return-visitor': {
    title: 'Welcome back!',
    description:
      'Ready to start your free trial? Pick up where you left off with personalized workouts and progress tracking.',
    ctaText: 'Start your free trial',
    icon: Sparkles,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadCapturePopup({
  trigger,
  title,
  description,
  ctaText,
  ctaHref = '/api/login',
  calculationComplete,
}: LeadCapturePopupProps) {
  const prefersReducedMotion = useReducedMotion();
  const { shouldShow, dismiss } = useLeadCapture({
    trigger,
    calculationComplete,
  });
  const isMobile = useIsMobile();

  const defaults = DEFAULTS[trigger];
  const resolvedTitle = title ?? defaults.title;
  const resolvedDescription = description ?? defaults.description;
  const resolvedCtaText = ctaText ?? defaults.ctaText;
  const Icon = defaults.icon;

  const handleCtaClick = useCallback(() => {
    trackEvent('lead_popup_cta_click', { trigger });
    // Navigate to signup / login
    window.location.href = ctaHref;
  }, [trigger, ctaHref]);

  const handleDismiss = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleNoThanks = useCallback(() => {
    trackEvent('lead_popup_no_thanks', { trigger });
    dismiss();
  }, [trigger, dismiss]);

  // -----------------------------------------------------------------------
  // Mobile: bottom slide-up sheet (no overlay modal)
  // -----------------------------------------------------------------------
  if (isMobile) {
    return (
      <AnimatePresence>
        {shouldShow && (
          <>
            {/* Scrim (click-outside to dismiss) */}
            <motion.div
              key="lead-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={handleDismiss}
              aria-hidden="true"
            />

            {/* Slide-up panel */}
            <motion.div
              key="lead-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={resolvedTitle}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border/50 bg-background p-6 pb-8 shadow-premium-lg"
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleDismiss();
              }}
              tabIndex={-1}
            >
              {/* Drag handle visual hint */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />

              {/* Close button */}
              <button
                onClick={handleDismiss}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted/50 transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Icon */}
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6]/20 to-[#10B981]/20">
                <Icon className="h-6 w-6 text-[#3B82F6]" />
              </div>

              {/* Copy */}
              <h2 className="mb-1 text-xl font-light tracking-tight">{resolvedTitle}</h2>
              <p className="mb-5 text-sm font-light leading-relaxed text-muted-foreground/80">
                {resolvedDescription}
              </p>

              {/* CTA */}
              <Button
                onClick={handleCtaClick}
                size="lg"
                className="relative w-full overflow-hidden bg-gradient-to-r from-[#3B82F6] to-[#10B981] text-white shadow-premium hover:from-[#3B82F6]/90 hover:to-[#10B981]/90 hover:shadow-premium-lg transition-all duration-300 group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative z-10">{resolvedCtaText}</span>
              </Button>

              {/* No thanks link */}
              <button
                onClick={handleNoThanks}
                className="mt-3 block w-full text-center text-sm font-light text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              >
                No thanks
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // -----------------------------------------------------------------------
  // Desktop: shadcn Dialog modal
  // -----------------------------------------------------------------------
  return (
    <Dialog
      open={shouldShow}
      onOpenChange={(open) => {
        if (!open) handleDismiss();
      }}
    >
      <DialogContent className="max-w-md glass-strong border-border/50 shadow-premium-lg overflow-hidden">
        {/* Accessibility */}
        <DialogTitle className="sr-only">{resolvedTitle}</DialogTitle>
        <DialogDescription className="sr-only">{resolvedDescription}</DialogDescription>

        <AnimatePresence>
          {shouldShow && (
            <motion.div
              key="lead-desktop"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* Decorative gradient bar at top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3B82F6] to-[#10B981]" />

              {/* Icon */}
              <div className="flex justify-center pt-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className="relative"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B82F6]/20 to-[#10B981]/20">
                    <Icon className="h-8 w-8 text-[#3B82F6]" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-[#3B82F6]/15 blur-xl"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: prefersReducedMotion ? 0 : Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </motion.div>
              </div>

              {/* Copy */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-extralight tracking-tight">{resolvedTitle}</h2>
                <p className="text-sm font-light leading-relaxed text-muted-foreground/80 max-w-sm mx-auto">
                  {resolvedDescription}
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-col items-center gap-2 pt-1">
                <Button
                  onClick={handleCtaClick}
                  size="lg"
                  className="relative w-full overflow-hidden bg-gradient-to-r from-[#3B82F6] to-[#10B981] text-white shadow-premium hover:from-[#3B82F6]/90 hover:to-[#10B981]/90 hover:shadow-premium-lg transition-all duration-300 group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative z-10">{resolvedCtaText}</span>
                </Button>

                {/* No thanks link */}
                <button
                  onClick={handleNoThanks}
                  className="mt-1 text-sm font-light text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                >
                  No thanks
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
