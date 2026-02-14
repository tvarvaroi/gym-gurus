# Sprint 8: Media Generation Guide

> Comprehensive reference for all media generation capabilities in GymGurus, covering exercise images, achievement badges, video generation, social media assets, and Open Graph images.

---

## 1. Exercise Image Generation Strategy

### Approach

Use **fal.ai FLUX model** for AI-generated exercise illustrations. FLUX produces high-quality, consistent imagery suitable for fitness instruction content. All images follow a unified visual style that aligns with the GymGurus brand.

### Prompt Template

Use the following prompt template to maintain a consistent style across all generated exercise images:

```
A professional fitness illustration of a person performing [EXERCISE_NAME],
dark charcoal background (#1a1a2e), blue accent lighting (#3b82f6),
clean anatomical form, side-angle view, athletic build,
gym environment with subtle equipment silhouettes,
digital illustration style, high contrast, no text overlays
```

**Variable substitutions:**

- `[EXERCISE_NAME]` — The exercise (e.g., "barbell back squat", "dumbbell lateral raise")
- Adjust `side-angle view` to `front view` or `rear view` depending on the exercise
- For compound movements, emphasize the primary muscle group in the lighting

### Image Specifications

| Use Case       | Format | Dimensions | Quality | Max File Size |
| -------------- | ------ | ---------- | ------- | ------------- |
| Card thumbnail | WebP   | 512x512    | 80%     | 50 KB         |
| Detail view    | WebP   | 1024x1024  | 90%     | 150 KB        |
| Fallback       | SVG    | Scalable   | N/A     | 5 KB          |

### Storage

- **Primary:** Cloudflare R2 bucket with CDN edge caching (or AWS S3 + CloudFront as alternative)
- **Path convention:** `/exercises/{category}/{exercise-slug}-{size}.webp`
- **Cache headers:** `Cache-Control: public, max-age=31536000, immutable`
- **CDN URL pattern:** `https://cdn.gymgurus.app/exercises/chest/bench-press-512.webp`

### Fallback: ExerciseImage Component

The `ExerciseImage` component provides SVG placeholder icons when generated images are unavailable or still loading:

```tsx
<ExerciseImage
  exercise="bench-press"
  category="chest"
  thumbnailUrl={exercise.thumbnailUrl} // CDN URL when available
  size="card" // "card" (512) or "detail" (1024)
  fallback="svg" // SVG icon based on category
/>
```

Category-to-icon mapping:

- **Chest** — horizontal press silhouette
- **Back** — pull-up silhouette
- **Legs** — squat silhouette
- **Shoulders** — overhead press silhouette
- **Arms** — curl silhouette
- **Core** — plank silhouette
- **Cardio** — running silhouette
- **Full Body** — burpee silhouette

### Batch Generation Workflow

1. Define the top 30 exercises in `scripts/exercise-image-manifest.json`
2. Run the batch generation script: `npx tsx scripts/generate-exercise-images.ts`
3. Script calls fal.ai API for each exercise using the prompt template
4. Downloaded images are automatically resized to both 512x512 and 1024x1024
5. Images are uploaded to R2/S3 and the `thumbnailUrl` field is updated in the database
6. Verify output with: `npx tsx scripts/verify-exercise-images.ts`

### Budget Estimate

| Item                 | Count | Cost per Unit | Total      |
| -------------------- | ----- | ------------- | ---------- |
| fal.ai FLUX images   | 30    | $0.03         | $0.90      |
| R2 storage (monthly) | ~15MB | Free tier     | $0.00      |
| CDN bandwidth        | —     | Free tier     | $0.00      |
| **Total setup cost** |       |               | **~$0.90** |

---

## 2. Achievement Badge System

### Approach

Programmatic **SVG badges** rendered via the `AchievementBadgeSVG` component. No external image generation service is needed — all badges are pure inline SVG rendered at runtime.

### Badge Matrix

**5 tiers x 6 categories = 30 unique badge combinations**

