import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CheckCircle, Trophy, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { GuruIcon } from '@/components/icons/GuruIcon';
import { DiscipleIcon } from '@/components/icons/DiscipleIcon';
import { RoninIcon } from '@/components/icons/RoninIcon';
import { getRoleTagline } from '@/lib/roles';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png';

// ─── Types ──────────────────────────────────────────────────────────────────
type UserRole = 'trainer' | 'client' | 'solo';

interface RoleConfig {
  id: UserRole;
  name: string;
  label: string;
  color: string;
  gradient: string;
  glow: string;
  iconSize: number;
  iconMt?: string;
  icon: React.ComponentType<{ size?: number; variant?: 'default' | 'white'; className?: string }>;
  features: string[];
}

const ROLES: RoleConfig[] = [
  {
    id: 'trainer',
    name: 'Guru',
    label: 'Personal Trainer',
    color: 'hsl(var(--color-guru))',
    gradient: 'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-accent)))',
    glow: 'hsl(var(--color-guru) / 0.35)',
    iconSize: 90,
    icon: GuruIcon,
    features: ['Unlimited clients', 'Custom workouts', 'Analytics dashboard', 'Messaging'],
  },
  {
    id: 'client',
    name: 'Disciple',
    label: 'Fitness Client',
    color: 'hsl(var(--color-disciple))',
    gradient:
      'linear-gradient(135deg, hsl(var(--color-disciple)), hsl(var(--color-disciple-secondary)))',
    glow: 'hsl(var(--color-disciple) / 0.35)',
    iconSize: 110,
    icon: DiscipleIcon,
    features: ['Personalized plans', 'Progress tracking', 'Guru messaging', 'Exercise library'],
  },
  {
    id: 'solo',
    name: 'Ronin',
    label: 'Solo Athlete',
    color: 'hsl(var(--color-ronin))',
    gradient: 'linear-gradient(135deg, #a855f7, #6366f1)',
    glow: 'hsl(var(--color-ronin) / 0.35)',
    iconSize: 120,
    iconMt: '-mt-4',
    icon: RoninIcon,
    features: ['AI-powered coach', 'Smart workouts', 'Gamification', 'Recovery tracking'],
  },
];

// ─── Hoisted shimmer random values (rendering-hoist-jsx) ────────────────────
const SHIMMER_POSITIONS = Array.from({ length: 18 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  dx: Math.random() * 150 - 75,
  dy: Math.random() * -140,
  delay: Math.random() * 5,
  variant: (['guru', 'disciple', 'white'] as const)[Math.floor(Math.random() * 3)],
}));

// ─── ShimmerParticle (memo'd) ───────────────────────────────────────────────
const ShimmerParticle = memo(
  ({
    x,
    y,
    dx,
    dy,
    delay,
    variant,
  }: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    delay: number;
    variant: 'guru' | 'disciple' | 'white';
  }) => {
    const colorMap = {
      guru: 'hsl(var(--color-guru))',
      disciple: 'hsl(var(--color-disciple))',
      white: '#e5e4e2',
    };
    return (
      <motion.div
        className="absolute w-0.5 h-0.5 rounded-full pointer-events-none"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          background: colorMap[variant],
          boxShadow: `0 0 6px ${colorMap[variant]}`,
        }}
        animate={{
          opacity: [0, 0.5, 0],
          y: [0, dy],
          x: [0, dx],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay,
          ease: 'easeOut',
        }}
      />
    );
  }
);
ShimmerParticle.displayName = 'ShimmerParticle';

