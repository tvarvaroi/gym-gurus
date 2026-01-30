import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import logoImage from '@assets/Sophisticated Logo with Japanese Influences (3)_1757605872884.png';

interface LandingHeaderProps {
  currentPage: number;
  onNavigate: (index: number) => void;
}

const navItems = [
  { label: 'Home', index: 0 },
  { label: 'Features', index: 1 },
  { label: 'About', index: 2 },
  { label: 'Resources', index: 3 },
  { label: 'Contact', index: 4 },
  { label: 'Login', index: 5 },
  { label: 'Pricing', index: 6 }
];

const LandingHeader = memo(({ currentPage, onNavigate }: LandingHeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigate = (index: number) => {
    onNavigate(index);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'glass-strong border-b border-white/10 shadow-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => handleNavigate(0)}
          >
            <div
              className="relative w-12 h-12 rounded-xl p-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(201, 168, 85, 0.12), rgba(13, 148, 136, 0.12))',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
              }}
            >
              {/* Sophisticated glass shine */}
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
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
                  background: 'linear-gradient(90deg, #c9a855 0%, #e5e4e2 50%, #0d9488 100%)',
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
                  background: 'linear-gradient(90deg, rgba(201, 168, 85, 0.6), rgba(13, 148, 136, 0.6))',
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
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <motion.button
                key={item.index}
                onClick={() => handleNavigate(item.index)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="text-base font-light transition-colors relative tracking-wider"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: currentPage === item.index ? 'transparent' : 'rgba(255, 255, 255, 0.7)',
                  background: currentPage === item.index
                    ? 'linear-gradient(90deg, #c9a855 0%, #e5e4e2 50%, #0d9488 100%)'
                    : 'none',
                  backgroundClip: currentPage === item.index ? 'text' : 'unset',
                  WebkitBackgroundClip: currentPage === item.index ? 'text' : 'unset',
                  WebkitTextFillColor: currentPage === item.index ? 'transparent' : 'rgba(255, 255, 255, 0.7)',
                  letterSpacing: '0.05em',
                }}
              >
                {item.label}

                {/* Active indicator */}
                {currentPage === item.index && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-px rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, rgba(201, 168, 85, 0.6), rgba(13, 148, 136, 0.6))',
                    }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
            ))}
          </nav>

          {/* Empty space for balance */}
          <div className="hidden md:block w-20" />

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white hover:text-gold-primary transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
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
                  <motion.button
                    key={item.index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleNavigate(item.index)}
                    className="text-left py-3 px-4 rounded-xl transition-all"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      background: currentPage === item.index
                        ? 'linear-gradient(135deg, rgba(201, 168, 85, 0.12), rgba(13, 148, 136, 0.12))'
                        : 'transparent',
                      border: currentPage === item.index
                        ? '1px solid rgba(201, 168, 85, 0.2)'
                        : '1px solid transparent',
                    }}
                  >
                    <span
                      style={{
                        color: currentPage === item.index ? 'transparent' : 'rgba(255, 255, 255, 0.7)',
                        background: currentPage === item.index
                          ? 'linear-gradient(90deg, #c9a855 0%, #e5e4e2 50%, #0d9488 100%)'
                          : 'none',
                        backgroundClip: currentPage === item.index ? 'text' : 'unset',
                        WebkitBackgroundClip: currentPage === item.index ? 'text' : 'unset',
                        WebkitTextFillColor: currentPage === item.index ? 'transparent' : 'rgba(255, 255, 255, 0.7)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {item.label}
                    </span>
                  </motion.button>
                ))}
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
