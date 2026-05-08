# Sprint 6 — Two Products (Coaching Dialogue + The Mirror) — Vision

> **Date authored:** 2026-05-08
> **Status:** BATCH 1 + BATCH 2 LOCKED. Brainstorm HARD GATE closed 2026-05-08 with 30 calls across 6 sections. Sprint 6 grew from 11 → 13 batches with two new insertions: BATCH 3.5 (set_comments) + BATCH 4.5 (WorkoutExecution Hevy-bar UX). BATCH 3 schema work cleared to dispatch.
> **Predecessor:** Sprint 5 (Apple Health XML Import) shipped 2026-05-08, commit `13fcc83`.
> **BATCH 2 brainstorm output:** see `_brain/notes/decisions.md` Sprint 6 BATCH 2 entries (11 substantive architectural decisions). Consolidated decision log archived in BATCH 2 commit message.

> **For agentic workers:** this is a vision doc + locked-refinements spec. It answers _why_ and _what_. Step-by-step _how_ lands in BATCH 3+ implementation plans. **BATCH 2 lock means no further re-litigation of the 30 calls in `decisions.md` Sprint 6 BATCH 2 section.** New design questions surface as BATCH 3+ implementation discoveries; refinements update this doc + decisions.md.

---

## 1. Why this sprint is structurally different

The May 2026 sprint arc (Sprints 1–5) built the data substrate — biometrics, notifications, wellness, wearables foundation, Apple Health import. Each sprint expanded the data lake or the engagement pipe. They were _additive infrastructure_ sprints.

Sprint 6 is the first sprint that asks a different question: _what is GymGurus actually for?_ The answer that fell out of the kickoff brainstorm is that GymGurus is not one product with three roles. It's two products with three roles.

- **Product A — The Coaching Dialogue.** Guru ↔ Disciple. Two humans in a relationship mediated by data. The data isn't the point. The implicit conversation through data _is_ the point. Trainer notices client's HRV dropped. Client logs poor sleep. Trainer adjusts tomorrow's workout _with reasoning_. Client trusts more. Loop tightens. The differentiator: **NOT another task-assignment platform.** A coaching dialogue platform where data IS the conversation.

- **Product B — The Mirror.** Ronin alone. One person in a relationship with themselves, mediated by AI. The dashboard is a daily essay about who you've been, who you are, who you're becoming. AI is the inner voice trained on your patterns. The differentiator: **NOT a fitness tracker, NOT an AI workout coach.** The narrative of self.

Treating Disciple as "Ronin with a trainer-share toggle" was structurally wrong. It produced an IA where the Disciple sidebar duplicated Ronin's self-tracking surfaces (Body, Wellness, Progress, Schedule) but flagged half of them with a "your trainer can see this" toggle. The right framing is: Disciple's primary surface is _the relationship with their Guru_. Self-tracking exists to feed that relationship.

This sprint restructures the IA, builds the coaching dialogue surfaces, and rebuilds the Ronin home as a five-chapter scroll narrative.

---

## 2. Core thesis (locked from kickoff brainstorm)

GymGurus is two products, not three roles. The role determines which product the user is in.

| Role                        | Product                       | Primary surface                                                    |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| **Guru** (DB: `trainer`)    | Product A — Coaching Dialogue | Today (triage) → per-Disciple Story tab                            |
| **Disciple** (DB: `client`) | Product A — Coaching Dialogue | Today (assigned + check-in + coach msg) → Coach (the relationship) |
| **Ronin** (DB: `solo`)      | Product B — The Mirror        | Home (the five-chapter scroll) → AI Coach                          |

The role accents (gold / teal / purple) stay. The role display names stay. The CSS variable system stays. What changes is the IA, the surfaces, and the data flows that bind Guru ↔ Disciple together.

---

## 3. The five Guru-Disciple patterns (Product A's unique selling point)

Each pattern has a **concept** (what makes it differentiated), a **schema dependency** (what BATCH 3 must add), and an **implementation surface** (the exact files/components BATCH 5–9 will land in).

### 3.1 Pattern 1 — Two-Way Mirror

**Concept:** every data surface visible to both sides carries a "your coach sees this / last viewed by your client on [date]" annotation. Mutual visibility into mutual visibility. The Disciple knows the Guru is paying attention. The Guru knows whether the Disciple has seen recent updates.

