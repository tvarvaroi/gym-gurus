# GymGurus — Design Upgrade Plan

## Deep Research + Page-by-Page Upgrade Roadmap

---

## PART 1 — THE FULL DESIGN TOOLING ECOSYSTEM

### What We Currently Use

- shadcn/ui — headless Radix primitives, unstyled
- Tailwind CSS — utility styling
- framer-motion (now `motion/react`) — animations, already installed
- Recharts — charts
- Playfair Display — display font (recently added)

### Tier 1 — Install Immediately (free, copy-paste, zero risk)

**Magic UI** — magicui.design
Install: `pnpm dlx shadcn@latest add @magicui/<component>`
Components for GymGurus:

- `NumberTicker` — animated count-up on every stat number in the app
- `AnimatedCircularProgressBar` — animated ring, replaces flat Recharts pies
- `BentoGrid` — asymmetric dashboard stat cards
- `BlurFade` — staggered entrance animations on page load
- `BorderBeam` — animated glowing border on active cards
- `MagicCard` — spotlight/glow follows mouse cursor on hover
- `OrbitingCircles` — achievement/XP visualization
- `AnimatedList` — staggered list entrance for workout history
- `ShimmerButton` — premium CTA button with light sweep
- `Confetti` — achievement unlock celebration
- `SparklesText` — gold sparkle on achievement rank names
- `NeonGradientCard` — glowing card border for premium features
- `TypingAnimation` — AI Coach typewriter effect

**Aceternity UI** — ui.aceternity.com
Install: copy component code from site into `client/src/components/ui/`
Components for GymGurus:

- `CardSpotlight` — dramatic spotlight on hover
- `BackgroundBeams` — animated beam background for landing/hero
- `WobbleCard` — 3D tilt on hover for stat and feature cards
- `AnimatedTooltip` — premium tooltips with avatars for client lists
- `MovingBorders` — animated border gradient for active state cards
- `LampEffect` — dramatic light cone for hero sections and empty states
- `SparklesCore` — particle sparkle for achievements
- `TracingBeam` — scroll-based line that traces through landing content
- `GlowingStarsBackgroundCard` — dark card with star field
- `Timeline` — animated vertical timeline for workout history
- `HoverBorderGradient` — animated gradient border on hover

**21st.dev** — 21st.dev/community/components
Community copy-paste components. Key categories:

- Cards (79), Buttons (130), Badges (25), Avatars (17)
- Calendars (34), Tables (30), Sliders (45), Tabs (38)
- Empty States — build premium empty states for all roles

### Tier 2 — Targeted Use

**React Three Fiber + framer-motion-3d**

- Achievements page — 3D rotating trophy/medal on unlock
- Landing page — subtle 3D geometric hero object
- One or two high-impact moments only, not overused

**GSAP**

- Workout execution — set completion animations, rest timer
- Progress page — chart data entrance sequences
- Achievement unlock sequence

**Recharts → Tremor or custom Motion SVG**

- Tremor charts have premium dark-mode defaults
- Custom SVG paths with Motion for fully unique look

### Tier 3 — Design Tools (feed into Claude Code)

- **Google Stitch** — AI UI generator, use for design references
- **v0.dev** — AI component generator, use for first drafts
- **Figma** — layout planning before implementation
- **Framer** — landing page prototyping

---

## PART 2 — PAGE-BY-PAGE UPGRADE PLAN

### RONIN DASHBOARD — 7/10 → 9.5/10

- Stats numbers → `NumberTicker` count-up on load
- Card border → `BorderBeam` on active card
- Button → `ShimmerButton`
- Page entrance → `BlurFade` stagger (greeting → name → stats → button)
- Hero card bg → subtle `Meteors` at very low opacity
- ActionZone card → `WobbleCard` 3D tilt
- Week strip active day → `BorderBeam` border
- Stat cards below fold → `MagicCard` + `NumberTicker` + `AnimatedCircularProgressBar`

### RONIN WORKOUT PLANS — 5/10 → 9/10

- Plan cards → 21st.dev Display Cards (Codehagen/display-cards pattern)
- Hover: card lifts, reveals first 3 exercises
- Active/selected → `BorderBeam`
- Empty state → `LampEffect` + dramatic CTA
- Difficulty badges → animated gradient fill
- Filter tabs → Motion animated underline indicator

