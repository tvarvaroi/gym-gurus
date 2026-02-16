import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransitionVariants } from '@/lib/landingAnimations';
import LandingHeader from './LandingHeader';

interface PageCarouselProps {
  pages: React.ReactNode[];
}

const PageCarousel = memo(({ pages }: PageCarouselProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);

  const totalPages = pages.length;

  // Navigate to specific page
  const navigateToPage = useCallback((newPage: number) => {
    if (newPage === currentPage) return;

    setDirection(newPage > currentPage ? 1 : -1);
    setCurrentPage(newPage);
  }, [currentPage]);

  // Navigate to next page
  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      navigateToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, navigateToPage]);

  // Navigate to previous page
  const previousPage = useCallback(() => {
    if (currentPage > 0) {
      navigateToPage(currentPage - 1);
    }
  }, [currentPage, navigateToPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        previousPage();
      } else if (e.key >= '1' && e.key <= '7') {
        const pageIndex = parseInt(e.key) - 1;
        if (pageIndex < totalPages) {
          navigateToPage(pageIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, previousPage, navigateToPage, totalPages]);

  // Touch/swipe navigation
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // Swiped left - next page
          nextPage();
        } else {
          // Swiped right - previous page
          previousPage();
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [nextPage, previousPage]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Header Navigation */}
      <LandingHeader currentPage={currentPage} onNavigate={navigateToPage} />

      {/* Page Content */}
      <div className="relative min-h-screen">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={pageTransitionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            {pages[currentPage]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Page Indicators (Dots) */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-3">
        {pages.map((_, index) => (
          <button
            key={index}
            onClick={() => navigateToPage(index)}
            className="group relative p-4"
            aria-label={`Go to page ${index + 1}`}
          >
            <motion.div
              animate={{
                scale: currentPage === index ? 1.2 : 1,
                backgroundColor: currentPage === index
                  ? 'rgb(201, 168, 85)' // gold-primary
                  : 'rgba(255, 255, 255, 0.3)'
              }}
              transition={{ duration: 0.3 }}
              className="w-3 h-3 rounded-full cursor-pointer"
            />

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="glass-strong px-3 py-1 rounded-lg text-xs text-white whitespace-nowrap">
                {['Home', 'Features', 'About', 'Resources', 'Contact', 'Login', 'Pricing'][index]}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Navigation Arrows - Desktop only */}
      <div className="hidden md:block">
        {/* Previous */}
        {currentPage > 0 && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={previousPage}
            className="fixed left-6 top-1/2 transform -translate-y-1/2 z-40 glass-strong p-4 rounded-full hover:scale-110 transition-all group"
            aria-label="Previous page"
          >
            <svg
              className="w-6 h-6 text-white group-hover:text-gold-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>
        )}

        {/* Next */}
        {currentPage < totalPages - 1 && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={nextPage}
            className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40 glass-strong p-4 rounded-full hover:scale-110 transition-all group"
            aria-label="Next page"
          >
            <svg
              className="w-6 h-6 text-white group-hover:text-gold-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        )}
      </div>
    </div>
  );
});

PageCarousel.displayName = 'PageCarousel';

export default PageCarousel;
