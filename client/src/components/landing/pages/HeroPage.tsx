import { memo } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { fadeInUpVariants, staggerContainer } from '@/lib/landingAnimations';
import { Users, Clock, TrendingUp, CheckCircle, Crown, ArrowRight, Trophy } from 'lucide-react';
import CTAButton from '../shared/CTAButton';

// Luxury shimmer particle component
const ShimmerParticle = ({
  delay,
  variant = 'blue',
  prefersReducedMotion = false,
}: {
  delay: number;
  variant?: 'blue' | 'emerald';
  prefersReducedMotion?: boolean;
}) => (
  <motion.div
    className="absolute w-0.5 h-0.5 rounded-full"
    style={{
      background:
        variant === 'blue'
          ? 'linear-gradient(135deg, hsl(var(--color-guru)), #e5e4e2, hsl(var(--color-guru)))'
          : 'linear-gradient(135deg, hsl(var(--color-disciple)), #e5e4e2, hsl(var(--color-disciple)))',
      boxShadow:
        variant === 'blue' ? '0 0 8px hsl(var(--color-guru) / 0.5)' : '0 0 8px hsl(var(--color-disciple) / 0.5)',
    }}
    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
    animate={{
      opacity: [0, 0.7, 0],
      scale: [0, 1.5, 0],
      x: [0, Math.random() * 150 - 75],
      y: [0, Math.random() * -150],
    }}
    transition={{
      duration: 3,
      repeat: prefersReducedMotion ? 0 : Infinity,
      delay,
      ease: 'easeOut',
    }}
  />
);

