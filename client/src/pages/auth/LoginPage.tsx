import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { GuruIcon } from '@/components/icons/GuruIcon';
import { DiscipleIcon } from '@/components/icons/DiscipleIcon';
import { RoninIcon } from '@/components/icons/RoninIcon';
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png';
import { useQueryClient } from '@tanstack/react-query';
import { getCsrfToken } from '@/lib/queryClient';

type AuthRole = 'trainer' | 'solo';

const ROLES: {
  id: AuthRole;
  name: string;
  label: string;
  color: string;
  gradient: string;
  glow: string;
  icon: React.ComponentType<{ size?: number; variant?: 'default' | 'white'; className?: string }>;
}[] = [
  {
    id: 'trainer',
    name: 'Guru',
    label: 'Trainer',
    color: 'hsl(var(--color-guru))',
    gradient: 'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-accent)))',
    glow: 'hsl(var(--color-guru) / 0.35)',
    icon: GuruIcon,
  },
  {
    id: 'solo',
    name: 'Ronin',
    label: 'Solo',
    color: 'hsl(var(--color-ronin))',
    gradient: 'linear-gradient(135deg, hsl(var(--color-ronin)), #6366f1)',
    glow: 'hsl(var(--color-ronin) / 0.35)',
    icon: RoninIcon,
  },
];

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

// ─── Shared Google SVG ──────────────────────────────────────────────────────
const GoogleIcon = memo(() => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
));
GoogleIcon.displayName = 'GoogleIcon';

