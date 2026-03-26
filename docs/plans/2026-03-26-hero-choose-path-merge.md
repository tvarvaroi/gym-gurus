# Hero + Choose Your Path Merge — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge Hero and Choose Your Path into a single above-fold section with 3-card bento grid (desktop) and swipeable card stack (mobile). Delete the standalone ChooseYourPathSection.

**Architecture:** Single HeroChoosePathSection.tsx replaces both HeroPage.tsx and ChooseYourPathSection.tsx. Desktop: 40/60 split (branding left, 3 role cards right). Mobile: full-width swipeable cards with pagination + CTA zone. Cards navigate to /auth/login or /disciple-login — no inline auth form.

**Tech Stack:** React 18, framer-motion (lazy-loaded), TypeScript, Tailwind, wouter

---

## Phase 1 — Build HeroChoosePathSection.tsx

### Task 1: Create the component file with all sub-components

**Files:**

- Create: `client/src/components/landing/pages/HeroChoosePathSection.tsx`

Full component (~550 lines) with:

- ShimmerParticle (memo'd, random values hoisted)
- ParallaxCard (memo'd, useMotionValue + useSpring for mouse/touch tracking)
- RoleCardContent (memo'd)
- DesktopLayout (40/60 split)
- MobileLayout (swipeable cards + pagination + CTA)
- HeroChoosePathSection (main export, useMediaQuery detection)

## Phase 2 — Integration

### Task 2: Update LandingPage.tsx

- Replace HeroPage import with HeroChoosePathSection
- Remove ChooseYourPathSection import and section
- Section order: #hero (merged), #how-it-works, #features, #about, #pricing, #contact

### Task 3: Update LandingHeader.tsx

- Login href → "#hero" (both desktop + mobile)

### Task 4: Delete ChooseYourPathSection.tsx

## Phase 3 — Verification

### Task 5: Build verification

- tsc --noEmit: 0 new errors in changed files
- npm run build: clean build
