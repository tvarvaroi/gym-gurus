import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png';

export default function PaymentCancelled() {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'hsl(0 0% 7%)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          top: '10%',
          right: '10%',
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
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 30px 60px -15px rgba(0,0,0,0.5)',
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

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <h1
              className="text-3xl font-light mb-3"
              style={{ fontFamily: "'Playfair Display', serif", color: '#f2f2f2' }}
            >
              No worries.
            </h1>
            <p
              className="text-sm mb-2"
              style={{ color: 'hsl(0 0% 60%)', fontFamily: 'Inter, sans-serif' }}
            >
              You can upgrade anytime — your progress is safe.
            </p>
            <p
              className="text-xs mb-8"
              style={{ color: 'hsl(0 0% 35%)', fontFamily: 'Inter, sans-serif' }}
            >
              Nothing was charged.
            </p>

            <div className="space-y-3">
              <Button
                className="w-full h-12 text-sm font-semibold tracking-widest uppercase"
                onClick={() => navigate('/pricing')}
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-accent)))',
                  color: '#ffffff',
                  border: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                View Plans
              </Button>

              <Button
                variant="ghost"
                className="w-full h-11 text-sm"
                onClick={() => navigate('/dashboard')}
                style={{ color: 'hsl(0 0% 50%)', fontFamily: 'Inter, sans-serif' }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
