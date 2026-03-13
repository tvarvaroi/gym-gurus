# Stack — Frontend

Self-contained reference for every frontend library in use.

## Core Framework

- **React** `^18.3.1` — UI library. Concurrent features enabled.
- **Vite** `^5.4.19` — build tool and dev server. Config in `vite.config.ts`.
- **TypeScript** `5.6.3` — strict mode. Pre-existing errors in storage.ts and test helpers — do not block on these.

## Styling

- **Tailwind CSS** `^3.4.17` — utility-first. Config in `tailwind.config.ts`.
- **shadcn/ui** — component library built on Radix. Components live in `client/src/components/ui/`. **Do not edit these files.**
- **Fonts** — Playfair Display (headings), Inter (body). Loaded via Google Fonts in index.html.

## Routing

- **wouter** `^3.3.5` — lightweight React router. Used instead of React Router.
  - Route definitions live in `client/src/components/RouterConfig.tsx`
  - Public vs protected routes managed via `client/src/lib/routeConfig.ts`

## Data Fetching

- **TanStack Query** `@tanstack/react-query ^5.60.5` — server state management.
  - All API calls go through `useQuery` / `useMutation`
  - Auth state: always use `useUser()` from `UserContext` — never a standalone `useQuery`
  - Query keys match the API path: `['/api/solo/stats']`

## Animation

- **framer-motion** `^11.18.2` — present in ~60 files after partial cleanup.
  - `useReducedMotion()` hook guards all animations
  - Ongoing effort to replace with Tailwind `animate-*` classes where motion is trivial

## State

- **React Context** — `UserContext` is the canonical auth state.
  - `useUser()` is the only correct way to read auth state on the client.

## Related Notes

- [[auth-system]]
- [[role-system]]
