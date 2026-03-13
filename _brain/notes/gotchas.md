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

---

## Image Processing

**`@imgly` background removal: pass raw buffer only.**
Any pre-processing (normalize, CLAHE, modulate, linear, sharpen) before `removeBackground()` confuses the ML model and produces grainy artifacts. The model is trained on natural photos. Pass `req.file.buffer` directly.

**`sharp .trim()` strips transparent edges after background removal.**
After `removeBackground()` returns a PNG with transparent background, `.trim()` removes the transparent padding so the subject fills its natural bounding box. Do this before storing.

---

## CSP / Security

**`chart.tsx` uses `dangerouslySetInnerHTML` for a `<style>` tag.**
This is why `styleSrc: ["'self'", "'unsafe-inline'"]` stays in the Helmet CSP config. Removing `unsafe-inline` from `styleSrc` breaks chart styling. `scriptSrc` has `unsafe-inline` removed — it uses nonces instead.

---

## Database

**Migrations path is `server/migrations/` not `drizzle/migrations/`.**
The Drizzle config points to `server/migrations/`. Do not create files in `drizzle/migrations/`.

**20 DB tables have no Drizzle schema definition (§DB-5).**
`shared/schema.ts` only defines 13 of 33+ tables. Running `drizzle-kit generate` without fixing this will produce DROP TABLE diffs for the unmanaged tables. See §DB-5 in CLAUDE.md for the full list.

---

## Related Notes

- [[decisions]]
- [[file-upload-pipeline]]
- [[auth-system]]
