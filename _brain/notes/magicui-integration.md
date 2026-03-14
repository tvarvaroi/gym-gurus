# Magic UI Integration

How Magic UI components are installed and adapted for GymGurus (Vite + Tailwind v3 + framer-motion v11).

---

## How to Install a New Magic UI Component

**Step 1 — Fetch source from GitHub:**

```bash
gh api repos/magicuidesign/magicui/contents/apps/www/registry/magicui/<component-name>.tsx \
  --jq '.download_url' | xargs curl -s
```

**Step 2 — Write to `client/src/components/ui/<component-name>.tsx`**

**Step 3 — Apply these adaptations every time:**

1. Remove `"use client"` at the top
2. `import ... from "motion/react"` → `import ... from "framer-motion"`
3. Fix `useInView` margin type: `useInView(ref, { once: true, margin: "0px" } as any)`
4. Replace Tailwind v4 utilities with v3 equivalents or inline CSS (see gotchas.md)
5. Replace `"` with `'` and `  ` with spaces for ESLint consistency (lint-staged auto-fixes on commit)

**Step 4 — Run `npm run build` to verify no errors before committing**

---

## Installed Components (as of 2026-03-14)

### `number-ticker.tsx`

- **Source:** `apps/www/registry/magicui/number-ticker.tsx`
- **Deps:** `framer-motion` (useInView, useMotionValue, useSpring) — already installed
- **Usage:** `<NumberTicker value={42} className="text-2xl font-bold" />`
- **Notes:**
  - Value must be a `number` — cannot accept formatted strings like "1.2k"
  - Animates from `startValue` (default 0) to `value` on scroll-into-view
  - Uses spring physics (damping: 60, stiffness: 100) — smooth deceleration
  - `decimalPlaces` prop for float display
  - Formats with `Intl.NumberFormat("en-US")` — adds commas for thousands

### `blur-fade.tsx`

- **Source:** `apps/www/registry/magicui/blur-fade.tsx`
- **Deps:** `framer-motion` — already installed
- **Usage:** `<BlurFade delay={0.1}><YourComponent /></BlurFade>`
- **Notes:**
  - Renders a `motion.div` wrapper — can affect flex/grid layout (use `className` prop)
  - Default: fades in from below with 6px blur, 0.4s duration
  - `delay` prop adds to the base 0.04s built-in delay
  - `inView` prop (default false) — set to `true` to trigger only when scrolled into view
  - On the dashboard, used without `inView` (page load only, not scroll-triggered)

### `animated-circular-progress-bar.tsx`

- **Source:** `apps/www/registry/magicui/animated-circular-progress-bar.tsx`
- **Deps:** None (pure CSS SVG animation)
- **Usage:**
  ```tsx
  <AnimatedCircularProgressBar
    value={75} // current value
    max={100} // max value
    gaugePrimaryColor="hsl(var(--primary))"
    gaugeSecondaryColor="hsl(var(--muted))"
    className="size-20" // controls physical size
  />
  ```
- **Notes:**
  - CSS custom property animation — transitions happen on mount via `--transition-length: 1s`
  - Default `className` is `size-40` (160px) — always override with `size-20` etc.
  - Renders built-in `{currentPercent}` label — overlay custom content with absolute positioning
  - Works 0–100; values > 90 hide the secondary arc (gap logic)
  - `gaugePrimaryColor` / `gaugeSecondaryColor` accept any CSS color string (hsl, hex, rgba)

### `border-beam.tsx`

- **Source:** `apps/www/registry/magicui/border-beam.tsx`
- **Deps:** `framer-motion` — already installed
- **Usage:**
  ```tsx
  // Parent MUST have: relative overflow-hidden rounded-*
  <div className="relative rounded-2xl overflow-hidden border border-border/20">
    <BorderBeam
      size={80}
      duration={5}
      colorFrom="hsl(var(--primary))"
      colorTo="rgba(255,255,255,0.05)"
      borderWidth={1}
    />
    {/* card content */}
  </div>
  ```
- **Notes:**
  - Uses CSS `offsetPath: rect(...)` — supported Chrome 116+, Firefox 116+, Safari 17+
  - Our implementation simplified from Tailwind v4 original — uses inline CSS for masking
  - The gradient travels in a loop around the card perimeter
  - `colorFrom` is the bright/leading color; `colorTo` is the trailing/fade color
  - Keep `duration` between 4–8s for subtle elegance; faster looks cheap
  - `delay` is inverted (`delay: -delay` in framer-motion) to start the animation mid-loop

---

## Where Each Component is Used

| Component                     | File                                    | Notes                                      |
| ----------------------------- | --------------------------------------- | ------------------------------------------ |
| `NumberTicker`                | `redesign/dashboard/QuickStats.tsx`     | Workouts, Streak, PRs stats                |
| `NumberTicker`                | `redesign/dashboard/MobileHero.tsx`     | Desktop hero: Total Workouts, Streak       |
| `NumberTicker`                | `pages/ProgressPage.tsx`                | Total Workouts, Total Volume, Total Sets   |
| `NumberTicker`                | `pages/solo/Achievements.tsx`           | XP Earned                                  |
| `BlurFade`                    | `pages/solo/SoloDashboard.tsx`          | 8 sections, 0.05–0.40s stagger             |
| `AnimatedCircularProgressBar` | `pages/solo/Achievements.tsx`           | Unlock % ring in header stats              |
| `BorderBeam`                  | ~~`redesign/dashboard/MobileHero.tsx`~~ | REVERTED 2026-03-14 — wrong domain pattern |
| `BorderBeam`                  | ~~`redesign/dashboard/ActionZone.tsx`~~ | REVERTED 2026-03-14 — wrong domain pattern |

> **Domain note:** `BorderBeam` is a decorative SaaS-landing pattern. GymGurus app interior uses performance/discipline language — traveling gradient borders on functional cards conflict with that. Re-evaluate against `design-language.md` before using in app interior.

---

## Phase 2 Components — DO NOT INSTALL (flagged as wrong domain)

The following were originally planned but are flagged as SaaS-landing patterns incompatible with GymGurus app interior:

- `confetti.tsx` — overkill celebration for a discipline/performance domain
- `sparkles-text.tsx` — decorative noise, not earned signal
- `typing-animation.tsx` — may still be appropriate for AI Coach; evaluate against design-language.md first

Fetch pattern: same GitHub API approach, same adaptation checklist.

---

## Related Notes

- [[notes/gotchas]] — Magic UI section has detailed trouble-shooting
- [[notes/design-upgrade-plan]] — full phase plan with page-by-page component mapping
- [[resources/magicui-components]] — full component list
