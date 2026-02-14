# GymGurus — Brand & Design Guide

## Design Direction
Dark premium fitness aesthetic. Professional, not flashy. Confident, not aggressive.
Think: luxury gym meets modern SaaS — clean lines, purposeful contrast, data-driven feel.

---

## Color System

### Core Palette
| Role | Color | Hex | HSL | Usage |
|---|---|---|---|---|
| Primary | Electric Blue | `#3B82F6` | `217 91% 60%` | CTAs, active states, primary buttons, links |
| Secondary | Emerald | `#10B981` | `160 84% 39%` | Success states, progress indicators, positive metrics |
| Background | Charcoal | `#1F2937` | `215 28% 17%` | Main app background |
| Background Dark | Deep Charcoal | `#111827` | `217 33% 12%` | Page background, deepest layer |
| Surface | Slate | `#1E293B` | `217 33% 17%` | Cards, panels, elevated surfaces |
| Danger | Rose | `#F43F5E` | `347 77% 60%` | Errors, destructive actions, warnings |
| Warning | Amber | `#F59E0B` | `38 92% 50%` | Caution states, expiring items |

### Role-Specific Colors
| Role | Color | Hex | Usage |
|---|---|---|---|
| Trainer Accent | Gold | `#C9A855` | Trainer-specific UI, premium tier badges |
| Client Accent | Teal | `#0D9488` | Client-specific UI, client cards |
| Solo Accent | Electric Blue | `#3B82F6` | Solo user UI, gamification |

### Neutral Scale (Dark Mode)
| Token | Hex | HSL | Usage |
|---|---|---|---|
| `neutral-950` | `#0A0A0A` | `0 0% 4%` | Deepest background |
| `neutral-900` | `#111827` | `217 33% 12%` | Page background |
| `neutral-800` | `#1F2937` | `215 28% 17%` | App background |
| `neutral-700` | `#374151` | `218 20% 27%` | Borders, dividers |
| `neutral-600` | `#4B5563` | `215 14% 34%` | Muted text, placeholders |
| `neutral-500` | `#6B7280` | `220 9% 46%` | Secondary text |
| `neutral-400` | `#9CA3AF` | `218 11% 65%` | Body text |
| `neutral-300` | `#D1D5DB` | `216 12% 84%` | Primary text |
| `neutral-200` | `#E5E7EB` | `220 13% 91%` | Headings |
| `neutral-100` | `#F3F4F6` | `220 14% 96%` | Bright text, emphasis |

---

## Typography

### Font Stack
| Role | Font | Fallback | Usage |
|---|---|---|---|
| Headings | **Inter** (Bold 700) | system-ui, sans-serif | Page titles, section headers, card titles |
| Body | **Inter** (Regular 400) | system-ui, sans-serif | Paragraphs, descriptions, labels |
| Data/Stats | **JetBrains Mono** | Menlo, monospace | Calculator numbers, stats, metrics, streaks |

### Type Scale
| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| Display | 3rem (48px) | 800 | 1.1 | Landing page hero |
| H1 | 2.25rem (36px) | 700 | 1.2 | Page titles |
| H2 | 1.875rem (30px) | 700 | 1.25 | Section headers |
| H3 | 1.5rem (24px) | 600 | 1.3 | Card titles |
| H4 | 1.25rem (20px) | 600 | 1.4 | Subsection headers |
| Body Large | 1.125rem (18px) | 400 | 1.6 | Intro paragraphs |
| Body | 1rem (16px) | 400 | 1.5 | Default text |
| Body Small | 0.875rem (14px) | 400 | 1.5 | Secondary text, labels |
| Caption | 0.75rem (12px) | 500 | 1.4 | Timestamps, badges, hints |
| Stat | 2rem+ (32px+) | 700 | 1.1 | Dashboard numbers (JetBrains Mono) |

---

## CSS Variables (Theme Tokens)

