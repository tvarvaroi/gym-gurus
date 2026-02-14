# ADR-005: Mobile Strategy

**Status:** Proposed
**Date:** 2026-02-14
**Sprint:** Post-launch planning
**Decision Makers:** Engineering Lead, Product Owner

## Context

GymGurus is currently a React SPA (React 18 + TypeScript) with responsive design. Users access it via web browsers on both desktop and mobile devices. As the platform grows, we need a deliberate mobile strategy to serve trainers and their clients who increasingly operate from phones and tablets throughout their day -- in the gym, between sessions, and on the go.

Key observations driving this decision:

- Personal trainers frequently check schedules, log workouts, and message clients from their phones
- Clients need quick access to workout plans, progress tracking, and calculators while at the gym
- The fitness app market is dominated by native mobile apps (Trainerize, TrueCoach, PT Distinction all have native apps)
- Our current responsive design covers basic mobile use but lacks offline capability, push notifications, and home screen presence
- Engineering resources are limited (solo developer / small team)

## Decision Drivers

- **Cost efficiency:** Minimize development and maintenance overhead for a small team
- **Time to market:** Get a usable mobile experience to users as quickly as possible
- **User experience:** Deliver a smooth, app-like experience on mobile devices
- **Offline capability:** Calculators and cached workout plans should work without connectivity (gym basements, travel)
- **Iterability:** Ability to ship updates instantly without app store review cycles
- **Future flexibility:** Don't close doors on native development if demand warrants it

## Considered Options

### Option A: Progressive Web App (PWA)

Enhance the existing React SPA with PWA capabilities: web app manifest, service worker, offline caching, and install-to-home-screen functionality.

- **Pros:**
  - Leverages the entire existing React + TypeScript codebase with zero rewrite
  - No app store approval process; updates deploy instantly via existing CI/CD
  - Single codebase for all platforms (desktop, mobile, tablet)
  - Lower development cost (estimated 2-4 weeks of work)
  - Installable on Android (full PWA support) and iOS (improving support since iOS 16.4+)
  - Service worker enables offline access to calculators and cached data
  - Avoids 15-30% app store commission on any future in-app purchases
  - Lighthouse auditing provides clear, measurable PWA quality scores

- **Cons:**
  - Limited native API access (no Bluetooth for wearables, limited background processing)
  - No presence in App Store / Google Play Store (discoverability disadvantage)
  - Push notification support on iOS requires iOS 16.4+ and user must install the PWA first
  - Safari/WebKit limitations on iOS (storage quotas, background sync restrictions)
  - Some users perceive web apps as "less legitimate" than native apps
  - Cannot access HealthKit (Apple Health) or Google Fit APIs directly

- **Estimated effort:** 2-4 weeks (1 developer)

### Option B: React Native

Build a separate mobile application using React Native, sharing UI knowledge (but not code) with the existing React web app.

- **Pros:**
  - Leverages existing React/TypeScript knowledge on the team
  - True native performance with native UI components
  - Full access to device APIs (camera, Bluetooth, HealthKit, Google Fit, push notifications)
  - App Store and Google Play presence for discoverability and credibility
  - Large ecosystem of libraries (react-native-health, react-native-ble, etc.)
  - Expo framework simplifies build/deploy pipeline significantly

- **Cons:**
  - Separate codebase to build and maintain alongside the web app
  - Significantly longer development time (estimated 3-5 months for v1)
  - App store submission, review, and approval processes add friction
  - Must maintain two deployment pipelines (web + mobile)
  - React Native upgrade cycle can be painful (breaking changes between versions)
  - Need to handle platform-specific bugs for both iOS and Android
  - App store fees ($99/year Apple, $25 one-time Google)

- **Estimated effort:** 3-5 months (1-2 developers)

### Option C: Flutter

Build a cross-platform mobile app using Flutter and Dart, creating a fully separate application from the web codebase.

- **Pros:**
  - Excellent UI rendering performance via Skia engine
  - Single codebase produces both iOS and Android apps
  - Growing ecosystem with strong Google backing
  - Flutter for Web could theoretically replace the React SPA long-term
  - Material Design and Cupertino widgets look native on each platform
  - Hot reload makes development iteration fast

- **Cons:**
  - Dart learning curve for a team experienced in TypeScript/React
  - Zero code sharing with existing React web application
  - Smaller ecosystem compared to React Native
  - Would require rewriting all business logic and UI from scratch
  - Dart developers are harder to hire than React developers
  - Two completely different tech stacks to maintain

- **Estimated effort:** 4-6 months (1-2 developers)

### Option D: Capacitor (Ionic)

Wrap the existing React web application in a native shell using Capacitor, adding native API access through plugins.

- **Pros:**
  - Wraps the existing React web app directly -- minimal code changes needed
  - Full native API access through Capacitor plugins (camera, push, filesystem, etc.)
  - App Store and Google Play presence
  - Capacitor plugins for HealthKit, Google Fit, and Bluetooth exist
  - Can still deploy as a web app simultaneously
  - Fastest path from "web app" to "app store listing"