**Schema dependency:** new `data_view_log` table — `(viewer_user_id, viewed_user_id, surface, timestamp)`. Lightweight; one row per (viewer, viewee, surface) with `last_viewed_at` upsert semantics, not a full activity log. ~four indexes (PK, partial UNIQUE on `(viewer_user_id, viewed_user_id, surface)`, idx on `(viewed_user_id, surface)` for the reverse query, idx on `viewer_user_id` for the user's own audit).

**Implementation surface:**

- Server: new `server/services/dataViewLogService.ts` exporting `recordView(viewerUserId, viewedUserId, surface)` and `getLastView(viewerUserId, viewedUserId, surface)`. Called from each shared-data route's GET handler post-auth.
- Client: tiny shared `<LastViewedAnnotation viewedUserId={...} surface="biometrics|wellness|progress|workouts|story" />` primitive in `client/src/components/coaching/LastViewedAnnotation.tsx`. Reads from `useLastView()` hook.
- Surfaces it appears on:
  - Disciple's `/biometrics`, `/wellness`, `/progress`, `/workouts` pages, top-right of the page header
  - Guru's `/clients/:id` Story / Plan / Body / Wellness tabs, top-right of the tab content
- The annotation is informational only (no celebration, no "your coach is online now"). Sub-3-second polite presence.

**Anti-pattern (don't do this):** adding a real-time "your coach is viewing this right now" indicator. That creates surveillance dynamics and Pattern 1 is about _trust_, not _presence_. The annotation is asynchronous and historical: "last viewed 2 days ago" not "viewing right now."

### 3.2 Pattern 2 — Compliance with Compassion

**Concept:** when a Disciple misses a workout or breaks a streak, the Guru's surface presents it WITH context (recent wellness, HRV trend, sentiment from notes, last sleep score). Compliance is a signal, not a verdict. The Guru never sees "Disciple X missed 3 workouts" without also seeing "Disciple X's HRV has been low for 5 days." The point is the trainer adjusts care, not enforces compliance.

**Schema dependency:** none new. Reads from existing `daily_wellness_log`, `daily_vitals`, `sleep_sessions`, `workout_assignments`, `body_metrics`. Aggregation is server-side per-Disciple, computed on demand for the triage view.

**Implementation surface:**

- Server: existing `/api/dashboard/needs-attention` endpoint (returns `alerts: [{clientId, clientName, reason, severity, lastSession}]`, `Dashboard.tsx:37`) **enriches its response shape** to include `context: {recentWellness, hrvTrend, lastSleepScore, sentiment, recentNote}`. Logic in `server/routes/dashboard.ts` or a new `server/services/triageService.ts`.
- Client: new `/today` Guru route. New `client/src/pages/GuruToday.tsx`. The current `NeedsAttentionCard` (`client/src/components/Dashboard.tsx:37`) is the seed — it gets promoted to the page-level component with full triage UI and context-rendering chips.
- The new `/today` becomes the Guru's `/dashboard` redirect target — when a Guru hits `/dashboard`, they land on `/today`. The current Guru Dashboard cards (DashboardHero / DashboardStatCards / DashboardCharts / GuruWeekStrip) move to a "Business" view OR retire.

**Existing seed code to extend, not replace:** `Dashboard.tsx:37` `NeedsAttentionCard` already reads from `/api/dashboard/needs-attention`. Sprint 6 enriches the API response and the card UI; doesn't tear down and rebuild.

### 3.3 Pattern 3 — Adjustment with Reasoning

**Concept:** when a Guru changes a Disciple's program (drops an exercise, swaps a workout, lowers volume), the Disciple sees both the change AND the reason ("removed deadlifts this week — your back fatigue scores have been elevated"). Trust + education through transparency. Without reasoning, every change is an arbitrary command. With reasoning, every change is coaching.

**Schema dependency:** new `program_change_log` table — `(id, program_enrollment_id OR workout_assignment_id, guru_user_id, disciple_user_id, change_type, reason_text, payload_diff_json, created_at)`. The polymorphic FK (program_enrollment_id XOR workout_assignment_id) follows the Sprint 1 polymorphic pattern; CHECK constraint enforces XOR. `change_type` is a closed enum (`exercise_removed`, `exercise_swapped`, `volume_adjusted`, `workout_skipped`, `program_paused`, `note_added`).

**Implementation surface:**

- Server: existing program/workout edit endpoints in `server/routes/programsRouter.ts`, `server/routes/workoutsRouter.ts`, `server/routes/assignments.ts` extend their Zod input schemas to accept optional `reasonText` (max 500 chars). On commit, write the change_log row. Notification dispatch fires from BATCH 7 onward.
- Client: new `<ProgramChangeBanner change={...} />` component in `client/src/components/coaching/ProgramChangeBanner.tsx`. Renders at the top of the Disciple's program/workout view when there's an unread change. Auto-marks-read on view (writes to `data_view_log` per Pattern 1).
- The Coaching Timeline (Pattern 5) reads `program_change_log` rows as one of its event sources.

**Anti-pattern (don't do this):** making `reasonText` required. Coaching is human; sometimes a Guru just adjusts a number and the reasoning is "I just know." Required reasoning would either produce noise ("changed because") or block legitimate quick edits. Optional with a strong UI nudge ("Add a reason — your client values context").

### 3.4 Pattern 4 — Shared Goal Hierarchy

**Concept:** Guru and Disciple see the same goal, the same target chart, the same milestone progress. Today the Guru and Disciple have separate mental models — the Guru thinks "client wants to lose 10kg by summer" but the Disciple just sees workouts assigned. When goals are shared, the _why_ of every workout is visible to both sides.

**Schema dependency:** new `client_goals` table — `(id, client_id, guru_user_id, disciple_user_id, title, description, target_metric, target_value, target_date, current_value, status, created_at, completed_at, deleted_at)`. Guru-writable, Disciple-readable. Soft-delete via `deleted_at`. `target_metric` is a closed enum tied to existing data sources (`weight_kg`, `body_fat_percentage`, `total_volume_kg`, `streak_days`, `1rm_kg_for_exercise:<id>`, `custom`). `current_value` updated by a periodic recompute from the relevant data table — not stored on every write.

**Implementation surface:**

- Server: new `server/routes/clientGoals.ts` with 5 routes: `GET /api/clients/:id/goals`, `POST /api/clients/:id/goals` (Guru only), `PATCH /api/clients/:id/goals/:goalId` (Guru only), `DELETE /api/clients/:id/goals/:goalId` (Guru only soft-delete), `GET /api/disciple/goals` (Disciple's own view of their goals). IDOR mutation tests on every route — the Disciple's `GET /api/disciple/goals` body-spoof shape mirrors Sprint 5's INSERT pattern.
- Client: new `client/src/components/coaching/GoalHierarchyView.tsx` — a vertical list of goals with progress bars. Surfaced in:
  - Guru's `/clients/:id` Story tab (writable)
  - Disciple's `/coach` page (read-only)
- Goal completion flows through Sprint 2's notification dispatcher: `goal_achieved` notification type to both sides.

### 3.5 Pattern 5 — Coaching Timeline

**Concept:** unified chronological event stream per Disciple. Workouts completed, wellness check-ins, body metric logs, photos, messages from Guru, program changes (Pattern 3), goal updates (Pattern 4). Default tab on Guru's per-Disciple view. The story of the relationship, not just the numbers.

**Schema dependency:** none new. The timeline is a _read_ aggregator across many existing tables. Data sources, in priority order:

1. `workout_assignments` (assigned + completed events)
2. `daily_wellness_log` (check-in events)
3. `body_metrics` (current user_id-keyed body data)
4. `progress_entries` **(legacy clientId-keyed entries — read indefinitely; do NOT migrate during Sprint 6)**
5. `program_change_log` (Pattern 3)
6. `client_goals` create/complete events (Pattern 4)
7. `progress_photos`
8. (future: messages from Guru — message system not in Sprint 6 scope)

**`progress_entries` read-both decision (LOCKED):** the Coaching Timeline reads from BOTH `progress_entries` (legacy clientId-keyed) AND `body_metrics` (current user_id-keyed). It does NOT migrate `progress_entries` data forward into `body_metrics` as a Sprint 6 side-effect.

Rationale: migrating legacy data is its own sprint with its own correctness gates, dedupe rules, and rollback risk. Doing it as a Sprint 6 side-effect creates blast radius proportional to the legacy data volume × the new Coaching Timeline aggregation logic. Reading both indefinitely is cheap (unioned query with `UNION ALL` and a `source_table` discriminator column in the aggregator response), and the legacy column count is small (~rows-per-active-Disciple-pre-Sprint-1 × pre-Sprint-1 active Disciples). If a future sprint needs single-table semantics for performance reasons, that's its own proposal.

**Implementation surface:**

- Server: new `server/services/coachingTimeline.ts` exporting `getTimeline(clientId, opts: {cursor, limit, types?})`. Uses cursor-based pagination on `(timestamp, source_table, source_id)`. Returns `events: TimelineEvent[]` where each event carries `{kind, timestamp, payload, sourceTable, sourceId}`. Aggregation is per-page — never load the full history into memory.
- New `server/routes/timeline.ts` with `GET /api/clients/:id/timeline?cursor=...&limit=20`. Guru-only (the route checks `req.user.role === 'trainer'` AND that the trainer owns the client, via the existing `requireTrainerOwnership` middleware pattern).
- Client: new `client/src/components/coaching/CoachingTimeline.tsx` — infinite scroll, event-typed rendering (each event kind has a small renderer card), date grouping ("Today" / "Yesterday" / "This week" / "Earlier in May" / etc).
- Default tab on Guru's `/clients/:id` page (Sprint 6 BATCH 6) is "Story" which renders the Coaching Timeline.

**Anti-pattern (don't do this):** building this as a write-time event log table that every domain service emits to. That couples write-time correctness across the whole codebase to a denormalized audit table — a future schema change to any source table risks breaking the timeline view. Read-time aggregation is the right shape.

---

## 4. The Ronin Home — five-chapter scroll narrative (Product B)

A scroll, not a grid. A reading experience, not a dashboard. The current `SoloDashboard.tsx` (`client/src/pages/solo/SoloDashboard.tsx`) is a stack of cards (MobileHero + ActionZone + WellnessHintCard + QuickStats + WeekStrip + WeeklyOverview + StreakCalendar + RecoveryBodyStatus + BodyIntelligencePanel + WidgetScroller + RecentActivityFeed). Sprint 6 replaces it with a five-chapter scroll narrative on the same `/dashboard` route.

This is a **replacement**, not a parallel route. Existing components are largely **absorbed** into the new chapters with reframing:

### Chapter 1 — Today

Date in Playfair Display. AI-generated subtitle responsive to user state ("You're rested. Today is for hard work." / "You showed up yesterday. Today's a recovery day."). One CTA: today's primary action.

**Absorbs:** ActionZone, WellnessHintCard.
**New:** the AI subtitle generator (server-side, tiny model call, cached per user-day).

### Chapter 2 — The Week So Far

Horizontal day-by-day visual narrative. Each day a small column with: workout completion dot, wellness check-in icon, sleep stage strip (when wearable connects, post-Sprint-4-resumption), one-line note if user wrote one.

**Absorbs:** WeekStrip, QuickStats.
**Retires:** WeeklyOverview (desktop) — its data flows into the chapter's denser horizontal layout.

### Chapter 3 — The Trend

Composite radar (you-today vs you-30d-ago) on 6 axes (training volume, sleep, energy, soreness, body weight, consistency). Below the radar: a delta table showing each axis in numbers. Below that: AI-generated insight one-paragraph.

**Absorbs:** RecoveryBodyStatus, BodyIntelligencePanel.
**New:** the composite radar component (BATCH 4 chart primitive), the delta table, the AI insight generator.

### Chapter 4 — The Long Arc

Vertical timeline annotated with milestones (PRs, body composition shifts, wellness streak peaks, program completions). Wellness check-in notes echoed back at their date. Tap any milestone to expand the original entry.

**Absorbs:** RecentActivityFeed, StreakCalendar.
**New:** the annotated timeline component (BATCH 4 chart primitive), milestone detection logic.

### Chapter 5 — The Quiet

Single rotating element. One of: AI-generated quote in the user's own voice (trained on their wellness notes), a quote from the user's own past self ("You wrote this 3 months ago: ..."), or a gentle prompt ("How are you feeling today? Add a note."). Wellness check-in entry point.

**New:** the rotation logic, the quote-from-past-self retrieval, the integrated wellness check-in.

**Component retirement:** WidgetScroller (compact quick-access nav) retires — the sidebar IS the nav now. Sprint 6's IA simplifies the Ronin sidebar to 5 items, which makes WidgetScroller redundant.

**Anti-pattern (don't do this):** turning chapters into routes. The whole point is that Ronin Home is a reading experience — sectioning it into separate routes destroys the narrative. Anchor links (`#today`, `#week`, `#trend`, `#arc`, `#quiet`) for deep-linking are fine, but the page is one scroll.

---

## 5. The layered design model — narrative + visual + tabular

Three layers, each scaled to the surface:

| Layer                   | Voice                                                | When                                                                                            |
| ----------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Layer 1 — Narrative** | The diary voice, AI insight, "the why"               | Ronin Home Chapter 5, AI Coach responses, program change reasoning, wellness check-in headlines |
| **Layer 2 — Visual**    | Charts, radars, sparklines, the shape of the data    | Ronin Home Chapters 2–4, Disciple Coach view, Guru Today triage cards, Guru per-client tabs     |
| **Layer 3 — Tabular**   | Grids, tables, raw numbers when comparing or sorting | Guru client roster, Coaching Timeline filtering, Disciple/Ronin My Story sortable views         |

The model isn't either/or. A surface can have all three. Guru's per-client Story tab: narrative event stream (Layer 1) + body composition stacked area chart (Layer 2) + sortable workout adherence table (Layer 3). The point is _intentional layering_, not picking one.

---

## 6. Chart inventory — eight types, library split

Eight chart types. No new dependencies. Library decisions:

| Chart                                                    | Library                               | Rationale                                                                                                 |
| -------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Calendar Heatmap (mood/compliance/sleep)                 | Custom SVG                            | Recharts has no heatmap primitive; the GitHub-contribution-grid shape is small enough for hand-rolled SVG |
| Composite Radar (you today vs 30d ago)                   | Recharts `RadarChart`                 | Dual-series radar is a built-in pattern                                                                   |
| Sparkline Row (inline tiny charts in tables)             | Custom SVG                            | Recharts is heavy for a 60×16 inline glyph; lightweight SVG is the right tool                             |
| Stacked Area (body composition, sleep stages)            | Recharts `AreaChart` with stackId     | Native stacked areas                                                                                      |
| Annotated Timeline (milestones overlaid on metric trend) | Recharts `LineChart` + `ReferenceDot` | Built-in annotation primitives                                                                            |
| Correlation Scatter (sleep vs energy, HRV vs RPE)        | Recharts `ScatterChart`               | Native scatter                                                                                            |
| Sortable Client Roster Table                             | shadcn `Table` + sort state           | Not a chart — tabular data                                                                                |
| Adherence Gantt (program timeline blocks color-coded)    | Custom SVG                            | Recharts doesn't model Gantt; SVG rectangles by week × day are a 30-line component                        |

**Decision (LOCKED):** no new chart library dependency. **No d3.** Recharts is already installed (`^2.15.2`) and proven in the codebase (ProgressPage, BodyMetricsTrends, WellnessMiniTrend). Custom SVG is the fallback for the 2 chart types recharts can't model cleanly. Adding d3 would buy theoretical capability we don't need (no force-directed graphs, no geo, no chord diagrams) at the cost of bundle size.

**Component location:** all 8 primitives live in a new `client/src/components/charts/sprint6/` directory in BATCH 4. They are _primitives_ — opinionated about visual style, agnostic about data source. Pages in BATCH 5–10 supply data via props.

**Existing chart components stay where they are:** `ZoneBandChart` (Sprint 3 ACWR-specific), `MuscleRadarChart` / `ProgressLineChart` / `VolumeBarChart` (`charts/`) — these remain. Sprint 6 doesn't consolidate or refactor existing charts; it adds primitives.

---

## 7. IA restructure — sidebar simplification, route preservation

**Critical finding from BATCH 1 reconnaissance:** the IA restructure is largely a sidebar concern. Pages stay where they are. Routes stay reachable. What changes is the menu hierarchy and a few new top-level routes.

### 7.1 Guru sidebar — 13 → 5 items

| Before                                                                                                                                                   | After                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Dashboard, My Clients, Workout Plans, Programs, Exercise Library, Calculators, Body, Wellness, Schedule, AI Coach, Nutrition Planner, Payments, Settings | **Today, Clients, Programming, Schedule, Business** |

- **Today** → new `/today` route, lands on `GuruToday.tsx` (Pattern 2 triage). Becomes the Guru's `/dashboard` redirect target.
- **Clients** → existing `/clients` and `/clients/:id` routes. Per-client view restructures to 6 tabs (Story / Plan / Body / Wellness / Photos / Notes — see BATCH 6).
- **Programming** → parent menu item. Sub-items (in collapsed dropdown OR as tabs on a new `/programming` page): Workout Plans (`/workouts`), Programs (`/programs`), Exercise Library (`/exercises`), Premium Calculators (`/dashboard/calculators`).
- **Schedule** → existing `/schedule`.
- **Business** → existing `/payments` + the retired Guru Dashboard cards (DashboardStatCards / DashboardCharts) move here as a secondary view. New `/business` route lands on a `BusinessView.tsx` that aggregates them.

**Removed from Guru sidebar:** Body, Wellness, AI Coach, Nutrition Planner, standalone Calculators (the public calculators stay public-routed; the premium calculators land under Programming). Rationale: a Guru using the trainer-tool surface tracks _clients_, not themselves. If a Guru wants to log their own body metrics, they switch contexts (out of scope for v1).

### 7.2 Disciple sidebar — 9 → 5 items

| Before                                                                                         | After                                         |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Dashboard, My Workouts, Programs, My Progress, Calculators, Body, Wellness, Schedule, Settings | **Today, My Plan, My Story, Coach, Settings** |

- **Today** → new role-aware view at `/dashboard` for Disciple. Renders today's assigned workout + wellness check-in prompt + most recent coach message. New `DiscipleToday.tsx`.
- **My Plan** → existing `/workouts` (the Disciple's `WorkoutPlans` view) + integrated program view. Adjustment banner from Pattern 3 lands here.
- **My Story** → new `/my-story` route. Tabs: Body (subsumes `/biometrics`), Wellness (subsumes `/wellness`), Photos (existing PhotosTab), Activity (placeholder for post-Sprint-4-resumption wearable data). Routes `/biometrics` and `/wellness` stay reachable as deep-links + redirect to the appropriate `/my-story` tab.
- **Coach** → new `/coach` route. The relationship surface. Renders: shared goals (Pattern 4 read-only), recent program changes (Pattern 3), latest message from Guru (placeholder for future message system), Apple Health import status (subsumed from current `/settings?tab=imports`).
- **Settings** → existing `/settings`.

**Removed from Disciple sidebar:** Calculators (public calc routes stay reachable; premium calculators are a Ronin/Guru feature), standalone Body / Wellness / Schedule (Body + Wellness consolidate into My Story; Schedule moves to Coach view as "Upcoming sessions"). Rationale: the Disciple has a _human_ coach. Calculators and standalone analytics dilute the relationship surface.

### 7.3 Ronin sidebar — 14 → 5 items

| Before                                                                                                                                                                | After                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Dashboard, AI Coach, Generate Workout, Nutrition Planner, My Workouts, Programs, My Progress, Recovery, Achievements, Calculators, Body, Wellness, Schedule, Settings | **Home, AI Coach, Training, My Story, Settings** |

- **Home** → existing `/dashboard` route, replaced with the five-chapter scroll (see Section 4).
- **AI Coach** → existing `/solo/coach` + absorbs Generate Workout (`/solo/generate`), Nutrition Planner (`/solo/nutrition`), Recovery insights. AI is one entity with multiple lenses, not three separate menu items. Recovery's per-muscle anatomy diagram stays (it's the visual layer for the coach context); Recovery as a _standalone metric page_ retires.
- **Training** → new `/training` route. Tabs: Workouts (existing `/workouts`), Programs (existing `/programs`), Execution (existing `/workout-execution/:id` deep-links). Three timescales of one thing.
- **My Story** → mirrors Disciple's My Story (Body / Wellness / Photos / Activity / Achievements). Achievements absorbs the existing `/solo/achievements` page.
- **Settings** → existing `/settings`.

**Removed from Ronin sidebar:** standalone Generate Workout, Nutrition Planner, Recovery, Achievements, Calculators, Body, Wellness, Schedule, My Progress, My Workouts, Programs (all absorbed into the 5 above).

### 7.4 Routing decision (LOCKED): pages stay reachable

Every existing page route in `RouterConfig.tsx` stays reachable. The sidebar change is a _menu_ change, not a route change. The benefit: deep-links from old emails/bookmarks/notifications keep working. The cost: a small amount of duplicated navigation paths (a Ronin can reach `/workouts` from sidebar Training tab AND from a deep-link). Acceptable.

**New top-level routes Sprint 6 introduces:**

- `/today` (Guru triage view)
- `/coach` (Disciple relationship surface)
- `/my-story` (Disciple + Ronin merged data narrative — same component, role-aware)
- `/business` (Guru retired-dashboard catch-all)
- `/training` (Ronin training timescales)
- `/programming` (Guru programming hub — optional, may render as menu dropdown only)

**No routes are deleted in Sprint 6.** Page retirements are sidebar-level only.

---

## 8. Schema additions (BATCH 2 LOCKED — three migrations across three batches)

Three Sprint 6 migrations, each its own scope, dispatched at the relevant batch:

| Migration                                   | BATCH     | Scope                                                                                                |
| ------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| **017** `017_coaching_relationship_data.ts` | BATCH 3   | `client_goals` + `program_change_log` + `data_view_log` + `clients.share_wellness_with_trainer` flag |
| **018** `018_set_comments.ts`               | BATCH 3.5 | `set_comments` table (substrate for comments-on-sets + Pattern 5 Coaching Timeline)                  |
| **019** `019_user_exercise_notes.ts`        | BATCH 4.5 | `user_exercise_notes` table (per-user-per-exercise persistent notes for WorkoutExecution)            |

All additive — no DDL changes to existing tables beyond the single `clients.share_wellness_with_trainer` column. Sprint 5's 014/014.5/014.6 split discipline is the precedent.

### 8.1 `client_goals` (migration 017)

```
id, client_id (FK clients.id ON DELETE CASCADE),
guru_user_id (FK users.id), disciple_user_id (FK users.id),
title, description,
category (enum: 'physique'|'strength'|'endurance'|'wellness'|'behavioral'|'custom'),
custom_category_label (text, nullable — only set when category='custom'),
target_metric (enum), target_value (numeric),
target_date (date), current_value (numeric),
status (enum: 'active'|'completed'|'paused'|'abandoned'),
created_at, completed_at, deleted_at
```

Flat structure (no `parent_goal_id` self-FK in v0). Five fixed categories cover ~95% of real goals; `custom` as escape hatch with separate `custom_category_label` text column (keeps the enum clean for queries; custom users get a free-text label without polluting the enum).

Indexes: `(client_id, status)`, `(disciple_user_id, status)`, `deleted_at` for soft-delete filter.

### 8.2 `program_change_log`

```
id,
program_enrollment_id (nullable FK), workout_assignment_id (nullable FK),
guru_user_id (FK users.id), disciple_user_id (FK users.id),
change_type (enum: 'exercise_removed'|'exercise_swapped'|'volume_adjusted'|'workout_skipped'|'program_paused'|'note_added'),
reason_text (varchar 500, nullable), payload_diff (jsonb),
created_at, viewed_at (nullable — Pattern 1 read-tracking)
```

CHECK constraint: `(program_enrollment_id IS NOT NULL) OR (workout_assignment_id IS NOT NULL)` (XOR, mirrors `progress_entries` polymorphic pattern from Sprint 1).

Indexes: `(disciple_user_id, viewed_at)` for unread-banner queries, `(program_enrollment_id, created_at DESC)` and `(workout_assignment_id, created_at DESC)` for timeline lookup.

### 8.3 `data_view_log`

```
id, viewer_user_id (FK users.id), viewed_user_id (FK users.id),
surface (varchar 32), last_viewed_at
```

UNIQUE on `(viewer_user_id, viewed_user_id, surface)` — upsert, not append. The "log" name is a misnomer for a state table; kept for the conventional connotation of "tracking".

Indexes: PK + the UNIQUE + idx on `(viewed_user_id, surface)` for the reverse query.

### 8.4 `clients.share_wellness_with_trainer` BOOLEAN NOT NULL DEFAULT true (migration 017)

Verified absent in current schema. The other 5 share\_\*\_with_trainer flags exist (body, sleep, hrv, activity, photos). Wellness completes the granular consent set for Sprint 6's coaching surfaces. Default-on follows the established pattern.

### 8.5 `set_comments` (migration 018, BATCH 3.5)

```
id, set_id (FK workout_set_logs.id ON DELETE CASCADE),
author_user_id (FK users.id),
parent_comment_id (FK self-FK, nullable, depth=1 enforced),
text_content (text, max 2000 chars),
media_urls (text[] of R2 keys, max 3 enforced at API),
read_at (timestamp, nullable — Pattern 1 read-tracking),
created_at, updated_at
```

**Threading depth=1 enforced at TWO layers**: Zod validation at API boundary asserts `parent_comment_id` references a top-level comment (own `parent_comment_id IS NULL`); plus DB-level CHECK constraint for belt-and-suspenders. Implementation: BATCH 3.5 schema-author picks between (a) `depth INTEGER CHECK (depth IN (0, 1))` column with insert trigger, or (b) subquery-based CHECK — whichever drizzle expresses cleanly.

**Media**: TEXT[] of R2 keys, max 3 enforced at API boundary via Zod `.max(3)`. MIME allowlist `image/jpeg, image/png, video/mp4, video/quicktime` (audio voice notes deferred). 50MB per-file cap. R2 lifecycle on comment deletion uses Sprint 2 `userDeletion`-style audit-first ordering.

Indexes: `(set_id, created_at)` for set-detail view, `(author_user_id, read_at) WHERE read_at IS NULL` partial for unread inbox queries.

### 8.6 `user_exercise_notes` (migration 019, BATCH 4.5)

```
id, user_id (FK users.id ON DELETE CASCADE),
exercise_id (FK exercises.id ON DELETE CASCADE),
note_text (text, max 2000 chars),
is_private (boolean NOT NULL DEFAULT false),
created_at, updated_at ($onUpdate)
```

UNIQUE on `(user_id, exercise_id)` — one note per (user, exercise) pair, upsert semantics. Multi-note structure deferred (if demand surfaces, future sprint drops UNIQUE + adds order_index).

Default coach-visible (`is_private=false`); per-note privacy toggle when sensitive. Coach view filters private rows out entirely (no placeholder — performance-anxiety risk).

Two indexes (PK + UNIQUE).

**No CHECK or FK changes to existing tables across all three migrations.** Each migration is purely additive.

---

## 9. progress_entries — read-both, do not migrate (LOCKED)

Already documented in Section 3.5 Pattern 5. Lifting it out as a standalone decision because it's load-bearing for BATCH 5/6 implementation:

**Decision:** Coaching Timeline reads from BOTH `progress_entries` (legacy clientId-keyed) AND `body_metrics` (current user_id-keyed). It does NOT migrate `progress_entries` data forward into `body_metrics` as a Sprint 6 side-effect.

**Rationale:**

- Migrating legacy data is its own sprint with its own correctness gates (dedupe rules, value-unit normalization, lossy-coercion handling, rollback playbook). A Sprint 6 side-effect doesn't get those gates.
- The legacy column count is small (~rows-per-active-Disciple-pre-Sprint-1 × pre-Sprint-1 active Disciples). Reading both indefinitely is cheap.
- The aggregator response carries a `sourceTable: 'progress_entries' | 'body_metrics'` discriminator so the UI can render legacy entries with a small "(pre-Sprint-1 entry)" annotation if it ever matters. v1 doesn't surface the distinction; the field is for future-proofing.
- If a future sprint needs single-table semantics for performance, that's its own proposal with its own migration plan and verifier phases.

**Counter-considered:** migrate during BATCH 3 alongside the schema additions. Rejected: BATCH 3 ships migration 017 with three new tables + one consent flag. Adding a data migration to that scope amplifies blast radius and complicates rollback. Keep migrations additive; data movement is its own thing.

---

## 10. Load-bearing inconsistencies — DO NOT undo

The codebase has accumulated several inconsistencies that look like bugs but are deliberate. Sprint 6 introduces several more. This section catalogs both. Future cleanup passes that "harmonize" any of these will re-introduce a problem an earlier sprint deliberately solved.

### 10.1 Inherited (do not undo in Sprint 6)

| Inconsistency                                                                                     | Why it's load-bearing                                                                                                                           | Source decision                                                                                                                                    |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| AppSidebar wellness icon `HeartPulse`, Recovery icon `Heart`                                      | Adjacent menu items would look duplicated with two `Heart` glyphs back-to-back                                                                  | decisions.md "Wellness icon: HeartPulse, not Heart" (Sprint 3 BATCH 6)                                                                             |
| WellnessHintCard absent on Guru dashboard (present on Ronin + Disciple)                           | Guru's mental model is "what do my clients need," not "how am I feeling"; the role-shape is intentional                                         | decisions.md (Sprint 3 BATCH 6); inline `DO NOT add the card to Dashboard.tsx Guru branch` comment in `WellnessHintCard.tsx`                       |
| ReadinessHero animation timing tiers (1200ms first-time vs 600ms returning)                       | Friction-vs-delight is streak-aware; harmonizing breaks the reveal pacing                                                                       | decisions.md "Streak-aware animation timing" (Sprint 3 BATCH 5); inline `DO NOT harmonize` comment in `ReadinessHero.tsx`                          |
| `progress_entries` polymorphic XOR (userId XOR clientId, never both)                              | Polymorphic single table avoided per-role table proliferation; CHECK constraint enforces the invariant at DB layer                              | decisions.md "progressEntries polymorphic refactor" (Sprint 1); see schema CHECK `progress_entries_user_or_client_check`                           |
| `clients.id` is NOT FK to `users.id` — Disciple linkage by email                                  | Clients can exist as non-registered prospects; FK would force registration before adding to roster                                              | gotchas.md "clients.id is NOT a FK to users.id"; Sprint 4 added `clients.user_id` FK _alongside_ the email linkage, not as a replacement           |
| Photos NEVER trainer-visible regardless of consent flag in v1                                     | Photos are highest-sensitivity biometric data; deserve granular per-photo consent (a future sprint), not a single boolean                       | decisions.md "shareBodyMetricsWithTrainer default-on, single boolean" (Sprint 1); reinforced by Sprint 1.5 BATCH 1 photos-by-client route deletion |
| `expectOwnershipClause` defined inline per test file, NOT extracted to shared helper              | The pattern is small enough that copy-paste is the discipline; a shared helper would couple test files in ways that mask drift                  | decisions.md "IDOR mutation testing pattern as architectural invariant"; originated in `server/test/routes/biometrics.test.ts`                     |
| Three /dashboard role-dispatch indirections (HomePage → Dashboard → ClientDashboard for Disciple) | Each layer has a distinct responsibility (route → role detection → role-specific render); flattening would require a single 600-line dispatcher | RouterConfig.tsx pattern, established Sprint 5 routes split                                                                                        |

### 10.2 New for Sprint 6 (introduce with `DO NOT undo` comments)

When BATCH 5–10 lands these patterns, the call sites get inline `DO NOT undo` comments with rationale.

| New Sprint 6 inconsistency                                                                                                                 | Why it must stay                                                                                                                                                | Comment site                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Coaching Timeline reads `progress_entries` AND `body_metrics` indefinitely (Section 9)                                                     | Migration is its own scope; read-time aggregation is cheaper than risk-bearing data movement                                                                    | `server/services/coachingTimeline.ts` header comment + `DO NOT consolidate to body_metrics-only without separate migration plan` |
| Pattern 1 `data_view_log` is read-time-aggregator-style (UPSERT on (viewer, viewee, surface)), NOT append-only event log                   | The use case is "when did the coach last look", not "what's the audit trail of every view." Append-only would explode row count for zero product value          | `server/services/dataViewLogService.ts` header + `DO NOT promote to append-only without product justification`                   |
| Pattern 3 `reason_text` is OPTIONAL on every program edit endpoint                                                                         | Required reasoning produces noise ("changed because"); optional with UI nudge respects coaching workflow                                                        | Inline comment at each program/workout/assignment edit handler when accepting the field                                          |
| Ronin Home replaces `SoloDashboard.tsx` on the same `/dashboard` route, NOT a parallel route                                               | Chapter narrative ≠ separable routes; deep-linkability via anchors only                                                                                         | `client/src/pages/solo/RoninHome.tsx` header + `DO NOT split chapters into separate routes`                                      |
| New `/today`, `/coach`, `/my-story`, `/business`, `/training` are added BUT no existing routes are deleted                                 | Deep-links from emails/notifications/bookmarks must keep working                                                                                                | RouterConfig.tsx comment block above the new routes section                                                                      |
| Guru `/dashboard` redirects to `/today`, but `/dashboard` stays a valid URL                                                                | Old in-app links + the AppSidebar "Today" item both work without restructuring every link                                                                       | RouterConfig.tsx redirect implementation comment                                                                                 |
| Sidebar Body / Wellness items are removed from Guru BUT `/biometrics` and `/wellness` routes stay reachable for cross-role deep-links      | Access via URL is preserved; Guru's _menu_ simplifies to client-focus                                                                                           | AppSidebar.tsx removal comment block citing the routes-stay-reachable invariant                                                  |
| Programming hub on Guru sidebar is a parent dropdown OR a `/programming` page (BATCH 7 decides; both are valid)                            | Decision is BATCH 7 implementation detail, not a vision lock. Either shape preserves the routes                                                                 | BATCH 7 plan                                                                                                                     |
| **(B2)** `set_comments.parent_comment_id` self-FK enforced depth=1 at TWO layers (Zod + DB CHECK)                                          | Nested threads change inbox UX significantly (badge counting, deep-link rendering, conversation grouping). Belt-and-suspenders prevents drift                   | `shared/schema.ts` `set_comments` header + DB CHECK constraint name `set_comments_depth_check`                                   |
| **(B2)** `URGENT_COMMENT_KEYWORDS` is a single named constant at `shared/constants/coachingTriage.ts`, NOT inline in rendering logic       | Discoverable + tunable + future per-coach customization without hunting across files                                                                            | `shared/constants/coachingTriage.ts` header comment                                                                              |
| **(B2)** Comment composer offline drafts via IndexedDB is scoped to comments only, NOT general offline-first execution                     | Partial wedge captures 80% of offline value at 10% of cost; full offline-first execution is its own sprint                                                      | `client/src/lib/commentDrafts.ts` header comment + `DO NOT scope-creep into general offline-first`                               |
| **(B2)** Coach inbox lives inside `/today`, NOT as a standalone sidebar item                                                               | Adding "Inbox" sidebar item breaks 5-item lock + creates false competition between Today triage and Inbox for first-glance attention                            | `client/src/pages/GuruToday.tsx` structure comment                                                                               |
| **(B2)** Plate calculator: standard barbell only (45lb / 20kg); icon only renders for barbell-tagged exercises                             | "Ship nothing rather than ship wrong numbers" — Smith machine counterbalance varies per gym; defaulting to barbell semantics produces wrong answers             | `client/src/components/execution/PlateCalculator.tsx` header comment                                                             |
| **(B2)** RPE/RIR column default OFF for all users; Coach view shows whatever Disciple logged regardless of Disciple's display toggle       | Beginners don't understand RPE; UI clutter without value. Coach data presence drives Coach UI, not Disciple's display toggle                                    | `client/src/pages/WorkoutExecution.tsx` RPE column conditional comment                                                           |
| **(B2)** Exercise-level note `is_private=true` rows filtered ENTIRELY from Coach view (no `[private note]` placeholder)                    | Placeholder would create performance-anxiety risk ("Coach knows there's something but can't read it"). Filtered = Coach has zero awareness, Disciple has agency | `client/src/components/coaching/ExerciseNoteCard.tsx` filter comment                                                             |
| **(B2)** ProgramBuilder `/programs/builder/:id` replaced in-place; legacy at `/programs/builder-legacy/:id` for one sprint as escape hatch | Two parallel pages dilute the new mental model; single sprint of legacy URL preserves rollback path without long-term maintenance burden                        | `client/src/components/RouterConfig.tsx` legacy URL comment                                                                      |
| **(B2)** Two progression schemes only (double-progression + RPE-target); JSONB shape additive, no DDL                                      | Discipline of scope; validates UI pattern with 2 before scaling. JSONB additive = future schemes ship without migration                                         | `program_weeks.days[].exercises[].progressionScheme` field with comment in `shared/schema.ts`                                    |
| **(B2)** Voice-of-Ronin narrative cache key includes `${modelVersion}` suffix                                                              | Clean cache invalidation on model upgrade (Haiku 4.5 → Haiku 5 etc.); zero stale-output risk after deploy                                                       | `server/services/narrativeService.ts` cache key construction comment                                                             |
| **(B2)** Recovery engine reads from existing wearable schema source-agnostically                                                           | Forward-proof for Sprint 4 wearable resumption — zero engine code changes when `source='whoop'`/`'garmin'`/`'oura'` rows appear                                 | `server/services/recoveryEngine.ts` header comment + `DO NOT add source-specific branches`                                       |
| **(B2)** Auto-adjustment banner gate: `if (user.role !== 'solo') return null` at render path                                               | Two Products framing: Product A (Disciple) is human-driven via Pattern 3; algorithm-injected adjustments compete with Coach authority                           | Banner component header + decisions.md cross-ref                                                                                 |

### 10.3 Accidental drift that BATCH 1–13 may opportunistically clean

| Drift                                                                                                                                                                                                                                          | When to clean                                                                                                                              | Risk                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `client/src/components/charts/` has 3 files (`MuscleRadarChart`, `ProgressLineChart`, `VolumeBarChart`) used in only 1–2 places each, while the same chart shapes get re-rolled inline in ProgressPage / BodyMetricsTrends / WellnessMiniTrend | BATCH 4, AS PART OF the chart primitives library — only if the existing 3 components fit into the new primitives cleanly                   | Low. The files are small. Keep if they don't naturally absorb            |
| Existing Recharts inline usages in ProgressPage.tsx, ClientDetailsPage.tsx                                                                                                                                                                     | Don't refactor in Sprint 6 unless touching the page for other reasons                                                                      | Medium. Refactor without test coverage = regressions                     |
| WidgetScroller (`client/src/components/redesign/dashboard/WidgetScroller.tsx`) becomes redundant when sidebar simplifies                                                                                                                       | BATCH 10 (Ronin Home), retire alongside the SoloDashboard replacement                                                                      | Low                                                                      |
| The original three /dashboard role-dispatch indirections become harder to navigate when each role has a different replacement view (`GuruToday`, `DiscipleToday`, `RoninHome`)                                                                 | Replace with a single role-aware switch in RouterConfig (one new function, three cases) when the three new components land in BATCH 5/8/10 | Low — pure refactor with three test invocations covering the three roles |

---

## 11. 13-batch plan (BATCH 2 LOCKED — high-level; detail in each BATCH's plan doc)

| BATCH   | Phase            | Deliverables                                                                                                                                                                                                                                                                                                  | Brainstorm gate? |
| ------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **1**   | Foundation       | Vision doc + decisions.md updates + CLAUDE.md sprint history refresh                                                                                                                                                                                                                                          | —                |
| **2**   | Foundation       | **HARD GATE** — vision reviewed, 30 calls locked across 6 sections. Sprint grows from 11 → 13 batches                                                                                                                                                                                                         | YES              |
| **3**   | Foundation       | Schema migration 017 (`client_goals` + `program_change_log` + `data_view_log` + `share_wellness_with_trainer`) + verifier phases. Dev-applied only                                                                                                                                                            | —                |
| **3.5** | Foundation (NEW) | Schema migration 018 (`set_comments`) + IDOR mutation tests on set_comments routes (6th `expectOwnershipClause` site, architectural invariant) + R2 lifecycle on comment deletion                                                                                                                             | —                |
| **4**   | Primitives       | Chart primitives library (8 components in `client/src/components/charts/sprint6/`: 5 recharts + 2 custom SVG + 1 shadcn Table) + sidebar restructure (all 3 roles → 5 items each) + new top-level routes scaffold (`/today`, `/coach`, `/my-story`, `/business`, `/training`)                                 | —                |
| **4.5** | Primitives (NEW) | WorkoutExecution UX layer to Hevy bar — schema migration 019 (`user_exercise_notes`) + plate calculator + superset visual + auto-scroll + mid-session swap + RPE column + set-type pills + layered notes + three-dot menu consolidation. Shared substrate for Disciple + Ronin                                | —                |
| **5**   | Guru build       | Guru Today (`/today`) — Pattern 2 triage feature with enriched `NeedsAttentionCard` (wellness/HRV/sentiment context) + Inbox section aggregated-by-client + 🚨 Urgent keyword-pinned (`URGENT_COMMENT_KEYWORDS` from `shared/constants/coachingTriage.ts`)                                                    | —                |
| **6**   | Guru build       | Per-client view (`/clients/:id`) restructure with 6 tabs (Story / Plan / Body / Wellness / Photos / Notes) — Notes is trainer's private notes, NEVER Disciple-visible                                                                                                                                         | —                |
| **7**   | Guru build       | Programming hub merge + ProgramBuilder calendar rebuild (replace-in-place at `/programs/builder/:id`, legacy at `/programs/builder-legacy/:id`) + Pattern 3 (Adjustment with Reasoning, MANUAL coach-driven) on every program/workout edit endpoint + 2 progression schemes (double-progression + RPE-target) | —                |
| **8**   | Disciple build   | Disciple Today + Coach view (`/coach`) — Pattern 4 read-only goal hierarchy + Pattern 3 change banner                                                                                                                                                                                                         | —                |
| **9**   | Disciple build   | Disciple My Story (`/my-story`) with chart suites + Apple Health import surfaced inside Coach view                                                                                                                                                                                                            | —                |
| **10**  | Ronin build      | Ronin Home (5-chapter scroll on `/dashboard`) + AI Coach merge + Voice-of-Ronin narrative engine (Haiku + structured output + validator + observability) + recovery-aware auto-adjustment banner (Ronin-only, deterministic rules + LLM explanation)                                                          | —                |
| **11**  | Close            | Audits (ui-ux-pro-max, vercel-react, /security-scan, /review), license scan, screenshot pack, MEMORY.md / decisions.md updates, prod migration prep for migrations 017 + 018 + 019                                                                                                                            | —                |

Migrations 017 + 018 + 019 ship to prod via the standard runner (`scripts/run-prod-migration.ts`) at BATCH 11 close, sequenced 017 → 018 → 019 with verifier phases between. Each is its own rollback unit. Migration 015 stays gated on Sprint 4 resumption (separate decision, `decisions.md` "Sprint 4 PAUSED").

---

## 12. Out of scope (do NOT touch in Sprint 6)

Explicit guardrails. BATCH 2 brainstorm gate added the items marked **(B2)**. Each has a separate sprint or remains a deliberate non-goal:

### 12.1 Sprint-level deferrals

- **Wearable integration deploy** — Sprint 4 stays paused. Migrations 014/014.5 are already on prod (Sprint 5 needed them); migration 015 stays prod-gated. Don't run 015 on prod with Sprint 6's prod migration sequence.
- **Recovery Engine v2** — Sprint 7 (post-Sprint-6). The v0 readiness algorithm in `daily_wellness_log` stays untouched. Sprint 6 reads `readinessScoreFactors[].label` directly, doesn't compute alternative scores.
- **Adaptive Programming (algorithm-driven)** — Sprint 7 (Q2 master roadmap PHASE C). **(B2)** Pattern 3 (Adjustment with Reasoning, MANUAL coach-driven) STAYS in Sprint 6 BATCH 7. The deferral is specifically for ALGORITHM-driven auto-adjustment (recovery → deload, RPE history → load auto-adjust). Pattern 3 + adaptive programming share UI affordance (the reason annotation) but differ in trigger source.
- **AI Coach Context upgrade** — Sprint 8. Sprint 6's AI insights for Ronin Home Chapter 1 (subtitle) and Chapter 5 (rotating element) use minimal prompt context. The full multi-day RAG shape is Sprint 8.
- **Native shell (Capacitor)** — Sprint 12. Sprint 6 stays web-only.
- **Habits + Hydration** — Sprint 9.
- **Menstrual cycle tracking** — Sprint 10.
- **Insights page + correlation analytics across all data types** — Sprint 13.

### 12.2 BATCH 2 schema/feature deferrals (B2)

- **Migrating `progress_entries` data into `body_metrics`** — its own future sprint (see Section 9).
- **Movement-pattern × equipment swap filter** — Sprint 7+; needs `exercises.movementPattern` enum + backfill of all existing exercises. Pre-curated `alternativeExercises[]` is the v0 surface.
- **On-Demand program type** — Sprint 7+; schema enum (`programs.programType`) + library UI + picker UX as focused unit. Sprint 6 ships Phased only.
- **Master/Variant/Live three-layer program model** — Sprint 7+; snapshot-copy + diff UI + workflow + master-changed notifications. Sprint 6 workaround: "Duplicate program" affordance in BATCH 7 calendar UI.
- **`%1RM` and `linear+deload` progression schemes** — Sprint 7+. Sprint 6 BATCH 7 ships double-progression + RPE-target only.
- **Multi-segment time-of-day narrative** — future enhancement. v0 morning-flavored regardless of view time.
- **Dual-mode (Ronin + Coach) auto-adjustment merge** — future when dual-mode ships. Sprint 6 banner is `solo`-role-only.
- **Multi-note exercise notes structure** — when single-note constraint surfaces friction. v0 `user_exercise_notes` has UNIQUE on (user_id, exercise_id).
- **Soft-archive for `set_comments`** — when storage cost becomes a real concern. v0 persists forever.
- **Email fallback for `set_comment_posted`** — only if production metrics show comments being missed at scale. v0 push-only with quiet-hours + coalescing.
- **Apple Watch companion app** — Sprint 7 or later. Phone-side execution to Hevy bar first.
- **Full offline-first execution** — deck-clearing first item after Sprint 6 if BATCH 4.5 ships network-required. Comment composer's IndexedDB drafts is the partial wedge.

### 12.3 Anti-patterns explicitly out of scope (do NOT introduce in Sprint 6)

- **Photos becoming trainer-visible** — Sprint 6 introduces Pattern 1 view-tracking but does NOT relax the "photos are never trainer-visible v1" decision. A future sprint owns granular per-photo consent.
- **Real-time presence indicators** (Pattern 1 anti-pattern) — Pattern 1 is asynchronous, not surveillance.
- **Required `reasonText`** (Pattern 3 anti-pattern) — Optional with UI nudge. **(B2)** Reasoning stays optional; required reasoning would either produce noise ("changed because") or block legitimate quick edits.
- **Chapters as separate routes** (Ronin Home anti-pattern) — Ronin Home is one scroll, anchor links handle deep-linking.
- **Append-only event log shape for `data_view_log`** — upsert state-table is the load-bearing pattern.
- **`set_comments` nested replies past depth=1** — depth=1 enforced at TWO layers (Zod + DB CHECK). Future-Claude reading the schema sees the depth invariant explicitly.
- **LLM picks adjustment magnitude in recovery engine** — deterministic decision + LLM narrative is the falsifiability discipline.
- **Permanent inline `<input>` composer per set row** — explodes vertical space, prompts comment-noise. Three-dot menu is the consolidation.

### 12.4 Discipline / workflow

- **Message system between Guru and Disciple** — referenced as a future Coaching Timeline event source, but the actual message system is its own sprint.
- **Guru's Body / Wellness self-tracking surfaces** — out of scope. Guru-as-self-tracker is a context switch, not a Sprint 6 surface. Routes stay reachable; menu items don't.
- **Extracting `expectOwnershipClause` to a shared helper** — explicitly NOT a Sprint 6 task. Inline-per-test-file pattern is the architectural invariant.
- **CI cleanup (aiService meal-plan-fallback test, heap-growth ratio threshold)** — opportunistic if BATCH 11 has runway, otherwise its own follow-up.
- **Smith / EZ / safety squat / trap bar plate calc** — Sprint 6 BATCH 4.5 ships standard barbell only. "Ship nothing rather than ship wrong numbers" discipline.
- **Adding the 💬 icon affordance permanently to set rows** — three-dot menu is the v0 home for comment entry. Revisit only if post-Sprint-6 analytics show <10% of active Disciples post any comment in 30 days.
- **Tuning recovery thresholds without updating the citation entry** — `decisions.md` Sprint 6 BATCH 10 recovery thresholds entry is the auditable basis. Vibes-based tuning erodes that.

---

## 13. Risks + mitigations

| Risk                                                                           | Mitigation                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The IA restructure breaks user mental models for existing Ronin/Disciple users | Routes stay reachable; sidebar change is gradual; pre-launch in-app announcement card explaining the new IA                                                                                                                                                   |
| Coaching Timeline read-time aggregation becomes slow at high message volume    | Cursor-based pagination from day 1 + per-source query plan is bounded by index coverage. Profile at BATCH 6 close. If P95 > 500ms, BATCH 11 ships an aggregation cache (denormalized `coaching_timeline_cache` table populated by triggers) — not Sprint 6 v1 |
| Pattern 1 view tracking becomes noisy if every page render writes a row        | Throttle: write at most once per (viewer, viewee, surface) per minute. Pattern is upsert-on-conflict, not append                                                                                                                                              |
| Sprint 6 schema additions block on Sprint 4 migration 015                      | They don't. 017 is independent. 015 stays gated separately                                                                                                                                                                                                    |
| The 13-batch plan accumulates scope creep                                      | Explicit "out of scope" section (12) + per-batch guardrails. Anti-scope-creep is invariant 14 in the discipline list. BATCH 2 added 12 new deferrals, all listed in §12.2                                                                                     |
| Brainstorm HARD GATE at BATCH 2 produces fundamental rethink                   | **CLOSED**: BATCH 2 closed 2026-05-08 with 30 calls locked. Sprint grew 11 → 13 batches; vision refined inline. BATCH 3+ implementation surfaces refinements update this doc + decisions.md                                                                   |
| **(B2)** Voice-of-Ronin LLM hallucinates ungrounded claims                     | Structured JSON output + programmatic validator + ground-truth check (5% tolerance) + `narrative_fallback_fired` observability metric. Target <2% fallback rate; >2% triggers prompt/validator tuning                                                         |
| **(B2)** Comment composer offline drafts inflate IndexedDB on the client       | Drafts purge on successful upload; manual "discard draft" affordance in drafts list. Per-user IndexedDB usage capped by browser quotas; <100 drafts × 50MB realistic worst case = bounded                                                                     |
| **(B2)** Recovery thresholds are vibes-based without justification             | Each threshold (HRV breach 15%, severe-fatigue 25%, sleep 5h, soreness 9/10) cited in `decisions.md` Sprint 6 BATCH 10 recovery thresholds entry against published research (Plews et al., Whoop methodology, Knufinke et al., 5/3/1 deload literature)       |

---

## 14. References

- Predecessor sprints: `docs/plans/2026-05-02-sprint-1-biometrics.md`, `docs/plans/2026-05-03-sprint-1.5-audit-hotfix.md`, `docs/plans/2026-05-05-sprint-2-notification-engine.md`, `docs/plans/2026-05-06-sprint-3-wellness-checkin.md`, `docs/plans/2026-05-06-sprint-4-wearables.md` (paused), `docs/plans/2026-05-08-sprint-5-apple-health-import.md`
- Q2-Q3 master roadmap: `docs/plans/2026-05-02-q2-q3-master-roadmap.md`
- Architectural patterns: `_brain/notes/decisions.md`
- Hard-won lessons: `_brain/notes/gotchas.md`
- Role system: `_brain/notes/role-system.md`
- Schema: `shared/schema.ts`
- Current IA: `client/src/components/AppSidebar.tsx`, `client/src/components/RouterConfig.tsx`
- Current home surfaces: `client/src/pages/solo/SoloDashboard.tsx`, `client/src/components/Dashboard.tsx`, `client/src/components/dashboard/ClientDashboard.tsx`

---

**End of vision. BATCH 2 brainstorm gate CLOSED 2026-05-08. BATCH 3 schema work cleared to dispatch.**
