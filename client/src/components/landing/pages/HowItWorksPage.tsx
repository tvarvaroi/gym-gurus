import { memo } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Dumbbell, TrendingUp, ArrowRight, Crown } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Sign Up & Add Clients',
    description:
      'Create your account in under a minute. Import or add your clients and their goals — no tech skills required.',
    variant: 'guru' as const,
  },
  {
    number: '02',
    icon: Dumbbell,
    title: 'Build & Assign Workouts',
    description:
      'Use the drag-and-drop workout builder or let AI generate plans. Assign workouts to clients with one click.',
    variant: 'disciple' as const,
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Track & Grow',
    description:
      'Monitor progress with real-time dashboards, schedule sessions, manage payments, and scale your business.',
    variant: 'guru' as const,
  },
];

const HowItWorksPage = memo(() => {
  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Ambient glow - one-shot entrance */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, hsl(var(--color-guru) / 0.08) 0%, transparent 70%)',
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
                background:
                  'linear-gradient(135deg, hsl(var(--color-guru) / 0.08), hsl(var(--color-disciple) / 0.08))',
                border: '1px solid hsl(var(--color-guru) / 0.2)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Crown className="w-4 h-4" style={{ color: 'hsl(var(--color-guru))' }} />
              <span className="text-sm font-light tracking-wider" style={{ color: '#d4d4d4' }}>
                HOW IT WORKS
              </span>
            </motion.div>

            <h2
              className="text-4xl md:text-5xl lg:text-6xl font-light pb-3"
              style={{
                fontFamily: "'Playfair Display', serif",
                background:
                  'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #e5e4e2 50%, hsl(var(--color-disciple)) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
                lineHeight: '1.25',
              }}
            >
              Three Simple Steps
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
              Get up and running in minutes, not days.
            </p>
          </motion.div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.3 + index * 0.15,
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
                  {/* Glass overlay */}
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
                    }}
                  />

                  <div className="relative space-y-4">
                    {/* Step number */}
                    <span
                      className="text-5xl font-light"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        color:
                          step.variant === 'guru'
                            ? 'hsl(var(--color-guru) / 0.2)'
                            : 'hsl(var(--color-disciple) / 0.2)',
                      }}
                    >
                      {step.number}
                    </span>

                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background:
                          step.variant === 'guru'
                            ? 'linear-gradient(135deg, hsl(var(--color-guru) / 0.15), hsl(var(--color-guru-secondary) / 0.1))'
                            : 'linear-gradient(135deg, hsl(var(--color-disciple) / 0.15), hsl(var(--color-disciple-secondary) / 0.1))',
                        color:
                          step.variant === 'guru'
                            ? 'hsl(var(--color-guru))'
                            : 'hsl(var(--color-disciple))',
                      }}
                    >
                      <step.icon className="w-6 h-6" />
                    </div>

                    {/* Title */}
                    <h3
                      className="text-xl font-light pb-1"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        background:
                          step.variant === 'guru'
                            ? 'linear-gradient(135deg, #ffffff, hsl(var(--color-guru)))'
                            : 'linear-gradient(135deg, #ffffff, hsl(var(--color-disciple)))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        lineHeight: '1.4',
                      }}
                    >
                      {step.title}
                    </h3>

                    {/* Description */}
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

                {/* Connector arrow between cards (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-5 h-5" style={{ color: 'hsl(var(--color-guru) / 0.3)' }} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center"
          >
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
              <a
                href="/api/login?role=trainer"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-light transition-all"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  background:
                    'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-secondary)), hsl(var(--color-guru-accent)))',
                  boxShadow:
                    '0 20px 40px hsl(var(--color-guru) / 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  letterSpacing: '0.05em',
                }}
              >
                Get Started Free
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
