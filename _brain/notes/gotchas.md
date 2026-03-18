# Gotchas

Hard-won lessons. Check this before touching anything.

---

## Layout

**`overflow-y: auto` on main clips `position: absolute` children with translate transforms.**
If a dropdown, tooltip, or floating element disappears at the scroll container boundary, the culprit is `overflow-y: auto` on a parent. Move the element outside the scroll container or use a portal.

**`w-auto` images inside `absolute` containers overflow their parent.**
Always pair `w-auto` with `max-w-[...]` or use a fixed-width wrapper with `overflow-hidden`.

**`flex justify-between` with dynamic text overflows on narrow cards.**
Multi-word labels (e.g. muscle names from DB) will overflow. Use `flex flex-wrap gap-1` + `flex-1 min-w-0` on the label + `flex-shrink-0` on badges.

**Fixed heights `h-[Npx]` clip dynamic content.**
Use `min-h-[Npx]` for content containers. Only use fixed `h-[Npx]` on chart containers (recharts requires it), skeletons, and decorative elements.

**Empty state conditions must check ALL data states.**
If a component has both `completed` and `planned` data, the empty state condition must be `!hasCompleted && !hasPlanned` — not just `!hasCompleted`.

---

## Access Codes

**`client_access_codes.clientId` has a UNIQUE constraint — one row per client ever.**
The DB constraint (`CONSTRAINT client_access_codes_client_id_unique UNIQUE("client_id")`) allows only ONE row per client. The original `createAccessCodeForClient()` tried to deactivate the old row then INSERT a new one — unique-constraint violation on any second call. Fixed by switching to `INSERT ... ON CONFLICT (client_id) DO UPDATE` upsert (2026-03-15).

**Never use deactivate-then-insert for access-code regeneration.**
Because of the unique constraint above, any "soft-delete and re-insert" pattern for `client_access_codes` will break after the first regeneration. Always use upsert.

---

## API / Routes

**Never pass user ID as a path segment to list endpoints.**
`fetch('/api/clients/${user?.id}')` hit the SPA catch-all and returned HTML, causing `JSON.parse` to throw `"Unexpected token '<'"`. Use `fetch('/api/clients')` — auth middleware identifies the user. Fixed in §BE-7.

**Triple isPublicRoute pattern → now single source in routeConfig.ts.**
Previously three independent `isPublicPage` lists (AppLayout, UserContext, queryClient.ts) had to stay in sync. Now: one file, `client/src/lib/routeConfig.ts`. Add new public routes only there.

---

## Build / Deploy

**Railway Nixpacks can serve stale builds after small commits.**
A trivial whitespace-only follow-up push forces a clean rebuild. If a deploy looks wrong despite the code being correct, push again.

**`console.log` blocked by ESLint in client files.**
Use `console.warn` or `console.error`. The pre-commit hook will reject commits with `console.log`.

---

## Styling

**`bg-primary` is role-aware — never hardcode colour overrides on role-specific components.**
`bg-primary` reads from `--primary` CSS var which changes per role (gold/purple/teal). Hardcoding `bg-[#c9a84c]` or `bg-violet-500` breaks the role colour system. Use `bg-primary text-primary-foreground` always.

**Semantic greens are intentional — don't replace them in brand audits.**
Green is correctly used for: success/completion states (workout set done, achievement unlocked), health indicators (BMI healthy range, heart rate Zone 3, recovery ≥80%), validation pass (password strength, form consent), and data series differentiation (muscle groups: legs=green, back=blue, bicep=purple). Only replace green when it's used as a UI accent/decoration unrelated to meaning. See Sprint 2 audit in `design-upgrade-plan.md` for the full categorization.

---

## Image Processing

**`@imgly` background removal: pass raw buffer only.**
Any pre-processing (normalize, CLAHE, modulate, linear, sharpen) before `removeBackground()` confuses the ML model and produces grainy artifacts. The model is trained on natural photos. Pass `req.file.buffer` directly.

**`sharp .trim()` strips transparent edges after background removal.**
After `removeBackground()` returns a PNG with transparent background, `.trim()` removes the transparent padding so the subject fills its natural bounding box. Do this before storing.

