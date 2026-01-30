# GymGurus Landing Pages - Implementation Plan

## Overview
Create a premium, carousel-based landing experience with multiple pages showcasing GymGurus' value proposition, features, pricing, and company story. The design will maintain the luxury aesthetic of the current login page with a fixed background video and smooth content transitions.

---

## 1. Page Structure & Navigation

### Pages to Implement (6 Total)

#### 1. **Home/Hero Page** (Default/First Page)
- Large centered GymGurus logo (2x size of login page)
- Premium tagline: "Transform Your Training Business"
- Subtle animated elements (particles, gradients, glow effects)
- Key value props in minimalist cards
- Scroll indicator or navigation hints

#### 2. **Features Page**
- Showcase core platform capabilities
- 3-column grid of feature cards with icons
- Interactive feature demonstrations
- "All-in-One Solution" messaging

#### 3. **Pricing Page**
- 3-tier pricing structure (Starter, Professional, Enterprise)
- Feature comparison table
- "30-Day Free Trial" prominent CTA
- FAQ section for pricing questions

#### 4. **About Us Page**
- Company mission and vision
- Team showcase (if applicable)
- Company values and culture
- Milestones and achievements

#### 5. **Resources Page**
- Blog preview/featured articles
- Guides and tutorials
- Success stories/testimonials
- Video content library

#### 6. **Contact Page**
- Contact form
- Support information
- Office location (if applicable)
- Social media links

---

## 2. Navigation System Design

### Header Navigation Bar

```
┌─────────────────────────────────────────────────────────────┐
│  [GymGurus Logo]    Home  Features  Pricing  About  Resources │
│                                            Contact  [Login]    │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- **Position**: Fixed at top, glass morphism backdrop
- **Background**: `rgba(255, 255, 255, 0.05)` with `backdrop-filter: blur(12px)`
- **Height**: 80px
- **Border**: `1px solid rgba(255, 255, 255, 0.1)` bottom border
- **Logo**: Left-aligned, 40px height
- **Nav Items**: Center-aligned, 16px font, 24px padding
- **Login Button**: Right-aligned, gold gradient (`trainer-gradient`)
- **Active State**: Gold underline or highlight
- **Hover**: Smooth color transition, gold tint

### Carousel Navigation System

**Approach**: Horizontal carousel with smooth transitions
- **Method**: Framer Motion AnimatePresence for page transitions
- **Direction**: Left/right arrow keys, mouse swipe, navigation clicks
- **Animation**: Slide + fade effect (300-500ms duration)
- **Background**: Video stays fixed, only content slides
- **Indicators**: Dot navigation at bottom showing current page

**Alternative Approach**: Full-page scroll snap
- **Method**: CSS scroll-snap-type
- **Navigation**: Smooth scroll to sections
- **Advantage**: Native browser behavior, better performance

---

## 3. Design System & Components

### Color Palette (From Login Page)

```css
/* Primary Colors */
--gold-primary: #c9a855;      /* Trainer/Premium accent */
--gold-light: #d4b86a;        /* Hover states */
--teal-primary: #0d9488;      /* Client accent */
--teal-light: #14b8a6;        /* Secondary teal */

/* Neutrals */
--bg-dark: #0a0a0a;           /* Background base */
--text-white: #ffffff;        /* Primary text */
--text-muted: rgba(255, 255, 255, 0.7);  /* Secondary text */

/* Glass Morphism */
--glass-bg: rgba(255, 255, 255, 0.05);
--glass-border: rgba(255, 255, 255, 0.1);
--glass-strong: rgba(255, 255, 255, 0.08);
```

### Typography Scale

```css
/* Headings */
--h1: 64px / 800 weight / -0.02em tracking  (Hero titles)
--h2: 48px / 700 weight / -0.01em tracking  (Section titles)
--h3: 32px / 600 weight / 0em tracking      (Feature titles)
--h4: 24px / 600 weight / 0em tracking      (Card titles)