### Recommended Dark Theme Variables
```css
:root {
  /* Brand colors */
  --brand-primary: 217 91% 60%;        /* #3B82F6 Electric Blue */
  --brand-secondary: 160 84% 39%;      /* #10B981 Emerald */
  --brand-danger: 347 77% 60%;         /* #F43F5E Rose */
  --brand-warning: 38 92% 50%;         /* #F59E0B Amber */
  --brand-trainer: 43 48% 56%;         /* #C9A855 Gold */
  --brand-client: 174 86% 29%;         /* #0D9488 Teal */

  /* Fonts */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', Menlo, Consolas, monospace;
}

.dark {
  --background: 217 33% 12%;           /* #111827 */
  --foreground: 220 14% 96%;           /* #F3F4F6 */
  --card: 217 33% 17%;                 /* #1E293B */
  --card-foreground: 220 13% 91%;      /* #E5E7EB */
  --border: 218 20% 27%;              /* #374151 */
  --muted: 215 14% 34%;               /* #4B5563 */
  --muted-foreground: 218 11% 65%;    /* #9CA3AF */
  --primary: 217 91% 60%;             /* #3B82F6 */
  --primary-foreground: 0 0% 100%;    /* #FFFFFF */
  --secondary: 160 84% 39%;           /* #10B981 */
  --secondary-foreground: 0 0% 100%;  /* #FFFFFF */
  --destructive: 347 77% 60%;         /* #F43F5E */
  --destructive-foreground: 0 0% 100%;/* #FFFFFF */
  --ring: 217 91% 60%;                /* #3B82F6 */
}
```

### Tailwind Config Extensions
```typescript
// tailwind.config.ts — extend theme.colors
{
  brand: {
    blue: '#3B82F6',
    emerald: '#10B981',
    gold: '#C9A855',
    teal: '#0D9488',
    rose: '#F43F5E',
    amber: '#F59E0B',
  },
  trainer: {
    DEFAULT: '#C9A855',
    light: '#D4B86A',
    dark: '#B89744',
    subtle: 'rgba(201, 168, 85, 0.1)',
    border: 'rgba(201, 168, 85, 0.3)',
  },
  client: {
    DEFAULT: '#0D9488',
    light: '#14B8A6',
    dark: '#0F766E',
    subtle: 'rgba(13, 148, 136, 0.1)',
    border: 'rgba(13, 148, 136, 0.3)',
  },
}
```

---

## Component Tokens

### Border Radius
| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 3px | Small badges, tags |
| `radius-md` | 6px | Inputs, buttons |
| `radius-lg` | 9px | Cards, modals |
| `radius-xl` | 16px | Feature cards, hero sections |
| `radius-full` | 9999px | Avatars, pills, badges |

### Spacing Scale
Based on 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

### Shadow Scale (Dark Mode)
| Token | Value | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle elevation |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.3)` | Cards |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.3)` | Dropdowns, popovers |
| `shadow-premium` | `0 10px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)` | Featured cards |
| `shadow-glow-blue` | `0 0 20px rgba(59,130,246,0.3)` | Active/focused primary elements |
| `shadow-glow-gold` | `0 0 20px rgba(201,168,85,0.2)` | Trainer premium elements |

---

## Glass Morphism
Used on landing page overlays and premium UI surfaces:
```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

## Current vs Target State

> **Note:** The current CSS variables (in `client/src/index.css`) use Gold/Amber (`HSL 43 48% 56%`) as `--primary` and Teal (`HSL 174 86% 29%`) as `--secondary`. The target brand direction moves primary to Electric Blue (`#3B82F6`) with Emerald (`#10B981`) as secondary. The Gold/Amber and Teal colors are retained as role-specific accents for Trainer and Client contexts respectively.
>
> Migration from current to target colors is planned for Sprint 4 (Frontend Design).

---

## Logo & Identity
- Logo: "GymGurus" wordmark in Inter Bold
- Icon: Stylized dumbbell + brain/AI motif (TBD)
- Favicon: Blue square with white "G" lettermark
- Always display on dark backgrounds for maximum impact

## Photography & Imagery
- Style: High-contrast, dramatic lighting, real athletes (not stock photo models)
- Treatment: Slight desaturation, dark vignette edges
- Exercise library: Clean white-background illustrations or photos with consistent framing
- Avoid: Neon colors, busy backgrounds, overly muscular bodybuilder imagery

## Iconography
- Style: Lucide icons (already in use via shadcn/ui)
- Size: 16px (inline), 20px (buttons), 24px (navigation), 32px+ (feature icons)
- Color: Inherit from text color or use brand accent colors
