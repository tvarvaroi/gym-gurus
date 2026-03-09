# Design Doc: § UX-1 — Carousel → Scrollable Landing Page

**Date:** 2026-03-09
**Status:** Approved — implementing
**Issue:** § UX-1 (CLAUDE.md)
**Skills activated:** brainstorming, landing-page-generator, page-cro, ux-researcher-designer, performance-profiler, marketing-psychology, seo-audit, signup-flow-cro, ab-test-setup

---

## Problem

The landing page uses a JS `AnimatePresence` carousel (`PageCarousel.tsx`) that renders one slide at a time. This creates three simultaneous failure modes:

**1. CRO (page-cro skill — severity 4, highest rating)**

- Login form is buried at slide 6 of 7 with no URL, no direct link
- Browser back/forward are broken — the nav stack is never updated
- Users who land expecting a marketing page cannot find the CTA without manually swiping through 5 slides
- Journey map stage: Awareness → drop-off before Evaluation

**2. SEO (seo-audit skill)**

- Only slide 1 (HeroPage) is in the initial HTML payload; slides 2–7 are rendered by JS on demand
- Googlebot crawls the HTML, sees one section, misses How It Works / Features / Pricing / Contact entirely
- All section copy, headings, and structured content invisible to crawlers

**3. Performance (performance-profiler skill)**

- framer-motion `AnimatePresence` is on the critical render path, blocking LCP
- `PageCarousel` registers 4 event listeners on `window` (keydown, touchstart, touchend, carousel:navigate) that are never needed on a marketing page
- Target post-fix: LCP < 1s, CLS < 0.1 (landing-page-generator skill targets)

**marketing-psychology skill confirms:** carousel violates progressive disclosure — users never see sections 2–7 organically. Sections after slide 1 have ~0% organic view rate.

---

## Decision Log

| Decision                   | Choice                                                                | Rationale                                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login placement            | Dedicated route `/auth/login`                                         | Login in a marketing page carousel is an anti-pattern; dedicated route gives it a URL, enables direct linking, simplifies landing page               |
| `LoginCarouselPage.tsx`    | Delete                                                                | Replaced by existing `/auth/login` route                                                                                                             |
| Section order              | Unchanged: Hero → How It Works → Features → About → Contact → Pricing | Scope limited to container mechanism; reorder is a post-launch A/B test hypothesis                                                                   |
| `min-h-screen` on sections | Keep as-is                                                            | Each section filling the viewport is a deliberate premium design choice; section height is a separate experiment if scroll-depth data shows drop-off |
| LandingHeader nav          | Static anchor links, zero JS, no active-state tracking                | Simpler is better; IntersectionObserver active tracking adds complexity with no material UX gain for this scope                                      |
| Scroll behaviour           | CSS `scroll-behavior: smooth` on the page container                   | No JS needed; degrades gracefully in browsers that don't support it                                                                                  |

---

## Approach: Minimal Surgery (Approach A)

**Scope:** Container mechanism only. No section component layout or styling changes.

### Files to delete

- `client/src/components/landing/PageCarousel.tsx` — the carousel mechanism entirely
- `client/src/components/landing/pages/LoginCarouselPage.tsx` — login leaves the landing page

### Files to modify

- `client/src/pages/LandingPage.tsx` — replace `<PageCarousel>` with scrollable `<div>` rendering all sections sequentially with `<section id="...">` wrappers
- `client/src/components/landing/LandingHeader.tsx` — strip `currentPage`/`onNavigate` props; nav items become `<a href="#section-id">`; Login item becomes `<a href="/auth/login">`

### Files explicitly NOT touched (layout/styling)

- `client/src/components/landing/pages/HeroPage.tsx` — layout unchanged\*
- `client/src/components/landing/pages/HowItWorksPage.tsx` — layout unchanged\*
- `client/src/components/landing/pages/FeaturesPage.tsx` — layout unchanged\*
- `client/src/components/landing/pages/AboutPage.tsx` — layout unchanged ✓
- `client/src/components/landing/pages/ContactPage.tsx` — layout unchanged ✓
- `client/src/components/landing/pages/PricingPage.tsx` — layout unchanged\*

\*Four of the six section components contain `carousel:navigate` event dispatches that must be replaced as part of carousel removal. These are one-line onClick changes only — no layout or styling changes.

---

## carousel:navigate Audit

All occurrences found and their replacements:

| File                 | Line  | Current                                                                                             | Replacement                                                                  |
| -------------------- | ----- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `PageCarousel.tsx`   | 65–66 | `addEventListener('carousel:navigate', ...)`                                                        | Deleted with the file                                                        |
| `HeroPage.tsx`       | 204   | `dispatchEvent(carousel:navigate page:5)` — navigates to Login slide                                | `window.location.href = '/auth/login'`                                       |
| `HowItWorksPage.tsx` | 224   | `dispatchEvent(carousel:navigate page:5)` — navigates to Login slide                                | `window.location.href = '/auth/login'`                                       |
| `FeaturesPage.tsx`   | 255   | `dispatchEvent(carousel:navigate page:5)` — navigates to Login slide                                | `window.location.href = '/auth/login'`                                       |
| `PricingPage.tsx`    | 421   | `dispatchEvent(carousel:navigate page:4)` — navigates to Contact slide (Enterprise "Contact Sales") | `document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })` |
| `PricingPage.tsx`    | 425   | `dispatchEvent(carousel:navigate page:5)` — navigates to Login slide                                | `window.location.href = '/auth/login'`                                       |

Page index reference (carousel, now defunct):

- 0=Hero, 1=How It Works, 2=Features, 3=About, 4=Contact, 5=Login, 6=Pricing

---

## Section IDs (anchor targets)

| Section component | `<section id>` |
| ----------------- | -------------- |
| HeroPage          | `hero`         |
| HowItWorksPage    | `how-it-works` |
| FeaturesPage      | `features`     |
| AboutPage         | `about`        |
| ContactPage       | `contact`      |
| PricingPage       | `pricing`      |

---

## Post-Launch Experiments (ab-test-setup skill)

1. **Section reorder A/B test** — hypothesis: moving Pricing before About/Contact increases trial signups. Measure: signup conversion rate at `/auth/login` from landing page referrer. Run with 50/50 split for minimum 2 weeks.

2. **Section height audit** — hypothesis: `min-h-screen` on all sections causes scroll-depth drop-off after Hero. Measure: scroll depth analytics (% users reaching Pricing section). If <30% reach Pricing, test natural content-height sections.

3. **Hero CTA copy** — current: generic "Get Started". Test: "Start Your Free Trial" vs "Join as Guru / Ronin". Measure: CTR to `/auth/login`.

---

## CRO/SEO/Performance note for CLAUDE.md

> § UX-1 fixes three failure modes simultaneously: CRO (login discoverable, browser nav works), SEO (all 6 sections crawler-visible), Performance (carousel JS removed from critical path). Combined WSJF score of 28 — highest remaining fix after resolved criticals.
