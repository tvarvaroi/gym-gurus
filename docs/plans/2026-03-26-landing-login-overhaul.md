# Landing Page + Login Architecture Overhaul

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the role-selection login experience into the landing page as an inline section, redesign mobile login with character portraits, rewrite all landing copy for dual-audience (Guru + Ronin), and upgrade SEO with schema.org JSON-LD.

**Architecture:** ChooseYourPathSection is a new landing section with inline auth form that appears after role selection. Desktop login page gets null default role. Mobile login page gets full redesign with character portrait zone + bottom sheet. All landing copy rewritten with outcome-led messaging. index.html gets full SEO upgrade.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind, framer-motion (lazy-loaded pages only), react-hook-form + zod, wouter, TanStack Query

---

## Phase 1 — SEO + index.html (no component changes)

### Task 1: Update meta tags and JSON-LD in index.html

**Files:**

- Modify: `client/index.html`

**Step 1: Update title and meta description**

Replace line 6:

```html
<title>GymGurus — AI Fitness Platform for Personal Trainers & Solo Athletes</title>
<meta
  name="description"
  content="Manage clients, build AI-powered programs, track PRs and body metrics. Used by 2,000+ personal trainers. Free calculators included. Start free — no credit card."
/>
```

**Step 2: Update OG tags (lines 13-18)**

```html
<meta property="og:title" content="GymGurus — Train Smarter. Grow Faster." />
<meta
  property="og:description"
  content="The platform where personal trainers build empires and solo athletes break limits. AI-powered. Free to start."
/>
<meta property="og:image" content="/og-image.png" />
<meta property="og:url" content="https://gym-gurus-production.up.railway.app" />
```

**Step 3: Update Twitter card (lines 22-24)**

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="GymGurus — AI Fitness for Trainers & Athletes" />
<meta
  name="twitter:description"
  content="2,000+ trainers. 50,000+ workouts. AI-powered programs. Free to start."
/>
<meta name="twitter:image" content="/og-image.png" />
```

**Step 4: Replace JSON-LD with @graph (lines 51-76)**

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "GymGurus",
        "applicationCategory": "HealthApplication",
        "operatingSystem": "Web",
        "description": "AI fitness platform for personal trainers and solo athletes. Manage clients, build programs, track PRs.",
        "offers": {
          "@type": "AggregateOffer",
          "lowPrice": "0",
          "highPrice": "99",
          "priceCurrency": "USD",
          "offerCount": "5"
        },
        "featureList": [
          "AI Workout Generation",
          "Client Management",
          "Progress Tracking",
          "Strength Standards",
          "Body Metrics",
          "Nutrition Planning",
          "13 Free Fitness Calculators",
          "Multi-Week Program Builder"
        ]
      },
      {
        "@type": "Organization",
        "name": "GymGurus",
        "url": "https://gym-gurus-production.up.railway.app"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Does GymGurus replace my spreadsheets?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. GymGurus replaces spreadsheets, Google Docs, and paper logs with a purpose-built platform for managing clients, workouts, progress, and payments in one place."
            }
          },
          {
            "@type": "Question",
            "name": "Can my clients see their own progress?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Clients (Disciples) get their own login with a dashboard showing assigned workouts, progress charts, and upcoming sessions."
            }
          },
          {
            "@type": "Question",
            "name": "Is there a free tier?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. GymGurus offers a 30-day free trial with full access. No credit card required to start."
            }
          },
          {
            "@type": "Question",
            "name": "How does AI workout generation work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tell the AI your goal, experience level, equipment, and time. It generates a complete workout with exercises, sets, reps, and rest periods in under 30 seconds."
            }
          },
          {
            "@type": "Question",
            "name": "Can I build multi-week training programs?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. The Program Builder lets you create periodized multi-week programs with progressive overload, deload weeks, and day-by-day structure. AI can generate entire programs too."
            }
          }
        ]
      },
      {
        "@type": "WebSite",
        "name": "GymGurus",
        "url": "https://gym-gurus-production.up.railway.app",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://gym-gurus-production.up.railway.app/calculators?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
    ]
  }
</script>
```

**Step 5: Add preload tags before closing `</head>`**

```html
<link
  rel="preload"
  href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
  as="style"
/>
```

**Step 6: Verify**

Run: `npm run build`
Expected: Build succeeds, no HTML parse errors

---

## Phase 2 — ChooseYourPathSection (desktop inline auth)

### Task 2: Create ChooseYourPathSection component

**Files:**

- Create: `client/src/components/landing/pages/ChooseYourPathSection.tsx`

This is a full-viewport landing section with:

- Two role cards (Guru gold, Ronin purple), neither selected by default
- Clicking a card reveals an inline login form below with spring animation
- Form submits to POST /api/auth/login, navigates to /dashboard on success
- Disciple link at bottom

Key implementation notes:

- Use react-hook-form + zod (same pattern as existing LoginPage.tsx)
- Use getCsrfToken() from @/lib/queryClient for CSRF
- Use GuruIcon/RoninIcon/DiscipleIcon from @/components/icons/
- framer-motion is OK here (this is lazy-loaded via LandingPage.tsx Suspense)
- initialRole = null (CRITICAL — no default)
- @media (prefers-reduced-motion: reduce) disables glow/particle animations
- All buttons min 44×44px touch target