// ─── ParallaxCard (memo'd, mouse + touch) ───────────────────────────────────
const ParallaxCard = memo(
  ({
    children,
    className,
    style,
    onClick,
    isSelected,
    reducedMotion,
    ariaLabel,
    ariaPressed,
    onKeyDown,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    isSelected?: boolean;
    reducedMotion?: boolean;
    ariaLabel?: string;
    ariaPressed?: boolean;
    onKeyDown?: (e: React.KeyboardEvent) => void;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
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

    const handleMouse = useCallback(
      (e: React.MouseEvent) => {
        if (reducedMotion) return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
        mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
      },
      [mouseX, mouseY, reducedMotion]
    );

    const handleTouch = useCallback(
      (e: React.TouchEvent) => {
        if (reducedMotion) return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect || !e.touches[0]) return;
        mouseX.set((e.touches[0].clientX - rect.left) / rect.width - 0.5);
        mouseY.set((e.touches[0].clientY - rect.top) / rect.height - 0.5);
      },
      [mouseX, mouseY, reducedMotion]
    );

    const resetTilt = useCallback(() => {
      mouseX.set(0);
      mouseY.set(0);
    }, [mouseX, mouseY]);

    return (
      <motion.div
        ref={ref}
        className={className}
        style={{
          ...style,
          transformStyle: 'preserve-3d',
          rotateX: reducedMotion ? 0 : rotateX,
          rotateY: reducedMotion ? 0 : rotateY,
        }}
        whileHover={reducedMotion ? {} : { scale: 1.05, z: 50 }}
        whileTap={reducedMotion ? {} : { scale: 0.98 }}
        onMouseMove={handleMouse}
        onMouseLeave={resetTilt}
        onTouchMove={handleTouch}
        onTouchEnd={resetTilt}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        onKeyDown={onKeyDown}
      >
        {children}
      </motion.div>
    );
  }
);
ParallaxCard.displayName = 'ParallaxCard';

