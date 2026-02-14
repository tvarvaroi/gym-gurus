# GymGurus Feature Prioritization (RICE Framework)

**Last updated:** 2026-02-14
**Stage:** Pre-launch, completing v2 rewrite
**Stack:** React 18 + TypeScript + Express + PostgreSQL

---

## 1. RICE Framework Explanation

RICE is a quantitative prioritization framework developed at Intercom. It removes gut-feel bias by scoring every feature across four dimensions and producing a single comparable number.

| Factor         | Definition                                              | Scale                                                        |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| **Reach**      | How many users will this impact per quarter?            | 1 (niche) to 10 (all users)                                  |
| **Impact**     | How much does this move the needle for those users?     | 0.25 = minimal, 0.5 = low, 1 = medium, 2 = high, 3 = massive |
| **Confidence** | How confident are we in the Reach and Impact estimates? | 0.5 = low, 0.8 = medium, 1.0 = high                          |
| **Effort**     | Person-months of engineering work required              | Lower is better for prioritization                           |

**Formula:**

```
RICE Score = (Reach x Impact x Confidence) / Effort
```

A higher RICE score means the feature delivers more validated value per unit of engineering time. Features with scores above 10 are strong candidates; below 2 are deprioritized unless strategically required.

---

## 2. Scoring Table

| #   | Feature                              | Status          | Reach | Impact | Confidence | Effort (PM) | RICE Score |
| --- | ------------------------------------ | --------------- | :---: | :----: | :--------: | :---------: | :--------: |
| 1   | IDOR security fix                    | DONE (Sprint 1) |  10   |   3    |    1.0     |     0.5     | **60.00**  |
| 2   | Stripe webhooks                      | DONE (Sprint 3) |  10   |   3    |    1.0     |     1.0     | **30.00**  |
| 3   | AI chatbot rebuild (Vercel AI SDK)   | DONE (Sprint 2) |   8   |   2    |    0.8     |     1.5     |  **8.53**  |
| 4   | Workout builder / mobile responsive  | DONE (Sprint 4) |   9   |   2    |    1.0     |     2.0     |  **9.00**  |
| 5   | Calculator SEO pages + cross-linking | DONE (Sprint 6) |   7   |   2    |    0.8     |     1.0     | **11.20**  |
| 6   | Mobile responsive polish             | Partial         |   9   |   2    |    1.0     |     0.5     | **36.00**  |
| 7   | Exercise library images              | Pending         |   8   |   1    |    1.0     |     1.0     |  **8.00**  |
| 8   | Video generation (Remotion)          | Pending         |   5   |   2    |    0.5     |     3.0     |  **1.67**  |
| 9   | Email sequences                      | Pending         |   7   |   2    |    0.8     |     1.5     |  **7.47**  |
| 10  | Referral program                     | Pending         |   4   |   2    |    0.5     |     2.0     |  **2.00**  |
| 11  | Comparison pages (vs competitors)    | Pending         |   6   |   1    |    0.8     |     0.5     |  **9.60**  |
| 12  | Blog/content system                  | Pending         |   6   |   1    |    0.8     |     2.0     |  **2.40**  |
| 13  | Push notifications                   | Pending         |   7   |   1    |    0.8     |     1.0     |  **5.60**  |
| 14  | Client mobile app (React Native/PWA) | Pending         |   8   |   3    |    0.5     |     5.0     |  **2.40**  |
| 15  | Zapier/API integrations              | Pending         |   3   |   1    |    0.5     |     3.0     |  **0.50**  |

### Scoring Rationale (Pending/Partial Features)

**#6 - Mobile responsive polish (RICE: 36.00)**
Reach is near-universal (9) because most trainer-client interactions happen on phones. Impact is high (2) as a polished mobile experience directly affects retention and first impressions. Confidence is high (1.0) because the v2 already has partial responsive work done, so scope is well understood. Only 0.5 PM of effort remains since the foundation exists.

**#7 - Exercise library images (RICE: 8.00)**
Impacts most users (8) since every trainer builds workouts from the exercise library. Medium impact (1) as it improves usability but is not a blocker. High confidence (1.0) because scope is a known asset pipeline task. Roughly 1 PM to source, optimize, and integrate images.

