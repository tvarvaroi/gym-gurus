import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, RotateCcw, Plus, Minus, Volume2, VolumeX, Bell, BellOff } from 'lucide-react';
import { useRestTimer, REST_TIME_PRESETS } from '@/hooks/useRestTimer';
import { useState, useEffect } from 'react';

interface RestTimerDisplayProps {
  defaultSeconds?: number;
  onComplete?: () => void;
  autoStart?: boolean;
  showPresets?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
}

export function RestTimerDisplay({
  defaultSeconds = 90,
  onComplete,
  autoStart = false,
  showPresets = true,
  size = 'md',
}: RestTimerDisplayProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const timer = useRestTimer({
    defaultSeconds,
    onComplete,
    autoStart,
    enableSound: soundEnabled,
    enableNotifications: notificationsEnabled,
    enableVibration: true,
  });

  const sizeClasses = {
    sm: { timer: 'text-4xl', container: 'p-4', button: 'p-2' },
    md: { timer: 'text-6xl', container: 'p-6', button: 'p-3' },
    lg: { timer: 'text-8xl', container: 'p-8', button: 'p-4' },
    fullscreen: { timer: 'text-[12rem]', container: 'p-12', button: 'p-6' },
  };

  const { timer: timerSize, container, button } = sizeClasses[size];

  // Get color based on remaining time
  const getTimerColor = () => {
    if (timer.seconds <= 5) return 'text-red-500';
    if (timer.seconds <= 15) return 'text-orange-500';
    if (timer.seconds <= 30) return 'text-yellow-500';
    return 'text-foreground';
  };

  return (
    <div className={`bg-card rounded-2xl ${container} flex flex-col items-center`}>
      {/* Settings */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`${button} rounded-full ${soundEnabled ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          title={soundEnabled ? 'Mute' : 'Unmute'}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          className={`${button} rounded-full ${notificationsEnabled ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
        >
          {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>
      </div>

      {/* Timer Display */}
      <div className="relative mb-6">
        {/* Circular Progress */}
        <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-secondary"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-primary"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: timer.progress / 100 }}
            style={{
              strokeDasharray: '283',
              strokeDashoffset: 283 * (1 - timer.progress / 100),
            }}
          />
        </svg>

        {/* Time Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`font-mono font-bold ${timerSize} ${getTimerColor()}`}
            key={timer.formattedTime}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.1 }}
          >
            {timer.formattedTime}
          </motion.span>
          <span className="text-sm text-muted-foreground">
            {timer.isRunning ? 'Rest' : timer.isPaused ? 'Paused' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Add/Subtract Time Buttons */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => timer.subtractTime(15)}
          className={`${button} rounded-full bg-secondary hover:bg-secondary/80`}
          disabled={!timer.isRunning && !timer.isPaused}
        >
          <Minus className="w-5 h-5" />
        </button>
        <span className="text-sm text-muted-foreground w-16 text-center">±15s</span>
        <button
          onClick={() => timer.addTime(15)}
          className={`${button} rounded-full bg-secondary hover:bg-secondary/80`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-4 mb-6">
        {!timer.isRunning && !timer.isPaused ? (
          <button
            onClick={() => timer.start()}
            className={`${button} rounded-full bg-primary text-primary-foreground hover:bg-primary/90`}
          >
            <Play className="w-6 h-6" />
          </button>
        ) : timer.isPaused ? (
          <button
            onClick={() => timer.resume()}
            className={`${button} rounded-full bg-primary text-primary-foreground hover:bg-primary/90`}
          >
            <Play className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={() => timer.pause()}
            className={`${button} rounded-full bg-secondary hover:bg-secondary/80`}
          >
            <Pause className="w-6 h-6" />
          </button>
        )}
        <button
          onClick={() => timer.reset()}
          className={`${button} rounded-full bg-secondary hover:bg-secondary/80`}
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>

      {/* Time Presets */}
      {showPresets && (
        <div className="flex flex-wrap justify-center gap-2">
          {REST_TIME_PRESETS.map((preset) => (
            <button
              key={preset.seconds}
              onClick={() => timer.start(preset.seconds)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                timer.totalSeconds === preset.seconds
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      {timer.setCount > 0 && (
        <div className="mt-4 pt-4 border-t w-full">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Sets completed: {timer.setCount}</span>
            <span>Total rest: {Math.floor(timer.totalRestTime / 60)}m {timer.totalRestTime % 60}s</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal timer for inline use
interface MinimalRestTimerProps {
  seconds: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

export function MinimalRestTimer({ seconds, onComplete, autoStart = true }: MinimalRestTimerProps) {
  const timer = useRestTimer({
    defaultSeconds: seconds,
    onComplete,
    autoStart,
    enableSound: true,
    enableNotifications: true,
    enableVibration: true,
  });

  const getColor = () => {
    if (timer.seconds <= 5) return 'bg-red-500';
    if (timer.seconds <= 15) return 'bg-orange-500';
    if (timer.seconds <= 30) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <div className="flex items-center gap-3">
      {/* Mini progress bar */}
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getColor()}`}
          initial={{ width: '0%' }}
          animate={{ width: `${timer.progress}%` }}
        />
      </div>

      {/* Time */}
      <span className="font-mono font-bold text-lg min-w-[60px]">{timer.formattedTime}</span>

      {/* Skip button */}
      {!timer.isRunning ? (
        <button
          onClick={() => timer.start()}
          className="p-1 rounded bg-secondary hover:bg-secondary/80"
        >
          <Play className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={onComplete}
          className="p-1 rounded bg-secondary hover:bg-secondary/80 text-xs"
        >
          Skip
        </button>
      )}
    </div>
  );
}

// Floating rest timer that stays visible
interface FloatingRestTimerProps {
  isVisible: boolean;
  seconds: number;
  onComplete: () => void;
  onDismiss: () => void;
}

export function FloatingRestTimer({
  isVisible,
  seconds,
  onComplete,
  onDismiss,
}: FloatingRestTimerProps) {
  const timer = useRestTimer({
    defaultSeconds: seconds,
    onComplete,
    autoStart: true,
    enableSound: true,
    enableNotifications: true,
    enableVibration: true,
  });

  useEffect(() => {
    if (isVisible) {
      timer.start(seconds);
    }
  }, [isVisible, seconds]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-card shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 border"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          <span className="text-sm text-muted-foreground">Rest</span>

          <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${timer.progress}%` }}
            />
          </div>

          <span className="font-mono font-bold text-xl">{timer.formattedTime}</span>

          <button
            onClick={onDismiss}
            className="p-1 rounded-full bg-secondary hover:bg-secondary/80"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RestTimerDisplay;