### Task 3: Add ChooseYourPathSection to LandingPage.tsx

**Files:**

- Modify: `client/src/pages/LandingPage.tsx`

Add lazy import:

```tsx
const ChooseYourPathSection = lazy(
  () => import('@/components/landing/pages/ChooseYourPathSection')
);
```

Add section after Pricing (line 95), before closing `</div>`:

```tsx
<section id="choose-path" style={{ scrollMarginTop: '5rem' }}>
  <Suspense fallback={<PageLoader />}>
    <ChooseYourPathSection />
  </Suspense>
</section>
```

### Task 4: Update LandingHeader Login button

**Files:**

- Modify: `client/src/components/landing/LandingHeader.tsx`

Change desktop Login CTA (line 129-142) `href="/auth/login"` → `href="#choose-path"`
Change mobile Login CTA (line 215-230) `href="/auth/login"` → `href="#choose-path"`

**Checkpoint:** `tsc --noEmit`, verify header Login scrolls to section

---

## Phase 3 — LoginPage.tsx (null default + mobile redesign)

### Task 5: LoginPage desktop — null default role

**Files:**

- Modify: `client/src/pages/auth/LoginPage.tsx`

Change line 66 from:

```tsx
return r === 'trainer' || r === 'solo' ? r : 'trainer';
```

to:

```tsx
return r === 'trainer' || r === 'solo' ? r : null;
```

This makes neither role pre-selected on desktop.

### Task 6: LoginPage mobile — Option A character portrait redesign

**Files:**

- Modify: `client/src/pages/auth/LoginPage.tsx`

Add a `useMediaQuery` or `window.innerWidth < 768` check. On mobile:

- TOP ZONE (48vh): Full-bleed character zone with selected role icon at 200px, role-reactive gradient background
- STICKY PILL TABS: "GURU" / "RONIN" pill buttons with framer-motion `layoutId="active-tab-pill"` sliding indicator
- BOTTOM SHEET (52vh+): Spring entrance `y:[100%, 0]`, role-reactive form
- Character flip: `rotateY: [0, 90, 90, 0]` on role switch
- Keyboard handling: bottom sheet `y: -20px` on input focus

Desktop layout stays as-is (2-card layout) but with null default from Task 5.

**Checkpoint:** `tsc --noEmit`, test at 390px viewport

---

## Phase 4 — Copy Rewrites

### Task 7: HeroPage.tsx copy rewrite

**Files:**

- Modify: `client/src/components/landing/pages/HeroPage.tsx`

Replace:

- H1: "Train Smarter. Grow Faster."
- Subtitle: "The platform where personal trainers build empires and solo athletes break limits."
- CTA primary: "Start Free — No Card Needed" → scrolls to #choose-path
- CTA secondary: "Watch It Work" → scrolls to #how-it-works
- Trust indicators: "2,000+ trainers · 50,000+ workouts built · 500,000+ sets logged"
- Trust badges: "30-day free trial" / "No credit card" / "Cancel in one click"

### Task 8: HowItWorksPage.tsx dual-path rewrite

**Files:**

- Modify: `client/src/components/landing/pages/HowItWorksPage.tsx`

Replace single trainer journey with dual Guru/Ronin tracks:

- Section headline: "Your Path. Your Rules."
- Desktop: two columns side by side. Mobile: tabbed.
- Guru track: "Add Your Clients" → "Build Their Program" → "Watch Them Grow"
- Ronin track: "Tell AI Your Goals" → "Get Your Program" → "Hit Every PR"
- Bottom CTAs: "Start as Guru" and "Start as Ronin" → scroll to #choose-path

### Task 9: FeaturesPage.tsx outcome-led copy

**Files:**

- Modify: `client/src/components/landing/pages/FeaturesPage.tsx`

Rewrite all 5 feature cards to outcome-led copy per spec.
Add 6th feature card: "Free Fitness Calculators" → links to /calculators.

### Task 10: PricingPage.tsx upgrades

**Files:**

- Modify: `client/src/components/landing/pages/PricingPage.tsx`

- Add "Most Popular" badge to mid-tier plan
- Add urgency banner: "Early access pricing — rates increase as we grow"
- Add risk reversal: "Cancel in one click. No questions, no penalty, no retention calls."
- Add social proof: "Join 2,000+ trainers who chose GymGurus over spreadsheets and sticky notes."
- Add FAQ accordion (4 questions from spec)

**Checkpoint:** Visual review of all copy changes, humanizer pass

---

## Phase 5 — Verification

### Task 11: Build verification

Run: `tsc --noEmit`
Run: `npm run build`
Expected: Both pass with zero new errors

### Task 12: Success criteria check

Verify all 19 success criteria from the spec:

- Login button scrolls to #choose-path
- No default role selected
- Role cards apply correct theme
- Form submits and navigates to /dashboard
- Mobile character portrait and bottom sheet (390px)
- Mobile tab flip animation
- Hero H1 is "Train Smarter. Grow Faster."
- HowItWorks shows both tracks
- JSON-LD present and valid
- All images have alt text
- All clickable elements have cursor-pointer
- 44×44px minimum touch targets
- prefers-reduced-motion disables animations