**#8 - Video generation via Remotion (RICE: 1.67)**
Moderate reach (5) as it appeals to trainers who share content on social media, not all users. High impact (2) for those who use it, as auto-generated video is a strong differentiator. Low confidence (0.5) because Remotion integration is unproven in this stack and render performance is uncertain. Significant effort (3 PM) for video pipeline, templates, rendering infrastructure, and storage.

**#9 - Email sequences (RICE: 7.47)**
Good reach (7) since email touches onboarding, client re-engagement, and billing. High impact (2) because automated email is a proven lever for SaaS retention and reactivation. Medium confidence (0.8) since we need to evaluate providers (Resend, SendGrid) and build templates. Moderate effort (1.5 PM) for provider integration, template system, and sequence logic.

**#10 - Referral program (RICE: 2.00)**
Lower reach (4) at pre-launch since the user base is small; referrals compound only at scale. High impact (2) for those who do refer, as word-of-mouth is the top acquisition channel for fitness SaaS. Low confidence (0.5) because referral mechanics, fraud prevention, and reward structure need validation. Moderate effort (2 PM) for referral tracking, reward fulfillment, and dashboard.

**#11 - Comparison pages (RICE: 9.60)**
Decent reach (6) as comparison pages target bottom-of-funnel search traffic (high intent). Medium impact (1) since they support conversion but do not change core product value. Medium confidence (0.8) because similar pages are well-understood SEO plays. Very low effort (0.5 PM) as these are primarily static content pages with structured data.

**#12 - Blog/content system (RICE: 2.40)**
Moderate reach (6) for SEO and content marketing. Medium impact (1) since blog content is a long-term play, not an immediate lever. Medium confidence (0.8) since CMS scope can grow unpredictably. Moderate effort (2 PM) for CMS, editor, categories, and SEO integration.

**#13 - Push notifications (RICE: 5.60)**
Good reach (7) as notifications touch workout reminders, messages, and scheduling. Medium impact (1) because push is a retention mechanism, not an acquisition one. Medium confidence (0.8) since service worker / FCM integration is well-documented. About 1 PM of effort for service worker setup, notification preferences, and backend triggers.

**#14 - Client mobile app (RICE: 2.40)**
High reach (8) since this serves every client of every trainer. Massive impact (3) as a native app experience dramatically improves client engagement. Low confidence (0.5) because React Native or PWA path is undecided, cross-platform testing is unpredictable, and app store approval adds risk. Largest effort item (5 PM) for build, test, deploy, and ongoing maintenance of a separate codebase.

**#15 - Zapier/API integrations (RICE: 0.50)**
Low reach (3) as only power users and agency trainers need integrations at launch. Medium impact (1) for those who do use it. Low confidence (0.5) because API design, rate limiting, auth, and Zapier certification are complex. High effort (3 PM) for public API, docs, Zapier app, and OAuth.

---

## 3. Prioritized Backlog

Features ordered by RICE score, grouped into priority tiers.

### Completed Features (for reference)

| Priority | Feature                              | RICE  | Sprint   |
| -------- | ------------------------------------ | :---: | -------- |
| --       | IDOR security fix                    | 60.00 | Sprint 1 |
| --       | Stripe webhooks                      | 30.00 | Sprint 3 |
| --       | Calculator SEO pages + cross-linking | 11.20 | Sprint 6 |
| --       | Workout builder / mobile responsive  | 9.00  | Sprint 4 |
| --       | AI chatbot rebuild (Vercel AI SDK)   | 8.53  | Sprint 2 |

### P0: Must Have for Launch

These features are required before opening signups to paying customers.

| Rank | Feature                  | RICE  | Effort | Rationale                                                                                                                                                             |
| :--: | ------------------------ | :---: | :----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1   | Mobile responsive polish | 36.00 | 0.5 PM | Trainers live on mobile. A half-broken responsive experience kills conversions at first visit. The remaining work is small since the foundation exists from Sprint 4. |

> **Note:** The completed features (IDOR fix, Stripe webhooks, workout builder, AI chatbot, SEO calculators) already cover the other P0 requirements. Mobile polish is the last remaining launch blocker.