// ─── Mobile Layout — Option A ───────────────────────────────────────────────
function MobileLoginLayout({
  activeRole,
  setActiveRole,
  roleData,
  error,
  showPassword,
  setShowPassword,
  isLoading,
  register,
  handleSubmit,
  onSubmit,
  errors,
}: {
  activeRole: AuthRole | null;
  setActiveRole: (r: AuthRole) => void;
  roleData: (typeof ROLES)[0] | null;
  error: string | null;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  isLoading: boolean;
  register: ReturnType<typeof useForm<LoginForm>>['register'];
  handleSubmit: ReturnType<typeof useForm<LoginForm>>['handleSubmit'];
  onSubmit: (data: LoginForm) => Promise<void>;
  errors: ReturnType<typeof useForm<LoginForm>>['formState']['errors'];
}) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Detect virtual keyboard on mobile
  useEffect(() => {
    const onFocus = () => setKeyboardOpen(true);
    const onBlur = () => setKeyboardOpen(false);
    const inputs = document.querySelectorAll('input');
    inputs.forEach((input) => {
      input.addEventListener('focus', onFocus, { passive: true });
      input.addEventListener('blur', onBlur, { passive: true });
    });
    return () => {
      inputs.forEach((input) => {
        input.removeEventListener('focus', onFocus);
        input.removeEventListener('blur', onBlur);
      });
    };
  }, [activeRole]);

  const currentIcon =
    activeRole === 'trainer' ? GuruIcon : activeRole === 'solo' ? RoninIcon : null;

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      {/* ── Sticky Pill Tabs ── */}
      <div className="sticky top-0 z-50 flex items-center justify-center gap-2 py-3 px-4 backdrop-blur-xl bg-black/70 border-b border-white/5">
        {ROLES.map((role) => {
          const isActive = activeRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setActiveRole(role.id)}
              className="relative px-6 py-2 text-xs font-semibold uppercase tracking-[0.15em] rounded-full transition-colors duration-300 cursor-pointer min-h-[44px]"
              style={{
                fontFamily: 'Inter, sans-serif',
                color: isActive ? role.color : 'hsl(0 0% 45%)',
                background: isActive ? `${role.color}15` : 'transparent',
              }}
              aria-pressed={isActive}
              aria-label={`Sign in as ${role.name}`}
            >
              {role.name.toUpperCase()}
              {isActive && (
                <motion.div
                  layoutId="active-tab-pill"
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ background: role.color }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Character Zone (48vh) ── */}
      <div
        className="relative flex items-center justify-center transition-all duration-500"
        style={{
          height: keyboardOpen ? '20vh' : '42vh',
          background: roleData
            ? `radial-gradient(ellipse at 50% 80%, ${roleData.color}20 0%, transparent 70%)`
            : 'radial-gradient(ellipse at 50% 80%, rgba(255,255,255,0.04) 0%, transparent 70%)',
          transition: 'height 0.3s ease, background 0.6s ease',
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute w-[300px] h-[300px] rounded-full pointer-events-none transition-all duration-700"
          style={{
            background: roleData
              ? `radial-gradient(circle, ${roleData.color}25 0%, transparent 70%)`
              : 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Character icon with flip animation */}
        <AnimatePresence mode="wait">
          {currentIcon && (
            <motion.div
              key={activeRole}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              style={{ perspective: '800px' }}
            >
              {(() => {
                const Icon = currentIcon;
                return <Icon size={keyboardOpen ? 120 : 200} variant="default" />;
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No role selected state */}
        {!activeRole && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <img src={logoImage} alt="GymGurus" className="h-16 w-auto mx-auto mb-3" />
            <p
              className="text-sm"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: 'hsl(0 0% 50%)',
              }}
            >
              Choose your path above
            </p>
          </motion.div>
        )}
      </div>

      {/* ── Bottom Sheet ── */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28, delay: 0.15 }}
        className="flex-1 relative rounded-t-3xl px-6 pt-5 pb-8 overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(12,12,12,1) 100%)',
          borderTop: roleData
            ? `1px solid ${roleData.color}25`
            : '1px solid rgba(255,255,255,0.08)',
          transform: keyboardOpen ? 'translateY(-20px)' : 'translateY(0)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Drag handle (decorative) */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Heading */}
        <div className="text-center mb-5">
          <h1
            className="text-2xl font-light mb-1"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: roleData ? roleData.color : '#f2f2f2',
              transition: 'color 0.4s ease',
            }}
          >
            Welcome Back
          </h1>
          <p
            className="text-sm"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: 'hsl(0 0% 55%)',
            }}
          >
            {activeRole && roleData ? (
              <>
                Signing in as <span style={{ color: roleData.color }}>{roleData.name}</span>
              </>
            ) : (
              'Select a role to continue'
            )}
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        {activeRole && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label
                htmlFor="m-email"
                className="text-xs uppercase tracking-wider"
                style={{ color: 'hsl(0 0% 60%)', fontFamily: 'Inter, sans-serif' }}
              >
                Email
              </Label>
              <Input
                id="m-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
                {...register('email')}
                className="mt-1.5 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0 text-base"
                style={{ borderColor: roleData ? `${roleData.color}40` : undefined }}
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label
                  htmlFor="m-password"
                  className="text-xs uppercase tracking-wider"
                  style={{ color: 'hsl(0 0% 60%)', fontFamily: 'Inter, sans-serif' }}
                >
                  Password
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs hover:underline transition-colors cursor-pointer"
                  style={{ color: roleData?.color ?? 'hsl(0 0% 50%)' }}
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="m-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...register('password')}
                  className="pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0 text-base"
                  style={{ borderColor: roleData ? `${roleData.color}40` : undefined }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-sm font-semibold tracking-widest uppercase transition-all duration-300 cursor-pointer"
              disabled={isLoading}
              style={
                roleData
                  ? {
                      background: roleData.gradient,
                      color: activeRole === 'trainer' ? '#0a0a0a' : '#ffffff',
                      border: 'none',
                      boxShadow: `0 8px 24px -4px ${roleData.glow}`,
                      fontFamily: 'Inter, sans-serif',
                    }
                  : {
                      background: 'rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.15)',
                      fontFamily: 'Inter, sans-serif',
                    }
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        )}

        {/* Divider + Google + links */}
        {activeRole && (
          <>
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/8" />
              </div>
              <div className="relative flex justify-center">
                <span
                  className="px-3 text-[10px] uppercase tracking-widest"
                  style={{
                    color: 'hsl(0 0% 35%)',
                    background: 'hsl(0 0% 7%)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  or
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={isLoading}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/8 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'hsl(0 0% 75%)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <p
              className="text-center text-xs mt-5"
              style={{ color: 'hsl(0 0% 40%)', fontFamily: 'Inter, sans-serif' }}
            >
              Don&apos;t have an account?{' '}
              <Link
                href={`/auth/register?role=${activeRole}`}
                className="font-medium hover:underline transition-colors cursor-pointer"
                style={{ color: roleData?.color ?? 'hsl(0 0% 60%)' }}
              >
                Create account
              </Link>
            </p>

            <div className="flex items-center justify-center gap-3 mt-4">
              <Link href="/disciple-login" className="cursor-pointer">
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 hover:scale-105 cursor-pointer"
                  style={{
                    background: 'hsl(var(--color-disciple) / 0.08)',
                    border: '1px solid hsl(var(--color-disciple) / 0.25)',
                  }}
                >
                  <DiscipleIcon size={20} />
                  <span
                    className="text-xs"
                    style={{ color: 'hsl(var(--color-disciple))', fontFamily: 'Inter, sans-serif' }}
                  >
                    Client access
                  </span>
                </div>
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Desktop Layout (existing, unchanged except null default) ────────────────
function DesktopLoginLayout({
  activeRole,
  setActiveRole,
  roleData,
  error,
  showPassword,
  setShowPassword,
  isLoading,
  register,
  handleSubmit,
  onSubmit,
  errors,
}: {
  activeRole: AuthRole | null;
  setActiveRole: (r: AuthRole) => void;
  roleData: (typeof ROLES)[0] | null;
  error: string | null;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  isLoading: boolean;
  register: ReturnType<typeof useForm<LoginForm>>['register'];
  handleSubmit: ReturnType<typeof useForm<LoginForm>>['handleSubmit'];
  onSubmit: (data: LoginForm) => Promise<void>;
  errors: ReturnType<typeof useForm<LoginForm>>['formState']['errors'];
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      {/* Ambient glow orbs */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`orb-top-${activeRole}`}
          className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: roleData
              ? `radial-gradient(circle, ${roleData.color}22 0%, transparent 70%)`
              : 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
            top: '-10%',
            left: '5%',
            filter: 'blur(60px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          key={`orb-bottom-${activeRole}`}
          className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: roleData
              ? `radial-gradient(circle, ${roleData.color}18 0%, transparent 70%)`
              : 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
            bottom: '0%',
            right: '5%',
            filter: 'blur(60px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, scale: [1.1, 1, 1.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </AnimatePresence>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-lg relative z-10 px-4 py-10"
      >
        <div
          className="relative rounded-3xl overflow-hidden p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(26,26,26,0.95), rgba(18,18,18,0.98))',
            border: roleData ? `1px solid ${roleData.color}35` : '1px solid rgba(255,255,255,0.08)',
            boxShadow: roleData
              ? `0 30px 60px -15px ${roleData.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`
              : '0 30px 60px -15px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03)',
            backdropFilter: 'blur(30px)',
            transition: 'border 0.4s ease, box-shadow 0.4s ease',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: roleData
                ? `linear-gradient(135deg, ${roleData.color}08 0%, transparent 50%)`
                : 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%)',
              transition: 'background 0.4s ease',
            }}
          />

          <div className="relative z-10">
            {/* Logo */}
            <div className="flex justify-center mb-7">
              <img src={logoImage} alt="GymGurus" className="h-14 w-auto" />
            </div>

            {/* Heading */}
            <div className="text-center mb-7">
              <h1
                className="text-3xl font-light mb-1"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: roleData ? roleData.color : '#f2f2f2',
                  transition: 'color 0.4s ease',
                }}
              >
                Welcome Back
              </h1>
              <p
                className="text-sm"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: 'hsl(0 0% 60%)',
                  letterSpacing: '0.04em',
                }}
              >
                {activeRole ? (
                  <>
                    Signing in as <span style={{ color: roleData?.color }}>{roleData?.name}</span>
                  </>
                ) : (
                  'Select your path to continue'
                )}
              </p>
            </div>

            {/* Inline Role Switcher */}
            <div className="mb-7">
              <p
                className="text-xs mb-3 text-center"
                style={{
                  color: 'hsl(0 0% 45%)',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Your role
              </p>
              <div className="grid grid-cols-2 gap-4">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  const isActive = activeRole === role.id;
                  return (
                    <motion.button
                      key={role.id}
                      type="button"
                      onClick={() => setActiveRole(role.id)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative flex flex-col items-center gap-3 py-6 px-4 rounded-2xl cursor-pointer transition-all duration-300"
                      style={{
                        background: isActive
                          ? `linear-gradient(135deg, ${role.color}18, ${role.color}10)`
                          : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                        border: isActive
                          ? `1px solid ${role.color}50`
                          : '1px solid rgba(255,255,255,0.07)',
                        boxShadow: isActive ? `0 8px 24px -4px ${role.glow}` : 'none',
                      }}
                      aria-pressed={isActive}
                      aria-label={`Sign in as ${role.name}`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="role-dot"
                          className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                          style={{ background: role.color }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <div
                        className="w-28 h-28 rounded-2xl flex items-center justify-center"
                        style={{
                          background: isActive ? role.gradient : 'rgba(255,255,255,0.06)',
                          boxShadow: isActive ? `0 6px 16px -2px ${role.glow}` : 'none',
                          transition: 'background 0.3s ease, box-shadow 0.3s ease',
                        }}
                      >
                        <Icon size={100} variant={isActive ? 'white' : 'default'} />
                      </div>
                      <div className="text-center">
                        <div
                          className="text-sm font-semibold leading-none mb-1"
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            color: isActive ? role.color : 'hsl(0 0% 65%)',
                            transition: 'color 0.3s ease',
                          }}
                        >
                          {role.name}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: 'hsl(0 0% 40%)', fontFamily: 'Inter, sans-serif' }}
                        >
                          {role.label}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5"
                >
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label
                  htmlFor="email"
                  style={{
                    color: 'hsl(0 0% 70%)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  {...register('email')}
                  className="mt-1.5 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:border-current"
                  style={
                    roleData
                      ? ({
                          borderColor: `${roleData.color}40`,
                          '--tw-ring-color': roleData.color,
                        } as React.CSSProperties)
                      : {}
                  }
                />
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label
                    htmlFor="password"
                    style={{
                      color: 'hsl(0 0% 70%)',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '0.75rem',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs hover:underline transition-colors cursor-pointer"
                    style={{ color: roleData?.color ?? 'hsl(0 0% 50%)' }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    {...register('password')}
                    className="pr-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0"
                    style={
                      roleData
                        ? ({ borderColor: `${roleData.color}40` } as React.CSSProperties)
                        : {}
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-sm font-semibold tracking-widest uppercase transition-all duration-300 hover:scale-[1.02] hover:shadow-lg mt-2 cursor-pointer"
                disabled={isLoading}
                style={
                  roleData
                    ? {
                        background: roleData.gradient,
                        color: activeRole === 'trainer' ? '#0a0a0a' : '#ffffff',
                        border: 'none',
                        boxShadow: `0 8px 24px -4px ${roleData.glow}`,
                        fontFamily: 'Inter, sans-serif',
                      }
                    : {
                        background: 'rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.15)',
                        fontFamily: 'Inter, sans-serif',
                      }
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/8" />
              </div>
              <div className="relative flex justify-center">
                <span
                  className="px-3 text-[10px] uppercase tracking-widest"
                  style={{
                    color: 'hsl(0 0% 35%)',
                    background: 'hsl(0 0% 10%)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  or
                </span>
              </div>
            </div>

            {/* Google */}
            <button
              type="button"
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/8 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'hsl(0 0% 75%)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Footer links */}
            <p
              className="text-center text-xs mt-5"
              style={{ color: 'hsl(0 0% 40%)', fontFamily: 'Inter, sans-serif' }}
            >
              Don&apos;t have an account?{' '}
              <Link
                href={activeRole ? `/auth/register?role=${activeRole}` : '/auth/register'}
                className="font-medium hover:underline transition-colors cursor-pointer"
                style={{ color: roleData?.color ?? 'hsl(0 0% 60%)' }}
              >
                Create account
              </Link>
            </p>
            <div className="flex flex-col items-center gap-2 mt-4">
              <p
                className="text-xs"
                style={{ color: 'hsl(0 0% 40%)', fontFamily: 'Inter, sans-serif' }}
              >
                Are you a client?
              </p>
              <Link href="/disciple-login" className="cursor-pointer">
                <div
                  className="cursor-pointer rounded-2xl p-3 transition-all duration-200 hover:scale-105"
                  style={{
                    background: 'hsl(var(--color-disciple) / 0.08)',
                    border: '1px solid hsl(var(--color-disciple) / 0.25)',
                  }}
                >
                  <DiscipleIcon size={56} />
                </div>
              </Link>
              <p
                className="text-xs"
                style={{ color: 'hsl(0 0% 38%)', fontFamily: 'Inter, sans-serif' }}
              >
                Access with your code
              </p>
            </div>
          </div>
        </div>

        <p
          className="text-center text-[11px] mt-5"
          style={{ color: 'hsl(0 0% 30%)', fontFamily: 'Inter, sans-serif' }}
        >
          By signing in you agree to our{' '}
          <Link
            href="/terms"
            className="hover:text-white/50 underline transition-colors cursor-pointer"
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="hover:text-white/50 underline transition-colors cursor-pointer"
          >
            Privacy Policy
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function LoginPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Role from URL param — null default
  const initialRole = useMemo<AuthRole | null>(() => {
    const r = new URLSearchParams(window.location.search).get('role');
    return r === 'trainer' || r === 'solo' ? r : null;
  }, []);
  const [activeRole, setActiveRole] = useState<AuthRole | null>(initialRole);

  const roleData = ROLES.find((r) => r.id === activeRole) ?? null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = useCallback(
    async (data: LoginForm) => {
      setError(null);
      setIsLoading(true);
      try {
        const csrfToken = getCsrfToken();
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
          },
          body: JSON.stringify(data),
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          queryClient.setQueryData(['/api/auth/user'], result.user);
          queryClient.setQueryData(['/api/auth/me'], result.user);
          setLocation('/dashboard');
        } else {
          const err = await response.json();
          setError(err.error || 'Login failed');
        }
      } catch {
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient, setLocation]
  );

  const sharedProps = {
    activeRole,
    setActiveRole,
    roleData,
    error,
    showPassword,
    setShowPassword,
    isLoading,
    register,
    handleSubmit,
    onSubmit,
    errors,
  };

  return isMobile ? (
    <MobileLoginLayout {...sharedProps} />
  ) : (
    <DesktopLoginLayout {...sharedProps} />
  );
}
