import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  MessageSquare,
  Phone,
  MapPin,
  Crown,
  ArrowRight,
  CheckCircle,
  Loader2,
} from 'lucide-react';
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

const ContactPage = memo(() => {
  const prefersReducedMotion = useReducedMotion();
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const contactMethods = [
    {
      icon: <Mail className="w-5 h-5" />,
      title: 'Email',
      detail: 'support@gymgurus.com',
      variant: 'blue' as const,
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: 'Live Chat',
      detail: 'Mon-Fri, 9am-5pm EST',
      variant: 'emerald' as const,
    },
    {
      icon: <Phone className="w-5 h-5" />,
      title: 'Phone',
      detail: '1-800-GYM-GURU',
      variant: 'blue' as const,
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: 'Location',
      detail: 'San Francisco, CA',
      variant: 'emerald' as const,
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
          right: '5%',
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
          left: '5%',
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
        <div className="w-full max-w-5xl mx-auto">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-10 space-y-6"
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
                GET IN TOUCH
              </span>
            </motion.div>

            {/* Headline */}
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-light pb-3"
              style={{
                fontFamily: "'Playfair Display', serif",
                background: 'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #e5e4e2 50%, hsl(var(--color-disciple)) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
                lineHeight: '1.25',
              }}
            >
              Let's Connect
            </h1>

            {/* Subheadline */}
            <p
              className="text-base md:text-lg max-w-2xl mx-auto font-light pb-2"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: '#b3b3b3',
                letterSpacing: '0.01em',
                lineHeight: '2',
              }}
            >
              Have questions? We'd love to hear from you.
            </p>
          </motion.div>

          {/* Two Column Layout - Compact */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Form - Left */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl p-6 border relative"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow:
                  '0 15px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
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

              <div className="relative">
                <h3
                  className="text-xl font-light mb-4 pb-1"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    background: 'linear-gradient(135deg, #ffffff, hsl(var(--color-guru)))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: '1.4',
                  }}
                >
                  Send us a message
                </h3>

                <AnimatePresence mode="wait">
                  {formState === 'success' ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center justify-center py-8 space-y-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{
                          background:
                            'linear-gradient(135deg, hsl(var(--color-disciple) / 0.2), hsl(var(--color-disciple) / 0.1))',
                        }}
                      >
                        <CheckCircle className="w-8 h-8" style={{ color: 'hsl(var(--color-disciple))' }} />
                      </motion.div>
                      <h4
                        className="text-lg font-light text-white"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        Message Sent!
                      </h4>
                      <p
                        className="text-sm text-center"
                        style={{ color: '#b3b3b3', fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        Thank you for reaching out. We'll get back to you within 24 hours.
                      </p>
                      <button
                        type="button"
                        onClick={() => setFormState('idle')}
                        className="text-sm underline transition-colors hover:text-white"
                        style={{ color: 'hsl(var(--color-guru))' }}
                      >
                        Send another message
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {errorMessage && (
                        <div
                          className="mb-3 px-4 py-2 rounded-xl text-sm"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                          }}
                        >
                          {errorMessage}
                        </div>
                      )}
                      <form
                        className="space-y-3"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const formData = new FormData(form);
                          const name = formData.get('name') as string;
                          const email = formData.get('email') as string;
                          const message = formData.get('message') as string;
                          if (!name || !email || !message) return;

                          setFormState('submitting');
                          setErrorMessage('');
                          try {
                            const res = await fetch('/api/contact', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name, email, message }),
                            });
                            if (!res.ok) {
                              const data = await res.json().catch(() => ({}));
                              throw new Error(data.error || 'Failed to send message');
                            }
                            form.reset();
                            setFormState('success');
                          } catch (err: any) {
                            setErrorMessage(
                              err.message || 'Something went wrong. Please try again.'
                            );
                            setFormState('error');
                          }
                        }}
                      >
                        <div>
                          <input
                            type="text"
                            name="name"
                            required
                            className="w-full px-4 py-2.5 rounded-xl focus:outline-none transition-all text-sm"
                            placeholder="Your name"
                            style={{
                              background:
                                'linear-gradient(135deg, rgba(15, 15, 15, 0.9), rgba(10, 10, 10, 0.95))',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#ffffff',
                              fontFamily: "'Cormorant Garamond', serif",
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = 'hsl(var(--color-guru) / 0.5)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                          />
                        </div>

                        <div>
                          <input
                            type="email"
                            name="email"
                            required
                            className="w-full px-4 py-2.5 rounded-xl focus:outline-none transition-all text-sm"
                            placeholder="your@email.com"
                            style={{
                              background:
                                'linear-gradient(135deg, rgba(15, 15, 15, 0.9), rgba(10, 10, 10, 0.95))',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#ffffff',
                              fontFamily: "'Cormorant Garamond', serif",
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = 'hsl(var(--color-guru) / 0.5)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                          />
                        </div>

                        <div>
                          <textarea
                            name="message"
                            required
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl focus:outline-none transition-all resize-none text-sm"
                            placeholder="How can we help?"
                            style={{
                              background:
                                'linear-gradient(135deg, rgba(15, 15, 15, 0.9), rgba(10, 10, 10, 0.95))',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#ffffff',
                              fontFamily: "'Cormorant Garamond', serif",
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = 'hsl(var(--color-guru) / 0.5)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                          />
                        </div>

                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                          <button
                            type="submit"
                            disabled={formState === 'submitting'}
                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-light transition-all disabled:opacity-60"
                            style={{
                              fontFamily: "'Playfair Display', serif",
                              background: 'linear-gradient(135deg, hsl(var(--color-guru)), hsl(var(--color-guru-secondary)), hsl(var(--color-guru-accent)))',
                              boxShadow:
                                '0 15px 30px hsl(var(--color-guru) / 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                              color: '#ffffff',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {formState === 'submitting' ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                Send Message
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </motion.div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Contact Info Grid - Right */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {contactMethods.map((method, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -3 }}
                  className="rounded-2xl p-5 border relative"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow:
                      '0 15px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
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

                  <div className="relative text-center space-y-2">
                    {/* Icon */}
                    <motion.div
                      className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center"
                      style={{
                        background:
                          method.variant === 'blue'
                            ? 'linear-gradient(135deg, hsl(var(--color-guru) / 0.15), hsl(var(--color-guru-secondary) / 0.1))'
                            : 'linear-gradient(135deg, hsl(var(--color-disciple) / 0.15), hsl(var(--color-disciple-secondary) / 0.1))',
                        color: method.variant === 'blue' ? 'hsl(var(--color-guru))' : 'hsl(var(--color-disciple))',
                      }}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      {method.icon}
                    </motion.div>

                    {/* Shimmer particle */}
                    <div className="absolute top-1 right-1">
                      <ShimmerParticle delay={index * 0.5} variant={method.variant} prefersReducedMotion={prefersReducedMotion} />
                    </div>

                    <h4
                      className="text-sm font-semibold"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        color: '#ffffff',
                      }}
                    >
                      {method.title}
                    </h4>
                    <p
                      className="text-xs font-light"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        color: '#999',
                      }}
                    >
                      {method.detail}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Legal links */}
          <div className="mt-8 text-center text-xs" style={{ color: '#666' }}>
            <a href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <span className="mx-2">·</span>
            <a href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
          </div>
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

ContactPage.displayName = 'ContactPage';

export default ContactPage;
