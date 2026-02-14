import { memo } from 'react';
import { motion } from 'framer-motion';
import { Target, Users, Zap, Shield, Crown } from 'lucide-react';

// Luxury shimmer particle component - optimized
const ShimmerParticle = ({
  delay,
  variant = 'blue',
}: {
  delay: number;
  variant?: 'blue' | 'emerald';
}) => (
  <motion.div
    className="absolute w-0.5 h-0.5 rounded-full"
    style={{
      background:
        variant === 'blue'
          ? 'linear-gradient(135deg, #3B82F6, #e5e4e2, #3B82F6)'
          : 'linear-gradient(135deg, #10B981, #e5e4e2, #10B981)',
      boxShadow:
        variant === 'blue' ? '0 0 8px rgba(59, 130, 246, 0.5)' : '0 0 8px rgba(16, 185, 129, 0.5)',
      willChange: 'transform, opacity',
    }}
    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
    animate={{
      opacity: [0, 0.7, 0],
      scale: [0, 1.5, 0],
      x: [0, Math.random() * 100 - 50],
      y: [0, Math.random() * -100],
    }}
    transition={{
      duration: 2.5,
      repeat: Infinity,
      delay,
      ease: 'easeOut',
    }}
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
      {/* Sophisticated dual-tone ambient glow - optimized */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          top: '10%',
          right: '5%',
          filter: 'blur(80px)',
          willChange: 'opacity',
        }}
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
          bottom: '10%',
          left: '5%',
          filter: 'blur(80px)',
          willChange: 'opacity',
        }}
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
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
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
              style={{
                background:
                  'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.08))',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Crown className="w-4 h-4" style={{ color: '#3B82F6' }} />
              <span className="text-sm font-light tracking-wider" style={{ color: '#d4d4d4' }}>
                OUR MISSION
              </span>
            </motion.div>

            {/* Headline */}
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-light pb-3"
              style={{
                fontFamily: "'Playfair Display', serif",
                background: 'linear-gradient(90deg, #3B82F6 0%, #e5e4e2 50%, #10B981 100%)',
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
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))'
                            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
                        color: value.variant === 'blue' ? '#3B82F6' : '#10B981',
                      }}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                    >
                      {value.icon}
                    </motion.div>

                    {/* Shimmer particle - optimized */}
                    <div className="absolute top-2 right-2">
                      <ShimmerParticle delay={index * 0.5} variant={value.variant} />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3
                        className="text-xl font-light mb-1 pb-1"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          background:
                            value.variant === 'blue'
                              ? 'linear-gradient(135deg, #ffffff, #3B82F6)'
                              : 'linear-gradient(135deg, #ffffff, #10B981)',
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

      {/* Floating luxury particles - optimized count */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none z-50"
          style={{
            width: '1.5px',
            height: '1.5px',
            background:
              i % 2 === 0
                ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                : 'linear-gradient(135deg, #10B981, #059669)',
            boxShadow:
              i % 2 === 0 ? '0 0 8px rgba(59, 130, 246, 0.4)' : '0 0 8px rgba(16, 185, 129, 0.4)',
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
            repeat: Infinity,
            delay: Math.random() * 6,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
});

AboutPage.displayName = 'AboutPage';

export default AboutPage;
