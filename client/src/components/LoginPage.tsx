import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trophy, CheckCircle, Shield, Crown } from 'lucide-react';
import { GuruIcon } from '@/components/icons/GuruIcon';
import { DiscipleIcon } from '@/components/icons/DiscipleIcon';
import { RoninIcon } from '@/components/icons/RoninIcon';
import { getRoleDisplayName, getRoleTagline } from '@/lib/roles';
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type UserRole = 'trainer' | 'client' | 'solo';

// Luxury shimmer particle component
const ShimmerParticle = ({
  delay,
  variant = 'gold',
  prefersReducedMotion = false,
}: {
  delay: number;
  variant?: 'gold' | 'teal';
  prefersReducedMotion?: boolean;
}) => (
  <motion.div
    className="absolute w-0.5 h-0.5 rounded-full"
    style={{
      background:
        variant === 'gold'
          ? 'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--muted)), hsl(var(--color-guru)))'
          : 'linear-gradient(135deg, hsl(var(--color-disciple)), hsl(var(--muted)), hsl(var(--color-disciple)))',
      boxShadow:
        variant === 'gold'
          ? '0 0 8px hsl(var(--color-guru) / 0.5)'
          : '0 0 8px hsl(var(--color-disciple) / 0.5)',
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

// 3D Parallax Card Component with Mouse Tracking
const ParallaxCard = ({
  role,
  isSelected,
  onClick,
  children,
}: {
  role: UserRole;
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={`Select ${role} role`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{ scale: 1.05, z: 50 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
    >
      {children}
    </motion.div>
  );
};

export function LoginPage() {
  const prefersReducedMotion = useReducedMotion();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSignIn = () => {
    if (selectedRole) {
      window.location.href = `/api/login?role=${selectedRole}`;
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Premium Gym Video Background */}
      <div className="absolute inset-0 z-0">
        {/* Video Element */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => {
            setVideoLoaded(true);
            console.log('✅ Local video loaded and ready to play');
          }}
          onLoadStart={() => console.log('📥 Local video loading started...')}
          onCanPlay={() => console.log('✅ Local video can start playing')}
          onPlay={() => console.log('▶️ Local video is now playing')}
          onError={(e) => {
            console.error('❌ Local video failed to load');
            const videoEl = e.currentTarget as HTMLVideoElement;
            console.error('Video error code:', videoEl.error?.code);
            console.error('Video error message:', videoEl.error?.message);
          }}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: 'brightness(0.6) contrast(1.25) saturate(0.95)',
            opacity: videoLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease-in',
          }}
        >
          <source src="/videos/gym-background.mp4" type="video/mp4" />
        </video>

        {/* Loading indicator - shows until video loads */}
        {!videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-5">
            <div className="text-white/30 text-sm">Loading video...</div>
          </div>
        )}

        {/* Fallback premium animated background if video doesn't load */}
        <div className="absolute inset-0 -z-10">
          {/* Animated gym-themed gradient background */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 30%, #0f0f0f 60%, #050505 100%)',
            }}
            animate={{
              background: [
                'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 30%, #0f0f0f 60%, #050505 100%)',
                'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 30%, #0a0a0a 60%, #0f0f0f 100%)',
                'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 30%, #0f0f0f 60%, #050505 100%)',
              ],
            }}
            transition={{
              duration: 10,
              repeat: prefersReducedMotion ? 0 : Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Subtle texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255, 255, 255, 0.03) 2px,
                rgba(255, 255, 255, 0.03) 4px
              )`,
            }}
          />
        </div>

        {/* Dark Glass/Mirror Filter Overlay - Creates the dark base that torch will reveal through */}
        <motion.div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `radial-gradient(circle 500px at ${mousePosition.x}px ${mousePosition.y}px,
              rgba(0, 0, 0, 0.50) 0%,
              rgba(0, 0, 0, 0.70) 20%,
              rgba(0, 0, 0, 0.85) 45%,
              rgba(0, 0, 0, 0.92) 70%,
              rgba(0, 0, 0, 0.95) 100%)`,
            backdropFilter: 'blur(0.5px)',
          }}
        />

        {/* Subtle noise texture */}
        <div
          className="absolute inset-0 opacity-[0.015] z-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay',
          }}
        />

        {/* Sophisticated dual-tone ambient glow */}
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full pointer-events-none z-30"
          style={{
            background:
              'radial-gradient(circle, hsl(var(--color-guru) / 0.08) 0%, transparent 70%)',
            top: '15%',
            left: '15%',
            filter: 'blur(140px)',
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: prefersReducedMotion ? 0 : Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full pointer-events-none z-30"
          style={{
            background:
              'radial-gradient(circle, hsl(var(--color-disciple) / 0.08) 0%, transparent 70%)',
            bottom: '15%',
            right: '15%',
            filter: 'blur(140px)',
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 12,
            repeat: prefersReducedMotion ? 0 : Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Elegant metallic accent lines */}
        <div className="absolute inset-0 opacity-8 z-30">
          <div
            className="absolute top-0 left-0 w-full h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, hsl(var(--color-guru) / 0.2), hsl(var(--color-disciple) / 0.2), transparent)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-full h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, hsl(var(--color-disciple) / 0.2), hsl(var(--color-guru) / 0.2), transparent)',
            }}
          />
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="relative z-40 flex flex-col lg:flex-row min-h-screen">
        {/* LEFT SIDE - Branding & Visual */}
        <div className="lg:w-2/5 relative flex flex-col justify-center p-8 lg:p-16">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 lg:mb-20"
          >
            <div className="flex items-center gap-6">
              <div
                className="relative w-18 h-18 lg:w-24 lg:h-24 rounded-2xl p-1"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--color-guru) / 0.12), hsl(var(--color-disciple) / 0.12))',
                  backdropFilter: 'blur(24px)',
                  boxShadow:
                    '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                }}
              >
                {/* Sophisticated glass shine */}
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
                  }}
                />
                <img
                  src={logoImage}
                  alt="Gym Gurus"
                  className="w-full h-full rounded-xl object-cover relative z-10"
                  style={{ filter: 'brightness(1.15) contrast(1.08) saturate(0.85)' }}
                />
              </div>
              <div>
                <h1
                  className="text-3xl lg:text-4xl font-extralight tracking-[0.4em] mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    background:
                      'linear-gradient(90deg, hsl(var(--color-guru)) 0%, hsl(var(--muted)) 50%, hsl(var(--color-disciple)) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '0.25em',
                  }}
                >
                  GYM GURUS
                </h1>
                <div
                  className="h-px my-2"
                  style={{
                    background:
                      'linear-gradient(90deg, hsl(var(--color-guru) / 0.6), hsl(var(--color-disciple) / 0.6))',
                  }}
                />
                <p
                  className="text-xs tracking-[0.4em] font-light"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    color: 'hsl(var(--muted-foreground))',
                    letterSpacing: '0.35em',
                  }}
                >
                  ELITE FITNESS
                </p>
              </div>
            </div>
          </motion.div>

          {/* Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-10"
          >
            <div>
              {/* Luxury badge */}
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 4, repeat: prefersReducedMotion ? 0 : Infinity }}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-10"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--color-guru) / 0.08), hsl(var(--color-disciple) / 0.08))',
                  border: '1px solid hsl(var(--color-guru) / 0.2)',
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                }}
              >
                <Crown className="w-4 h-4" style={{ color: 'hsl(var(--color-guru))' }} />
                <span
                  className="text-sm font-light tracking-wider"
                  style={{ color: 'hsl(var(--border))' }}
                >
                  PREMIUM EXPERIENCE
                </span>
              </motion.div>

              {/* Magazine-style hero headline */}
              <h2
                className="text-6xl lg:text-8xl font-light mb-8 leading-[0.95]"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  background:
                    'linear-gradient(135deg, #ffffff 0%, hsl(var(--muted)) 30%, hsl(var(--color-guru)) 70%, hsl(var(--color-disciple)) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.03em',
                }}
              >
                Welcome
                <br />
                Back
              </h2>

              <p
                className="text-lg max-w-lg leading-relaxed font-light"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: 'hsl(var(--muted-foreground))',
                  letterSpacing: '0.02em',
                  lineHeight: '1.8',
                }}
              >
                Experience the pinnacle of fitness excellence. Select your path and embark on a
                transformative journey.
              </p>
            </div>

            {/* Luxury stats with dual-tone accents */}
            <div
              className="grid grid-cols-3 gap-8 max-w-lg pt-10"
              style={{
                borderTop: '1px solid hsl(var(--color-guru) / 0.12)',
              }}
            >
              {[
                { value: '10K+', label: 'Active Users', variant: 'gold' as const },
                { value: '50K+', label: 'Workouts', variant: 'teal' as const },
                { value: '98%', label: 'Satisfaction', variant: 'gold' as const },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  whileHover={{ scale: 1.05, y: -3 }}
                  className="text-center relative"
                >
                  <div className="relative">
                    {/* Dual-tone shimmer particles */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {[...Array(2)].map((_, j) => (
                        <ShimmerParticle
                          key={j}
                          delay={i * 0.4 + j * 0.3}
                          variant={stat.variant}
                          prefersReducedMotion={prefersReducedMotion}
                        />
                      ))}
                    </div>
                    <div
                      className="text-4xl font-light mb-1"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        background:
                          stat.variant === 'gold'
                            ? 'linear-gradient(135deg, #ffffff, hsl(var(--color-guru)))'
                            : 'linear-gradient(135deg, #ffffff, hsl(var(--color-disciple)))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {stat.value}
                    </div>
                  </div>
                  <div
                    className="text-xs uppercase tracking-widest font-light"
                    style={{ color: 'hsl(var(--muted-foreground))', letterSpacing: '0.15em' }}
                  >
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Floating trophy with gold accent */}
          <div className="absolute bottom-20 left-20 hidden lg:block">
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 5, repeat: prefersReducedMotion ? 0 : Infinity }}
            >
              <Trophy className="w-14 h-14" style={{ color: 'hsl(var(--color-guru) / 0.15)' }} />
            </motion.div>
          </div>
        </div>

        {/* RIGHT SIDE - Role Selection (Bento Grid) */}
        <div className="lg:w-3/5 relative flex items-center justify-center p-8 lg:p-16">
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl"
          >
            {/* Title */}
            <div className="mb-12 text-center lg:text-left">
              <h3
                className="text-4xl lg:text-5xl font-light mb-4"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  background:
                    'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #ffffff 50%, hsl(var(--color-disciple)) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                }}
              >
                Choose Your Path
              </h3>
              <p
                style={{ color: 'hsl(var(--muted-foreground))', letterSpacing: '0.05em' }}
                className="font-light text-sm"
              >
                Select your role to begin your journey
              </p>
            </div>

            {/* Bento Grid Layout - 3 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {/* TRAINER CARD - Luxury Gold/Bronze */}
              <ParallaxCard
                role="trainer"
                isSelected={selectedRole === 'trainer'}
                onClick={() => setSelectedRole('trainer')}
              >
                <motion.div
                  className="relative h-[380px] rounded-3xl overflow-hidden group"
                  style={{
                    background:
                      selectedRole === 'trainer'
                        ? 'linear-gradient(135deg, hsl(var(--color-guru) / 0.10), hsl(var(--color-guru-secondary) / 0.08))'
                        : 'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                    backdropFilter: 'blur(30px)',
                    border:
                      selectedRole === 'trainer'
                        ? '1px solid hsl(var(--color-guru) / 0.35)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow:
                      selectedRole === 'trainer'
                        ? '0 25px 50px -12px hsl(var(--color-guru) / 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                        : '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                  }}
                  whileHover={{
                    boxShadow:
                      selectedRole === 'trainer'
                        ? '0 30px 60px -15px hsl(var(--color-guru) / 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                        : '0 30px 60px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                  }}
                >
                  {/* Sophisticated glass overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
                    }}
                  />

                  {/* Selection indicator */}
                  {selectedRole === 'trainer' && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute top-6 right-6 z-20"
                    >
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{
                          background:
                            'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-secondary)))',
                          boxShadow: '0 10px 20px hsl(var(--color-guru) / 0.4)',
                        }}
                      >
                        <CheckCircle className="w-6 h-6 text-black" strokeWidth={3} />
                      </div>
                    </motion.div>
                  )}

                  {/* Icon Circle - Top Left */}
                  <motion.div
                    className="absolute top-6 left-6 w-16 h-16 rounded-full flex items-center justify-center z-10"
                    style={{
                      background:
                        'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-accent)))',
                      boxShadow:
                        '0 12px 30px hsl(var(--color-guru) / 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                    }}
                    whileHover={{ rotate: 360, scale: 1.15 }}
                    transition={{ duration: 0.7 }}
                  >
                    {/* Icon shine */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 60%)',
                      }}
                    />
                    <GuruIcon size={28} className="relative z-10" />
                  </motion.div>

                  <div
                    className="relative h-full p-9 flex flex-col justify-between"
                    style={{ transform: 'translateZ(50px)' }}
                  >
                    {/* Content */}
                    <div className="mt-16">
                      <h4
                        className="text-4xl font-light mb-3"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          background: 'linear-gradient(135deg, #ffffff, hsl(var(--color-guru)))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {getRoleDisplayName('trainer')}
                      </h4>
                      <p
                        className="text-sm leading-relaxed mb-6 font-light"
                        style={{ color: 'hsl(var(--muted-foreground))', letterSpacing: '0.01em' }}
                      >
                        {getRoleTagline('trainer')} — Empower, build programs, track progress
                      </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                      {[
                        'Unlimited clients',
                        'Custom workouts',
                        'Analytics dashboard',
                        'Messaging',
                      ].map((feature, i) => (
                        <motion.div
                          key={feature}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.1 }}
                          className="flex items-center gap-3 text-sm"
                          style={{ color: 'hsl(var(--border))' }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background:
                                'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-secondary)))',
                              boxShadow: '0 0 8px hsl(var(--color-guru) / 0.5)',
                            }}
                          />
                          <span className="font-light tracking-wide">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Refined hover glow */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background:
                        'radial-gradient(circle at center, hsl(var(--color-guru) / 0.06), transparent 70%)',
                    }}
                  />
                </motion.div>
              </ParallaxCard>

              {/* CLIENT CARD - Elegant Teal/Cyan */}
              <ParallaxCard
                role="client"
                isSelected={selectedRole === 'client'}
                onClick={() => setSelectedRole('client')}
              >
                <motion.div
                  className="relative h-[380px] rounded-3xl overflow-hidden group"
                  style={{
                    background:
                      selectedRole === 'client'
                        ? 'linear-gradient(135deg, hsl(var(--color-disciple) / 0.10), hsl(var(--color-disciple-secondary) / 0.08))'
                        : 'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                    backdropFilter: 'blur(30px)',
                    border:
                      selectedRole === 'client'
                        ? '1px solid hsl(var(--color-disciple) / 0.35)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow:
                      selectedRole === 'client'
                        ? '0 25px 50px -12px hsl(var(--color-disciple) / 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                        : '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                  }}
                  whileHover={{
                    boxShadow:
                      selectedRole === 'client'
                        ? '0 30px 60px -15px hsl(var(--color-disciple) / 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                        : '0 30px 60px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                  }}
                >
                  {/* Sophisticated glass overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
                    }}
                  />

                  {/* Selection indicator */}
                  {selectedRole === 'client' && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute top-6 right-6 z-20"
                    >
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{
                          background:
                            'linear-gradient(135deg, hsl(var(--color-disciple)), hsl(var(--color-disciple-secondary)))',
                          boxShadow: '0 10px 20px hsl(var(--color-disciple) / 0.4)',
                        }}
                      >
                        <CheckCircle className="w-6 h-6 text-white" strokeWidth={3} />
                      </div>
                    </motion.div>
                  )}

                  {/* Icon Circle - Top Left */}
                  <motion.div
                    className="absolute top-6 left-6 w-16 h-16 rounded-full flex items-center justify-center z-10"
                    style={{
                      background:
                        'linear-gradient(135deg, hsl(var(--color-disciple)), hsl(var(--color-disciple-secondary)))',
                      boxShadow:
                        '0 12px 30px hsl(var(--color-disciple) / 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                    }}
                    whileHover={{ rotate: 360, scale: 1.15 }}
                    transition={{ duration: 0.7 }}
                  >
                    {/* Icon shine */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 60%)',
                      }}
                    />
                    <DiscipleIcon size={28} className="relative z-10" />
                  </motion.div>

                  <div
                    className="relative h-full p-9 flex flex-col justify-between"
                    style={{ transform: 'translateZ(50px)' }}
                  >
                    {/* Content */}
                    <div className="mt-16">
                      <h4
                        className="text-4xl font-light mb-3"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          background:
                            'linear-gradient(135deg, #ffffff, hsl(var(--color-disciple)))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {getRoleDisplayName('client')}
                      </h4>
                      <p
                        className="text-sm leading-relaxed mb-6 font-light"
                        style={{ color: 'hsl(var(--muted-foreground))', letterSpacing: '0.01em' }}
                      >
                        {getRoleTagline('client')} — Follow programs, track progress
                      </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                      {[
                        'Personalized plans',
                        'Progress tracking',
                        'Trainer messaging',
                        'Exercise library',
                      ].map((feature, i) => (
                        <motion.div
                          key={feature}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.1 }}
                          className="flex items-center gap-3 text-sm"
                          style={{ color: 'hsl(var(--border))' }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background:
                                'linear-gradient(135deg, hsl(var(--color-disciple)), hsl(var(--color-disciple-secondary)))',
                              boxShadow: '0 0 8px hsl(var(--color-disciple) / 0.5)',
                            }}
                          />
                          <span className="font-light tracking-wide">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Refined hover glow */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background:
                        'radial-gradient(circle at center, hsl(var(--color-disciple) / 0.06), transparent 70%)',
                    }}
                  />
                </motion.div>
              </ParallaxCard>

              {/* SOLO CARD - Purple/Indigo */}
              <ParallaxCard
                role="solo"
                isSelected={selectedRole === 'solo'}
                onClick={() => setSelectedRole('solo')}
              >
                <motion.div
                  className="relative h-[380px] rounded-3xl overflow-hidden group"
                  style={{
                    background:
                      selectedRole === 'solo'
                        ? 'linear-gradient(135deg, hsl(var(--color-ronin) / 0.10), hsl(var(--color-ronin-secondary) / 0.08))'
                        : 'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                    backdropFilter: 'blur(30px)',
                    border:
                      selectedRole === 'solo'
                        ? '1px solid hsl(var(--color-ronin) / 0.35)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow:
                      selectedRole === 'solo'
                        ? '0 25px 50px -12px hsl(var(--color-ronin) / 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                        : '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                  }}
                  whileHover={{
                    boxShadow:
                      selectedRole === 'solo'
                        ? '0 30px 60px -15px hsl(var(--color-ronin) / 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                        : '0 30px 60px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                  }}
                >
                  {/* Sophisticated glass overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
                    }}
                  />

                  {/* Selection indicator */}
                  {selectedRole === 'solo' && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute top-6 right-6 z-20"
                    >
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{
                          background:
                            'linear-gradient(135deg, hsl(var(--color-ronin)), hsl(var(--color-ronin-secondary)))',
                          boxShadow: '0 10px 20px hsl(var(--color-ronin) / 0.4)',
                        }}
                      >
                        <CheckCircle className="w-6 h-6 text-white" strokeWidth={3} />
                      </div>
                    </motion.div>
                  )}

                  {/* Icon Circle - Top Left */}
                  <motion.div
                    className="absolute top-6 left-6 w-16 h-16 rounded-full flex items-center justify-center z-10"
                    style={{
                      background:
                        'linear-gradient(135deg, hsl(var(--color-ronin)), hsl(var(--color-ronin-secondary)))',
                      boxShadow:
                        '0 12px 30px hsl(var(--color-ronin) / 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                    }}
                    whileHover={{ rotate: 360, scale: 1.15 }}
                    transition={{ duration: 0.7 }}
                  >
                    {/* Icon shine */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 60%)',
                      }}
                    />
                    <RoninIcon size={28} className="relative z-10" />
                  </motion.div>

                  <div
                    className="relative h-full p-9 flex flex-col justify-between"
                    style={{ transform: 'translateZ(50px)' }}
                  >
                    {/* Content */}
                    <div className="mt-16">
                      <h4
                        className="text-4xl font-light mb-3"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          background: 'linear-gradient(135deg, #ffffff, hsl(var(--color-ronin)))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {getRoleDisplayName('solo')}
                      </h4>
                      <p
                        className="text-sm leading-relaxed mb-6 font-light"
                        style={{ color: 'hsl(var(--muted-foreground))', letterSpacing: '0.01em' }}
                      >
                        {getRoleTagline('solo')} — Train independently with AI
                      </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                      {[
                        'AI-powered coach',
                        'Smart workouts',
                        'Gamification',
                        'Recovery tracking',
                      ].map((feature, i) => (
                        <motion.div
                          key={feature}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.1 }}
                          className="flex items-center gap-3 text-sm"
                          style={{ color: 'hsl(var(--border))' }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background:
                                'linear-gradient(135deg, hsl(var(--color-ronin)), hsl(var(--color-ronin-secondary)))',
                              boxShadow: '0 0 8px hsl(var(--color-ronin) / 0.5)',
                            }}
                          />
                          <span className="font-light tracking-wide">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Refined hover glow */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background:
                        'radial-gradient(circle at center, hsl(var(--color-ronin) / 0.06), transparent 70%)',
                    }}
                  />
                </motion.div>
              </ParallaxCard>
            </div>

            {/* Sign In Button - Dynamic Role Colors */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={handleSignIn}
                disabled={!selectedRole}
                className="w-full h-16 rounded-2xl text-lg font-semibold transition-all duration-500 relative overflow-hidden border-0"
                style={
                  selectedRole
                    ? selectedRole === 'trainer'
                      ? {
                          background:
                            'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-secondary)), hsl(var(--color-guru-accent)))',
                          boxShadow:
                            '0 20px 40px hsl(var(--color-guru) / 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                          color: '#000000',
                        }
                      : selectedRole === 'client'
                        ? {
                            background:
                              'linear-gradient(135deg, hsl(var(--color-disciple)), hsl(var(--color-disciple-secondary)), hsl(var(--color-disciple-accent)))',
                            boxShadow:
                              '0 20px 40px hsl(var(--color-disciple) / 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                          }
                        : {
                            background:
                              'linear-gradient(135deg, hsl(var(--color-ronin)), hsl(var(--color-ronin-secondary)), hsl(var(--color-ronin-accent)))',
                            boxShadow:
                              '0 20px 40px hsl(var(--color-ronin) / 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                          }
                    : {
                        background:
                          'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'hsl(var(--muted-foreground))',
                      }
                }
              >
                {selectedRole && (
                  <>
                    {/* Role-specific animated shine */}
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent)',
                      }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{
                        duration: 2.5,
                        repeat: prefersReducedMotion ? 0 : Infinity,
                        ease: 'linear',
                      }}
                    />
                    {/* Premium top highlight */}
                    <div
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 50%)',
                      }}
                    />
                  </>
                )}
                <span
                  className="relative z-10 flex items-center justify-center gap-3 font-light"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '0.08em',
                  }}
                >
                  CONTINUE
                  <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </motion.div>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-center text-xs mt-8 flex items-center justify-center gap-2"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="font-light tracking-wide">
                Secure Authentication • Privacy Protected
              </span>
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Floating luxury particles - Gold & Teal */}
      {[...Array(18)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none z-50"
          style={{
            width: Math.random() > 0.7 ? '1.5px' : '1px',
            height: Math.random() > 0.7 ? '1.5px' : '1px',
            background:
              i % 3 === 0
                ? 'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-secondary)))'
                : i % 3 === 1
                  ? 'linear-gradient(135deg, hsl(var(--color-disciple)), hsl(var(--color-disciple-secondary)))'
                  : 'linear-gradient(135deg, hsl(var(--muted)), #ffffff)',
            boxShadow:
              i % 3 === 0
                ? '0 0 8px hsl(var(--color-guru) / 0.4)'
                : i % 3 === 1
                  ? '0 0 8px hsl(var(--color-disciple) / 0.4)'
                  : '0 0 5px hsl(var(--muted) / 0.3)',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -140, 0],
            opacity: [0, 0.5, 0],
            scale: [0, 1.8, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 6,
            repeat: prefersReducedMotion ? 0 : Infinity,
            delay: Math.random() * 8,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