/* Body */
--body-large: 20px / 400 weight / 1.6 line-height
--body-regular: 16px / 400 weight / 1.5 line-height
--body-small: 14px / 400 weight / 1.4 line-height
```

### Component Library Needed

1. **LandingHeader** - Navigation bar component
2. **PageCarousel** - Carousel wrapper with transitions
3. **HeroSection** - Large logo + tagline section
4. **FeatureCard** - Individual feature showcase
5. **PricingCard** - Pricing tier card with features
6. **TestimonialCard** - Client success story
7. **StatCard** - Animated statistics display
8. **CTAButton** - Primary action buttons (gold gradient)
9. **GlassCard** - Reusable glass morphism card
10. **VideoBackground** - Fixed background video component

---

## 4. Detailed Page Structures

### Page 1: Home/Hero

```
┌─────────────────────────────────────────────────────────────┐
│                      [Fixed Header Nav]                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                    [GymGurus Logo - Large]                    │
│                     120px height, gold glow                   │
│                                                               │
│              "Transform Your Training Business"               │
│                    48px, white, centered                      │
│                                                               │
│         "All-in-one platform for modern personal trainers"    │
│                    20px, muted, centered                      │
│                                                               │
│    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐ │
│    │ ✓ Unlimited   │  │ ✓ Save 10hrs  │  │ ✓ Grow Your   │ │
│    │   Clients     │  │   per Week    │  │   Business    │ │
│    └───────────────┘  └───────────────┘  └───────────────┘ │
│                                                               │
│                   [Start Free Trial →]                        │
│                  Gold gradient button, large                  │
│                                                               │
│                    30-day trial • No credit card              │
│                                                               │
│                  ↓ Scroll to explore features                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Animated gradient orbs floating in background
- Logo with subtle pulse/glow animation
- Value props in glass morphism cards
- Parallax scroll effect for depth
- Mouse cursor particle trail

### Page 2: Features

```
┌─────────────────────────────────────────────────────────────┐
│                      [Fixed Header Nav]                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                   "Everything You Need"                       │
│                       48px, centered                          │
│                                                               │
│              "All-in-one platform built for trainers"         │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  [Icon]     │  │  [Icon]     │  │  [Icon]     │         │
│  │ Client Mgmt │  │  Workouts   │  │  Nutrition  │         │
│  │ Track all   │  │  Custom     │  │  Meal plans │         │
│  │ clients...  │  │  builder... │  │  tracking...│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  [Icon]     │  │  [Icon]     │  │  [Icon]     │         │
│  │ Progress    │  │  Scheduling │  │  Messaging  │         │
│  │ Analytics   │  │  Calendar   │  │  Built-in   │         │
│  │ dashboards..│  │  booking... │  │  chat...    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│                [View Full Feature List →]                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Features to Highlight:**
1. Client Management & CRM
2. Workout Builder & Library
3. Nutrition Planning & Tracking
4. Progress Analytics & Reports
5. Scheduling & Calendar
6. In-App Messaging
7. Payment Processing
8. Mobile Apps (iOS & Android)
9. Automated Workflows
10. Custom Branding

### Page 3: Pricing

```
┌─────────────────────────────────────────────────────────────┐
│                      [Fixed Header Nav]                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                "Simple, Transparent Pricing"                  │
│                                                               │
│                 [Monthly] / [Annual] Toggle                   │
│                   (Save 20% annually)                         │
│                                                               │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐        │
│  │  Starter   │    │Professional│    │ Enterprise │        │
│  │            │    │[POPULAR]   │    │            │        │
│  │   $49/mo   │    │   $99/mo   │    │  Custom    │        │
│  │            │    │            │    │            │        │
│  │ ✓ 50 clients    │ ✓ Unlimited│    │ ✓ Unlimited│        │
│  │ ✓ Core features │ ✓ All features │ ✓ Priority │        │
│  │ ✓ Email support │ ✓ Priority  │    │ ✓ Dedicated│        │
│  │                 │   support   │    │   manager  │        │
│  │[Start Trial→]  │[Start Trial→]  │[Contact→]  │        │
│  └────────────┘    └────────────┘    └────────────┘        │
│                                                               │
│              "All plans include 30-day free trial"            │
│                    "No credit card required"                  │
│                                                               │
│                   ─── Feature Comparison ───                  │
│                      [Expandable Table]                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Pricing Strategy:**
- Emphasize "Unlimited Clients" on Pro+ tiers
- Free trial prominent on all plans
- Annual discount highlighted
- Feature comparison table
- Money-back guarantee
- FAQ accordion below

