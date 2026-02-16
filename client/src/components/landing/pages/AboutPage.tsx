import { memo } from 'react';
import { motion } from 'framer-motion';
import { Target, Users, Zap, Shield, Crown } from 'lucide-react';

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

const AboutPage = memo(() => {
  const values = [
    {
      icon: <Target className="w-7 h-7" />,
      title: 'Trainer-First',
      description: 'Built to help trainers succeed',
      variant: 'blue' as const,
    },
    {
      icon: <Zap className="w-7 h-7" />,
      title: 'Innovation',
      description: 'Cutting-edge AI & automation',
      variant: 'emerald' as const,
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: 'Integrity',
      description: 'Transparent pricing, honest communication',
      variant: 'blue' as const,
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: 'Community',
      description: 'Movement of empowered trainers',
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
        <div className="w-full max-w-6xl mx-auto space-y-10">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center space-y-6"
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
                OUR MISSION
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
              Empowering Trainers
            </h1>

            {/* Mission Statement */}
            <p
              className="text-base md:text-lg max-w-3xl mx-auto font-light pb-2"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: '#b3b3b3',
                letterSpacing: '0.01em',
                lineHeight: '2',
              }}
            >
              GymGurus empowers trainers to build thriving businesses through innovative technology.
              We believe trainers should spend their time training—not drowning in paperwork.
            </p>
          </motion.div>

          {/* Core Values Grid - 2x2 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto"
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.03, y: -3 }}
                className="relative"
              >
                <div
                  className="rounded-2xl p-6 border relative h-full"
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
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background:
                          value.variant === 'blue'
                            ? 'linear-gradient(135deg, hsl(var(--color-guru) / 0.15), hsl(var(--color-guru-secondary) / 0.1))'
                            : 'linear-gradient(135deg, hsl(var(--color-disciple) / 0.15), hsl(var(--color-disciple-secondary) / 0.1))',
                        color: value.variant === 'blue' ? 'hsl(var(--color-guru))' : 'hsl(var(--color-disciple))',
                      }}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                    >
                      {value.icon}
                    </motion.div>

                    {/* Shimmer particle - optimized */}
                    <div className="absolute top-2 right-2">
                      <ShimmerDot delay={index * 0.5} variant={value.variant} />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3
                        className="text-xl font-light mb-1 pb-1"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          background:
                            value.variant === 'blue'
                              ? 'linear-gradient(135deg, #ffffff, hsl(var(--color-guru)))'
                              : 'linear-gradient(135deg, #ffffff, hsl(var(--color-disciple)))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          lineHeight: '1.4',
                        }}
                      >
                        {value.title}
                      </h3>
                      <p
                        className="text-sm font-light pb-1"
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          color: '#999',
                          lineHeight: '1.6',
                        }}
                      >
                        {value.description}
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
        { left: '12%', top: '25%', variant: 'guru' },
        { left: '85%', top: '30%', variant: 'disciple' },
        { left: '20%', top: '80%', variant: 'disciple' },
        { left: '75%', top: '70%', variant: 'guru' },
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

AboutPage.displayName = 'AboutPage';

export default AboutPage;