| Tier     | Color Palette              | Border Style     |
| -------- | -------------------------- | ---------------- |
| Bronze   | #CD7F32, #A0522D           | Solid, thin      |
| Silver   | #C0C0C0, #A8A8A8           | Solid, medium    |
| Gold     | #FFD700, #DAA520           | Double border    |
| Platinum | #E5E4E2, #B0C4DE, gradient | Gradient glow    |
| Diamond  | #B9F2FF, #7DF9FF, shimmer  | Animated shimmer |

| Category    | Icon Element            |
| ----------- | ----------------------- |
| Strength    | Dumbbell                |
| Endurance   | Heart rate pulse        |
| Consistency | Calendar with checkmark |
| Progress    | Upward arrow/graph      |
| Social      | Connected people        |
| Milestone   | Star/trophy             |

### Component Usage

```tsx
<AchievementBadgeSVG
  tier="gold"
  category="strength"
  unlocked={true}
  size={64} // px, default 64
  animate={true} // trigger unlock animation
/>
```

### Locked vs Unlocked States

- **Locked:** Grayscale filter, 40% opacity, no animation
- **Unlocked:** Full color palette for the tier, optional unlock animation

### Unlock Animation

The unlock animation combines CSS keyframes with Framer Motion:

```css
@keyframes badge-unlock {
  0% {
    transform: scale(0.5);
    opacity: 0;
    filter: brightness(2);
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
    filter: brightness(1.5);
  }
  100% {
    transform: scale(1);
    opacity: 1;
    filter: brightness(1);
  }
}
```

Framer Motion integration for the container:

```tsx
<motion.div
  initial={{ scale: 0.5, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", stiffness: 260, damping: 20 }}
>
  <AchievementBadgeSVG ... />
</motion.div>
```

Diamond tier includes an additional shimmer animation loop on the border.

---

## 3. Remotion Video Proof of Concept

### Setup

Install the required packages:

```bash
npm install remotion @remotion/cli @remotion/renderer @remotion/player
```

### Project Structure

```
client/src/remotion/
  Root.tsx                    # Remotion root with composition list
  compositions/
    ClientProgressRecap.tsx   # 30-second progress recap video
    WorkoutSummary.tsx        # 15-second workout summary video
  components/
    AnimatedStat.tsx          # Number counter animation
    ProgressChart.tsx         # Animated chart component
    ExerciseChecklist.tsx     # Animated checklist with checkmarks
    BrandFrame.tsx            # Consistent brand wrapper
  utils/
    spring-configs.ts         # Shared spring animation configs
    brand-constants.ts        # Colors, fonts, dimensions
remotion.config.ts            # Remotion configuration file
```

### Video Template 1: Client Progress Recap (30 seconds)

**Duration:** 30 seconds at 30fps (900 frames)
**Resolution:** 1080x1920 (vertical/story format)

Timeline:
| Segment | Frames | Duration | Content |
|---------------|-----------|----------|----------------------------------------|
| Intro | 0–90 | 3s | Client name, date range, brand logo |
| Stats | 91–300 | 7s | Animated counters: workouts, volume, PRs |
| Chart | 301–540 | 8s | Animated progress chart (weight/reps) |
| Highlights | 541–750 | 7s | Top 3 achievements with badge icons |
| Celebration | 751–900 | 5s | Confetti particles, motivational text |

### Video Template 2: Workout Summary (15 seconds)

**Duration:** 15 seconds at 30fps (450 frames)
**Resolution:** 1080x1080 (square format)

Timeline:
| Segment | Frames | Duration | Content |
|---------------|-----------|----------|----------------------------------------|
| Header | 0–60 | 2s | Workout name, date, duration |
| Exercises | 61–360 | 10s | Animated checklist with checkmarks |
| Summary | 361–450 | 3s | Total volume, intensity, outro |

### Brand Integration

- **Background:** Dark theme (`#0f0f23` to `#1a1a2e` gradient)
- **Primary accent:** Blue (`#3b82f6`)
- **Secondary accent:** Emerald (`#10b981`)
- **Font:** Playfair Display for headings, Inter for body text
- **Logo:** GymGurus wordmark in top-left corner throughout

