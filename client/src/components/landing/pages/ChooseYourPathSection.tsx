import { memo, useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { GuruIcon } from '@/components/icons/GuruIcon';
import { RoninIcon } from '@/components/icons/RoninIcon';
import { DiscipleIcon } from '@/components/icons/DiscipleIcon';
import { getCsrfToken } from '@/lib/queryClient';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Link } from 'wouter';

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
    name: 'The Guru',
    label: 'Personal Trainer',
    color: 'hsl(var(--color-guru))',
    gradient: 'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-accent)))',
    glow: 'hsl(var(--color-guru) / 0.35)',
    icon: GuruIcon,
  },
  {
    id: 'solo',
    name: 'The Ronin',
    label: 'Solo Athlete',
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

const ChooseYourPathSection = memo(() => {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const formRef = useRef<HTMLDivElement>(null);

  const [activeRole, setActiveRole] = useState<AuthRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const roleData = ROLES.find((r) => r.id === activeRole) ?? null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const handleRoleSelect = useCallback(
    (roleId: AuthRole) => {
      if (roleId === activeRole) return;
      setActiveRole(roleId);
      setError(null);
      reset();
      // Scroll form into view after animation settles
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    },
    [activeRole, reset]
  );

  const onSubmit = async (data: LoginForm) => {
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
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center py-20 px-4">
      {/* Ambient glow orbs — animate to role colour on selection */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none transition-all duration-1000"
        style={{
          background: roleData
            ? `radial-gradient(circle, ${roleData.color}15 0%, transparent 70%)`
            : 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          top: '-10%',
          left: '10%',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none transition-all duration-1000"
        style={{
          background: roleData
            ? `radial-gradient(circle, ${roleData.color}10 0%, transparent 70%)`
            : 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)',
          bottom: '5%',
          right: '10%',
          filter: 'blur(80px)',
        }}
      />

      <div className="relative z-10 w-full max-w-3xl mx-auto">
        {/* Headline */}
        <div className="text-center mb-12">
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4"
            style={{
              fontFamily: 'Inter, sans-serif',
              color: roleData ? roleData.color : 'hsl(0 0% 45%)',
              transition: 'color 0.6s ease',
            }}
          >
            Begin your journey
          </p>
          <h2
            className="text-4xl md:text-5xl font-light mb-4"
            style={{
              fontFamily: "'Playfair Display', serif",
              background: roleData
                ? `linear-gradient(135deg, ${roleData.color}, #e5e4e2)`
                : 'linear-gradient(135deg, #e5e4e2 0%, #999 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              transition: 'background 0.6s ease',
            }}
          >
            Choose Your Path
          </h2>
          <p
            className="text-lg"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: 'hsl(0 0% 50%)',
              letterSpacing: '0.03em',
            }}
          >
            The first decision of your journey
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-2 gap-6 md:gap-8 mb-8">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = activeRole === role.id;
            const isOther = activeRole !== null && !isSelected;

            return (
              <motion.button
                key={role.id}
                type="button"
                onClick={() => handleRoleSelect(role.id)}
                whileHover={prefersReducedMotion ? {} : { y: -8 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        scale: isSelected ? 1.03 : 1,
                        opacity: isOther ? 0.35 : 1,
                      }
                }
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                className="relative flex flex-col items-center gap-4 py-8 md:py-10 px-4 rounded-3xl cursor-pointer transition-[border,box-shadow] duration-300 min-h-[200px]"
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${role.color}12, ${role.color}08)`
                    : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                  border: isSelected
                    ? `1px solid ${role.color}50`
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isSelected
                    ? `0 12px 40px -8px ${role.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`
                    : 'none',
                }}
                aria-pressed={isSelected}
                aria-label={`Select ${role.name} role — ${role.label}`}
              >
                {/* Icon */}
                <motion.div
                  animate={prefersReducedMotion ? {} : { scale: isSelected ? 1.08 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-[120px] h-[120px] flex items-center justify-center"
                >
                  <Icon size={120} variant={isSelected ? 'default' : 'default'} />
                </motion.div>

                {/* Label */}
                <div className="text-center">
                  <div
                    className="text-lg md:text-xl font-light mb-1"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      color: isSelected ? role.color : 'hsl(0 0% 65%)',
                      transition: 'color 0.3s ease',
                    }}
                  >
                    {role.name}
                  </div>
                  <div
                    className="text-xs tracking-wider uppercase"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      color: 'hsl(0 0% 40%)',
                    }}
                  >
                    {role.label}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Inline auth form — slides in when role selected */}
        <AnimatePresence mode="wait">
          {activeRole && roleData && (
            <motion.div
              ref={formRef}
              key="auth-form"
              initial={{ opacity: 0, y: 40, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 20, height: 0 }}
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 24,
                opacity: { duration: 0.3 },
              }}
              className="overflow-hidden"
            >
              <div
                className="relative rounded-3xl p-6 md:p-8 max-w-md mx-auto"
                style={{
                  background: 'linear-gradient(135deg, rgba(26,26,26,0.95), rgba(18,18,18,0.98))',
                  border: `1px solid ${roleData.color}30`,
                  boxShadow: `0 20px 50px -10px ${roleData.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                  backdropFilter: 'blur(30px)',
                }}
              >
                {/* Sheen */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-3xl"
                  style={{
                    background: `linear-gradient(135deg, ${roleData.color}06 0%, transparent 50%)`,
                  }}
                />

                <div className="relative z-10">
                  {/* Form heading */}
                  <div className="text-center mb-6">
                    <h3
                      className="text-2xl font-light mb-1"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        color: roleData.color,
                      }}
                    >
                      Welcome Back
                    </h3>
                    <p
                      className="text-sm"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        color: 'hsl(0 0% 55%)',
                      }}
                    >
                      Signing in as <span style={{ color: roleData.color }}>{roleData.name}</span>
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
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <Label
                        htmlFor="choose-email"
                        className="text-xs uppercase tracking-wider"
                        style={{ color: 'hsl(0 0% 60%)', fontFamily: 'Inter, sans-serif' }}
                      >
                        Email
                      </Label>
                      <Input
                        id="choose-email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        disabled={isLoading}
                        {...register('email')}
                        className="mt-1.5 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:border-current"
                        style={{
                          borderColor: `${roleData.color}40`,
                        }}
                      />
                      {errors.email && (
                        <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label
                          htmlFor="choose-password"
                          className="text-xs uppercase tracking-wider"
                          style={{ color: 'hsl(0 0% 60%)', fontFamily: 'Inter, sans-serif' }}
                        >
                          Password
                        </Label>
                        <Link
                          href="/auth/forgot-password"
                          className="text-xs hover:underline transition-colors"
                          style={{ color: roleData.color }}
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="choose-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          disabled={isLoading}
                          {...register('password')}
                          className="pr-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0"
                          style={{
                            borderColor: `${roleData.color}40`,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                          tabIndex={-1}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
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
                      style={{
                        background: roleData.gradient,
                        color: activeRole === 'trainer' ? '#0a0a0a' : '#ffffff',
                        border: 'none',
                        boxShadow: `0 8px 24px -4px ${roleData.glow}`,
                        fontFamily: 'Inter, sans-serif',
                      }}
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
                          background: 'hsl(0 0% 8%)',
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        or
                      </span>
                    </div>
                  </div>

                  {/* Google OAuth */}
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
                    <svg
                      className="w-4 h-4 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
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
                    Continue with Google
                  </button>

                  {/* Register + Disciple links */}
                  <p
                    className="text-center text-xs mt-5"
                    style={{ color: 'hsl(0 0% 40%)', fontFamily: 'Inter, sans-serif' }}
                  >
                    Don&apos;t have an account?{' '}
                    <Link
                      href={activeRole ? `/auth/register?role=${activeRole}` : '/auth/register'}
                      className="font-medium hover:underline transition-colors cursor-pointer"
                      style={{ color: roleData.color }}
                    >
                      Create account
                    </Link>
                  </p>

                  <div className="flex items-center justify-center gap-3 mt-5 pt-4 border-t border-white/5">
                    <p
                      className="text-xs"
                      style={{ color: 'hsl(0 0% 40%)', fontFamily: 'Inter, sans-serif' }}
                    >
                      Are you a client?
                    </p>
                    <Link href="/disciple-login" className="cursor-pointer">
                      <div
                        className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-all duration-200 hover:scale-105 cursor-pointer"
                        style={{
                          background: 'hsl(var(--color-disciple) / 0.08)',
                          border: '1px solid hsl(var(--color-disciple) / 0.25)',
                        }}
                      >
                        <DiscipleIcon size={24} />
                        <span
                          className="text-xs"
                          style={{
                            color: 'hsl(var(--color-disciple))',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          Access with your code
                        </span>
                      </div>
                    </Link>
                  </div>

                  {/* Legal */}
                  <p
                    className="text-center text-[11px] mt-4"
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

ChooseYourPathSection.displayName = 'ChooseYourPathSection';

export default ChooseYourPathSection;
