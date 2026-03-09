import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png';

const navItems = [
  { label: 'Home', href: '#hero' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
  { label: 'Pricing', href: '#pricing' },
];

const LandingHeader = memo(() => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'glass-strong border-b border-white/10 shadow-xl' : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <motion.a
            href="#hero"
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 cursor-pointer"
          >
            <div
              className="relative w-12 h-12 rounded-xl p-0.5"
              style={{
                background:
                  'linear-gradient(135deg, hsl(var(--color-guru) / 0.12), hsl(var(--color-disciple) / 0.12))',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
                }}
              />
              <img
                src={logoImage}
                alt="Gym Gurus"
                className="w-full h-full rounded-lg object-cover relative z-10"
                style={{ filter: 'brightness(1.15) contrast(1.08) saturate(0.85)' }}
              />
            </div>
            <div>
              <h1
                className="text-xl font-extralight tracking-[0.3em]"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  background:
                    'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #e5e4e2 50%, hsl(var(--color-disciple)) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.2em',
                }}
              >
                GYM GURUS
              </h1>
              <div
                className="h-px my-0.5"
                style={{
                  background:
                    'linear-gradient(90deg, hsl(var(--color-guru) / 0.6), hsl(var(--color-disciple) / 0.6))',
                }}
              />
              <p
                className="text-[0.5rem] tracking-[0.3em] font-light"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  color: '#999',
                  letterSpacing: '0.25em',
                }}
              >
                ELITE FITNESS
              </p>
            </div>
          </motion.a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <motion.a
                key={item.href}
                href={item.href}
                whileHover={{ y: -2 }}
                className="text-base font-light transition-colors tracking-wider"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: 'rgba(255, 255, 255, 0.7)',
                  letterSpacing: '0.05em',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255, 255, 255, 1)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255, 255, 255, 0.7)';
                }}
              >
                {item.label}
              </motion.a>
            ))}

            {/* Login CTA */}
            <motion.a
              href="/auth/login"
              whileHover={{ y: -2 }}
              className="text-base font-light transition-colors tracking-wider px-4 py-1.5 rounded-lg"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: 'hsl(var(--color-guru))',
                border: '1px solid hsl(var(--color-guru) / 0.4)',
                letterSpacing: '0.05em',
                textDecoration: 'none',
              }}
            >
              Login
            </motion.a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white hover:text-gold-primary transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-80 glass-strong border-l border-white/10 p-6 overflow-y-auto"
            >
              {/* Close button */}
              <div className="flex justify-end mb-8">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex flex-col gap-4">
                {navItems.map((item, index) => (
                  <motion.a
                    key={item.href}
                    href={item.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-left py-3 px-4 rounded-xl transition-all"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      color: 'rgba(255, 255, 255, 0.7)',
                      textDecoration: 'none',
                    }}
                  >
                    {item.label}
                  </motion.a>
                ))}

                {/* Login CTA */}
                <motion.a
                  href="/auth/login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navItems.length * 0.1 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-left py-3 px-4 rounded-xl transition-all mt-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: 'hsl(var(--color-guru))',
                    border: '1px solid hsl(var(--color-guru) / 0.3)',
                    textDecoration: 'none',
                  }}
                >
                  Login
                </motion.a>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

LandingHeader.displayName = 'LandingHeader';

export default LandingHeader;
