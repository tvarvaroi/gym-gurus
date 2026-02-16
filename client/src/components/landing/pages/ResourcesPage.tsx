import { memo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Video, FileText, Crown, ArrowRight, TrendingUp } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// Luxury shimmer particle component - optimized
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
      repeat: prefersReducedMotion ? 0 : Infinity,
      delay,
      ease: 'easeOut',
    }}
  />
);

const ResourcesPage = memo(() => {
  const prefersReducedMotion = useReducedMotion();
  const resources = [
    {
      icon: <BookOpen className="w-7 h-7" />,
      title: 'Blog',
      description: 'Expert insights for growing your training business',
      highlights: ['Marketing tips', 'Client retention', 'Success stories'],
      variant: 'blue' as const,
      cta: 'Read Articles',
    },
    {
      icon: <Video className="w-7 h-7" />,
      title: 'Academy',
      description: 'Master the GymGurus platform with video courses',
      highlights: ['Video tutorials', 'Live webinars', 'Certification'],
      variant: 'emerald' as const,
      cta: 'Watch Now',
    },
    {
      icon: <FileText className="w-7 h-7" />,
      title: 'Case Studies',
      description: 'Real success stories from top trainers',
      highlights: ['Revenue growth', 'Time saved', 'Client results'],
      variant: 'blue' as const,
      cta: 'View Stories',
    },
  ];

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Sophisticated dual-tone ambient glow - optimized */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, hsl(var(--color-guru) / 0.08) 0%, transparent 70%)',
          top: '10%',
          left: '10%',
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
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, hsl(var(--color-disciple) / 0.08) 0%, transparent 70%)',
          bottom: '10%',
          right: '10%',
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
                LEARNING CENTER
              </span>
            </motion.div>

            {/* Headline */}
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-light leading-tight pb-2"
              style={{
                fontFamily: "'Playfair Display', serif",
                background: 'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #e5e4e2 50%, hsl(var(--color-disciple)) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}
            >
              Resources & Learning
            </h1>

            {/* Subheadline */}
            <p
              className="text-base md:text-lg max-w-2xl mx-auto font-light leading-relaxed pb-1"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: '#b3b3b3',
                letterSpacing: '0.01em',
                lineHeight: '1.8',
              }}
            >
              Everything you need to succeed as a modern trainer
            </p>
          </motion.div>

          {/* Resources Grid - Premium Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {resources.map((resource, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="relative group"
              >
                <div
                  className="rounded-2xl p-6 border relative h-full flex flex-col"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow:
                      '0 20px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
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

                  {/* Hover glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background:
                        resource.variant === 'blue'
                          ? 'radial-gradient(circle at center, hsl(var(--color-guru) / 0.06), transparent 70%)'
                          : 'radial-gradient(circle at center, hsl(var(--color-disciple) / 0.06), transparent 70%)',
                    }}
                  />

                  <div className="relative flex flex-col h-full">
                    {/* Shimmer particle */}
                    <div className="absolute top-2 right-2">
                      <ShimmerParticle delay={index * 0.5} variant={resource.variant} prefersReducedMotion={prefersReducedMotion} />
                    </div>

                    {/* Icon */}
                    <motion.div
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                      style={{
                        background:
                          resource.variant === 'blue'
                            ? 'linear-gradient(135deg, hsl(var(--color-guru) / 0.15), hsl(var(--color-guru-secondary) / 0.1))'
                            : 'linear-gradient(135deg, hsl(var(--color-disciple) / 0.15), hsl(var(--color-disciple-secondary) / 0.1))',
                        color: resource.variant === 'blue' ? 'hsl(var(--color-guru))' : 'hsl(var(--color-disciple))',
                      }}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                    >
                      {resource.icon}
                    </motion.div>

                    {/* Title */}
                    <h3
                      className="text-2xl font-light mb-2 pb-1"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        background:
                          resource.variant === 'blue'
                            ? 'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #e5e4e2 50%, hsl(var(--color-disciple)) 100%)'
                            : 'linear-gradient(90deg, hsl(var(--color-disciple)) 0%, #e5e4e2 50%, hsl(var(--color-guru)) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {resource.title}
                    </h3>

                    {/* Description */}
                    <p
                      className="text-sm font-light mb-4 pb-1"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        color: '#b3b3b3',
                        letterSpacing: '0.01em',
                        lineHeight: '1.6',
                      }}
                    >
                      {resource.description}
                    </p>

                    {/* Highlights */}
                    <ul className="space-y-2 mb-6 flex-grow">
                      {resource.highlights.map((highlight, hIndex) => (
                        <li key={hIndex} className="flex items-center gap-2">
                          <TrendingUp
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{
                              color: resource.variant === 'blue' ? 'hsl(var(--color-guru))' : 'hsl(var(--color-disciple))',
                            }}
                          />
                          <span
                            className="text-xs font-light"
                            style={{
                              fontFamily: "'Cormorant Garamond', serif",
                              color: '#d4d4d4',
                            }}
                          >
                            {highlight}
                          </span>
                        </li>
                      ))}
                    </ul>
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

ResourcesPage.displayName = 'ResourcesPage';

export default ResourcesPage;
