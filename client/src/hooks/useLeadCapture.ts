import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { trackEvent } from '@/lib/analytics';

type TriggerType = 'calculator-result' | 'scroll' | 'return-visitor';

const SESSION_KEY = 'gymgurus_lead_popup_shown';
const SESSION_LOADED_KEY = 'gymgurus_session_loaded';
const DISMISS_KEY = 'gymgurus_lead_popup_dismissed';
const VISIT_COUNT_KEY = 'gymgurus_visit_count';

/** How many times a user can dismiss before we stop showing forever */
const MAX_DISMISSALS = 3;

/** Scroll threshold percentage (0-1) for scroll-based trigger */
const SCROLL_THRESHOLD = 0.6;

/** Delay in ms after scroll threshold is reached before showing popup */
const SCROLL_SHOW_DELAY = 800;

interface UseLeadCaptureOptions {
  trigger: TriggerType;
  /** For calculator-result trigger: set to true externally when a calculation completes */
  calculationComplete?: boolean;
}

interface UseLeadCaptureReturn {
  shouldShow: boolean;
  dismiss: () => void;
  triggerType: TriggerType;
}

/**
 * Manages lead capture popup state, session tracking, and scroll detection.
 *
 * Rules enforced:
 * - Never show on first page load of a session (requires at least one prior page load in sessionStorage)
 * - Max 1 popup per session (tracked via sessionStorage)
 * - Don't show to logged-in users
 * - Track dismissals in localStorage; stop showing after MAX_DISMISSALS
 */
export function useLeadCapture({
  trigger,
  calculationComplete = false,
}: UseLeadCaptureOptions): UseLeadCaptureReturn {
  const { isAuthenticated, isLoading } = useUser();
  const [shouldShow, setShouldShow] = useState(false);
  const hasTriggeredRef = useRef(false);

  // Helpers for storage (wrapped for SSR safety)
  const getSession = useCallback((key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }, []);

  const setSession = useCallback((key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // storage unavailable
    }
  }, []);

  const getLocal = useCallback((key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, []);

  const setLocal = useCallback((key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage unavailable
    }
  }, []);

  /**
   * Check whether all preconditions for showing a popup are met.
   * Returns true if we are allowed to show a popup.
   */
  const canShow = useCallback((): boolean => {
    // Don't show while auth state is loading
    if (isLoading) return false;

    // Never show to logged-in users
    if (isAuthenticated) return false;

    // Max 1 popup per session
    if (getSession(SESSION_KEY) === 'true') return false;

    // Must not be the first page load in this session
    if (getSession(SESSION_LOADED_KEY) !== 'true') return false;

    // Respect dismissal limit from localStorage
    const dismissCount = parseInt(getLocal(DISMISS_KEY) || '0', 10);
    if (dismissCount >= MAX_DISMISSALS) return false;

    return true;
  }, [isLoading, isAuthenticated, getSession, getLocal]);

  // On mount: mark this session as having had at least one page load,
  // and increment the persistent visit count for return-visitor detection.
  useEffect(() => {
    // If the session hasn't been marked yet, mark it now.
    // The popup cannot show on THIS first load because SESSION_LOADED_KEY
    // was not yet set when canShow() checks it. On subsequent navigations
    // within the same session (or SPA route changes triggering re-mounts),
    // the key will already exist.
    if (getSession(SESSION_LOADED_KEY) !== 'true') {
      setSession(SESSION_LOADED_KEY, 'true');
    }

    // Increment persistent visit count (for return-visitor trigger)
    const currentCount = parseInt(getLocal(VISIT_COUNT_KEY) || '0', 10);
    // Only bump once per session
    if (getSession('gymgurus_visit_counted') !== 'true') {
      setLocal(VISIT_COUNT_KEY, String(currentCount + 1));
      setSession('gymgurus_visit_counted', 'true');
    }
  }, [getSession, setSession, getLocal, setLocal]);

  // ---------- Trigger: calculator-result ----------
  useEffect(() => {
    if (trigger !== 'calculator-result') return;
    if (!calculationComplete) return;
    if (hasTriggeredRef.current) return;

    // Small delay so the popup doesn't appear the exact same frame as the result
    const timeout = setTimeout(() => {
      if (canShow()) {
        hasTriggeredRef.current = true;
        setShouldShow(true);
        setSession(SESSION_KEY, 'true');
        trackEvent('lead_popup_shown', { trigger: 'calculator-result' });
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [trigger, calculationComplete, canShow, setSession]);

  // ---------- Trigger: scroll ----------
  useEffect(() => {
    if (trigger !== 'scroll') return;

    const handleScroll = () => {
      if (hasTriggeredRef.current) return;

      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;

      const scrollPercent = window.scrollY / scrollHeight;
      if (scrollPercent >= SCROLL_THRESHOLD) {
        // Delay slightly so it doesn't feel instantaneous
        setTimeout(() => {
          if (hasTriggeredRef.current) return;
          if (canShow()) {
            hasTriggeredRef.current = true;
            setShouldShow(true);
            setSession(SESSION_KEY, 'true');
            trackEvent('lead_popup_shown', { trigger: 'scroll' });
          }
        }, SCROLL_SHOW_DELAY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trigger, canShow, setSession]);

  // ---------- Trigger: return-visitor ----------
  useEffect(() => {
    if (trigger !== 'return-visitor') return;
    if (hasTriggeredRef.current) return;

    // Only trigger for 2nd+ visit
    const visitCount = parseInt(getLocal(VISIT_COUNT_KEY) || '0', 10);
    if (visitCount < 2) return;

    // Slight delay so it doesn't appear instantly on page load
    const timeout = setTimeout(() => {
      if (hasTriggeredRef.current) return;
      if (canShow()) {
        hasTriggeredRef.current = true;
        setShouldShow(true);
        setSession(SESSION_KEY, 'true');
        trackEvent('lead_popup_shown', { trigger: 'return-visitor' });
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [trigger, canShow, getLocal, setSession]);

  // ---------- Dismiss ----------
  const dismiss = useCallback(() => {
    setShouldShow(false);
    setSession(SESSION_KEY, 'true');

    // Increment persistent dismissal counter
    const current = parseInt(getLocal(DISMISS_KEY) || '0', 10);
    setLocal(DISMISS_KEY, String(current + 1));

    trackEvent('lead_popup_dismissed', { trigger });
  }, [trigger, getLocal, setLocal, setSession]);

  return {
    shouldShow,
    dismiss,
    triggerType: trigger,
  };
}