const HeroPage = memo(() => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Sophisticated dual-tone ambient glow - optimized for smooth animation */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, hsl(var(--color-guru) / 0.08) 0%, transparent 70%)',
          top: '10%',
          right: '10%',
          filter: 'blur(80px)',
          willChange: 'opacity',
        }}
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 6,
          repeat: prefersReducedMotion ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, hsl(var(--color-disciple) / 0.08) 0%, transparent 70%)',
          bottom: '10%',
          left: '10%',
          filter: 'blur(80px)',
          willChange: 'opacity',
        }}
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: prefersReducedMotion ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Elegant metallic accent lines - asymmetric */}
      <div className="absolute inset-0 opacity-10 z-0">
        <div
          className="absolute top-0 left-0 w-2/3 h-px"
          style={{
            background: 'linear-gradient(90deg, hsl(var(--color-guru) / 0.4), transparent)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-2/3 h-px"
          style={{
            background: 'linear-gradient(270deg, hsl(var(--color-disciple) / 0.4), transparent)',
          }}
        />
        <div
          className="absolute top-1/3 right-0 w-px h-1/3"
          style={{
            background:
              'linear-gradient(180deg, transparent, hsl(var(--color-guru) / 0.3), transparent)',
          }}
        />
      </div>

      {/* Asymmetric Split Layout */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center">
        {/* LEFT SIDE - 60% width on desktop - Hero Content */}
        <div className="w-full lg:w-[60%] px-6 md:px-12 lg:px-16 py-20 lg:py-24 space-y-12 flex flex-col justify-center">
          {/* Top Section - Luxury badge + Headline */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-10"
          >
            {/* Luxury badge */}
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4, repeat: prefersReducedMotion ? 0 : Infinity }}
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
                PREMIUM FITNESS PLATFORM
              </span>
            </motion.div>

            {/* Oversized Magazine-Style Headline */}
            <div className="space-y-6">
              <h1
                className="text-5xl md:text-6xl lg:text-7xl font-light pb-4"
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
                Transform
                <br />
                Your
                <br />
                <span className="font-normal">Training</span>
                <br />
                Business
              </h1>

              {/* Subheadline with generous spacing */}
              <p
                className="text-xl md:text-2xl max-w-xl font-light pl-2 pb-3"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: '#b3b3b3',
                  letterSpacing: '0.02em',
                  lineHeight: '2',
                  borderLeft: '2px solid hsl(var(--color-guru) / 0.3)',
                  paddingLeft: '2rem',
                }}
              >
                The all-in-one platform for modern personal trainers. Manage, track, and
                grow—effortlessly.
              </p>
            </div>
          </motion.div>

          {/* CTA Section with Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-8"
          >
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <motion.div whileHover={{ scale: 1.05, x: 5 }} whileTap={{ scale: 0.98 }}>
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

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <button
                  onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-light transition-all"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    letterSpacing: '0.05em',
                  }}
                >
                  See How It Works
                </button>
              </motion.div>
            </div>

            {/* Trust Indicators - Horizontal */}
            <div className="flex flex-wrap items-center gap-6 text-sm" style={{ color: '#999' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'hsl(var(--color-guru))' }} />
                <span className="font-light">30-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'hsl(var(--color-disciple))' }} />
                <span className="font-light">No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'hsl(var(--color-guru))' }} />
                <span className="font-light">Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDE - 40% width on desktop - Floating Stats & Cards */}
        <div className="hidden sm:block w-full lg:w-[40%] px-6 md:px-8 lg:px-10 py-12 lg:py-20 space-y-6">
          {/* Statistics - Vertical Stack */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {[
              { value: '10K+', label: 'Active Trainers', variant: 'blue' as const },
              { value: '50K+', label: 'Clients Served', variant: 'emerald' as const },
              { value: '99%', label: 'Satisfaction', variant: 'blue' as const },
            ].map((stat, index) => (
              <motion.div key={index} whileHover={{ x: 10, scale: 1.05 }} className="relative">
                {/* Floating card effect */}
                <div
                  className="p-8 rounded-2xl relative"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                    backdropFilter: 'blur(30px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow:
                      '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
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

                  <div className="relative space-y-2">
                    {/* Shimmer particle - optimized to 1 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShimmerParticle delay={index * 0.5} variant={stat.variant} prefersReducedMotion={prefersReducedMotion} />
                    </div>

                    <div
                      className="text-4xl lg:text-5xl font-light pb-2"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        background:
                          stat.variant === 'blue'
                            ? 'linear-gradient(135deg, #ffffff, hsl(var(--color-guru)))'
                            : 'linear-gradient(135deg, #ffffff, hsl(var(--color-disciple)))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        lineHeight: '1.3',
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      className="text-sm uppercase tracking-widest font-light pb-1"
                      style={{ color: '#808080', letterSpacing: '0.15em', lineHeight: '1.6' }}
                    >
                      {stat.label}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Floating Trophy - Decorative */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="hidden lg:block"
          >
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 6, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
              className="flex items-center justify-center"
            >
              <Trophy className="w-20 h-20" style={{ color: 'hsl(var(--color-guru) / 0.15)' }} />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Feature Pills - Centered for Symmetry */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-20 left-0 right-0 z-20 hidden md:flex justify-center"
      >
        <div className="flex flex-wrap gap-4 justify-center max-w-4xl px-6">
          {[
            {
              icon: <Users className="w-5 h-5" />,
              text: 'Unlimited Clients',
              variant: 'blue' as const,
            },
            {
              icon: <Clock className="w-5 h-5" />,
              text: 'Save 10+ Hours Weekly',
              variant: 'emerald' as const,
            },
            {
              icon: <TrendingUp className="w-5 h-5" />,
              text: '40% Revenue Growth',
              variant: 'blue' as const,
            },
          ].map((pill, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05, y: -2 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.8), rgba(10, 10, 10, 0.9))',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${pill.variant === 'blue' ? 'hsl(var(--color-guru) / 0.2)' : 'hsl(var(--color-disciple) / 0.2)'}`,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ color: pill.variant === 'blue' ? 'hsl(var(--color-guru))' : 'hsl(var(--color-disciple))' }}>
                {pill.icon}
              </div>
              <span
                className="text-sm font-light"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: '#d4d4d4',
                  letterSpacing: '0.02em',
                }}
              >
                {pill.text}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Floating luxury particles - Gold & Teal - optimized count */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none z-50"
          style={{
            width: '1.5px',
            height: '1.5px',
            background:
              i % 2 === 0
                ? 'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-secondary)))'
                : 'linear-gradient(135deg, hsl(var(--color-disciple)), hsl(var(--color-disciple-secondary)))',
            boxShadow:
              i % 2 === 0 ? '0 0 8px hsl(var(--color-guru) / 0.4)' : '0 0 8px hsl(var(--color-disciple) / 0.4)',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            willChange: 'transform, opacity',
          }}
          animate={{
            y: [0, -150, 0],
            opacity: [0, 0.5, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 6 + Math.random() * 3,
            repeat: prefersReducedMotion ? 0 : Infinity,
            delay: Math.random() * 6,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
});

HeroPage.displayName = 'HeroPage';

export default HeroPage;