// ─── RoleCardContent (memo'd) ───────────────────────────────────────────────
const RoleCardContent = memo(
  ({
    role,
    isSelected,
    reducedMotion,
    circleSize = 64,
    isMobile = false,
  }: {
    role: RoleConfig;
    isSelected: boolean;
    reducedMotion: boolean;
    circleSize?: number;
    isMobile?: boolean;
  }) => {
    const Icon = role.icon;

    if (isMobile) {
      // Mobile: centered vertical layout — circle → name → tagline → divider → features
      return (
        <div className="flex flex-col items-center pt-4">
          {/* Centered circle */}
          <motion.div
            className="rounded-full flex items-center justify-center mb-4"
            style={{
              width: circleSize,
              height: circleSize,
              background: role.gradient,
              boxShadow: isSelected ? `0 6px 20px -4px ${role.glow}` : 'none',
            }}
            whileHover={reducedMotion ? {} : { rotate: 360, scale: 1.15 }}
            transition={{ duration: 0.7 }}
          >
            <Icon size={role.iconSize} variant="white" className={role.iconMt} />
          </motion.div>

          {/* Title */}
          <h2
            className="text-2xl font-light mb-1 text-center"
            style={{
              fontFamily: "'Playfair Display', serif",
              background: `linear-gradient(135deg, #ffffff, ${role.color})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {role.name}
          </h2>

          {/* Tagline */}
          <p
            className="text-sm mb-4 text-center"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: isSelected ? role.color : 'hsl(0 0% 50%)',
              transition: 'color 0.3s ease',
            }}
          >
            {getRoleTagline(role.id)}
          </p>

          {/* Divider */}
          <div className="h-px w-full mb-4" style={{ background: `${role.color}25` }} />

          {/* Features */}
          <ul className="space-y-2.5 w-full">
            {role.features.map((feat) => (
              <li key={feat} className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: role.color,
                    boxShadow: `0 0 4px ${role.glow}`,
                  }}
                />
                <span
                  className="text-sm font-light"
                  style={{ color: '#d4d4d4', fontFamily: 'Inter, sans-serif' }}
                >
                  {feat}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // Desktop: horizontal top row (circle left, checkmark right) then vertical
    return (
      <>
        {/* Top row: circle + checkmark */}
        <div className="flex items-start justify-between mb-4">
          <motion.div
            className="rounded-full flex items-center justify-center"
            style={{
              width: circleSize,
              height: circleSize,
              background: role.gradient,
              boxShadow: isSelected ? `0 6px 20px -4px ${role.glow}` : 'none',
            }}
            whileHover={reducedMotion ? {} : { rotate: 360, scale: 1.15 }}
            transition={{ duration: 0.7 }}
          >
            <Icon size={role.iconSize} variant="white" className={role.iconMt} />
          </motion.div>

          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <CheckCircle className="w-6 h-6" style={{ color: role.color }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Title */}
        <h2
          className="text-xl font-light mb-1 mt-6"
          style={{
            fontFamily: "'Playfair Display', serif",
            background: `linear-gradient(135deg, #ffffff, ${role.color})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {role.name}
        </h2>

        {/* Tagline */}
        <p
          className="text-xs mb-4"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: isSelected ? role.color : 'hsl(0 0% 50%)',
            transition: 'color 0.3s ease',
          }}
        >
          {getRoleTagline(role.id)}
        </p>

        {/* Divider */}
        <div className="h-px w-full mb-5" style={{ background: `${role.color}25` }} />

        {/* Features */}
        <ul className="space-y-3">
          {role.features.map((feat) => (
            <li key={feat} className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: role.color,
                  boxShadow: `0 0 4px ${role.glow}`,
                }}
              />
              <span
                className="text-xs font-light"
                style={{ color: '#d4d4d4', fontFamily: 'Inter, sans-serif' }}
              >
                {feat}
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  }
);
RoleCardContent.displayName = 'RoleCardContent';

// ─── useMediaQuery ──────────────────────────────────────────────────────────
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// ─── Desktop Layout ─────────────────────────────────────────────────────────
function DesktopLayout({
  selectedRole,
  onSelectRole,
  reducedMotion,
}: {
  selectedRole: UserRole | null;
  onSelectRole: (r: UserRole) => void;
  reducedMotion: boolean;
}) {
  const [, navigate] = useLocation();
  const roleData = useMemo(() => ROLES.find((r) => r.id === selectedRole), [selectedRole]);

  const handleKeyDown = useCallback(
    (role: UserRole) => (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectRole(role);
      }
    },
    [onSelectRole]
  );

  return (
    <div className="w-full relative overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Ambient glow orbs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, hsl(var(--color-guru) / 0.08) 0%, transparent 70%)',
          top: '10%',
          left: '-5%',
          filter: 'blur(80px)',
        }}
        animate={reducedMotion ? {} : { opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle, hsl(var(--color-disciple) / 0.06) 0%, transparent 70%)',
          bottom: '5%',
          right: '-5%',
          filter: 'blur(80px)',
        }}
        animate={reducedMotion ? {} : { opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Metallic accent lines */}
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
      </div>

      {/* Floating particles */}
      {!reducedMotion && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          {SHIMMER_POSITIONS.map((p, i) => (
            <ShimmerParticle key={i} {...p} />
          ))}
        </div>
      )}

      {/* Split layout */}
      <div className="relative z-10 flex items-center pt-24 pb-16" style={{ minHeight: '100vh' }}>
        {/* LEFT — branding (40%) */}
        <div className="w-[40%] px-8 lg:px-16 space-y-8 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-8"
          >
            {/* Logo + wordmark */}
            <div className="flex items-center gap-4">
              <div
                className="relative w-14 h-14 rounded-xl p-0.5"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--color-guru) / 0.12), hsl(var(--color-disciple) / 0.12))',
                  backdropFilter: 'blur(24px)',
                  boxShadow:
                    '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                }}
              >
                <img
                  src={logoImage}
                  alt="GymGurus logo"
                  className="w-full h-full rounded-lg object-cover relative z-10"
                  style={{ filter: 'brightness(1.15) contrast(1.08) saturate(0.85)' }}
                />
              </div>
              <div>
                <span
                  className="text-xl font-extralight tracking-[0.2em] block"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    background:
                      'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #e5e4e2 50%, hsl(var(--color-disciple)) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  GYM GURUS
                </span>
                <span
                  className="text-[0.55rem] tracking-[0.3em] font-light block"
                  style={{ color: '#999', fontFamily: 'Inter, sans-serif' }}
                >
                  ELITE FITNESS
                </span>
              </div>
            </div>

            {/* H1 */}
            <h1
              className="text-5xl lg:text-6xl xl:text-7xl font-light"
              style={{
                fontFamily: "'Playfair Display', serif",
                background:
                  'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #e5e4e2 50%, hsl(var(--color-disciple)) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
                lineHeight: '1.2',
              }}
            >
              Choose
              <br />
              Your Path
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg max-w-xs"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: '#999',
                letterSpacing: '0.03em',
                lineHeight: '1.8',
              }}
            >
              The first decision of your journey
            </p>

            {/* Stats — gradient divider above */}
            <div
              className="pt-6 space-y-4"
              style={{
                borderTop:
                  '1px solid linear-gradient(90deg, hsl(var(--color-guru) / 0.3), hsl(var(--color-disciple) / 0.3))',
              }}
            >
              <div className="h-px w-full bg-gradient-to-r from-[hsl(var(--color-guru)/0.3)] to-[hsl(var(--color-disciple)/0.3)]" />
              <div className="space-y-3" aria-label="Platform statistics">
                {[
                  { value: '2,000+', label: 'Personal Trainers', variant: 'guru' },
                  { value: '50,000+', label: 'AI Workouts Built', variant: 'disciple' },
                  { value: '500,000+', label: 'Sets Logged by Athletes', variant: 'guru' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-baseline gap-3">
                    <span
                      className="text-2xl lg:text-3xl font-light tabular-nums"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        color:
                          stat.variant === 'guru'
                            ? 'hsl(var(--color-guru))'
                            : 'hsl(var(--color-disciple))',
                      }}
                    >
                      {stat.value}
                    </span>
                    <span
                      className="text-xs uppercase tracking-widest font-light"
                      style={{ color: '#666', fontFamily: 'Inter, sans-serif' }}
                    >
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating trophy */}
            <motion.div
              className="hidden xl:block"
              animate={reducedMotion ? {} : { y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Trophy className="w-16 h-16" style={{ color: 'hsl(var(--color-guru) / 0.15)' }} />
            </motion.div>
          </motion.div>
        </div>

        {/* RIGHT — 3 role cards (60%) */}
        <div className="w-[60%] px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-3 gap-4 lg:gap-5"
            style={{ perspective: '1200px' }}
          >
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.id;
              return (
                <ParallaxCard
                  key={role.id}
                  onClick={() => onSelectRole(role.id)}
                  isSelected={isSelected}
                  reducedMotion={reducedMotion}
                  ariaLabel={`Select ${role.name} path as ${role.label}`}
                  ariaPressed={isSelected}
                  onKeyDown={handleKeyDown(role.id)}
                  className="rounded-3xl p-6 lg:p-8 cursor-pointer transition-[border,box-shadow] duration-300 relative min-h-[520px]"
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${role.color}12, ${role.color}08)`
                      : 'linear-gradient(135deg, rgba(15,15,15,0.7), rgba(10,10,10,0.8))',
                    border: isSelected
                      ? `1px solid ${role.color}50`
                      : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isSelected
                      ? `0 20px 40px -10px ${role.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`
                      : '0 15px 30px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(20px)',
                    opacity: selectedRole && !isSelected ? 0.5 : 1,
                    transition: 'opacity 0.3s ease, border 0.3s ease, box-shadow 0.3s ease',
                  }}
                >
                  {/* Glass overlay */}
                  <div
                    className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%)',
                    }}
                  />
                  {/* Hover glow */}
                  {isSelected && (
                    <div
                      className="absolute inset-0 rounded-3xl pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${role.color}10, transparent 70%)`,
                      }}
                    />
                  )}
                  <div className="relative z-10">
                    <RoleCardContent
                      role={role}
                      isSelected={isSelected}
                      reducedMotion={reducedMotion}
                    />
                  </div>
                </ParallaxCard>
              );
            })}
          </motion.div>

          {/* CTA buttons below cards — fixed height to prevent layout shift */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 flex flex-col items-center justify-center"
            style={{ height: 140 }}
            layout
          >
            <AnimatePresence mode="wait">
              {selectedRole === 'client' ? (
                <motion.div
                  key="desktop-client-cta"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/disciple-login')}
                    className="px-10 py-3.5 rounded-2xl text-sm font-semibold tracking-widest uppercase cursor-pointer min-h-[48px]"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      background: roleData?.gradient,
                      color: '#ffffff',
                      boxShadow: `0 12px 30px -4px ${roleData?.glow}`,
                    }}
                    aria-label="Access with your client code"
                  >
                    Access With Code
                  </motion.button>
                </motion.div>
              ) : selectedRole ? (
                <motion.div
                  key="desktop-auth-cta"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="flex items-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/auth/login?role=${selectedRole}`)}
                      className="px-10 py-3.5 rounded-2xl text-sm font-semibold tracking-widest uppercase cursor-pointer min-h-[48px]"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        background: roleData?.gradient,
                        color: selectedRole === 'trainer' ? '#0a0a0a' : '#ffffff',
                        boxShadow: `0 12px 30px -4px ${roleData?.glow}`,
                      }}
                      aria-label={`Sign in as ${roleData?.name}`}
                    >
                      Sign In
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/auth/register?role=${selectedRole}`)}
                      className="px-8 py-3.5 rounded-2xl text-sm font-light tracking-widest uppercase cursor-pointer min-h-[48px]"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        background: 'transparent',
                        border: `1px solid ${roleData?.color}50`,
                        color: roleData?.color,
                      }}
                      aria-label={`Create ${roleData?.name} account`}
                    >
                      Create Account
                    </motion.button>
                  </div>
                  <button
                    onClick={() => navigate('/disciple-login')}
                    className="text-xs font-light cursor-pointer hover:underline transition-colors"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      color: 'hsl(var(--color-disciple) / 0.7)',
                    }}
                  >
                    Are you a client? Access with your code →
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="desktop-empty-cta"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p
                    className="text-sm"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      color: 'hsl(0 0% 40%)',
                    }}
                  >
                    Select your path above
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Layout ──────────────────────────────────────────────────────────
function MobileLayout({
  selectedRole,
  onSelectRole,
  reducedMotion,
}: {
  selectedRole: UserRole | null;
  onSelectRole: (r: UserRole) => void;
  reducedMotion: boolean;
}) {
  const [, navigate] = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeRole = ROLES[activeIndex];
  const roleData = useMemo(() => ROLES.find((r) => r.id === selectedRole), [selectedRole]);

  // Gesture hint — one time only
  useEffect(() => {
    try {
      if (!localStorage.getItem('gg_swipe_hint_seen')) {
        setShowHint(true);
        const timer = setTimeout(() => {
          setShowHint(false);
          localStorage.setItem('gg_swipe_hint_seen', '1');
        }, 2500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Auto-select role when card snaps
  useEffect(() => {
    onSelectRole(ROLES[activeIndex].id);
  }, [activeIndex, onSelectRole]);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(ROLES.length - 1, index));
    setActiveIndex(clamped);
  }, []);

  // Arrow key navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(activeIndex - 1);
      if (e.key === 'ArrowRight') goTo(activeIndex + 1);
    },
    [activeIndex, goTo]
  );

  return (
    <div
      className="w-full relative overflow-hidden flex flex-col"
      style={{ minHeight: '100dvh' }}
      onKeyDown={handleKeyDown}
    >
      {/* Header clearance + title */}
      <div className="pb-3 px-6 text-center flex-shrink-0" style={{ paddingTop: 88 }}>
        <h1
          className="text-3xl font-light"
          style={{
            fontFamily: "'Playfair Display', serif",
            background:
              'linear-gradient(90deg, hsl(var(--color-guru)), #e5e4e2, hsl(var(--color-disciple)))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Choose Your Path
        </h1>
        <p
          className="text-sm mt-1"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: '#777',
          }}
        >
          The first decision of your journey
        </p>
      </div>

      {/* Swipeable card area — fixed height to prevent empty gap */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{ height: 420 }}
        ref={containerRef}
      >
        <div className="relative h-full flex items-center justify-center">
          {ROLES.map((role, index) => {
            const lastIdx = ROLES.length - 1;
            const isActive = index === activeIndex;
            const isNext = index === activeIndex + 1 || (activeIndex === lastIdx && index === 0);
            const isPrev = index === activeIndex - 1 || (activeIndex === 0 && index === lastIdx);

            // Position: active=center, adjacent=peeking, others=offscreen
            let xPercent = 200; // off-screen default
            let cardOpacity = 0;
            let cardScale = 0.92;
            let zIndex = 0;

            if (isActive) {
              xPercent = 0;
              cardOpacity = 1;
              cardScale = 1;
              zIndex = 10;
            } else if (isNext) {
              xPercent = 92; // peek from right (card width + gap)
              cardOpacity = 0.65;
              zIndex = 5;
            } else if (isPrev) {
              xPercent = -92; // peek from left
              cardOpacity = 0.65;
              zIndex = 5;
            }

            return (
              <motion.div
                key={role.id}
                className="absolute"
                style={{ width: 'calc(100vw - 80px)', maxWidth: 360, left: '50%' }}
                initial={false}
                animate={{
                  x: `calc(-50% + ${xPercent}%)`,
                  scale: cardScale,
                  opacity: cardOpacity,
                  zIndex,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                drag={isActive ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60 || info.velocity.x < -300) {
                    goTo(activeIndex + 1);
                  } else if (info.offset.x > 60 || info.velocity.x > 300) {
                    goTo(activeIndex - 1);
                  }
                }}
                onClick={() => {
                  if (!isActive) goTo(index);
                }}
              >
                <div
                  className="rounded-3xl p-6 relative cursor-pointer"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${role.color}10, rgba(15,15,15,0.8))`
                      : 'linear-gradient(135deg, rgba(15,15,15,0.7), rgba(10,10,10,0.8))',
                    border: isActive
                      ? `1px solid ${role.color}40`
                      : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: isActive ? `0 20px 40px -10px ${role.glow}` : 'none',
                    backdropFilter: 'blur(20px)',
                    minHeight: '390px',
                  }}
                >
                  <div className="relative z-10">
                    <RoleCardContent
                      role={role}
                      isSelected={isActive}
                      reducedMotion={reducedMotion}
                      circleSize={100}
                      isMobile
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Gesture hint */}
        {showHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2"
          >
            {reducedMotion ? (
              <span className="text-xs" style={{ color: '#666', fontFamily: 'Inter, sans-serif' }}>
                Swipe to explore
              </span>
            ) : (
              <>
                <motion.div animate={{ x: [-8, 8, -8] }} transition={{ duration: 1.5, repeat: 1 }}>
                  <ArrowLeft className="w-4 h-4" style={{ color: '#555' }} />
                </motion.div>
                <span
                  className="text-xs"
                  style={{ color: '#666', fontFamily: 'Inter, sans-serif' }}
                >
                  swipe
                </span>
                <motion.div animate={{ x: [8, -8, 8] }} transition={{ duration: 1.5, repeat: 1 }}>
                  <ArrowRight className="w-4 h-4" style={{ color: '#555' }} />
                </motion.div>
              </>
            )}
            <span className="sr-only">Swipe left or right to explore roles</span>
          </motion.div>
        )}
      </div>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-3 py-3">
        {ROLES.map((role, i) => (
          <button
            key={role.id}
            onClick={() => goTo(i)}
            className="w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={`Go to ${role.name} card`}
            aria-current={i === activeIndex ? 'true' : undefined}
          >
            <div
              className="w-2.5 h-2.5 rounded-full transition-all duration-300"
              style={{
                background: i === activeIndex ? role.color : 'rgba(255,255,255,0.2)',
                boxShadow: i === activeIndex ? `0 0 8px ${role.glow}` : 'none',
                transform: i === activeIndex ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          </button>
        ))}
      </div>

      {/* CTA zone — fixed height to prevent layout shift */}
      <motion.div
        className="px-6 pb-4 flex-shrink-0 flex flex-col items-center justify-center"
        style={{ height: 160 }}
        layout
        transition={{ layout: { duration: 0.3, ease: 'easeInOut' } }}
      >
        <AnimatePresence mode="wait">
          {selectedRole === 'client' ? (
            <motion.div
              key="client-cta"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center justify-center gap-3"
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/disciple-login')}
                className="w-full py-4 rounded-2xl text-sm font-semibold tracking-widest uppercase cursor-pointer min-h-[56px]"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  background: roleData?.gradient || activeRole.gradient,
                  color: '#ffffff',
                  boxShadow: `0 12px 30px -4px ${roleData?.glow || activeRole.glow}`,
                }}
                aria-label="Access with your client code"
              >
                Access With Code
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="default-cta"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="w-full space-y-2"
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/auth/login?role=${selectedRole || activeRole.id}`)}
                className="w-full py-4 rounded-2xl text-sm font-semibold tracking-widest uppercase cursor-pointer min-h-[56px]"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  background: roleData?.gradient || activeRole.gradient,
                  color: (selectedRole || activeRole.id) === 'trainer' ? '#0a0a0a' : '#ffffff',
                  boxShadow: `0 12px 30px -4px ${roleData?.glow || activeRole.glow}`,
                  transition: 'background 0.4s ease, box-shadow 0.4s ease',
                }}
                aria-label={`Sign in as ${roleData?.name || activeRole.name}`}
              >
                Sign In as {roleData?.name || activeRole.name}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/auth/register?role=${selectedRole || activeRole.id}`)}
                className="w-full py-2.5 rounded-2xl text-sm font-light tracking-widest uppercase cursor-pointer min-h-[44px]"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  background: 'transparent',
                  border: `1px solid ${roleData?.color || activeRole.color}50`,
                  color: roleData?.color || activeRole.color,
                  transition: 'border-color 0.4s ease, color 0.4s ease',
                }}
                aria-label={`Create ${roleData?.name || activeRole.name} account`}
              >
                Create Account
              </motion.button>
              <button
                onClick={() => navigate('/disciple-login')}
                className="w-full text-center text-xs font-light cursor-pointer hover:underline transition-colors min-h-[28px]"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  color: 'hsl(var(--color-disciple) / 0.7)',
                }}
              >
                Are you a client? Access with your code →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
const HeroChoosePathSection = memo(() => {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const reducedMotion = useReducedMotion();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleSelectRole = useCallback((role: UserRole) => {
    setSelectedRole((prev) => (prev === role ? null : role));
  }, []);

  return (
    <section id="hero" aria-label="Get started with GymGurus" style={{ scrollMarginTop: '5rem' }}>
      {isMobile ? (
        <MobileLayout
          selectedRole={selectedRole}
          onSelectRole={handleSelectRole}
          reducedMotion={reducedMotion}
        />
      ) : (
        <DesktopLayout
          selectedRole={selectedRole}
          onSelectRole={handleSelectRole}
          reducedMotion={reducedMotion}
        />
      )}
    </section>
  );
});

HeroChoosePathSection.displayName = 'HeroChoosePathSection';

export default HeroChoosePathSection;
