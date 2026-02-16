import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Dumbbell,
  LineChart,
  Calendar,
  CreditCard,
  Crown,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

// Luxury shimmer dot - one-shot entrance
const ShimmerDot = ({
  delay,
  variant = 'blue',
}: {
  delay: number;
  variant?: 'blue' | 'emerald';
}) => (
  <motion.div
    className="absolute w-1 h-1 rounded-full"
    style={{
      background:
        variant === 'blue'
          ? 'hsl(var(--color-guru))'
          : 'hsl(var(--color-disciple))',
      boxShadow:
        variant === 'blue' ? '0 0 6px hsl(var(--color-guru) / 0.4)' : '0 0 6px hsl(var(--color-disciple) / 0.4)',
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 0.5, scale: 1 }}
    transition={{ duration: 1, delay, ease: 'easeOut' }}
  />
);

const FeaturesPage = memo(() => {
  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Client Management',
      description: 'Track every detail',
      variant: 'blue' as const,
    },
    {
      icon: <Dumbbell className="w-6 h-6" />,
      title: 'Workout Builder',
      description: 'Create in minutes',
      variant: 'emerald' as const,
    },
    {
      icon: <LineChart className="w-6 h-6" />,
      title: 'Progress Analytics',
      description: 'Data-driven results',
      variant: 'blue' as const,
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Smart Scheduling',
      description: 'Automated booking',
      variant: 'emerald' as const,
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Payment Processing',
      description: 'Get paid faster',
      variant: 'emerald' as const,
    },
  ];

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Ambient glow - one-shot entrance */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, hsl(var(--color-guru) / 0.08) 0%, transparent 70%)',
          top: '10%',
          right: '5%',
          filter: 'blur(80px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, hsl(var(--color-disciple) / 0.08) 0%, transparent 70%)',
          bottom: '10%',
          left: '5%',
          filter: 'blur(80px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 2, delay: 0.3, ease: 'easeOut' }}
      />

      <div className="relative z-10 min-h-screen flex items-center px-8 md:px-12 lg:px-20 py-12">
        {/* Three Column Layout: Features Left | Center Text | Features Right */}
        <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* LEFT COLUMN - Features 1-3 */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {features.slice(0, 3).map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ x: 8, scale: 1.02 }}
                className="relative"
              >
                <div
                  className="p-5 rounded-2xl relative"
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

                  <div className="relative flex items-center gap-4">
                    {/* Icon */}
                    <motion.div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background:
                          feature.variant === 'blue'
                            ? 'linear-gradient(135deg, hsl(var(--color-guru) / 0.15), hsl(var(--color-guru-secondary) / 0.1))'
                            : 'linear-gradient(135deg, hsl(var(--color-disciple) / 0.15), hsl(var(--color-disciple-secondary) / 0.1))',
                        color: feature.variant === 'blue' ? 'hsl(var(--color-guru))' : 'hsl(var(--color-disciple))',
                      }}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      {feature.icon}
                    </motion.div>

                    {/* Shimmer particle - optimized to 1 */}
                    <div className="absolute top-2 right-2">
                      <ShimmerDot delay={index * 0.5} variant={feature.variant} />
                    </div>

                    {/* Title */}
                    <div className="flex-1">
                      <h3
                        className="text-lg font-light mb-0.5 pb-1"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          background:
                            feature.variant === 'blue'
                              ? 'linear-gradient(135deg, #ffffff, hsl(var(--color-guru)))'
                              : 'linear-gradient(135deg, #ffffff, hsl(var(--color-disciple)))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          lineHeight: '1.4',
                        }}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className="text-xs font-light pb-1"
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          color: '#999',
                          lineHeight: '1.6',
                        }}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CENTER COLUMN - Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="text-center space-y-8 px-4"
          >
            {/* Luxury badge */}
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
                PLATFORM FEATURES
              </span>
            </motion.div>

            {/* Headline */}
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-light pb-3"
              style={{
                fontFamily: "'Playfair Display', serif",
                background: 'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #e5e4e2 50%, hsl(var(--color-disciple)) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
                lineHeight: '1.25',
              }}
            >
              Everything You Need
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg md:text-xl max-w-md mx-auto font-light pb-2"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: '#b3b3b3',
                letterSpacing: '0.02em',
                lineHeight: '2',
              }}
            >
              All-in-one platform built for trainers. No juggling multiple apps, just results.
            </p>

            {/* CTA */}
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
              <a
                href="/api/login?role=trainer"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-light transition-all"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  background: 'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-secondary)), hsl(var(--color-guru-accent)))',
                  boxShadow:
                    '0 20px 40px hsl(var(--color-guru) / 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  letterSpacing: '0.05em',
                }}
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </a>
            </motion.div>

            {/* Trust Indicators */}
            <div
              className="flex flex-wrap items-center justify-center gap-4 text-xs"
              style={{ color: '#999' }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: 'hsl(var(--color-guru))' }} />
                <span className="font-light">30-day trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: 'hsl(var(--color-disciple))' }} />
                <span className="font-light">No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: 'hsl(var(--color-guru))' }} />
                <span className="font-light">Cancel anytime</span>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN - Features 4-6 */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {features.slice(3, 6).map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ x: -8, scale: 1.02 }}
                className="relative"
              >
                <div
                  className="p-5 rounded-2xl relative"
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

                  <div className="relative flex items-center gap-4">
                    {/* Icon */}
                    <motion.div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background:
                          feature.variant === 'blue'
                            ? 'linear-gradient(135deg, hsl(var(--color-guru) / 0.15), hsl(var(--color-guru-secondary) / 0.1))'
                            : 'linear-gradient(135deg, hsl(var(--color-disciple) / 0.15), hsl(var(--color-disciple-secondary) / 0.1))',
                        color: feature.variant === 'blue' ? 'hsl(var(--color-guru))' : 'hsl(var(--color-disciple))',
                      }}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      {feature.icon}
                    </motion.div>

                    {/* Shimmer particle - optimized to 1 */}
                    <div className="absolute top-2 right-2">
                      <ShimmerDot delay={index * 0.5 + 0.3} variant={feature.variant} />
                    </div>

                    {/* Title */}
                    <div className="flex-1">
                      <h3
                        className="text-lg font-light mb-0.5 pb-1"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          background:
                            feature.variant === 'blue'
                              ? 'linear-gradient(135deg, #ffffff, hsl(var(--color-guru)))'
                              : 'linear-gradient(135deg, #ffffff, hsl(var(--color-disciple)))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          lineHeight: '1.4',
                        }}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className="text-xs font-light pb-1"
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          color: '#999',
                          lineHeight: '1.6',
                        }}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Static entrance dots */}
      {[
        { left: '15%', top: '20%', variant: 'guru' },
        { left: '80%', top: '35%', variant: 'disciple' },
        { left: '25%', top: '75%', variant: 'disciple' },
        { left: '70%', top: '85%', variant: 'guru' },
      ].map((dot, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full pointer-events-none"
          style={{
            left: dot.left,
            top: dot.top,
            background: dot.variant === 'guru' ? 'hsl(var(--color-guru))' : 'hsl(var(--color-disciple))',
            boxShadow: dot.variant === 'guru' ? '0 0 6px hsl(var(--color-guru) / 0.4)' : '0 0 6px hsl(var(--color-disciple) / 0.4)',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 + i * 0.2, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
});

FeaturesPage.displayName = 'FeaturesPage';

export default FeaturesPage;