### Page 4: About Us

```
┌─────────────────────────────────────────────────────────────┐
│                      [Fixed Header Nav]                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                      "Our Mission"                            │
│                                                               │
│         "Empowering trainers to build thriving businesses     │
│              through innovative technology"                   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                [Mission Statement]                      │  │
│  │  GymGurus was born from a simple observation: personal  │  │
│  │  trainers are amazing at transforming lives, but often  │  │
│  │  struggle with the business and administrative side...  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│                     "Our Core Values"                         │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Trainer-First │  │  Innovation  │  │   Integrity  │      │
│  │ Everything we │  │ Cutting-edge │  │ Transparent, │      │
│  │ build starts  │  │ tech that... │  │ honest...    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│                    "Why We're Different"                      │
│  • Built by trainers, for trainers                            │
│  • No hidden fees or client caps                              │
│  • World-class support team                                   │
│  • Continuous innovation                                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Page 5: Resources

```
┌─────────────────────────────────────────────────────────────┐
│                      [Fixed Header Nav]                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                    "Learning Center"                          │
│                                                               │
│         "Everything you need to succeed as a trainer"         │
│                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ 📚 Blog        │  │ 🎓 Academy     │  │ 📊 Case Studies│ │
│  │ Latest tips    │  │ Video courses  │  │ Client success │ │
│  │ and insights   │  │ and training   │  │ stories        │ │
│  │                │  │                │  │                │ │
│  │ [Explore →]    │  │ [Learn →]      │  │ [Read →]       │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│                                                               │
│                  "Featured Articles"                          │
│                                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │ [Article Preview 1]                           │           │
│  │ Title, excerpt, author, date                  │           │
│  └──────────────────────────────────────────────┘           │
│                                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │ [Article Preview 2]                           │           │
│  └──────────────────────────────────────────────┘           │
│                                                               │
│                   [View All Resources →]                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Page 6: Contact

```
┌─────────────────────────────────────────────────────────────┐
│                      [Fixed Header Nav]                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                     "Get In Touch"                            │
│                                                               │
│           "Have questions? We'd love to hear from you"        │
│                                                               │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │                     │    │  Quick Support       │         │
│  │ Contact Form        │    │                      │         │
│  │                     │    │  📧 Email Support    │         │
│  │ [Name]              │    │  support@gymgurus... │         │
│  │ [Email]             │    │                      │         │
│  │ [Subject]           │    │  💬 Live Chat        │         │
│  │ [Message]           │    │  Available 9am-5pm   │         │
│  │                     │    │                      │         │
│  │ [Send Message →]    │    │  📞 Phone            │         │
│  │                     │    │  1-800-GYM-GURU      │         │
│  └─────────────────────┘    │                      │         │
│                              │  🏢 Location         │         │
│                              │  San Francisco, CA   │         │
│                              └─────────────────────┘         │
│                                                               │
│              ────── Follow Us ──────                          │
│              [Twitter] [LinkedIn] [Instagram]                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Technical Implementation

### File Structure

```
client/src/
├── components/
│   ├── landing/
│   │   ├── LandingHeader.tsx         # Main navigation header
│   │   ├── PageCarousel.tsx          # Carousel container
│   │   ├── VideoBackground.tsx       # Fixed video bg
│   │   ├── HeroPage.tsx              # Page 1: Hero/Home
│   │   ├── FeaturesPage.tsx          # Page 2: Features
│   │   ├── PricingPage.tsx           # Page 3: Pricing
│   │   ├── AboutPage.tsx             # Page 4: About
│   │   ├── ResourcesPage.tsx         # Page 5: Resources
│   │   ├── ContactPage.tsx           # Page 6: Contact
│   │   └── shared/
│   │       ├── FeatureCard.tsx
│   │       ├── PricingCard.tsx
│   │       ├── TestimonialCard.tsx
│   │       ├── StatCard.tsx
│   │       └── CTAButton.tsx
│   └── LoginPage.tsx                 # Keep existing
├── pages/
│   └── LandingPage.tsx               # Main landing entry
└── lib/
    └── landingAnimations.ts          # Animation variants