- **Cons:**
  - Performance limitations for complex UI interactions (scrolling lists, animations)
  - "Web-in-native-shell" feel can be noticeable to users (WebView rendering)
  - Debugging native plugin issues requires native development knowledge
  - App store reviewers sometimes reject thin WebView wrappers
  - WebView memory constraints on older devices
  - Plugin ecosystem is smaller than React Native's

- **Estimated effort:** 4-6 weeks (1 developer)

## Decision

We chose a **phased approach starting with PWA (Option A)** because it delivers the highest value with the lowest investment and risk, while preserving optionality for future native development.

### Phase 1: PWA (Immediate -- 2-4 weeks)

Convert the existing React SPA into a fully compliant Progressive Web App:

- Web app manifest configuration
- Service worker for offline calculator access and workout plan caching
- Install prompt strategy with smart timing
- Push notification setup (where supported)
- App-like navigation (standalone display mode, status bar theming)

### Phase 2: Evaluate React Native (Month 6 -- only if metrics justify)

Trigger conditions for moving to Phase 2:

- PWA install rate is below 10% of monthly active users
- Users specifically request a native app (tracked via feedback channels)
- A critical feature requires native API access (e.g., wearable integration becomes a top-requested feature)
- Competitor analysis shows native app as a significant acquisition disadvantage

If Phase 2 is triggered, start with React Native (Option B) for cross-platform development. If native wrapping is sufficient, Capacitor (Option D) is a lower-cost alternative to evaluate first.

## Consequences

### Positive

- Lower initial investment: 2-4 weeks vs 3-6 months for native
- Faster time to market: PWA ships through existing deployment pipeline
- Single codebase: No additional maintenance burden
- Instant updates: Bug fixes and features reach users immediately without app store review
- Data-driven escalation: Phase 2 decision is based on real metrics, not assumptions
- Can always wrap the PWA in Capacitor later if a native shell is needed for app store presence

### Negative

- No App Store / Google Play presence initially (limits discoverability)
- iOS PWA experience is still inferior to Android (storage limits, no background sync)
- Push notifications require PWA installation on iOS (extra friction)
- May be perceived as "not a real app" by some users or competitors
- Limited wearable integration options

### Risks

- **Risk:** iOS PWA support regresses or Apple further restricts web apps
  - **Mitigation:** Monitor WebKit release notes; Capacitor wrapping is a 2-week escape hatch
- **Risk:** Users don't discover the install prompt and never install the PWA
  - **Mitigation:** Smart install prompt timing, in-app education, and onboarding step explaining installation
- **Risk:** Offline data conflicts when syncing back to server
  - **Mitigation:** Implement last-write-wins with conflict detection; calculators are stateless so no conflict risk there

## Implementation Notes

### PWA Manifest Configuration

```json
{
  "name": "GymGurus: AI Fitness Coach & Trainer Platform",
  "short_name": "GymGurus",
  "description": "AI-powered fitness coaching platform for personal trainers and their clients",
  "start_url": "/dashboard?source=pwa",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#6366f1",
  "orientation": "portrait-primary",
  "categories": ["fitness", "health", "sports"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "GymGurus Dashboard"
    },
    {
      "src": "/screenshots/workout-builder.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Workout Builder"
    }
  ],
  "shortcuts": [
    {
      "name": "BMI Calculator",
      "short_name": "BMI",
      "url": "/calculators/bmi?source=shortcut",
      "icons": [{ "src": "/icons/calc-icon.png", "sizes": "192x192" }]
    },
    {
      "name": "One Rep Max",
      "short_name": "1RM",
      "url": "/calculators/one-rep-max?source=shortcut",
      "icons": [{ "src": "/icons/calc-icon.png", "sizes": "192x192" }]
    }
  ]
}
```

### Service Worker Caching Strategy

```
Cache Strategy by Resource Type:
---------------------------------
| Resource Type       | Strategy        | Rationale                                    |
|---------------------|-----------------|----------------------------------------------|
| App shell (HTML)    | Cache-first     | Instant load; update in background           |
| CSS / JS bundles    | Cache-first     | Hashed filenames; new deploy = new cache     |
| Calculator pages    | Cache-first     | Must work offline; no server data needed     |
| API responses       | Network-first   | Always show freshest data; fall back to cache |
| Workout plans       | Stale-while-    | Show cached version immediately; refresh in  |
|                     | revalidate      | background when online                       |
| User images/avatars | Cache-first     | Rarely change; save bandwidth                |
| Font files          | Cache-first     | Never change per version                     |
```

### Install Prompt Strategy

The install prompt should appear at a moment of high engagement, not on first visit. Strategy:

1. **Trigger conditions** (must meet at least one):
   - User has visited 3+ times (returning engaged user)
   - User has completed their first calculation (demonstrated value)
   - User has logged their first workout (committed user)
   - User has been on the platform for 5+ minutes in a single session