### RONIN WORKOUT EXECUTION — 6/10 → 9.5/10

- Set completion → GSAP checkmark draws itself + `NumberTicker`
- Rest timer → `AnimatedCircularProgressBar` pulsing ring
- Progress bar → animated fill with `BorderBeam` at leading edge
- Exercise transitions → `BlurFade` slide between exercises
- Workout complete → full `Confetti` + `SparklesText` on "WORKOUT COMPLETE"

### RONIN PROGRESS — 5.5/10 → 9/10

- Charts → Motion-animated SVG paths (line draws on load) or Tremor
- Stat cards → `BentoGrid` asymmetric layout + `MagicCard` + `NumberTicker`
- Period selector → Motion animated pill indicator
- Personal records → Aceternity `Timeline`

### RONIN ACHIEVEMENTS — 4/10 → 9.5/10

- Unlocked achievement cards → `SparklesText` + `Confetti` on first view
- Locked → `NeonGradientCard` dim glass with lock icon
- XP progress → large `AnimatedCircularProgressBar` ring
- Rank name → `SparklesCore` particles
- Skill visualization → `OrbitingCircles` around center avatar
- All numbers → `NumberTicker` + `BlurFade` entrance

### RONIN SCHEDULE — 5/10 → 8.5/10

- Calendar active day → Motion hover scale + glow
- Event pills → animated entrance
- Upcoming events → `AnimatedList` stagger
- Empty week → better empty state with suggested workout CTA

### RONIN AI COACH — 6/10 → 9/10

- Message entrance → `BlurFade` each bubble
- AI typing → `TypingAnimation` while generating
- AI avatar → pulsing `BorderBeam` ring while active
- Empty state → `BackgroundBeams` + dramatic CTA

### RONIN NUTRITION PLANNER — 6/10 → 8.5/10

- Macro rings → `AnimatedCircularProgressBar`
- Daily total → `NumberTicker`
- Meal cards → `MagicCard` spotlight
- Calorie bar → animated fill on load

### RONIN RECOVERY — 5/10 → 8/10

- Recovery % per muscle → `AnimatedCircularProgressBar`
- Body map → custom SVG human figure with color-coded regions
- Status numbers → `NumberTicker`
- Color coding: recovered=green, fatigued=amber, overloaded=red

### RONIN CALCULATORS HUB — 7/10 → 9/10

- Hub cards → `WobbleCard` 3D tilt
- Active calculator → `BorderBeam`
- Results → `NumberTicker` animated reveal
- Key result → `NeonGradientCard`

### LANDING PAGE — 6.5/10 → 9.5/10

- Hero → `LampEffect` or `BackgroundBeams`
- Heading → `BlurFade` word-by-word reveal
- Role cards → `WobbleCard` + `BorderBeam` on hover
- Feature sections → `TracingBeam` scroll line
- Stats → `NumberTicker` on scroll-into-view
- Testimonials → Motion infinite horizontal marquee
- CTAs → `ShimmerButton`
- Section backgrounds → `Meteors`, `AnimatedGridPattern`, `RetroGrid`

### LOGIN PAGE — 7/10 → 9/10

- Role selector → `MagicCard` spotlight
- Active role → `BorderBeam`
- Submit → `ShimmerButton`
- Background → subtle `Particles` or `FlickeringGrid`

### PRICING PAGE — 5/10 → 9/10

- Recommended plan → `NeonGradientCard`
- Featured plan → `BorderBeam`
- Price on billing toggle → `NumberTicker`
- Feature list → Motion stagger entrance
- CTA → `ShimmerButton`
- Background → `RetroGrid` or `AnimatedGridPattern`

### GURU DASHBOARD — 4.5/10 → 8.5/10

- Stats → `NumberTicker` + `BentoGrid` + `MagicCard`
- Recent clients → `AnimatedList`
- Revenue chart → Motion-animated SVG line
- Empty states → `LampEffect` + "Add your first client" CTA

### GURU CLIENTS — 5/10 → 8.5/10

- Client avatars → `AnimatedTooltip` mini profile on hover
- Cards → `WobbleCard`
- Active client → `BorderBeam`
- Table rows → Motion entrance stagger