```

### Carousel Implementation Options

#### Option A: Framer Motion (Recommended)

```tsx
import { motion, AnimatePresence } from 'framer-motion';

const PageCarousel = () => {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    <HeroPage />,
    <FeaturesPage />,
    <PricingPage />,
    <AboutPage />,
    <ResourcesPage />,
    <ContactPage />
  ];

  const pageVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className="carousel-container">
      <VideoBackground />
      <LandingHeader
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentPage}
          custom={direction}
          variants={pageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {pages[currentPage]}
        </motion.div>
      </AnimatePresence>
      <PageIndicators current={currentPage} total={pages.length} />
    </div>
  );
};
```

#### Option B: CSS Scroll Snap (Alternative)

```tsx
const LandingPage = () => {
  return (
    <div className="scroll-snap-container">
      <VideoBackground />
      <LandingHeader />
      <div className="scroll-snap-wrapper">
        <section className="snap-page"><HeroPage /></section>
        <section className="snap-page"><FeaturesPage /></section>
        <section className="snap-page"><PricingPage /></section>
        <section className="snap-page"><AboutPage /></section>
        <section className="snap-page"><ResourcesPage /></section>
        <section className="snap-page"><ContactPage /></section>
      </div>
    </div>
  );
};
```

```css
.scroll-snap-container {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}

