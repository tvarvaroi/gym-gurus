# GymGurus Technical Architecture Assessment

**Document Type:** CTO-Level Architecture Review & Recommendations
**Last Updated:** February 2026
**Status:** Pre-Launch Assessment

---

## Table of Contents

1. [Hosting Decision](#1-hosting-decision)
2. [Authentication](#2-authentication)
3. [Database](#3-database)
4. [Architecture](#4-architecture)
5. [SPA vs SSR](#5-spa-vs-ssr)
6. [AI Model Choice](#6-ai-model-choice)
7. [Media Generation](#7-media-generation)
8. [Mobile Strategy](#8-mobile-strategy)
9. [API Design](#9-api-design)
10. [CI/CD & Testing](#10-cicd--testing)

---

## 1. Hosting Decision

### Current State

GymGurus is currently hosted on **Replit**, which provides an integrated development environment with built-in hosting. This was a practical choice for rapid prototyping and early development.

### Limitations of Replit for Production

| Concern                                 | Impact                                                     | Severity |
| --------------------------------------- | ---------------------------------------------------------- | -------- |
| Cold starts on free/basic plans         | Users experience 5-15 second load times on first visit     | High     |
| Limited server configuration            | No control over Node.js version, memory, or CPU allocation | Medium   |
| Vendor lock-in (Replit Auth, Replit DB) | Migration becomes harder the longer you stay               | High     |
| No CDN for static assets                | Slower asset delivery, especially internationally          | Medium   |
| Scaling limitations                     | Cannot auto-scale horizontally under load                  | High     |
| No custom domain SSL management         | Limited control over certificate configuration             | Low      |
| Uptime SLA                              | No guaranteed uptime for production workloads              | High     |

### Options Evaluated

| Option               | Frontend        | Backend             | Cost (estimated) | Pros                                 | Cons                                                    |
| -------------------- | --------------- | ------------------- | ---------------- | ------------------------------------ | ------------------------------------------------------- |
| **Vercel + Railway** | Vercel (edge)   | Railway (container) | $20-40/month     | Best DX, edge delivery, auto-scaling | Two services to manage                                  |
| **Fly.io**           | Fly.io          | Fly.io              | $15-30/month     | Single platform, global edge         | Smaller community, steeper learning curve               |
| **Render**           | Render Static   | Render Web Service  | $15-35/month     | Simple, good free tier               | Slower deployments, cold starts on free tier            |
| **AWS (ECS/Lambda)** | CloudFront + S3 | ECS or Lambda       | $30-100/month    | Maximum control                      | Operational overhead, over-engineered for current stage |
| **Replit (stay)**    | Replit          | Replit              | $7-20/month      | No migration effort                  | All limitations listed above persist                    |

### Recommendation: Vercel + Railway

**Decision: Migrate to Vercel (frontend) + Railway (backend) for production.**

**Reasoning:**

1. **Vercel** provides edge-cached static asset delivery, automatic HTTPS, preview deployments for PRs, and zero-config React hosting. The free tier is generous enough for pre-launch.
2. **Railway** offers container-based backend hosting with PostgreSQL add-ons, auto-scaling, and a developer-friendly CLI. It eliminates cold starts and provides consistent uptime.
3. The combined cost ($20-40/month at launch scale) is reasonable and scales predictably.
4. Both platforms have excellent Git integration — push to main deploys automatically.
5. Migration effort is moderate (1-2 sprints) and eliminates vendor lock-in.

**Migration Path:**

```
Sprint N:     Set up Vercel project, deploy frontend
Sprint N+1:   Set up Railway, migrate backend + database
Sprint N+2:   Update DNS, decommission Replit
```

---

## 2. Authentication

### Current State

GymGurus uses **Replit OAuth** for authentication. This is tightly coupled to the Replit platform and will not work outside of the Replit hosting environment.

### Limitations of Replit Auth

| Concern                                 | Impact                                                      |
| --------------------------------------- | ----------------------------------------------------------- |
| Only works when hosted on Replit        | Complete blocker for migration                              |
| No social login options (Google, Apple) | Limits user acquisition convenience                         |
| No email/password fallback              | Users cannot create traditional accounts                    |
| No MFA/2FA support                      | Security gap for professional trainer accounts              |
| Limited session management              | No fine-grained control over session lifetime or revocation |
| No role-based access control built in   | Must be implemented manually regardless                     |

### Options Evaluated

| Solution                 | Type                  | Cost               | Social Login        | MFA               | Self-Hosted | Effort to Implement   |
| ------------------------ | --------------------- | ------------------ | ------------------- | ----------------- | ----------- | --------------------- |
| **better-auth**          | Open-source library   | Free               | Yes (plugins)       | Yes               | Yes         | Medium (2-3 days)     |
| **Auth.js (NextAuth)**   | Open-source library   | Free               | Yes (built-in)      | Community plugins | Yes         | Medium (2-3 days)     |
| **Clerk**                | Managed service       | Free to $25+/month | Yes                 | Yes               | No          | Low (1 day)           |
| **Supabase Auth**        | Managed + open-source | Free to $25+/month | Yes                 | Yes               | Optional    | Low-Medium (1-2 days) |
| **Firebase Auth**        | Managed service       | Free (generous)    | Yes                 | Yes               | No          | Low (1 day)           |
| **Custom (Passport.js)** | DIY                   | Free               | Manual per provider | Manual            | Yes         | High (5+ days)        |

### Recommendation: Migrate to better-auth

**Decision: Adopt better-auth as the authentication solution.**

**Reasoning:**

1. **Open-source and self-hosted** — No vendor lock-in, no per-user pricing that could become expensive at scale.
2. **Flexible plugin system** — Social login (Google, GitHub, Apple), MFA, session management, and organization/team support are all available as plugins.
3. **Framework agnostic** — Works with Express (current backend) without requiring a framework migration.
4. **Database adapter for PostgreSQL** — Integrates directly with the existing database, no additional services needed.
5. **Active development** — Well-maintained with a growing community, reducing risk of abandonment.
6. **Cost** — $0/month regardless of user count. Auth costs should not scale linearly with users.

**Why not Clerk?** Clerk is excellent for rapid development but introduces per-user pricing ($0.02/MAU after free tier). At 10,000 users, that is $200/month just for auth. For a startup watching margins, this is a significant ongoing cost for a solved problem.

**Why not Auth.js?** Auth.js is designed primarily for Next.js. While it has an Express adapter, it is a second-class citizen. better-auth has more natural Express support.

**Migration Steps:**

1. Install better-auth and configure PostgreSQL adapter
2. Set up email/password authentication as the primary method
3. Add Google OAuth as the first social login provider
4. Implement session management with secure HTTP-only cookies
5. Create migration script for existing Replit Auth users (map Replit user IDs to new auth records)
6. Add MFA as an optional feature for trainer accounts

---

## 3. Database

### Current State: PostgreSQL

GymGurus uses **PostgreSQL** via Drizzle ORM. This is the correct choice for the application's data model.

**Why PostgreSQL is right for GymGurus:**

| Requirement                                           | PostgreSQL Fit                                    |
| ----------------------------------------------------- | ------------------------------------------------- |
| Relational data (users, clients, workouts, exercises) | Excellent — this is fundamentally relational data |
| Complex queries (workout history, progress tracking)  | Excellent — JOINs, window functions, aggregations |
| Data integrity (foreign keys, constraints)            | Excellent — ACID compliance ensures consistency   |
| JSON fields (flexible exercise metadata)              | Good — JSONB support for semi-structured data     |
| Full-text search (exercise library)                   | Good — built-in tsvector/tsquery                  |
| Scalability to 100k+ users                            | Good — PostgreSQL handles this scale comfortably  |

**No changes recommended for the primary database.**

### Recommended Addition: Redis

**Decision: Add Redis when scaling beyond 100 concurrent users.**

Redis addresses several needs that PostgreSQL handles suboptimally:

| Use Case                                   | Without Redis                                | With Redis                                |
| ------------------------------------------ | -------------------------------------------- | ----------------------------------------- |
| Rate limiting (API, AI chat)               | Poll database on every request               | O(1) in-memory check                      |
| Session caching                            | Database read on every authenticated request | In-memory session lookup                  |
| Real-time features (live workout tracking) | Polling or WebSocket + DB writes             | Pub/sub with minimal latency              |
| AI response caching                        | Regenerate identical responses               | Cache common queries, reduce AI API costs |
| Leaderboard/gamification                   | Complex SQL queries on every page load       | Sorted sets with instant ranking          |
| Background job queue                       | Custom implementation                        | Bull/BullMQ for reliable job processing   |

**When to add Redis:**

- **Not now.** At pre-launch and early traction (<100 concurrent users), PostgreSQL handles all of these adequately.
- **Trigger:** When response times for authenticated requests exceed 200ms or when AI API costs exceed $50/month due to redundant queries.
- **Implementation:** Railway offers a Redis add-on ($5/month), making deployment trivial.

### Database Schema Recommendations

| Area               | Recommendation                                                                  | Priority      |
| ------------------ | ------------------------------------------------------------------------------- | ------------- |
| Indexes            | Add composite indexes on (user_id, created_at) for all time-series queries      | High          |
| Soft deletes       | Implement soft deletes (deleted_at column) for clients and workouts             | Medium        |
| Audit trail        | Add created_by / updated_by columns to critical tables                          | Medium        |
| Connection pooling | Use PgBouncer or built-in Drizzle pooling when concurrent connections exceed 20 | Low (for now) |

---

## 4. Architecture

### Current State: Monolith

GymGurus is a **monolithic application** with a React frontend and Express backend in a single repository. This is the correct architecture for the current stage.

### Monolith Decision Matrix

| Factor                     | Monolith                             | Microservices                                           | GymGurus Decision                                     |
| -------------------------- | ------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------- |
| Development speed          | Fast (single codebase, shared types) | Slow (inter-service contracts, deployment coordination) | **Monolith**                                          |
| Team size (1-3 developers) | Ideal                                | Over-engineered                                         | **Monolith**                                          |
| Debugging                  | Simple (single process, shared logs) | Complex (distributed tracing, log aggregation)          | **Monolith**                                          |
| Deployment                 | One deploy pipeline                  | Multiple pipelines, orchestration                       | **Monolith**                                          |
| Scaling                    | Vertical (add more CPU/RAM)          | Horizontal (scale individual services)                  | **Monolith** (vertical scaling is fine to 10k+ users) |
| Shared data access         | Direct database queries              | API calls between services, eventual consistency        | **Monolith**                                          |
| Cost                       | Low (one server)                     | High (multiple servers, service mesh, monitoring)       | **Monolith**                                          |

### When to Consider Microservices

**Trigger: Only after achieving product-market fit with 1,000+ active users.**

The only service worth extracting early is the **AI service**, because:

1. AI calls have fundamentally different scaling characteristics (bursty, high-latency, CPU/memory intensive)
2. AI service failures should not bring down the core application
3. AI models and prompts change on a different cadence than business logic
4. Cost management for AI is easier when isolated (separate billing, caching, rate limiting)

### Recommended Extraction Order (When the Time Comes)

```
Phase 1 (1,000+ users):  Extract AI service (workout generation, chatbot)
Phase 2 (5,000+ users):  Extract notification service (email, push, in-app)
Phase 3 (10,000+ users): Extract media service (image generation, video processing)
Phase 4 (never?):        Keep core (users, clients, workouts) as monolith
```

**Key principle:** The core CRUD operations for users, clients, and workouts should remain in the monolith indefinitely. These are tightly coupled by nature and splitting them creates complexity without benefit.

---

## 5. SPA vs SSR

### Current State

GymGurus is a **React Single Page Application (SPA)** with client-side rendering. The application uses a custom `useSEO()` hook and static meta tags for search engine optimization.

### SPA vs SSR Decision Matrix

| Factor                                  | SPA (Current)                                           | SSR (Next.js)                                     | GymGurus Decision |
| --------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- | ----------------- |
| User experience                         | Excellent (fast after initial load, smooth transitions) | Excellent (fast initial load, smooth transitions) | **Tie**           |
| SEO for landing pages                   | Adequate with static meta tags                          | Superior (server-rendered HTML)                   | **SSR advantage** |
| SEO for app pages (dashboard, workouts) | Not needed (behind auth)                                | Not needed (behind auth)                          | **Tie**           |
| Development complexity                  | Lower (familiar React patterns)                         | Higher (server/client boundaries, hydration)      | **SPA advantage** |
| Migration effort                        | None                                                    | 2-4 weeks of refactoring                          | **SPA advantage** |
| Hosting cost                            | Lower (static files + API)                              | Higher (server rendering requires compute)        | **SPA advantage** |
| Time to market                          | No change                                               | Delayed by migration                              | **SPA advantage** |

### SEO Analysis

**Pages that need SEO:**

- Landing page (/)
- Pricing page (/pricing)
- Features page (/features)
- Blog posts (if/when added)
- Contact page (/contact)

**Pages that do NOT need SEO (behind authentication):**

- Dashboard
- Client management
- Workout builder
- AI chatbot
- Settings
- All logged-in functionality

**Assessment:** Only 4-5 pages need SEO. The `useSEO()` hook with proper meta tags, combined with a well-structured sitemap.xml, handles this adequately for a SPA. Google's crawler processes JavaScript SPAs effectively as of 2024+.

### Recommendation: Stay SPA

**Decision: Remain on the current React SPA architecture.**

**Reasoning:**

1. The SEO-critical surface area is small (landing pages only) and adequately addressed by the current `useSEO()` approach.
2. Migrating to Next.js would delay launch by 2-4 weeks with marginal SEO benefit.
3. The application is primarily an authenticated tool — SEO is irrelevant for 90%+ of pages.
4. SPA architecture is simpler to reason about, debug, and deploy.

**Revisit trigger:** If organic search traffic becomes a significant acquisition channel and the current SEO approach demonstrably underperforms (measurable via Google Search Console data), then evaluate a partial migration where only the marketing pages use SSR (e.g., a separate Next.js marketing site at the root domain, with the SPA at app.gymgurus.com).

---

## 6. AI Model Choice

### Current State

GymGurus uses **Claude Sonnet** (Anthropic) for its AI chatbot feature, providing workout suggestions, form guidance, and general fitness Q&A.

### Cost Analysis

| Model                 | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Avg. Cost per Message | Monthly Cost (1,000 msgs/day) |
| --------------------- | -------------------------- | --------------------------- | --------------------- | ----------------------------- |
| Claude Sonnet 4       | $3.00                      | $15.00                      | ~$0.003               | ~$90                          |
| Claude Haiku 3.5      | $0.80                      | $4.00                       | ~$0.001               | ~$30                          |
| GPT-4o                | $2.50                      | $10.00                      | ~$0.0025              | ~$75                          |
| GPT-4o-mini           | $0.15                      | $0.60                       | ~$0.0003              | ~$9                           |
| Llama 3 (self-hosted) | Infrastructure cost        | Infrastructure cost         | ~$0.001-0.005         | Variable                      |

### Model Capability Assessment for GymGurus Use Cases

| Use Case                                 | Required Capability                       | Claude Sonnet | Claude Haiku | GPT-4o-mini |
| ---------------------------------------- | ----------------------------------------- | ------------- | ------------ | ----------- |
| Workout plan generation                  | Complex reasoning, structured output      | Excellent     | Good         | Good        |
| Exercise form guidance                   | Nuanced safety advice                     | Excellent     | Good         | Adequate    |
| Nutrition suggestions                    | Domain knowledge + personalization        | Excellent     | Good         | Good        |
| Simple Q&A ("what muscles does X work?") | Basic knowledge retrieval                 | Overkill      | Excellent    | Excellent   |
| Progress analysis                        | Data interpretation, trend identification | Excellent     | Adequate     | Good        |
| Conversational coaching                  | Natural dialogue, empathy, motivation     | Excellent     | Good         | Adequate    |

### Recommendation: Keep Claude Sonnet, Add Haiku for Simple Queries

**Decision: Dual-model strategy — route by query complexity.**

**Implementation:**

```
User message
    |
    v
[Complexity classifier] (rule-based, not ML)
    |
    +--> Simple query (factual, short answer expected)
    |       --> Claude Haiku (~$0.001/message)
    |       Examples: "What muscles does bench press work?"
    |                 "How many calories in a banana?"
    |                 "What's a good warm-up for squats?"
    |
    +--> Complex query (reasoning, planning, analysis)
            --> Claude Sonnet (~$0.003/message)
            Examples: "Create a 4-week hypertrophy program for my client"
                      "Analyze my progress and suggest adjustments"
                      "My client has a shoulder injury, modify this plan"
```

**Complexity classifier rules (simple heuristic, no ML needed):**

1. If the message is a question under 20 words with no client context referenced --> Haiku
2. If the message requests plan generation or modification --> Sonnet
3. If the message references specific client data or progress history --> Sonnet
4. If the message is a follow-up in a multi-turn conversation about programming --> Sonnet
5. Default: Sonnet (err on the side of quality)

**Expected cost savings:** 30-40% reduction in AI API costs with no perceptible quality loss for simple queries.

**Why not GPT-4o?** Anthropic's Claude models have shown stronger performance in structured fitness plan generation and safety-conscious responses (important when giving exercise and nutrition guidance). Staying within a single provider also simplifies API management, billing, and prompt engineering.

---

## 7. Media Generation

### Requirements

GymGurus needs to generate two types of media:

1. **Exercise images** — Visual representations of exercises for workout plans
2. **Video content** — Potential future feature for exercise demonstrations or marketing

### Recommendation: External Services, Not In-House

**Decision: Use fal.ai for image generation and Remotion for programmatic video. Do not build media generation in-house.**

### Image Generation: fal.ai

| Factor                     | Assessment                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Why fal.ai**             | Fast inference (sub-2-second generation), competitive pricing, excellent API, supports SDXL and Flux models |
| **Use case**               | Generate exercise illustration images for workout plans when stock images are unavailable                   |
| **Cost**                   | ~$0.01-0.03 per image (Flux Schnell for speed, Flux Dev for quality)                                        |
| **Alternative considered** | Replicate (similar capability, slightly higher cost), DALL-E (higher cost, less control)                    |
| **Implementation effort**  | Low — REST API call with prompt engineering for consistent exercise illustration style                      |

**Implementation approach:**

1. Pre-generate images for the 100 most common exercises and cache them
2. Generate on-demand for custom or uncommon exercises
3. Store generated images in object storage (S3, Cloudflare R2) to avoid regeneration costs
4. Use a consistent prompt template for visual style consistency

### Video Generation: Remotion

| Factor                     | Assessment                                                                     |
| -------------------------- | ------------------------------------------------------------------------------ |
| **Why Remotion**           | Programmatic video creation using React — fits the existing tech stack         |
| **Use case**               | Generate workout summary videos, progress highlight reels, marketing content   |
| **Cost**                   | Open-source (free for self-hosting), cloud rendering available                 |
| **Alternative considered** | FFmpeg (lower level, harder to maintain), Creatomate (managed, more expensive) |
| **Implementation effort**  | Medium — requires defining video templates in React components                 |
| **Priority**               | Low — this is a "nice to have" feature, not launch-critical                    |

**Key principle:** Media generation is a commodity. The value GymGurus provides is in the intelligence (AI workout plans, client management) — not in rendering pixels. Use external services for media and invest engineering time in core differentiators.

---

## 8. Mobile Strategy

### The Mobile Imperative

Personal trainers and their clients interact with fitness software primarily on mobile devices. A strong mobile experience is not optional — it is a requirement for product-market fit.

### Phase 1: PWA (Progressive Web App) — Launch Strategy

**Decision: Launch with a PWA. Do not build a native app initially.**

| Factor             | PWA                                                     | React Native                         | Native (Swift/Kotlin)                 |
| ------------------ | ------------------------------------------------------- | ------------------------------------ | ------------------------------------- |
| Development effort | Minimal (current React app + manifest + service worker) | Medium (2-3 months, shared codebase) | High (4-6 months, separate codebases) |
| Time to market     | Immediate (days of configuration)                       | 2-3 months delay                     | 4-6 months delay                      |
| App Store presence | No (installable from browser)                           | Yes                                  | Yes                                   |
| Push notifications | Yes (with limitations on iOS)                           | Yes                                  | Yes                                   |
| Offline capability | Yes (service worker caching)                            | Yes                                  | Yes                                   |
| Performance        | Good (90%+ of native feel for CRUD apps)                | Very Good                            | Excellent                             |
| Cost               | $0 additional                                           | $5,000-15,000 in development time    | $20,000-50,000+                       |
| Update deployment  | Instant (no app store review)                           | 1-3 day review cycle                 | 1-7 day review cycle                  |

**PWA Implementation Checklist:**

- [ ] Add `manifest.json` with app name, icons, theme colors
- [ ] Implement service worker for offline caching of static assets
- [ ] Add "Add to Home Screen" prompt for returning users
- [ ] Ensure all touch targets are at least 44x44px (Apple HIG)
- [ ] Test on iOS Safari, Android Chrome, and Samsung Internet
- [ ] Implement viewport meta tag for proper mobile scaling
- [ ] Add splash screen configuration for installed PWA mode

### Phase 2: React Native — Conditional

**Trigger: Evaluate at 500+ active users based on these metrics:**

| Metric               | Threshold for React Native Investment                           |
| -------------------- | --------------------------------------------------------------- |
| Mobile traffic share | >70% of sessions are mobile                                     |
| PWA install rate     | <10% of mobile users install the PWA                            |
| User feedback        | "I need an app store app" appears in >20% of feedback           |
| Competitor pressure  | Competitors launch native apps with features PWA cannot support |
| Revenue              | Sufficient revenue to fund 2-3 month development effort         |

**If none of these thresholds are met, stay with PWA indefinitely.** Many successful SaaS products operate as PWAs without native apps.

### React Native Approach (If Triggered)

- Use **Expo** for simplified build and deployment
- Share business logic and API layer with the web app
- Use React Navigation for native navigation patterns
- Prioritize iOS first (higher engagement and willingness to pay in fitness segment)
- Target 80% code sharing between web and mobile

---

## 9. API Design

### Current State

GymGurus uses a **RESTful API** built with Express.js. Routes follow standard REST conventions with JSON request/response bodies.

### REST vs GraphQL Decision

| Factor                  | REST (Current)                           | GraphQL                                           | GymGurus Decision             |
| ----------------------- | ---------------------------------------- | ------------------------------------------------- | ----------------------------- |
| Learning curve for team | Already implemented                      | Requires schema design, resolvers, client setup   | **REST**                      |
| Data fetching patterns  | Adequate — most views need 1-2 endpoints | Beneficial when views need data from 5+ entities  | **REST** (views are simple)   |
| Caching                 | Simple (HTTP caching, CDN-friendly)      | Complex (normalized cache, Apollo/Relay required) | **REST**                      |
| File uploads            | Native support                           | Requires multipart spec or separate endpoint      | **REST**                      |
| Mobile data efficiency  | May over-fetch slightly                  | Precise field selection reduces payload           | **GraphQL advantage** (minor) |
| Tooling and debugging   | Standard HTTP tools (Postman, curl)      | Requires GraphQL playground, schema introspection | **REST**                      |
| API versioning          | URL-based (v1, v2)                       | Schema evolution (deprecation directives)         | **Both adequate**             |

### Recommendation: Stay REST, Add Versioning

**Decision: Continue with REST. Add API versioning before public launch.**

**Reasoning:**

1. GymGurus' data access patterns are straightforward — clients, workouts, exercises. No complex nested queries that would benefit from GraphQL.
2. The team is already proficient with REST. Switching to GraphQL adds cognitive overhead without proportional benefit.
3. GraphQL introduces complexity in caching, error handling, and authorization that is not justified at this scale.
4. REST is perfectly adequate for the mobile strategy (PWA and potential React Native).

### API Versioning Strategy

**Approach: URL-based versioning**

```
Current:  /api/clients
After:    /api/v1/clients
```

**Versioning rules:**

1. All current endpoints move under `/api/v1/` before public launch
2. Breaking changes (field removal, type changes, behavior changes) require a new version
3. Additive changes (new fields, new endpoints) do NOT require a new version
4. Maintain at most 2 active versions (deprecate v(N-1) 6 months after v(N) launch)
5. Include `X-API-Version` response header for client version awareness

### Additional API Recommendations

| Recommendation           | Priority | Details                                                                                     |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------- |
| Request validation       | High     | Use Zod schemas (already in stack) for all request body validation                          |
| Rate limiting            | High     | Implement per-user rate limiting (100 req/min general, 10 req/min for AI endpoints)         |
| Error response format    | Medium   | Standardize error responses: `{ error: { code, message, details } }`                        |
| Pagination               | Medium   | Use cursor-based pagination for list endpoints (more performant than offset)                |
| CORS configuration       | High     | Lock down CORS to specific frontend domains before production                               |
| API documentation        | Medium   | Add Swagger/OpenAPI spec for internal documentation and potential future public API         |
| Request/response logging | High     | Structured logging (JSON format) for all API requests with timing, status, and user context |

---

## 10. CI/CD & Testing

### Current State

GymGurus does not have an automated CI/CD pipeline or comprehensive test suite. This is acceptable during rapid prototyping but must be addressed before production launch.

### CI/CD Pipeline: GitHub Actions

**Decision: Implement GitHub Actions for automated lint, test, and build on every push and pull request.**

**Recommended Pipeline:**

```yaml
# Trigger: On push to main, on all pull requests
Pipeline Steps: 1. Checkout code
  2. Install dependencies (npm ci)
  3. Lint (ESLint + Prettier check)
  4. Type check (TypeScript compiler, --noEmit)
  5. Unit tests (Vitest)
  6. Build (vite build — ensures production build succeeds)
  7. E2E tests (Playwright — on PR to main only)
  8. Deploy preview (Vercel automatic preview deployment)
```

**Estimated setup time:** 4-6 hours for the pipeline, 1-2 days for initial test suite.

### Testing Strategy

#### Testing Pyramid for GymGurus

```
        /  E2E Tests  \         (5-10 tests)   -- Critical user flows
       /  Integration  \        (20-30 tests)  -- API endpoint tests
      /   Unit Tests    \       (50-100 tests) -- Business logic, utilities
     /____________________\
```

#### E2E Tests (Playwright) — Critical Flows

These are the minimum E2E tests required before launch:

| Test                        | What It Validates                         | Priority |
| --------------------------- | ----------------------------------------- | -------- |
| User registration and login | Auth flow works end-to-end                | Critical |
| Client CRUD                 | Create, view, edit, delete a client       | Critical |
| Workout plan creation       | Build a workout plan with exercises       | Critical |
| Workout logging             | Log a completed workout with sets/reps    | Critical |
| AI chatbot interaction      | Send a message, receive AI response       | High     |
| Landing page loads          | Marketing page renders correctly          | High     |
| Mobile responsive layout    | Key pages render correctly at 375px width | Medium   |
| Calculator tools (BMI, 1RM) | Calculations produce correct results      | Medium   |

#### Unit Tests (Vitest) — Business Logic

| Area                    | Examples                                                | Priority |
| ----------------------- | ------------------------------------------------------- | -------- |
| Calculation utilities   | BMI formula, 1RM calculations, strength standards       | High     |
| Data validation schemas | Zod schema validation for all API inputs                | High     |
| Route handlers          | Request/response testing with mocked dependencies       | Medium   |
| AI prompt construction  | Verify prompts include correct context and constraints  | Medium   |
| Gamification logic      | XP calculations, level thresholds, achievement triggers | Medium   |

#### Integration Tests — API Endpoints

| Area              | Examples                                    | Priority |
| ----------------- | ------------------------------------------- | -------- |
| Auth endpoints    | Registration, login, session management     | High     |
| Client endpoints  | CRUD operations with database verification  | High     |
| Workout endpoints | Plan creation, exercise assignment, logging | High     |
| AI endpoints      | Chatbot with mocked AI responses            | Medium   |

### Test Coverage Targets

| Phase                  | Unit Coverage | Integration Coverage       | E2E Coverage     |
| ---------------------- | ------------- | -------------------------- | ---------------- |
| Pre-launch (Sprint 10) | 40%           | Key endpoints covered      | 5 critical flows |
| Post-launch (Month 1)  | 60%           | All endpoints covered      | 8 critical flows |
| Growth phase (Month 3) | 75%           | All endpoints + edge cases | 12+ flows        |

**Note:** 100% coverage is not the goal. Focus on covering business-critical logic and user-facing flows. Low-value tests (testing React render output, testing Drizzle ORM queries) add maintenance burden without proportional confidence.

### Recommended CI/CD Timeline

| Sprint      | Action                                                     | Effort   |
| ----------- | ---------------------------------------------------------- | -------- |
| Sprint 10   | Set up GitHub Actions pipeline (lint + type-check + build) | 4 hours  |
| Sprint 10   | Add Vitest with 10-15 unit tests for critical utilities    | 1 day    |
| Sprint 11   | Add Playwright with 5 E2E tests for critical flows         | 1-2 days |
| Sprint 11   | Configure Vercel preview deployments for PRs               | 2 hours  |
| Sprint 12   | Add integration tests for API endpoints                    | 1-2 days |
| Post-launch | Expand test suite based on bugs encountered                | Ongoing  |

### Pre-Launch Checklist (Non-Negotiable)

These items must be completed before GymGurus accepts real user data:

- [ ] **CI pipeline runs on every PR** — No merging without passing lint + build
- [ ] **E2E tests cover auth and client CRUD** — The two highest-risk flows
- [ ] **Environment variables are not hardcoded** — All secrets in environment config
- [ ] **Database backups are automated** — Daily backups with 30-day retention
- [ ] **Error monitoring is configured** — Sentry or equivalent for production error tracking
- [ ] **HTTPS enforced on all endpoints** — No HTTP fallback
- [ ] **Rate limiting on AI endpoints** — Prevent abuse and cost overruns
- [ ] **CORS locked to production domain** — No wildcard CORS in production
- [ ] **Logging captures request context** — Structured logs for debugging production issues
- [ ] **Deployment rollback is documented** — Team knows how to revert a bad deploy in under 5 minutes

---

## Summary: Decision Matrix

| Decision Area      | Current State      | Recommendation                                      | Priority      | Effort         |
| ------------------ | ------------------ | --------------------------------------------------- | ------------- | -------------- |
| **Hosting**        | Replit             | Migrate to Vercel + Railway                         | High          | 2 sprints      |
| **Authentication** | Replit OAuth       | Migrate to better-auth                              | High          | 1 sprint       |
| **Database**       | PostgreSQL         | Keep PostgreSQL, add Redis later                    | Low (for now) | N/A            |
| **Architecture**   | Monolith           | Stay monolith, extract AI service first when needed | Low           | N/A            |
| **Rendering**      | React SPA          | Stay SPA, monitor SEO metrics                       | Low           | N/A            |
| **AI Model**       | Claude Sonnet      | Keep Sonnet, add Haiku routing                      | Medium        | 2-3 days       |
| **Media**          | None               | Use fal.ai (images) + Remotion (video)              | Low           | As needed      |
| **Mobile**         | Web only           | PWA first, React Native at 500+ users               | Medium        | 1-2 days (PWA) |
| **API**            | REST (unversioned) | Stay REST, add v1 versioning                        | Medium        | 1 day          |
| **CI/CD**          | None               | GitHub Actions + Vitest + Playwright                | High          | Sprint 10      |

### Immediate Actions (Next 2 Sprints)

1. **Set up GitHub Actions CI pipeline** — Lint, type-check, build on every push
2. **Begin hosting migration planning** — Create Vercel and Railway accounts, test deployment
3. **Implement better-auth** — Remove Replit OAuth dependency
4. **Add API versioning** — Prefix all routes with /api/v1
5. **Write first E2E tests** — Auth flow and client CRUD with Playwright

### Deferred Decisions (Revisit at Scale Triggers)

- Redis: At 100+ concurrent users
- Microservices: At 1,000+ active users with confirmed PMF
- Next.js/SSR: Only if SEO becomes a measurable acquisition bottleneck
- React Native: At 500+ users with PWA metrics indicating demand
- GraphQL: Likely never needed for GymGurus' data patterns

---

_This assessment should be revisited quarterly or after any major scaling milestone. Architecture decisions are not permanent — they should evolve with the product's needs and the team's capacity._
