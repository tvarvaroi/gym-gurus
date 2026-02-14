import { memo, Suspense, lazy } from 'react';
import PageCarousel from '@/components/landing/PageCarousel';

// Lazy load pages for better performance
const HeroPage = lazy(() => import('@/components/landing/pages/HeroPage'));
const FeaturesPage = lazy(() => import('@/components/landing/pages/FeaturesPage'));
const AboutPage = lazy(() => import('@/components/landing/pages/AboutPage'));
const ResourcesPage = lazy(() => import('@/components/landing/pages/ResourcesPage'));
const ContactPage = lazy(() => import('@/components/landing/pages/ContactPage'));
const LoginCarouselPage = lazy(() => import('@/components/landing/pages/LoginCarouselPage'));
const PricingPage = lazy(() => import('@/components/landing/pages/PricingPage'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen w-full flex items-center justify-center">
    <div className="text-center" role="status" aria-label="Loading page content">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-white/70">Loading...</p>
    </div>
  </div>
);

const LandingPage = memo(() => {
  const pages = [
    <Suspense key="hero" fallback={<PageLoader />}>
      <HeroPage />
    </Suspense>,
    <Suspense key="features" fallback={<PageLoader />}>
      <FeaturesPage />
    </Suspense>,
    <Suspense key="about" fallback={<PageLoader />}>
      <AboutPage />
    </Suspense>,
    <Suspense key="resources" fallback={<PageLoader />}>
      <ResourcesPage />
    </Suspense>,
    <Suspense key="contact" fallback={<PageLoader />}>
      <ContactPage />
    </Suspense>,
    <Suspense key="login" fallback={<PageLoader />}>
      <LoginCarouselPage />
    </Suspense>,
    <Suspense key="pricing" fallback={<PageLoader />}>
      <PricingPage />
    </Suspense>
  ];

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-black">
      {/* Premium gradient background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 30%, #111111 50%, #0a0a0a 70%, #000000 100%)',
          }}
        />
        {/* Subtle blue accent glow */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
            top: '-20%',
            right: '-10%',
            filter: 'blur(100px)',
          }}
        />
        {/* Subtle emerald accent glow */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.04) 0%, transparent 70%)',
            bottom: '-10%',
            left: '-5%',
            filter: 'blur(100px)',
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/20 z-10" />
      </div>

      {/* Page Carousel - positioned above background */}
      <div className="relative z-20">
        <PageCarousel pages={pages} />
      </div>
    </div>
  );
});

LandingPage.displayName = 'LandingPage';

export default LandingPage;
