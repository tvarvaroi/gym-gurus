import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Dumbbell,
  TrendingUp,
  Sparkles,
  BookOpen,
  Target,
  ArrowRight,
  Crown,
} from 'lucide-react';

type Track = 'guru' | 'ronin';

const guruSteps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Add Your Clients',
    description: 'Import your roster, set goals, generate access codes. Done in 2 minutes.',
  },
  {
    number: '02',
    icon: Dumbbell,
    title: 'Build Their Program',
    description:
      'Drag workouts into weeks, assign rest days, set missed-session rules. Or let AI do it.',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Watch Them Grow',
    description: 'Real-time compliance tracking, revenue dashboard, automated reminders.',
  },
];

const roninSteps = [
  {
    number: '01',
    icon: Sparkles,
    title: 'Tell AI Your Goals',
    description: "One prompt. Your experience level, equipment, schedule. That's it.",
  },
  {
    number: '02',
    icon: BookOpen,
    title: 'Get Your Program',
    description: 'Full multi-week plan in 30 seconds. Or choose from expert-built templates.',
  },
  {
    number: '03',
    icon: Target,
    title: 'Hit Every PR',
    description: 'Log sets, track volume, watch your strength curve climb.',
  },
];

const HowItWorksPage = memo(() => {
  const [activeTrack, setActiveTrack] = useState<Track>('guru');

  const steps = activeTrack === 'guru' ? guruSteps : roninSteps;
  const accentVar = activeTrack === 'guru' ? '--color-guru' : '--color-ronin';
  const accentSecondaryVar = activeTrack === 'guru' ? '--color-guru-secondary' : '--color-ronin';

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Ambient glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: `radial-gradient(circle, hsl(${activeTrack === 'guru' ? 'var(--color-guru)' : 'var(--color-ronin)'} / 0.08) 0%, transparent 70%)`,
          top: '5%',
          left: '10%',
          filter: 'blur(80px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      <div className="relative z-10 min-h-screen flex items-center px-8 md:px-12 lg:px-20 py-12">
        <div className="w-full max-w-5xl mx-auto space-y-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
              style={{
                background: `linear-gradient(135deg, hsl(var(--color-guru) / 0.08), hsl(var(--color-ronin) / 0.08))`,
                border: '1px solid hsl(var(--color-guru) / 0.2)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Crown className="w-4 h-4" style={{ color: `hsl(var(${accentVar}))` }} />
              <span className="text-sm font-light tracking-wider" style={{ color: '#d4d4d4' }}>
                HOW IT WORKS
              </span>
            </motion.div>

            <h2
              className="text-4xl md:text-5xl lg:text-6xl font-light pb-3"
              style={{
                fontFamily: "'Playfair Display', serif",
                background:
                  'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #e5e4e2 50%, hsl(var(--color-ronin)) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
                lineHeight: '1.25',
              }}
            >
              Your Path. Your Rules.
            </h2>

            <p
              className="text-lg md:text-xl max-w-lg mx-auto font-light"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: '#b3b3b3',
                letterSpacing: '0.02em',
                lineHeight: '2',
              }}
            >
              Two paths, one platform. Choose yours.
            </p>
          </motion.div>

          {/* Track Switcher */}
          <div className="flex justify-center">
            <div
              className="inline-flex rounded-2xl p-1"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {[
                { id: 'guru' as Track, label: 'Guru Track', sublabel: 'Personal Trainer' },
                { id: 'ronin' as Track, label: 'Ronin Track', sublabel: 'Solo Athlete' },
              ].map((track) => {
                const isActive = activeTrack === track.id;
                const color =
                  track.id === 'guru' ? 'hsl(var(--color-guru))' : 'hsl(var(--color-ronin))';
                return (
                  <button
                    key={track.id}
                    onClick={() => setActiveTrack(track.id)}
                    className="relative px-6 md:px-8 py-3 rounded-xl text-sm transition-all duration-300 cursor-pointer min-h-[48px]"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      color: isActive ? color : 'hsl(0 0% 45%)',
                      background: isActive ? `${color}12` : 'transparent',
                    }}
                    aria-pressed={isActive}
                  >
                    <div className="font-medium tracking-wider uppercase text-xs">
                      {track.label}
                    </div>
                    <div
                      className="text-[10px] mt-0.5 tracking-wide"
                      style={{ color: 'hsl(0 0% 40%)' }}
                    >
                      {track.sublabel}
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="track-indicator"
                        className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                        style={{ background: color }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Steps — animated swap */}
          <motion.div
            key={activeTrack}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative"
              >
                <div
                  className="rounded-2xl p-6 h-full relative"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow:
                      '0 15px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
                    }}
                  />

                  <div className="relative space-y-4">
                    <span
                      className="text-5xl font-light"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        color: `hsl(var(${accentVar}) / 0.2)`,
                      }}
                    >
                      {step.number}
                    </span>

                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, hsl(var(${accentVar}) / 0.15), hsl(var(${accentSecondaryVar}) / 0.1))`,
                        color: `hsl(var(${accentVar}))`,
                      }}
                    >
                      <step.icon className="w-6 h-6" />
                    </div>

                    <h3
                      className="text-xl font-light pb-1"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        background: `linear-gradient(135deg, #ffffff, hsl(var(${accentVar})))`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        lineHeight: '1.4',
                      }}
                    >
                      {step.title}
                    </h3>

                    <p
                      className="text-sm font-light"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        color: '#999',
                        lineHeight: '1.8',
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight
                      className="w-5 h-5"
                      style={{ color: `hsl(var(${accentVar}) / 0.3)` }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
              <a
                href="#choose-path"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-light transition-all cursor-pointer"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  background:
                    'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-secondary)), hsl(var(--color-guru-accent)))',
                  boxShadow:
                    '0 15px 30px hsl(var(--color-guru) / 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  letterSpacing: '0.05em',
                  textDecoration: 'none',
                }}
              >
                Start as Guru
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </a>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
              <a
                href="#choose-path"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-light transition-all cursor-pointer"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  background: 'linear-gradient(135deg, hsl(var(--color-ronin)), #6366f1)',
                  boxShadow:
                    '0 15px 30px hsl(var(--color-ronin) / 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  letterSpacing: '0.05em',
                  textDecoration: 'none',
                }}
              >
                Start as Ronin
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
});

HowItWorksPage.displayName = 'HowItWorksPage';

export default HowItWorksPage;