---

## CSP / Security

**`chart.tsx` uses `dangerouslySetInnerHTML` for a `<style>` tag — handled with nonce.**
`ChartStyle` reads the per-request nonce from `<meta name="csp-nonce">` (injected by the server via `{{NONCE}}` replacement) and passes `nonce={nonce}` to the `<style>` element. Both `scriptSrc` and `styleSrc` now use nonces only — neither has `unsafe-inline`.
`styleSrcAttr: ["'unsafe-inline'"]` is a separate directive covering React's `style=""` attributes on DOM elements. This is safe — style attributes cannot execute JavaScript.

**`unsafe-inline` must stay in `styleSrcAttr` (not `styleSrc`).**
React and recharts render `style={{ ... }}` as inline `style=""` attributes. These need `styleSrcAttr: ["'unsafe-inline'"]`. Removing it breaks rendering across the whole app. It's safe to leave because style attributes have no code execution path.

---

## Database

**Migrations path is `server/migrations/` not `drizzle/migrations/`.**
The Drizzle config points to `server/migrations/`. Do not create files in `drizzle/migrations/`.

**20 DB tables have no Drizzle schema definition (§DB-5).**
`shared/schema.ts` only defines 13 of 33+ tables. Running `drizzle-kit generate` without fixing this will produce DROP TABLE diffs for the unmanaged tables. See §DB-5 in CLAUDE.md for the full list.

---

---

## Magic UI / Third-Party UI Components

**`npx shadcn@latest add magicui/...` does NOT work — 404.**
The shadcn CLI registry does not host Magic UI components. Fetch source directly from GitHub:

```
gh api repos/magicuidesign/magicui/contents/apps/www/registry/magicui/<component>.tsx --jq '.download_url' | xargs curl -s
```

Then manually write to `client/src/components/ui/`.

**Magic UI components are written for Next.js (App Router) + Tailwind v4 + `motion/react`.**
GymGurus uses Vite + Tailwind v3 + `framer-motion` v11. Required adaptations for every component:

1. Remove `"use client"` directive at the top (not needed in Vite)
2. Change all `import ... from "motion/react"` → `import ... from "framer-motion"`
3. Tailwind v4 utilities that need replacing:
   - `bg-linear-to-l` → `bg-gradient-to-l`
   - `border-(length:--border-beam-width)` → inline CSS `style={{ borderWidth: ... }}`
   - `mask-[...]`, `mask-intersect`, `[mask-clip:...]` → inline CSS (these are v4-only)
4. The `useInView` `margin` option has a type mismatch in framer-motion v11 — cast as `any`: `useInView(ref, { once: true, margin: "0px" } as any)`

**`BorderBeam` uses CSS `offsetPath` for the traveling dot animation.**
The `offsetPath: rect(0 auto auto 0 round ${size}px)` syntax requires browser support for CSS Motion Path. Supported in all modern browsers (Chrome 116+, Firefox 116+, Safari 17+). The parent card MUST have `position: relative` + `overflow: hidden` + `rounded-[inherit]` for the beam to clip correctly.

**`NumberTicker` only accepts `number`, not `string`.**
`formatVolume(kg)` returns a string (e.g. `"1.2k"` for large values). Do NOT pass formatted strings to NumberTicker. For volume stats, either: (a) pass the raw `kg` number and show `kg` as a suffix span, or (b) keep the string value and render it as plain text alongside other NumberTicker stats.
Implementation pattern used in QuickStats and MobileHero:

```tsx
{ numericValue: workoutsThisWeek, displayValue: null }  // → NumberTicker
{ numericValue: null, displayValue: formatVolume(vol) }  // → plain span
```

**`AnimatedCircularProgressBar` renders its own percentage text by default.**
The component renders `{currentPercent}` inside a centered span. When using it as a visual ring with custom inner content, wrap the component in `relative` and overlay an `absolute inset-0` div for custom label content. Hide the built-in span by overlapping it — or modify the component to accept `children`.