2. **Prompt UX:**
   - Custom in-app banner (not the browser's default prompt) with messaging: "Install GymGurus for quick access and offline calculators"
   - Show at bottom of screen, dismissible, non-blocking
   - If dismissed, don't show again for 7 days
   - Track install conversion rate in analytics

3. **Post-install experience:**
   - Redirect to a "Welcome to the app!" screen with tips
   - Pre-cache the user's workout plans for offline access
   - Enable push notification opt-in prompt

### Offline Capability Matrix

```
| Feature              | Offline Support | Implementation                          |
|----------------------|-----------------|-----------------------------------------|
| BMI Calculator       | Full            | All logic is client-side                |
| One Rep Max Calc     | Full            | All logic is client-side                |
| Strength Standards   | Full            | Cache standards data on install         |
| View Workout Plans   | Read-only       | Cache active plans; no edit offline     |
| Log Workouts         | Queue & Sync    | Store in IndexedDB; sync when online    |
| AI Chatbot           | None            | Requires server/API; show offline msg   |
| Client Management    | Read-only       | Cache client list; no CRUD offline      |
| Dashboard            | Partial         | Show cached stats; no real-time updates |
| Messaging            | Queue & Sync    | Queue outgoing; show cached messages    |
```

### Push Notification Setup

**Notification categories and triggers:**

| Category           | Trigger                              | Priority |
| ------------------ | ------------------------------------ | -------- |
| Workout Reminder   | 30 min before scheduled session      | High     |
| New Message        | Client or trainer sends a message    | High     |
| Progress Milestone | Client hits a PR or streak milestone | Medium   |
| Plan Update        | Trainer assigns or updates a plan    | Medium   |
| Weekly Summary     | Every Monday at 8am local time       | Low      |
| Inactivity Nudge   | No login for 5+ days                 | Low      |

**Technical implementation:**

- Use the Push API with VAPID keys for web push
- Firebase Cloud Messaging (FCM) as the push service
- Server-side notification queue to batch and deduplicate
- User preferences UI: allow toggling each category on/off
- Respect OS-level notification settings; never spam

### Metrics to Track (Phase 1 Success Criteria)

| Metric                     | Target                   | Measurement                            |
| -------------------------- | ------------------------ | -------------------------------------- |
| PWA install rate           | > 15% of MAU             | `beforeinstallprompt` + install events |
| Offline calculator usage   | > 5% of calc sessions    | Service worker fetch intercepts        |
| Push notification opt-in   | > 30% of installed users | Notification permission grants         |
| Lighthouse PWA score       | > 90                     | Automated CI checks                    |
| Mobile session duration    | +20% vs current          | Analytics comparison (pre/post PWA)    |
| Return visit rate (mobile) | +15% vs current          | 7-day retention cohort analysis        |

---

## App Store Optimization (for Future Native App)

If Phase 2 is triggered and a native app is published, the following ASO strategy should be applied:

### App Name

**"GymGurus: AI Fitness Coach & Trainer Platform"**

### Keyword Research Targets

| Primary Keywords          | Secondary Keywords  | Long-tail Keywords                  |
| ------------------------- | ------------------- | ----------------------------------- |
| personal trainer app      | workout planner     | AI workout generator for trainers   |
| fitness coaching platform | exercise tracker    | personal training client management |
| PT management software    | gym workout builder | fitness coach scheduling app        |
| client workout tracker    | strength calculator | one rep max calculator app          |
| trainer client management | fitness AI          | BMI calculator fitness app          |

### Screenshot Strategy (6 Screens)

1. **Dashboard overview** -- "Manage all your clients in one place"
2. **Workout builder** -- "Build custom workout plans in minutes"
3. **AI chatbot** -- "AI-powered fitness coaching assistant"
4. **Calculator suite** -- "Professional fitness calculators"
5. **Client progress** -- "Track client progress with detailed analytics"
6. **Mobile experience** -- "Train anywhere with offline access"

### App Store Description Template

```
GymGurus is the AI-powered fitness coaching platform that helps personal
trainers manage clients, build workout plans, and grow their business.

KEY FEATURES:
* AI Workout Builder -- Generate personalized workout plans with AI
* Client Management -- Track all your clients, their progress, and goals
* Fitness Calculators -- BMI, One Rep Max, Strength Standards, and more
* Smart Scheduling -- Manage sessions and send automated reminders
* Progress Tracking -- Visualize client improvements over time
* Offline Access -- Calculators and cached workouts work without internet

BUILT FOR PERSONAL TRAINERS:
Whether you train 5 clients or 50, GymGurus scales with your business.
Spend less time on admin and more time coaching.

POWERED BY AI:
Our AI assistant helps you design periodized programs, answer client
questions, and optimize training volume -- all backed by exercise science.

Download GymGurus today and transform how you coach.
```

---

## Related Decisions

- [ADR-001: Auth Architecture Migration](./001-auth-architecture-migration.md) -- Auth system impacts PWA session management and push notification user targeting
- Feature Prioritization: [Client mobile app (#14)](../strategy/feature-prioritization.md) -- This ADR provides the technical strategy for that roadmap item
