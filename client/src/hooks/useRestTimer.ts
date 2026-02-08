import { useState, useEffect, useCallback, useRef } from 'react';

interface UseRestTimerOptions {
  defaultSeconds?: number;
  onComplete?: () => void;
  autoStart?: boolean;
  enableNotifications?: boolean;
  enableVibration?: boolean;
  enableSound?: boolean;
}

interface RestTimerState {
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
  totalRestTime: number;
  setCount: number;
}

interface UseRestTimerReturn extends RestTimerState {
  start: (customSeconds?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  addTime: (additionalSeconds: number) => void;
  subtractTime: (subtractSeconds: number) => void;
  setDefaultTime: (seconds: number) => void;
  formattedTime: string;
  progress: number;
  totalSeconds: number;
}

// Request notification permission
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Send notification
function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/icons/workout.png',
      tag: 'rest-timer',
      requireInteraction: true,
      silent: false,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }
}

// Vibration pattern
function vibrate(pattern: number | number[]) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

// Format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function useRestTimer({
  defaultSeconds = 90,
  onComplete,
  autoStart = false,
  enableNotifications = true,
  enableVibration = true,
  enableSound = true,
}: UseRestTimerOptions = {}): UseRestTimerReturn {
  const [state, setState] = useState<RestTimerState>({
    seconds: defaultSeconds,
    isRunning: false,
    isPaused: false,
    totalRestTime: 0,
    setCount: 0,
  });

  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if (enableNotifications) {
      requestNotificationPermission();
    }
  }, [enableNotifications]);

  // Initialize audio
  useEffect(() => {
    if (enableSound) {
      audioRef.current = new Audio('/sounds/timer-complete.mp3');
      // Fallback to a beep if custom sound not available
      audioRef.current.onerror = () => {
        // Create a simple beep using Web Audio API as fallback
        audioRef.current = null;
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, [enableSound]);

  // Play completion sound
  const playCompletionSound = useCallback(() => {
    if (!enableSound) return;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Fallback to Web Audio API beep
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = 800;
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
          console.warn('Could not play sound:', e);
        }
      });
    }
  }, [enableSound]);

  // Timer completion handler
  const handleComplete = useCallback(() => {
    // Play sound
    playCompletionSound();

    // Vibrate
    if (enableVibration) {
      vibrate([200, 100, 200, 100, 200]);
    }

    // Send notification
    if (enableNotifications) {
      sendNotification('Rest Complete! 💪', 'Time for your next set');
    }

    // Call callback
    onComplete?.();
  }, [enableNotifications, enableVibration, playCompletionSound, onComplete]);

  // Timer logic
  useEffect(() => {
    if (!state.isRunning || state.isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setState(prev => {
        if (prev.seconds <= 1) {
          handleComplete();
          return {
            ...prev,
            seconds: 0,
            isRunning: false,
            isPaused: false,
          };
        }

        return {
          ...prev,
          seconds: prev.seconds - 1,
          totalRestTime: prev.totalRestTime + 1,
        };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, state.isPaused, handleComplete]);

  // Start timer
  const start = useCallback((customSeconds?: number) => {
    const seconds = customSeconds || totalSeconds;
    setTotalSeconds(seconds);

    setState(prev => ({
      ...prev,
      seconds,
      isRunning: true,
      isPaused: false,
      setCount: prev.setCount + 1,
    }));
  }, [totalSeconds]);

  // Pause timer
  const pause = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: true,
    }));
  }, []);

  // Resume timer
  const resume = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: false,
    }));
  }, []);

  // Reset timer
  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      seconds: totalSeconds,
      isRunning: false,
      isPaused: false,
    }));
  }, [totalSeconds]);

  // Add time
  const addTime = useCallback((additionalSeconds: number) => {
    setState(prev => ({
      ...prev,
      seconds: prev.seconds + additionalSeconds,
    }));
    setTotalSeconds(prev => prev + additionalSeconds);
  }, []);

  // Subtract time
  const subtractTime = useCallback((subtractSeconds: number) => {
    setState(prev => ({
      ...prev,
      seconds: Math.max(0, prev.seconds - subtractSeconds),
    }));
  }, []);

  // Set default time
  const setDefaultTime = useCallback((seconds: number) => {
    setTotalSeconds(seconds);
    setState(prev => ({
      ...prev,
      seconds: prev.isRunning ? prev.seconds : seconds,
    }));
  }, []);

  // Calculate progress
  const progress = totalSeconds > 0 ? ((totalSeconds - state.seconds) / totalSeconds) * 100 : 0;

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && !state.isRunning && !state.isPaused) {
      start();
    }
  }, [autoStart, start, state.isRunning, state.isPaused]);

  return {
    ...state,
    start,
    pause,
    resume,
    reset,
    addTime,
    subtractTime,
    setDefaultTime,
    formattedTime: formatTime(state.seconds),
    progress,
    totalSeconds,
  };
}

// Preset rest times
export const REST_TIME_PRESETS = [
  { label: '30s', seconds: 30, description: 'Light isolation exercises' },
  { label: '60s', seconds: 60, description: 'Moderate exercises' },
  { label: '90s', seconds: 90, description: 'Compound exercises' },
  { label: '2 min', seconds: 120, description: 'Heavy compound lifts' },
  { label: '3 min', seconds: 180, description: 'Very heavy, low rep' },
  { label: '5 min', seconds: 300, description: 'Max effort attempts' },
];

// Get recommended rest time based on exercise type and intensity
export function getRecommendedRestTime(
  exerciseType: 'compound' | 'isolation' | 'cardio',
  intensity: 'light' | 'moderate' | 'heavy' | 'max',
  reps: number
): number {
  if (exerciseType === 'cardio') return 30;

  const baseTime = exerciseType === 'compound' ? 90 : 60;

  const intensityMultiplier = {
    light: 0.5,
    moderate: 1,
    heavy: 1.5,
    max: 2,
  }[intensity];

  const repMultiplier = reps <= 3 ? 1.5 : reps <= 6 ? 1.2 : reps <= 10 ? 1 : 0.8;

  return Math.round(baseTime * intensityMultiplier * repMultiplier);
}

export default useRestTimer;
