import { memo } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Phone, MapPin, Crown, ArrowRight } from 'lucide-react';

// Luxury shimmer particle component - optimized
const ShimmerParticle = ({ delay, variant = 'gold' }: { delay: number; variant?: 'gold' | 'teal' }) => (
  <motion.div
    className="absolute w-0.5 h-0.5 rounded-full"
    style={{
      background: variant === 'gold'
        ? 'linear-gradient(135deg, #c9a855, #e5e4e2, #c9a855)'
        : 'linear-gradient(135deg, #0d9488, #e5e4e2, #0d9488)',
      boxShadow: variant === 'gold'
        ? '0 0 8px rgba(201, 168, 85, 0.5)'
        : '0 0 8px rgba(13, 148, 136, 0.5)',
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
      ease: "easeOut"
    }}
  />
);

const ContactPage = memo(() => {
  const contactMethods = [
    {
      icon: <Mail className="w-5 h-5" />,
      title: 'Email',
      detail: 'support@gymgurus.com',
      variant: 'gold' as const,
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: 'Live Chat',
      detail: 'Mon-Fri, 9am-5pm EST',
      variant: 'teal' as const,
    },
    {
      icon: <Phone className="w-5 h-5" />,
      title: 'Phone',
      detail: '1-800-GYM-GURU',
      variant: 'gold' as const,
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: 'Location',
      detail: 'San Francisco, CA',
      variant: 'teal' as const,
    }
  ];

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Sophisticated dual-tone ambient glow - optimized */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(201, 168, 85, 0.08) 0%, transparent 70%)',
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
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, transparent 70%)',
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
          repeat: Infinity,
          ease: "easeInOut"
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
              transition={{ duration: 4, repeat: Infinity }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(201, 168, 85, 0.08), rgba(13, 148, 136, 0.08))',
                border: '1px solid rgba(201, 168, 85, 0.2)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Crown className="w-4 h-4" style={{ color: '#c9a855' }} />
              <span className="text-sm font-light tracking-wider" style={{ color: '#d4d4d4' }}>
                GET IN TOUCH
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
                boxShadow: '0 15px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
              }}
            >
              {/* Glass overlay */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
                }}
              />

              <div className="relative">
                <h3
                  className="text-xl font-light mb-4 pb-1"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    background: 'linear-gradient(135deg, #ffffff, #c9a855)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: '1.4',
                  }}
                >
                  Send us a message
                </h3>

                <form className="space-y-3">
                  <div>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl focus:outline-none transition-all text-sm"
                      placeholder="Your name"
                      style={{
                        background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.9), rgba(10, 10, 10, 0.95))',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        fontFamily: "'Cormorant Garamond', serif",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(201, 168, 85, 0.5)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                    />
                  </div>

                  <div>
                    <input
                      type="email"
                      className="w-full px-4 py-2.5 rounded-xl focus:outline-none transition-all text-sm"
                      placeholder="your@email.com"
                      style={{
                        background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.9), rgba(10, 10, 10, 0.95))',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        fontFamily: "'Cormorant Garamond', serif",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(201, 168, 85, 0.5)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                    />
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl focus:outline-none transition-all resize-none text-sm"
                      placeholder="How can we help?"
                      style={{
                        background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.9), rgba(10, 10, 10, 0.95))',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        fontFamily: "'Cormorant Garamond', serif",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(201, 168, 85, 0.5)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                    />
                  </div>

                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-light transition-all"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        background: 'linear-gradient(135deg, #c9a855, #d4af37, #b8935e)',
                        boxShadow: '0 15px 30px rgba(201, 168, 85, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                        color: '#000000',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Send Message
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                </form>
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
                    background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.7), rgba(10, 10, 10, 0.8))',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 15px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                  }}
                >
                  {/* Glass overlay */}
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
                    }}
                  />

                  <div className="relative text-center space-y-2">
                    {/* Icon */}
                    <motion.div
                      className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center"
                      style={{
                        background: method.variant === 'gold'
                          ? 'linear-gradient(135deg, rgba(201, 168, 85, 0.15), rgba(184, 147, 94, 0.1))'
                          : 'linear-gradient(135deg, rgba(13, 148, 136, 0.15), rgba(20, 184, 166, 0.1))',
                        color: method.variant === 'gold' ? '#c9a855' : '#0d9488',
                      }}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      {method.icon}
                    </motion.div>

                    {/* Shimmer particle */}
                    <div className="absolute top-1 right-1">
                      <ShimmerParticle delay={index * 0.5} variant={method.variant} />
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
            background: i % 2 === 0
              ? 'linear-gradient(135deg, #c9a855, #d4af37)'
              : 'linear-gradient(135deg, #0d9488, #14b8a6)',
            boxShadow: i % 2 === 0
              ? '0 0 8px rgba(201, 168, 85, 0.4)'
              : '0 0 8px rgba(13, 148, 136, 0.4)',
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
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
});

ContactPage.displayName = 'ContactPage';

export default ContactPage;