**`BlurFade` wraps children in a `motion.div` — watch for flex/grid layout interference.**
`BlurFade` renders a `<div>` wrapper around children. If you apply `BlurFade` to a grid child or flex item, the outer div becomes the grid/flex item. Use `className` prop on `BlurFade` to pass `flex-1`, `col-span-*`, etc. through to the wrapper div.

---

## Charts / Data Visualization

**`react-body-highlighter` is CJS-only — Vite handles it via dependency optimizer.**
The package has `main: "dist/index.js"` (CJS with `process.env.NODE_ENV` check) and no `module`/`exports` field. Vite's dep optimizer pre-bundles it fine. No special config needed. The SVG body model data lives in `dist/assets/` and gets inlined into the chunk (~29kB in Recovery bundle).

**`ZoneBandChart` SVG: zone band rects must render before the data path.**
SVG renders in document order (no z-index). Zone band `<rect>` elements must appear before the `<path>` in the SVG markup, otherwise the colored bands will cover the data line.

**Catmull-Rom spline needs ≥2 data points to render a curve.**
The `ZoneBandChart` component handles single-point datasets by rendering a standalone dot instead of attempting a path. Check `data.length < 2` before calling the spline interpolation function.

---

## Exercise / Workout Data

**`workoutSetLogs` has no `userId` column — join through `workoutSessions`.**
To query a user's set logs for a specific exercise, you must `INNER JOIN workoutSessions` on `workoutSetLogs.sessionId = workoutSessions.id` and filter by `workoutSessions.userId`. Direct `WHERE userId = ?` on `workoutSetLogs` will fail.

**All IDs in `exercises`, `workoutSessions`, `workoutSetLogs` are `varchar` (UUIDs), not integers.**
Don't `parseInt()` exercise or session IDs from URL params. Use them as strings directly with `eq(exercises.id, exerciseId)`.

**`/exercises` page is trainer-only — solo users get "Access Denied".**
Solo exercise history is accessed via `/solo/exercises/:id/history` route, not the `/exercises` page. Links from `ExercisesPage.tsx` exercise cards go to the solo route.

---

## Routes Architecture (Sprint 5, 2026-03-15)

**Route files are mounted at `/api` with full sub-paths, not at specific prefixes.**
The Sprint 5 extracted routers (clients, dashboard, onboarding, assignments, progress) are mounted at `/api` and define full paths like `/clients`, `/dashboard/stats`, etc. inside the router. This is because routes under the same domain span multiple prefixes (e.g., `/api/clients/:id/workouts` vs `/api/client/workouts/weekly`). Clean-prefix routers (exercises at `/api/exercises`, workouts at `/api/workouts`, appointments at `/api/appointments`) use relative paths.

**`secureAuth` is applied at the mount point for Sprint 5 routers.**
Rate limiting middleware (apiRateLimit, strictRateLimit, writeRateLimit) is applied per-route inside each router. Don't double-apply `secureAuth` in route handlers.

**`server/types/express.d.ts` augments Express Request with `user: User` and `session`.**
After Sprint 5, use `req.user!.id` (non-null assertion — `secureAuth` guarantees it exists) instead of `(req.user as any).id`. The `session` type includes `userId`, `destroy()`, and `Record<string, unknown>`.

---

## Middleware Registration Order (Sprint 6, 2026-03-16)

**`notFoundHandler` must be mounted at `/api` only, not at `/`.**
Mounting `notFoundHandler` at `/` would catch the SPA catch-all route (`res.sendFile('index.html')`) and return JSON 404s for client-side routes. Use `app.use('/api', notFoundHandler)` so only unmatched API routes get the JSON 404 — client-side routes still fall through to the SPA handler.

**`errorHandler` must be registered AFTER all routes AND after `notFoundHandler`.**
Express error handlers (4-arg middleware) must be the last `app.use()` call. The order is: routes → `notFoundHandler` → `errorHandler` → static/SPA serving.

**`requestLogger` generates a UUID per request and sets `X-Request-Id` header.**
The request ID is stored in a `WeakMap` keyed by the request object. Use `getRequestId(req)` from `./middleware/requestLogger` to retrieve it in any downstream handler. The error handler uses this automatically for Sentry context.

---

## Related Notes

- [[decisions]]
- [[file-upload-pipeline]]
- [[auth-system]]