.snap-page {
  height: 100vh;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
```

### Video Background Component

```tsx
const VideoBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute min-w-full min-h-full object-cover opacity-30"
      >
        <source src="/videos/gym-background.mp4" type="video/mp4" />
      </video>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50" />
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-5 bg-noise" />
    </div>
  );
};
```

### Navigation Header Component

```tsx
const LandingHeader = ({ currentPage, onNavigate }) => {
  const navItems = [
    { label: 'Home', index: 0 },
    { label: 'Features', index: 1 },
    { label: 'Pricing', index: 2 },
    { label: 'About', index: 3 },
    { label: 'Resources', index: 4 },
    { label: 'Contact', index: 5 }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 glass border-b border-white/10">
      <div className="container mx-auto h-full flex items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="GymGurus" className="h-10" />
          <span className="text-xl font-semibold">GymGurus</span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.index}
              onClick={() => onNavigate(item.index)}
              className={`text-sm font-medium transition-colors ${
                currentPage === item.index
                  ? 'text-gold-primary'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Login Button */}
        <button className="px-6 py-2.5 trainer-gradient rounded-lg font-medium hover:opacity-90 transition">
          Login
        </button>
      </div>
    </header>
  );
};
```

---

## 6. Animation & Interaction Details

### Page Transition Animations

```typescript
// lib/landingAnimations.ts

export const pageTransitionVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] // Smooth easing
    }
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  })
};

export const fadeInUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' }
  }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export const scaleInVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};
```

### Hover Effects

```css
/* Premium button hover */
.cta-button {
  position: relative;
  overflow: hidden;
}

.cta-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.cta-button:hover::before {
  transform: translateX(100%);
}

/* Glass card hover */
.glass-card {
  transition: all 0.3s ease;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(201, 168, 85, 0.3);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(201, 168, 85, 0.15);
}
```

### Scroll Animations

```tsx
import { useScroll, useTransform } from 'framer-motion';

const ParallaxSection = ({ children }) => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <motion.div style={{ y }}>
      {children}
    </motion.div>
  );
};
```

---

## 7. Content & Copywriting

### Hero Page Copy

**Main Headline:**
- "Transform Your Training Business"
- Alt: "Build. Scale. Succeed."
- Alt: "The Future of Personal Training"

**Subheadline:**
- "All-in-one platform for modern personal trainers"
- "Manage clients, create workouts, track progress—all in one place"

**Value Props:**
1. ✓ Unlimited Clients
2. ✓ Save 10+ Hours per Week
3. ✓ Grow Your Revenue by 40%

**CTA:**
- Primary: "Start Free Trial"
- Secondary: "Watch Demo"

### Features Page Copy

**Headline:** "Everything You Need, Nothing You Don't"

**Feature Descriptions:**
1. **Client Management**
   - "Track every detail. From onboarding to goal achievement, manage your entire client roster in one intuitive dashboard."

2. **Workout Builder**
   - "Create custom programs in minutes. Drag-and-drop builder with 1000+ exercises and video demonstrations."

3. **Nutrition Planning**
   - "Fuel success with precision. Build meal plans, track macros, and monitor adherence—all synced with workouts."

4. **Progress Analytics**
   - "Data that drives results. Beautiful dashboards show exactly what's working and where to optimize."

5. **Smart Scheduling**
   - "Time is money. Automated booking, reminders, and calendar sync keep you organized and clients engaged."

6. **In-App Messaging**
   - "Stay connected, stay committed. Built-in chat keeps communication centralized and professional."

### Pricing Page Copy

**Headline:** "Simple, Transparent Pricing"
**Subheadline:** "Choose the plan that fits your business. Upgrade or downgrade anytime."

**Tier Names & Positioning:**
- **Starter**: "Perfect for new trainers"
- **Professional**: "Most popular for growing businesses"
- **Enterprise**: "For established training businesses"

**Trust Builders:**
- "30-day free trial on all plans"
- "No credit card required"
- "Cancel anytime, no questions asked"
- "Money-back guarantee"

### About Page Copy

**Mission Statement:**
"GymGurus was born from a simple observation: personal trainers are incredible at transforming lives, but often struggle with the business and administrative side. We believe trainers should spend their time training—not drowning in paperwork. That's why we built the most intuitive, powerful, and affordable all-in-one platform for fitness professionals."

**Core Values:**
1. **Trainer-First**: Everything we build starts with the question: "How does this help trainers succeed?"
2. **Innovation**: We're constantly pushing boundaries with AI, automation, and cutting-edge features.
3. **Integrity**: Transparent pricing, honest communication, no hidden fees or surprises.
4. **Community**: We're building more than software—we're building a movement of empowered trainers.

---

## 8. Responsive Design Breakpoints

```css
/* Mobile First Approach */

/* Mobile (320px - 767px) */
@media (max-width: 767px) {
  .h1 { font-size: 32px; }
  .h2 { font-size: 28px; }
  .h3 { font-size: 24px; }

  .feature-grid { grid-template-columns: 1fr; }
  .pricing-grid { grid-template-columns: 1fr; }

  .nav-menu { display: none; } /* Show hamburger menu */
  .header-logo { height: 32px; }
}

/* Tablet (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .h1 { font-size: 48px; }
  .h2 { font-size: 36px; }

  .feature-grid { grid-template-columns: repeat(2, 1fr); }
  .pricing-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .h1 { font-size: 64px; }
  .h2 { font-size: 48px; }

  .feature-grid { grid-template-columns: repeat(3, 1fr); }
  .pricing-grid { grid-template-columns: repeat(3, 1fr); }
}

/* Large Desktop (1440px+) */
@media (min-width: 1440px) {
  .container { max-width: 1280px; }
}
```

---

## 9. Performance Optimization

### Image Optimization
- Use WebP format with fallbacks
- Lazy load images below fold
- Implement blur-up placeholder technique
- Compress images to < 200KB

### Video Optimization
- Compress background video to < 5MB
- Use poster image for instant display
- Load video asynchronously
- Pause video when not in viewport

### Code Splitting
```tsx
// Lazy load pages
const HeroPage = lazy(() => import('./components/landing/HeroPage'));
const FeaturesPage = lazy(() => import('./components/landing/FeaturesPage'));
const PricingPage = lazy(() => import('./components/landing/PricingPage'));
```

### Animation Performance
- Use `transform` and `opacity` for animations (GPU-accelerated)
- Avoid animating `width`, `height`, `left`, `top`
- Use `will-change` sparingly for complex animations
- Reduce motion for users with `prefers-reduced-motion`

---

## 10. SEO & Accessibility

### Meta Tags
```html
<meta name="description" content="GymGurus - All-in-one platform for personal trainers. Manage clients, create workouts, track progress." />
<meta name="keywords" content="personal trainer software, fitness app, client management" />
<meta property="og:title" content="GymGurus - Transform Your Training Business" />
<meta property="og:image" content="/og-image.jpg" />
```

### Semantic HTML
```tsx
<main>
  <section aria-label="Hero">
    <h1>Transform Your Training Business</h1>
  </section>
  <section aria-label="Features">
    <h2>Everything You Need</h2>
  </section>
</main>
```

### Accessibility
- All interactive elements keyboard accessible
- Focus visible styles on all focusable elements
- ARIA labels for icon-only buttons
- Alt text for all images
- Color contrast ratio ≥ 4.5:1
- Skip to main content link

---

## 11. Implementation Timeline

### Phase 1: Foundation (Week 1)
- [x] Complete research
- [ ] Set up landing page routing
- [ ] Create VideoBackground component
- [ ] Implement LandingHeader with navigation
- [ ] Build PageCarousel container
- [ ] Set up animation system

### Phase 2: Core Pages (Week 2)
- [ ] Build HeroPage component
- [ ] Build FeaturesPage component
- [ ] Build PricingPage component
- [ ] Create shared components (FeatureCard, PricingCard, etc.)

### Phase 3: Secondary Pages (Week 3)
- [ ] Build AboutPage component
- [ ] Build ResourcesPage component
- [ ] Build ContactPage component
- [ ] Implement contact form functionality

### Phase 4: Polish & Optimization (Week 4)
- [ ] Add micro-interactions and hover effects
- [ ] Optimize images and video
- [ ] Implement lazy loading
- [ ] Test responsive design
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] SEO meta tags

### Phase 5: Testing & Launch
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Fix bugs and issues
- [ ] Final QA pass
- [ ] Deploy to production

---

## 12. Success Metrics

### User Engagement
- Average time on landing pages
- Carousel page progression rate
- CTA click-through rates
- Video play rate

### Conversion Metrics
- Free trial signup rate
- Pricing page visit → signup conversion
- Contact form submissions
- Login rate from landing pages

### Performance Metrics
- Page load time < 2 seconds
- Lighthouse score > 90
- Core Web Vitals pass
- Zero accessibility errors

---

## 13. Next Steps

1. **Review & Approve Plan**: Get stakeholder sign-off on page structure and content
2. **Gather Assets**: Collect logos, images, video footage, copy content
3. **Set Up Development Environment**: Create component structure and routing
4. **Start Implementation**: Begin with Phase 1 foundation work
5. **Iterate**: Regular design reviews and user testing

---

## Appendix: Component Props Examples

### FeatureCard Props
```typescript
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  delay?: number; // For stagger animation
}
```

### PricingCard Props
```typescript
interface PricingCardProps {
  name: string;
  price: number | 'Custom';
  period: 'month' | 'year';
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
  ctaHref: string;
}
```

### CTAButton Props
```typescript
interface CTAButtonProps {
  children: React.ReactNode;
  variant: 'primary' | 'secondary' | 'outline';
  size: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  className?: string;
}
```

---

**End of Implementation Plan**

This plan provides a comprehensive roadmap for building GymGurus' landing pages with a premium carousel experience. The design maintains the luxury aesthetic of the current login page while providing a smooth, engaging way for potential clients to explore the platform.