### P1: First 3 Months Post-Launch

High-value features to build momentum, drive early acquisition, and improve retention.

| Rank | Feature                           | RICE | Effort | Rationale                                                                                                            |
| :--: | --------------------------------- | :--: | :----: | -------------------------------------------------------------------------------------------------------------------- |
|  2   | Comparison pages (vs competitors) | 9.60 | 0.5 PM | Low-effort, high-intent SEO pages that convert searchers comparing tools. Builds on existing SEO work from Sprint 6. |
|  3   | Exercise library images           | 8.00 | 1.0 PM | Visual exercise library makes workout creation faster and more professional. Improves perceived product quality.     |
|  4   | Email sequences                   | 7.47 | 1.5 PM | Automated onboarding, re-engagement, and billing emails. Critical infrastructure for SaaS retention.                 |
|  5   | Push notifications                | 5.60 | 1.0 PM | Workout reminders and message alerts keep clients engaged between sessions. Retention lever.                         |

### P2: 3-6 Months Post-Launch

Growth and differentiation features that require a user base to validate.

| Rank | Feature                              | RICE | Effort | Rationale                                                                                                                 |
| :--: | ------------------------------------ | :--: | :----: | ------------------------------------------------------------------------------------------------------------------------- |
|  6   | Blog/content system                  | 2.40 | 2.0 PM | SEO compound growth. Start after comparison pages prove the content-led acquisition model.                                |
|  7   | Client mobile app (React Native/PWA) | 2.40 | 5.0 PM | Massive impact but massive effort. Evaluate PWA-first approach to reduce scope. Wait for user feedback to confirm demand. |
|  8   | Referral program                     | 2.00 | 2.0 PM | Referrals compound with scale. Build after reaching 50+ active trainers so the flywheel has fuel.                         |

### P3: Nice to Have / Future

Lower urgency. Build when there is clear user demand or strategic partnership opportunity.

| Rank | Feature                     | RICE | Effort | Rationale                                                                                                                     |
| :--: | --------------------------- | :--: | :----: | ----------------------------------------------------------------------------------------------------------------------------- |
|  9   | Video generation (Remotion) | 1.67 | 3.0 PM | Strong differentiator but risky and expensive. Prototype only after core product is stable and retention metrics are healthy. |
|  10  | Zapier/API integrations     | 0.50 | 3.0 PM | Enterprise/agency feature. Premature before product-market fit. Revisit when enterprise trainers request it.                  |

---

## 4. Dependencies

```
Mobile responsive polish (#6)
  --> No blockers. Can start immediately.

Comparison pages (#11)
  --> Depends on: Calculator SEO pages (#5) [DONE]
  --> Benefits from consistent SEO infrastructure and cross-linking.

Exercise library images (#7)
  --> No hard blockers.
  --> Nice to have before: Client mobile app (#14)
  --> Reason: Images should be optimized once, served everywhere.

Email sequences (#9)
  --> No hard blockers.
  --> Should be done before: Referral program (#10)
  --> Reason: Referral invites and reward notifications need email infrastructure.

Push notifications (#13)
  --> No hard blockers.
  --> Benefits from: Client mobile app (#14) if PWA path is chosen.
  --> Can be implemented as web push first, extended to native later.

Blog/content system (#12)
  --> Depends on: Comparison pages (#11) (validates content-led SEO strategy)
  --> Benefits from: Email sequences (#9) for content distribution.

Client mobile app (#14)
  --> Depends on: Mobile responsive polish (#6) (defines mobile UX patterns)
  --> Depends on: Exercise library images (#7) (assets ready for mobile)
  --> Depends on: Push notifications (#13) (can share service worker infra)

Referral program (#10)
  --> Depends on: Email sequences (#9) (invite and reward emails)
  --> Depends on: Stripe webhooks (#2) [DONE] (reward credit/discount logic)

Video generation (#8)
  --> No hard blockers.
  --> Benefits from: Exercise library images (#7) (visual assets for video)
  --> High standalone complexity; can be built independently.

Zapier/API integrations (#15)
  --> Depends on: Stable API surface (post-launch stabilization)
  --> Should wait until core product API is frozen.
```

