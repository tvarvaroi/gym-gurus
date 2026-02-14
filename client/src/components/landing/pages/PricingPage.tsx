import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Crown, CheckCircle } from 'lucide-react';

// Luxury shimmer particle component - optimized
const ShimmerParticle = ({
  delay,
  variant = 'blue',
}: {
  delay: number;
  variant?: 'blue' | 'emerald';
}) => (
  <motion.div
    className="absolute w-0.5 h-0.5 rounded-full"
    style={{
      background:
        variant === 'blue'
          ? 'linear-gradient(135deg, #c9a855, #e5e4e2, #c9a855)'
          : 'linear-gradient(135deg, #0d9488, #e5e4e2, #0d9488)',
      boxShadow:
        variant === 'blue' ? '0 0 8px rgba(201, 168, 85, 0.5)' : '0 0 8px rgba(13, 148, 136, 0.5)',
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
      repeat: Infinity,
      delay,
      ease: 'easeOut',
    }}
  />
);

const PricingPage = memo(() => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      name: 'Starter',
      priceMonthly: 49,
      priceAnnual: 39,
      features: ['50 clients', 'Core features', 'Mobile apps', 'Email support'],
      cta: 'Start Trial',
      popular: false,
      variant: 'emerald' as const,
    },
    {
      name: 'Professional',
      priceMonthly: 99,
      priceAnnual: 79,
      features: ['Unlimited clients', 'All features', 'Custom branding', 'Priority support'],
      cta: 'Start Trial',
      popular: true,
      variant: 'blue' as const,
    },
    {
      name: 'Enterprise',
      priceMonthly: null,
      priceAnnual: null,
      features: ['Everything in Pro', 'Dedicated manager', 'Custom integrations', 'SLA guarantee'],
      cta: 'Contact Sales',
      popular: false,
      variant: 'emerald' as const,
    },
  ];

  const getPrice = (plan: (typeof plans)[0]) => {
    if (plan.priceMonthly === null) return 'Custom';
    return billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceAnnual;
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Sophisticated dual-tone ambient glow - optimized */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(201, 168, 85, 0.08) 0%, transparent 70%)',
          top: '10%',
          left: '10%',
          filter: 'blur(80px)',
          willChange: 'opacity',
        }}
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, transparent 70%)',
          bottom: '10%',
          right: '10%',
          filter: 'blur(80px)',
          willChange: 'opacity',
        }}
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10 min-h-screen flex items-center px-8 md:px-12 lg:px-20 py-12">
        <div className="w-full max-w-6xl mx-auto space-y-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center space-y-6"
          >
            {/* Luxury badge */}
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
              style={{
                background:
                  'linear-gradient(135deg, rgba(201, 168, 85, 0.08), rgba(13, 148, 136, 0.08))',
                border: '1px solid rgba(201, 168, 85, 0.2)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Crown className="w-4 h-4" style={{ color: '#c9a855' }} />
              <span className="text-sm font-light tracking-wider" style={{ color: '#d4d4d4' }}>
                PRICING PLANS
              </span>
            </motion.div>

            {/* Headline */}
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-light pb-3"
              style={{
                fontFamily: "'Playfair Display', serif",
                background: 'linear-gradient(90deg, #c9a855 0%, #e5e4e2 50%, #0d9488 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
                lineHeight: '1.25',
              }}
            >
              Simple Pricing
            </h1>

            {/* Billing Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="inline-flex items-center gap-2 p-2 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                onClick={() => setBillingPeriod('monthly')}
                className="px-5 py-2 rounded-full transition-all font-light text-sm"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  background:
                    billingPeriod === 'monthly'
                      ? 'linear-gradient(135deg, #c9a855, #b8935e)'
                      : 'transparent',
                  color: billingPeriod === 'monthly' ? '#ffffff' : '#b3b3b3',
                  letterSpacing: '0.05em',
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className="px-5 py-2 rounded-full transition-all font-light text-sm"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  background:
                    billingPeriod === 'annual'
                      ? 'linear-gradient(135deg, #0d9488, #0f766e)'
                      : 'transparent',
                  color: billingPeriod === 'annual' ? '#ffffff' : '#b3b3b3',
                  letterSpacing: '0.05em',
                }}
              >
                Annual
              </button>
            </motion.div>

            {billingPeriod === 'annual' && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: '#c9a855',
                }}
              >
                Save 20% with annual billing
              </motion.p>
            )}
          </motion.div>

          {/* Pricing Cards - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, scale: plan.popular ? 1.02 : 1 }}
                className="relative"
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20"
                  >
                    <div
                      className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
                      style={{
                        background: 'linear-gradient(135deg, #c9a855, #b8935e)',
                        color: '#ffffff',
                        boxShadow: '0 8px 20px rgba(201, 168, 85, 0.4)',
                      }}
                    >
                      <Star className="w-3 h-3" />
                      Popular
                    </div>
                  </motion.div>
                )}

                <div
                  className="p-6 rounded-2xl relative h-full flex flex-col"
                  style={{
                    background: plan.popular
                      ? 'linear-gradient(135deg, rgba(201, 168, 85, 0.08), rgba(184, 147, 94, 0.05))'
                      : 'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                    backdropFilter: 'blur(20px)',
                    border: plan.popular
                      ? '1px solid rgba(201, 168, 85, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: plan.popular
                      ? '0 20px 40px -10px rgba(201, 168, 85, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                      : '0 15px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
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

                  <div className="relative flex flex-col h-full">
                    {/* Shimmer particle */}
                    <div className="absolute top-2 right-2">
                      <ShimmerParticle delay={index * 0.5} variant={plan.variant} />
                    </div>

                    {/* Plan Name */}
                    <h3
                      className="text-xl font-light mb-4 text-center pb-1"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        background:
                          plan.variant === 'blue'
                            ? 'linear-gradient(135deg, #ffffff, #c9a855)'
                            : 'linear-gradient(135deg, #ffffff, #0d9488)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        lineHeight: '1.4',
                      }}
                    >
                      {plan.name}
                    </h3>

                    {/* Price */}
                    <div className="text-center mb-6">
                      {plan.priceMonthly === null ? (
                        <div
                          className="text-3xl font-light"
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            color: '#ffffff',
                          }}
                        >
                          Custom
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-center">
                          <span
                            className="text-4xl font-light"
                            style={{
                              fontFamily: "'Playfair Display', serif",
                              color: '#ffffff',
                            }}
                          >
                            ${getPrice(plan)}
                          </span>
                          <span
                            className="text-base ml-2"
                            style={{
                              fontFamily: "'Cormorant Garamond', serif",
                              color: '#999',
                            }}
                          >
                            /mo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-6 flex-grow">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <Check
                            className="w-4 h-4 flex-shrink-0 mt-0.5"
                            style={{
                              color: plan.variant === 'blue' ? '#c9a855' : '#0d9488',
                            }}
                          />
                          <span
                            className="text-xs font-light"
                            style={{
                              fontFamily: "'Cormorant Garamond', serif",
                              color: '#d4d4d4',
                            }}
                          >
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <a
                        href={plan.priceMonthly === null ? '/contact' : '/api/login?role=trainer'}
                        className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-light transition-all text-sm"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          background: plan.popular
                            ? 'linear-gradient(135deg, #c9a855, #b8935e, #d4af37)'
                            : 'transparent',
                          border: plan.popular ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                          color: plan.popular ? '#ffffff' : '#ffffff',
                          boxShadow: plan.popular
                            ? '0 15px 30px rgba(201, 168, 85, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                            : 'none',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {plan.cta}
                      </a>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center justify-center gap-4 text-xs"
            style={{ color: '#999' }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5" style={{ color: '#c9a855' }} />
              <span className="font-light">30-day trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5" style={{ color: '#0d9488' }} />
              <span className="font-light">No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5" style={{ color: '#c9a855' }} />
              <span className="font-light">Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5" style={{ color: '#0d9488' }} />
              <span className="font-light">Money-back guarantee</span>
            </div>
          </motion.div>
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
                ? 'linear-gradient(135deg, #c9a855, #b8935e)'
                : 'linear-gradient(135deg, #0d9488, #0f766e)',
            boxShadow:
              i % 2 === 0 ? '0 0 8px rgba(201, 168, 85, 0.4)' : '0 0 8px rgba(13, 148, 136, 0.4)',
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
            repeat: Infinity,
            delay: Math.random() * 6,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
});

PricingPage.displayName = 'PricingPage';

export default PricingPage;