### Rendering Strategy

| Environment | Method               | Output Format | Notes                          |
| ----------- | -------------------- | ------------- | ------------------------------ |
| Development | Local Remotion CLI   | MP4 (H.264)   | `npx remotion render`          |
| Preview     | `<Player>` component | In-browser    | Interactive preview in the app |
| Production  | AWS Lambda           | MP4 (H.264)   | `@remotion/lambda` for scale   |

### Estimated Setup Time

- Initial Remotion configuration and project structure: **0.5 day**
- Client Progress Recap template: **1 day**
- Workout Summary template: **0.5 day**
- Testing and polish: **0.5–1 day**
- **Total: 2–3 days**

---

## 4. Social Media Asset Templates

All social media templates are implemented as **React components**, making them reusable with Remotion for animated versions or renderable as static images via `satori` / `@vercel/og`.

### Template Specifications

#### Instagram Post — Workout of the Day

- **Dimensions:** 1080x1080 px
- **Layout:** Exercise name as headline, key stats (sets, reps, rest), exercise illustration, brand footer
- **Style:** Dark background, blue accent bar on left, exercise image centered

#### Instagram Story — Client Transformation

- **Dimensions:** 1080x1920 px
- **Layout:** Before/after stats comparison, progress chart, achievement badges earned, swipe-up CTA
- **Style:** Full-bleed dark gradient, emerald highlights for positive changes

#### Twitter/X — Fitness Tip

- **Dimensions:** 1200x675 px
- **Layout:** Tip headline (large text), supporting detail (smaller), brand logo bottom-right
- **Style:** Dark background, blue accent underline on headline, clean typography

#### LinkedIn — Trainer Success Story

- **Dimensions:** 1200x627 px
- **Layout:** Trainer photo placeholder, client count, key metrics, testimonial quote
- **Style:** Professional dark theme, subtle grid pattern background, gold accents

### Component Pattern

```tsx
<SocialTemplate
  platform="instagram-post"
  data={{
    title: 'Workout of the Day',
    exercise: 'Barbell Back Squat',
    sets: 5,
    reps: 5,
    imageUrl: '/exercises/legs/barbell-back-squat-512.webp',
  }}
/>
```

Each template renders to a `<div>` with exact pixel dimensions, suitable for:

1. Screenshot export from the browser
2. Server-side rendering via satori to PNG
3. Remotion composition for animated versions

---

## 5. OG Image Strategy

### Static OG Images

Pre-generated OG images for key marketing pages:

| Page     | Image Content                           | File Path                 |
| -------- | --------------------------------------- | ------------------------- |
| Homepage | GymGurus logo, tagline, dark background | `/public/og/home.png`     |
| Pricing  | Plan comparison visual, pricing tiers   | `/public/og/pricing.png`  |
| Features | Feature icon grid, brand colors         | `/public/og/features.png` |

**Specifications:** 1200x630 px, PNG format, brand colors (`#0f0f23` background, `#3b82f6` accents), clean sans-serif text.

### Dynamic OG Images

Generated on-the-fly for calculator result pages and user-specific content.

**Technology:** `@vercel/og` (built on satori + resvg-wasm) for Edge Runtime rendering, or standalone `satori` for non-Vercel deployments.

#### Calculator OG Images

When users share calculator results, a dynamic OG image is generated:

```
/api/og/calculator?type=bmi&value=22.5&category=Normal
/api/og/calculator?type=1rm&exercise=bench-press&weight=225
/api/og/calculator?type=strength&level=intermediate&exercise=squat
```

Each generates a 1200x630 image with:

- Calculator type and result prominently displayed
- Visual indicator (gauge for BMI, bar chart for strength standards)
- GymGurus branding and URL
- Call-to-action: "Calculate yours at gymgurus.app"

### Meta Tag Implementation

```tsx
<Head>
  <meta property="og:image" content={ogImageUrl} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content={ogImageUrl} />
</Head>
```
