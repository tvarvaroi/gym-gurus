import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Extract token from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (!tokenParam) {
      setError('Invalid or missing reset token');
    } else {
      setToken(tokenParam);
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password');

  // Password strength indicators
  const passwordStrength = {
    length: password?.length >= 8,
    uppercase: /[A-Z]/.test(password || ''),
    lowercase: /[a-z]/.test(password || ''),
    number: /[0-9]/.test(password || ''),
  };

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/auth/login');
        }, 2000);
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={logoImage} alt="GymGurus Logo" className="h-16 w-auto" />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Password</h1>
            <p className="text-muted-foreground">Enter a strong password for your account</p>
          </div>

          {/* Success Alert */}
          {success && (
            <Alert className="mb-6 border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Password reset successfully! Redirecting to sign in...
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && !success && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Reset Password Form */}
          {!success && token && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* New Password */}
              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    autoFocus
                    disabled={isLoading}
                    {...register('password')}
                    className="pr-10 mt-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive mt-1.5">{errors.password.message}</p>
                )}
                {/* Password strength */}
                {password && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          passwordStrength.length ? 'text-green-500' : 'text-muted-foreground'
                        }`}
                      />
                      <span
                        className={
                          passwordStrength.length ? 'text-green-600' : 'text-muted-foreground'
                        }
                      >
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          passwordStrength.uppercase ? 'text-green-500' : 'text-muted-foreground'
                        }`}
                      />
                      <span
                        className={
                          passwordStrength.uppercase ? 'text-green-600' : 'text-muted-foreground'
                        }
                      >
                        One uppercase letter
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          passwordStrength.number ? 'text-green-500' : 'text-muted-foreground'
                        }`}
                      />
                      <span
                        className={
                          passwordStrength.number ? 'text-green-600' : 'text-muted-foreground'
                        }
                      >
                        One number
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...register('confirmPassword')}
                    className="pr-10 mt-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                  <p className="text-sm text-destructive mt-1.5">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          )}

          {/* Invalid Token State */}
          {!token && !success && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">This reset link is invalid or has expired.</p>
              <Link href="/auth/forgot-password">
                <Button variant="outline" className="w-full" size="lg">
                  Request New Reset Link
                </Button>
              </Link>
            </div>
          )}

          {/* Back to Login Link */}
          {!success && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Remember your password?{' '}
              <Link href="/auth/login">
                <a className="text-primary font-medium hover:underline">Sign in</a>
              </Link>
            </p>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            Reset links expire after 1 hour for security
          </p>
        )}
      </motion.div>
    </div>
  );
}
