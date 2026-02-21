import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { GuruIcon } from '@/components/icons/GuruIcon';
import { DiscipleIcon } from '@/components/icons/DiscipleIcon';
import { RoninIcon } from '@/components/icons/RoninIcon';
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png';
import { useQueryClient } from '@tanstack/react-query';
import { getCsrfToken } from '@/lib/queryClient';

// Disciples (clients) don't register — they use trainer-issued access codes at /disciple-login
type AuthRole = 'trainer' | 'solo';

const ROLES: {
  id: AuthRole;
  name: string;
  label: string;
  color: string;
  gradient: string;
  glow: string;
  icon: React.ComponentType<{ className?: string }>;
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

const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    role: z.enum(['trainer', 'solo']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const initialRole = useMemo<AuthRole | null>(() => {
    const r = new URLSearchParams(window.location.search).get('role');
    return r === 'trainer' || r === 'solo' ? r : null;
  }, []);
  const [activeRole, setActiveRole] = useState<AuthRole | null>(initialRole);

  const roleData = ROLES.find((r) => r.id === activeRole) ?? null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  // Keep form role field in sync with activeRole
  useEffect(() => {
    if (activeRole) setValue('role', activeRole);
  }, [activeRole, setValue]);

  const password = watch('password');
  const strength = {
    length: (password?.length ?? 0) >= 8,
    upper: /[A-Z]/.test(password ?? ''),
    lower: /[a-z]/.test(password ?? ''),
    number: /[0-9]/.test(password ?? ''),
  };

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    setIsLoading(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        }),
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        queryClient.setQueryData(['/api/auth/user'], result.user);
        queryClient.setQueryData(['/api/auth/me'], result.user);
        setLocation('/dashboard');
      } else {
        const err = await response.json();
        setError(err.error || 'Registration failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'hsl(0 0% 7%)' }}
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

      {/* Scrollable card wrapper */}
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
          {/* Top gradient sheen */}
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
            <div className="flex justify-center mb-6">
              <img
                src={logoImage}
                alt="GymGurus"
                className="h-13 w-auto"
                style={{ height: '3.25rem' }}
              />
            </div>

            {/* Heading */}
            <div className="text-center mb-6">
              <h1
                className="text-3xl font-light mb-1"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: roleData ? roleData.color : '#f2f2f2',
                  transition: 'color 0.4s ease',
                }}
              >
                Create Account
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
                    Joining as <span style={{ color: roleData?.color }}>{roleData?.name}</span>
                  </>
                ) : (
                  'Choose your path to begin'
                )}
              </p>
            </div>

            {/* ── Inline Role Switcher ── */}
            <div className="mb-6">
              <p
                className="text-xs mb-3 text-center"
                style={{
                  color: 'hsl(0 0% 45%)',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                I am a...
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
                    >
                      {isActive && (
                        <motion.div
                          layoutId="reg-role-dot"
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
              {errors.role && (
                <p className="text-xs text-red-400 mt-2 text-center">Please select a role</p>
              )}
              <div className="flex flex-col items-center gap-2 mt-3">
                <p
                  className="text-xs"
                  style={{ color: 'hsl(0 0% 40%)', fontFamily: 'Inter, sans-serif' }}
                >
                  Are you a client?
                </p>
                <Link href="/disciple-login">
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

            {/* Hidden role field */}
            <input type="hidden" {...register('role')} />

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
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="firstName"
                    style={{
                      color: 'hsl(0 0% 70%)',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '0.7rem',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    autoComplete="given-name"
                    disabled={isLoading}
                    {...register('firstName')}
                    className="mt-1 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0"
                    style={
                      roleData
                        ? ({ borderColor: `${roleData.color}40` } as React.CSSProperties)
                        : {}
                    }
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-400 mt-1">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="lastName"
                    style={{
                      color: 'hsl(0 0% 70%)',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '0.7rem',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    autoComplete="family-name"
                    disabled={isLoading}
                    {...register('lastName')}
                    className="mt-1 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0"
                    style={
                      roleData
                        ? ({ borderColor: `${roleData.color}40` } as React.CSSProperties)
                        : {}
                    }
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-400 mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <Label
                  htmlFor="email"
                  style={{
                    color: 'hsl(0 0% 70%)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.7rem',
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
                  className="mt-1 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0"
                  style={
                    roleData ? ({ borderColor: `${roleData.color}40` } as React.CSSProperties) : {}
                  }
                />
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <Label
                  htmlFor="password"
                  style={{
                    color: 'hsl(0 0% 70%)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...register('password')}
                    className="pr-10 mt-1 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0"
                    style={
                      roleData
                        ? ({ borderColor: `${roleData.color}40` } as React.CSSProperties)
                        : {}
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                )}
                {/* Strength indicators */}
                {password && (
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {[
                      { ok: strength.length, label: '8+ chars' },
                      { ok: strength.upper, label: 'Uppercase' },
                      { ok: strength.lower, label: 'Lowercase' },
                      { ok: strength.number, label: 'Number' },
                    ].map(({ ok, label }) => (
                      <div key={label} className="flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2
                          className="w-3 h-3 shrink-0"
                          style={{ color: ok ? (roleData?.color ?? '#22c55e') : 'hsl(0 0% 35%)' }}
                        />
                        <span
                          style={{
                            color: ok ? 'hsl(0 0% 70%)' : 'hsl(0 0% 35%)',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <Label
                  htmlFor="confirmPassword"
                  style={{
                    color: 'hsl(0 0% 70%)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...register('confirmPassword')}
                    className="pr-10 mt-1 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0"
                    style={
                      roleData
                        ? ({ borderColor: `${roleData.color}40` } as React.CSSProperties)
                        : {}
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 text-sm font-semibold tracking-widest uppercase transition-all duration-300 hover:scale-[1.02] hover:shadow-lg mt-1"
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
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            {/* Sign in link */}
            <p
              className="text-center text-xs mt-5"
              style={{ color: 'hsl(0 0% 40%)', fontFamily: 'Inter, sans-serif' }}
            >
              Already have an account?{' '}
              <Link
                href={activeRole ? `/auth/login?role=${activeRole}` : '/auth/login'}
                className="font-medium hover:underline transition-colors"
                style={{ color: roleData?.color ?? 'hsl(0 0% 60%)' }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p
          className="text-center text-[11px] mt-5"
          style={{ color: 'hsl(0 0% 30%)', fontFamily: 'Inter, sans-serif' }}
        >
          By creating an account you agree to our{' '}
          <Link href="/terms" className="hover:text-white/50 underline transition-colors">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="hover:text-white/50 underline transition-colors">
            Privacy Policy
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
