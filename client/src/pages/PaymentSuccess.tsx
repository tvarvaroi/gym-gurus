import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { getPlanDisplayName } from '@/lib/roles';
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png';

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Read tier from query param (passed by the Stripe success_url)
  const params = new URLSearchParams(window.location.search);
  const tier = params.get('tier') ?? null;
  const planName = tier ? getPlanDisplayName(tier) : 'Premium';

  // Invalidate auth cache so the app picks up the new subscription tier
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
  }, [queryClient]);

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'hsl(0 0% 7%)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(var(--color-guru) / 0.2) 0%, transparent 70%)',
          top: '-10%',
          left: '5%',
          filter: 'blur(60px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md relative z-10 px-4 py-10"
      >
        <div
          className="relative rounded-3xl overflow-hidden p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(26,26,26,0.95), rgba(18,18,18,0.98))',
            border: '1px solid hsl(var(--color-guru) / 0.35)',
            boxShadow: '0 30px 60px -15px hsl(var(--color-guru) / 0.2)',
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src={logoImage}
              alt="GymGurus"
              className="h-auto w-auto"
              style={{ height: '3.25rem' }}
            />
          </div>

          {/* Check icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            className="flex justify-center mb-5"
          >
            <CheckCircle2 className="w-16 h-16" style={{ color: 'hsl(var(--color-guru))' }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <h1
              className="text-3xl font-light mb-2"
              style={{ fontFamily: "'Playfair Display', serif", color: '#f2f2f2' }}
            >
              You&apos;re in.
            </h1>
            <p
              className="text-sm mb-1"
              style={{ color: 'hsl(0 0% 60%)', fontFamily: 'Inter, sans-serif' }}
            >
              <span style={{ color: 'hsl(var(--color-guru))', fontWeight: 600 }}>{planName}</span>{' '}
              is now active.
            </p>
            <p
              className="text-xs mb-8"
              style={{ color: 'hsl(0 0% 40%)', fontFamily: 'Inter, sans-serif' }}
            >
              You&apos;ll receive a confirmation email from Stripe shortly.
            </p>

            <Button
              className="w-full h-12 text-sm font-semibold tracking-widest uppercase"
              onClick={() => navigate('/dashboard')}
              style={{
                background:
                  'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-accent)))',
                color: '#ffffff',
                border: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