### Dependency Graph (Simplified)

```
                    +-----------------+
                    | Mobile Polish   |
                    | (#6) P0        |
                    +--------+--------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+         +---------v---------+
    | Comparison Pages  |         | Exercise Library  |
    | (#11) P1          |         | Images (#7) P1    |
    +---------+---------+         +---------+---------+
              |                             |
    +---------v---------+                   |
    | Blog/Content      |                   |
    | (#12) P2          |                   |
    +-------------------+                   |
                                            |
    +-------------------+         +---------v---------+
    | Email Sequences   +-------->| Client Mobile App |
    | (#9) P1           |         | (#14) P2          |
    +---------+---------+         +---------+---------+
              |                             ^
    +---------v---------+                   |
    | Referral Program  |         +---------+---------+
    | (#10) P2          |         | Push Notifications|
    +-------------------+         | (#13) P1          |
                                  +-------------------+
```

---

## 5. Quick Wins

Features with high RICE score and low effort (under 1 PM). These deliver disproportionate value for engineering time invested.

| Feature                       | RICE  | Effort | Why It's a Quick Win                                                                                                                                |
| ----------------------------- | :---: | :----: | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile responsive polish (#6) | 36.00 | 0.5 PM | Foundation exists from Sprint 4. Remaining work is CSS/layout fixes and testing across breakpoints. Highest ROI item on the entire board.           |
| Comparison pages (#11)        | 9.60  | 0.5 PM | Static content pages with structured data markup. Reuses SEO patterns from calculator pages. Directly targets high-intent "GymGurus vs X" searches. |
| Exercise library images (#7)  | 8.00  | 1.0 PM | Asset sourcing + optimization pipeline. No complex backend logic. Visually transforms the product.                                                  |

**Combined quick-win effort:** 2.0 person-months for a combined RICE of 53.60.

---

## 6. Recommendation: Next 5 Features to Build

Based on RICE scores, dependencies, and strategic positioning for a pre-launch SaaS product, the recommended build order is:

### Immediate (Current/Next Sprint)

| Order | Feature                               | RICE  | Effort | Timeline |
| :---: | ------------------------------------- | :---: | :----: | -------- |
| **1** | **Mobile responsive polish**          | 36.00 | 0.5 PM | Week 1-2 |
| **2** | **Comparison pages (vs competitors)** | 9.60  | 0.5 PM | Week 2-3 |

**Why this order:** Mobile polish is the last launch blocker and the highest-scoring remaining feature. Comparison pages are nearly zero-effort and capitalize on the SEO infrastructure already built in Sprint 6. Together, these two items take 1 PM and produce a launch-ready, SEO-optimized product.

### Post-Launch Sprint 1

| Order | Feature                     | RICE | Effort | Timeline  |
| :---: | --------------------------- | :--: | :----: | --------- |
| **3** | **Exercise library images** | 8.00 | 1.0 PM | Month 1   |
| **4** | **Email sequences**         | 7.47 | 1.5 PM | Month 1-2 |

**Why this order:** Exercise images improve product quality and perceived professionalism immediately, which matters when first users are forming opinions. Email sequences follow because onboarding emails are the single most impactful retention tool for early SaaS products. Both can run in parallel if there are two engineers.

### Post-Launch Sprint 2

| Order | Feature                | RICE | Effort | Timeline  |
| :---: | ---------------------- | :--: | :----: | --------- |
| **5** | **Push notifications** | 5.60 | 1.0 PM | Month 2-3 |

**Why this order:** After email infrastructure is in place, push notifications complete the communication stack. Workout reminders and message alerts keep clients returning between training sessions, which is the core retention loop for a fitness platform.

### Summary

```
Total effort for next 5 features:  4.5 person-months
Combined RICE value:                66.67
Average RICE per feature:           13.33
```

This sequence prioritizes launch readiness first, then retention infrastructure, then engagement mechanics. It deliberately defers high-effort, low-confidence items (video generation, mobile app, Zapier) until the core product has real users generating real feedback.

---

_This document should be revisited monthly as user feedback and usage data become available. RICE scores for pending features should be re-evaluated after launch when Reach and Confidence estimates can be grounded in actual metrics._
