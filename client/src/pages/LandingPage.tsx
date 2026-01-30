import { memo, Suspense, lazy, useState } from 'react';
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
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-gold-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-white/70">Loading...</p>
    </div>
  </div>
);

const LandingPage = memo(() => {
  const [videoLoaded, setVideoLoaded] = useState(false);

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
      {/* Premium Gym Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: 'brightness(0.4) contrast(1.2) saturate(0.9)',
            opacity: videoLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease-in',
          }}
        >
          <source src="/videos/gym-background.mp4" type="video/mp4" />
        </video>

        {/* Loading indicator */}
        {!videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-5">
            <div className="text-white/30 text-sm">Loading video...</div>
          </div>
        )}

        {/* Fallback gradient background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-black via-gray-900 to-black" />

        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30 z-10" />
      </div>

      {/* Page Carousel - positioned above video */}
      <div className="relative z-20">
        <PageCarousel pages={pages} />
      </div>
    </div>
  );
});

LandingPage.displayName = 'LandingPage';

export default LandingPage;
