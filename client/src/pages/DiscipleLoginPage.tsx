import { useState, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';
import { getCsrfToken } from '@/lib/queryClient';
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png';
import { DiscipleIcon } from '@/components/icons/DiscipleIcon';

const DISCIPLE_COLOR = 'hsl(var(--color-disciple))';
const DISCIPLE_GRADIENT =
  'linear-gradient(135deg, hsl(var(--color-disciple)), hsl(var(--color-disciple-accent)))';
const DISCIPLE_GLOW = 'hsl(var(--color-disciple) / 0.35)';

/**
 * Format a raw code string into GG-XXXX-XXXX as the user types.
 * Strips non-alphanumeric chars, uppercases, then inserts dashes.
 */
function formatCode(raw: string): string {
  const stripped = raw
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 10);
  if (stripped.length <= 2) return stripped;
  if (stripped.length <= 6) return `${stripped.slice(0, 2)}-${stripped.slice(2)}`;
  return `${stripped.slice(0, 2)}-${stripped.slice(2, 6)}-${stripped.slice(6)}`;
}

export default function DiscipleLoginPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [displayCode, setDisplayCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setDisplayCode(formatted);
    setError(null);
  };

  const isComplete = displayCode.replace(/-/g, '').length === 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return;

    setError(null);
    setIsLoading(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch('/api/auth/disciple-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ accessCode: displayCode }),
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        queryClient.setQueryData(['/api/auth/user'], result.user);
        queryClient.setQueryData(['/api/auth/me'], result.user);
        setLocation('/dashboard');
      } else {
        const err = await response.json();
        setError(err.error || 'Invalid access code. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'hsl(0 0% 7%)' }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${DISCIPLE_COLOR}22 0%, transparent 70%)`,
          top: '-10%',
          left: '5%',
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${DISCIPLE_COLOR}18 0%, transparent 70%)`,
          bottom: '0%',
          right: '5%',
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1.1, 1, 1.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md relative z-10 px-4 py-10"
      >
        <div
          className="relative rounded-3xl overflow-hidden p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(26,26,26,0.95), rgba(18,18,18,0.98))',
            border: `1px solid ${DISCIPLE_COLOR}35`,
            boxShadow: `0 30px 60px -15px ${DISCIPLE_GLOW}, inset 0 1px 0 rgba(255,255,255,0.05)`,
            backdropFilter: 'blur(30px)',
          }}
        >
          {/* Sheen */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${DISCIPLE_COLOR}08 0%, transparent 50%)`,
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

            {/* Icon + heading */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: DISCIPLE_GRADIENT,
                  boxShadow: `0 8px 24px -4px ${DISCIPLE_GLOW}`,
                }}
              >
                <DiscipleIcon className="w-8 h-8" variant="white" />
              </div>
              <h1
                className="text-3xl font-light mb-1"
                style={{ fontFamily: "'Playfair Display', serif", color: '#f2f2f2' }}
              >
                Client Access
              </h1>
              <p
                className="text-sm text-center"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: 'hsl(0 0% 60%)',
                  letterSpacing: '0.04em',
                }}
              >
                Enter the access code your trainer gave you
              </p>
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Code input */}
              <div className="space-y-2">
                <label
                  htmlFor="accessCode"
                  className="block text-xs uppercase tracking-widest"
                  style={{ color: 'hsl(0 0% 55%)', fontFamily: 'Inter, sans-serif' }}
                >
                  Access Code
                </label>
                <div className="relative">
                  <Key
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: DISCIPLE_COLOR }}
                  />
                  <input
                    ref={inputRef}
                    id="accessCode"
                    type="text"
                    value={displayCode}
                    onChange={handleInput}
                    placeholder="GG-XXXX-XXXX"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-4 rounded-xl text-2xl font-mono tracking-[0.2em] text-center disabled:opacity-50 transition-all focus:outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isComplete ? `${DISCIPLE_COLOR}60` : 'rgba(255,255,255,0.1)'}`,
                      color: isComplete ? DISCIPLE_COLOR : '#f2f2f2',
                      letterSpacing: '0.25em',
                      caretColor: DISCIPLE_COLOR,
                    }}
                    maxLength={12}
                  />
                </div>
                <p
                  className="text-xs text-center"
                  style={{ color: 'hsl(0 0% 35%)', fontFamily: 'Inter, sans-serif' }}
                >
                  Format: GG-XXXX-XXXX &nbsp;·&nbsp; Not case-sensitive
                </p>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 text-sm font-semibold tracking-widest uppercase transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                disabled={isLoading || !isComplete}
                style={{
                  background: isComplete ? DISCIPLE_GRADIENT : 'rgba(255,255,255,0.07)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: isComplete ? `0 8px 24px -4px ${DISCIPLE_GLOW}` : 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Access My Profile'
                )}
              </Button>
            </form>

            {/* Link to trainer login */}
            <p
              className="text-center text-xs mt-6"
              style={{ color: 'hsl(0 0% 40%)', fontFamily: 'Inter, sans-serif' }}
            >
              Are you a trainer?{' '}
              <Link
                href="/auth/login"
                className="font-medium hover:underline transition-colors"
                style={{ color: 'hsl(var(--color-guru))' }}
              >
                Log in here →
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