### DISCIPLE DASHBOARD — 7/10 → 8.5/10

- Next session card → `BorderBeam`
- Stats → `NumberTicker`
- Trainer card → `MagicCard`
- Session history → `AnimatedList`

---

## PART 3 — IMPLEMENTATION PHASES

### Phase 1 — Foundation ✅ COMPLETED 2026-03-14 (commit 413d760)

**Components installed** (all in `client/src/components/ui/`):

- `number-ticker.tsx` — spring-animated count-up, triggers on scroll-into-view
- `blur-fade.tsx` — blur+fade entrance with configurable direction/delay
- `animated-circular-progress-bar.tsx` — CSS-animated SVG ring, no extra deps
- `border-beam.tsx` — framer-motion `offsetPath` traveling gradient border

**Applied:**

| Component                     | Files changed       | What                                                                      |
| ----------------------------- | ------------------- | ------------------------------------------------------------------------- |
| `NumberTicker`                | `QuickStats.tsx`    | 3 of 4 stats (workouts, streak, PRs) — volume stays string (formatVolume) |
| `NumberTicker`                | `MobileHero.tsx`    | 2 desktop stats (totalWorkouts, streak) — volume & rank stay string       |
| `NumberTicker`                | `ProgressPage.tsx`  | Total Workouts, Total Volume, Total Sets                                  |
| `NumberTicker`                | `Achievements.tsx`  | XP Earned counter                                                         |
| `BlurFade`                    | `SoloDashboard.tsx` | 8 sections, delays 0.05–0.40s                                             |
| `AnimatedCircularProgressBar` | `Achievements.tsx`  | Header unlock % ring (replaces plain text ratio)                          |
| `BorderBeam`                  | `MobileHero.tsx`    | Desktop hero card — **REVERTED** (wrong domain pattern)                   |
| `BorderBeam`                  | `ActionZone.tsx`    | Today's workout card — **REVERTED** (wrong domain pattern)                |

**NOT yet done (still todo for Phase 1 scope):**

- NumberTicker on Guru dashboard stats
- NumberTicker on Disciple dashboard stats
- BlurFade on non-dashboard pages (Workouts, Recovery, Achievements, AI Coach)
- AnimatedCircularProgressBar on Nutrition macros, Recovery muscle groups
- BorderBeam reverted from hero + ActionZone — see design-language.md for correct patterns

> ⚠️ **DESIGN LANGUAGE GATE**: Phases 2–4 below were written before `_brain/notes/design-language.md` was completed. Re-evaluate every component against that document before implementing. The following are explicitly flagged as **SaaS-landing patterns — do not implement in the app**:
>
> - `Confetti` — celebration overkill for a performance/discipline domain
> - `SparklesText` — decorative noise, not earned signal
> - `WobbleCard` — playful 3D tilt conflicts with serious training context
> - `ShimmerButton` — SaaS-marketing CTA, not appropriate for in-app actions
> - `BorderBeam` — too decorative for functional UI cards (hero, workout card)

### Phase 2 — Showcase moments (RE-EVALUATE against design-language.md before starting)

5. Workout execution: set completion + rest timer ring
6. Achievement unlock: motion treatment TBD (Confetti/SparklesText flagged — do not use)
7. Landing hero: LampEffect or BackgroundBeams (landing only, not app interior)
8. Workout Plans: Display Cards

### Phase 3 — Polish (RE-EVALUATE against design-language.md before starting)

9. MagicCard on all major cards
10. WobbleCard — FLAGGED, do not implement
11. ShimmerButton — FLAGGED, do not implement
12. Chart replacements

### Phase 4 — Premium / 3D (RE-EVALUATE against design-language.md before starting)

13. Achievement 3D badge (R3F + framer-motion-3d)
14. Body map SVG for Recovery page
15. TracingBeam on landing scroll
16. OrbitingCircles for achievement visualization

---

## PART 4 — RESOURCES

- [[resources/magicui-components]] — full Magic UI component list
- [[resources/aceternity-components]] — full Aceternity component list
- [[resources/motion-react-docs]] — Motion v12 React docs
- https://21st.dev/community/components — browse live
- https://v0.dev — generate component first drafts
- https://stitch.withgoogle.com — AI UI design references
