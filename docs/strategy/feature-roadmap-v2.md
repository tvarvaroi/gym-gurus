# GymGurus Feature Roadmap v2: Brainstorm & RICE Prioritization

**Last updated:** 2026-02-14
**Stage:** Post-v1 planning, growth phase
**Stack:** React 18 + TypeScript + Express + PostgreSQL
**Guiding question:** _"What features would make trainers tell other trainers about GymGurus?"_

---

## 1. Feature Brainstorm by Category

### Category 1: Viral Features

Features designed to generate organic word-of-mouth and social sharing. These turn everyday trainer-client interactions into marketing moments.

| #   | Feature                             | Description                                                                                                          |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Client Progress Reports (Shareable) | Auto-generated progress reports with charts, PRs, and body comp changes. Exportable as branded image/PDF for social. |
| 2   | Workout Completion Certificates     | Visual certificates awarded when clients complete a training block or challenge. Shareable to Instagram/stories.     |
| 3   | Before/After Comparison Generator   | Side-by-side photo comparison tool with date stamps, measurements overlay, and trainer branding/watermark.           |
| 4   | Trainer Leaderboard (Opt-in)        | Anonymous or named ranking of trainers by client outcomes, certifications, or platform engagement. Gamified.         |

**Why these drive virality:** Every shared progress report or certificate includes the GymGurus brand. Trainers sharing client wins is the #1 organic acquisition channel in fitness. The before/after generator turns transformation photos (already viral content) into branded marketing assets.

### Category 2: Integration Features

Features that connect GymGurus to the broader fitness and productivity ecosystem. These reduce friction and make GymGurus the hub of a trainer's workflow.

| #   | Feature                                            | Description                                                                                                      |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 5   | Zapier/Make Integration                            | Webhook-based integration enabling workflow automation: new client -> CRM, completed workout -> email, etc.      |
| 6   | MyFitnessPal Sync                                  | Two-way nutrition data sync. Import client food logs; export calorie targets based on training phase.            |
| 7   | Apple Health / Google Fit Integration              | Sync step counts, heart rate, sleep data, and activity minutes. Enrich client profiles with passive health data. |
| 8   | Wearable Data Import (Fitbit, Garmin, Apple Watch) | Pull workout data, HRV, recovery scores, and sleep quality from popular wearables into client dashboards.        |

**Why these matter:** Trainers want one platform, not five. Integration with the tools clients already use (MyFitnessPal, Apple Watch) reduces data entry and makes GymGurus stickier. Zapier enables power users and agencies to build custom workflows without us writing custom code.

### Category 3: AI Features

Features that leverage AI to automate complex coaching decisions. These are differentiators that justify premium pricing and create moats.

| #   | Feature                     | Description                                                                                                                                                            |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | Auto-Periodization          | AI designs multi-week training blocks based on client goals, training history, and recovery data. Adjusts volume, intensity, and exercise selection across mesocycles. |
| 10  | Injury Risk Assessment      | Analyze training load trends, movement pattern data, and volume spikes to flag potential overtraining or injury risk. Alert trainers before problems occur.            |
| 11  | AI Nutrition Plan Generator | Generate macro-based meal plans considering dietary preferences, allergies, training phase, and calorie targets. Export as PDF or in-app view.                         |
| 12  | AI Workout Volume Optimizer | Analyze per-muscle-group volume across a training week. Recommend adjustments to hit evidence-based volume landmarks (e.g., 10-20 sets/muscle/week).                   |

**Why AI is a moat:** Competitors offer workout builders, but few offer AI that actually understands periodization science. Auto-periodization alone could save trainers 2-3 hours per week per client. These features justify a premium tier and are hard for competitors to replicate quickly.

### Category 4: Community Features

Features that create network effects and make GymGurus a platform, not just a tool.

| #   | Feature                         | Description                                                                                                                                                 |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | Exercise Library Contributions  | Trainers can submit custom exercises with descriptions, videos, and tags. Community votes on quality. Curated additions to the global library.              |
| 14  | Template Marketplace (Buy/Sell) | Trainers create and sell workout templates, programs, and training blocks. GymGurus takes a platform fee (10-15%). Enables passive income for top trainers. |
| 15  | Trainer Forum / Community Chat  | In-platform discussion forum organized by topics (programming, nutrition, business, certifications). Builds community and reduces churn.                    |

**Why community creates lock-in:** A trainer with 50 exercises in the library, 10 templates for sale, and daily forum activity will never switch platforms. Community features create switching costs that compound over time. The marketplace also creates a new revenue stream.

### Category 5: Business Features

Features that help trainers run the business side of personal training. These address the #2 pain point after programming: admin and billing.

| #   | Feature                              | Description                                                                                                                                        |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | Invoice Generation + PDF Export      | Generate professional invoices from session data. Auto-populate client details, session counts, and rates. Export as branded PDF.                  |
| 17  | Client Billing (Automated Recurring) | Stripe-powered recurring billing. Trainers set package prices; clients auto-charged monthly. Handles failed payments, receipts, and cancellations. |
| 18  | Tax Report Generation                | Annual/quarterly summaries of income by client, expense categories, and tax-deductible items. Export for accountant or tax software (CSV/PDF).     |
| 19  | Client Attendance Tracking           | Track session attendance, no-shows, late cancellations, and package usage. Auto-flag clients approaching package expiry.                           |

**Why business features retain:** Trainers who route their billing and invoicing through GymGurus are deeply locked in. Financial data is the stickiest data. Attendance tracking solves a universal pain point and ties directly into billing.

---

## 2. RICE Scoring

### Methodology

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

### Full Scoring Table

| Rank |  #  | Feature                               | Category    | Reach | Impact | Confidence | Effort (PM) | RICE Score |
| :--: | :-: | ------------------------------------- | ----------- | :---: | :----: | :--------: | :---------: | :--------: |
|  1   |  1  | Client Progress Reports (Shareable)   | Viral       |   9   |   3    |    0.8     |     2.0     | **10.80**  |
|  2   | 19  | Client Attendance Tracking            | Business    |   8   |   2    |    1.0     |     1.5     | **10.67**  |
|  3   | 12  | AI Workout Volume Optimizer           | AI          |   7   |   2    |    0.8     |     1.5     |  **7.47**  |
|  4   | 17  | Client Billing (Automated Recurring)  | Business    |   8   |   3    |    0.8     |     3.0     |  **6.40**  |
|  5   |  3  | Before/After Comparison Generator     | Viral       |   7   |   2    |    0.8     |     2.0     |  **5.60**  |
|  6   | 16  | Invoice Generation + PDF Export       | Business    |   6   |   2    |    1.0     |     2.0     |  **6.00**  |
|  7   |  9  | Auto-Periodization                    | AI          |   6   |   3    |    0.5     |     2.5     |  **3.60**  |
|  8   |  2  | Workout Completion Certificates       | Viral       |   6   |   1    |    0.8     |     1.0     |  **4.80**  |
|  9   |  7  | Apple Health / Google Fit Integration | Integration |   7   |   2    |    0.5     |     3.0     |  **2.33**  |
|  10  | 11  | AI Nutrition Plan Generator           | AI          |   5   |   2    |    0.5     |     2.5     |  **2.00**  |
|  11  | 13  | Exercise Library Contributions        | Community   |   5   |   1    |    0.8     |     2.0     |  **2.00**  |
|  12  |  8  | Wearable Data Import                  | Integration |   4   |   2    |    0.5     |     3.5     |  **1.14**  |
|  13  | 18  | Tax Report Generation                 | Business    |   4   |   1    |    0.8     |     2.0     |  **1.60**  |
|  14  |  6  | MyFitnessPal Sync                     | Integration |   5   |   1    |    0.5     |     2.5     |  **1.00**  |
|  15  | 10  | Injury Risk Assessment                | AI          |   3   |   2    |    0.5     |     4.0     |  **0.75**  |

### Scoring Rationale

**#1 - Client Progress Reports (RICE: 10.80)**
Reach is near-universal (9) because every trainer with active clients needs to demonstrate results. Massive impact (3) since shareable progress reports serve dual purposes: client retention (proof of value) and organic marketing (branded social content). Medium confidence (0.8) because the data model for tracking progress already exists; the work is primarily UI/PDF generation. Effort is 2 PM for the report template engine, chart rendering, PDF/image export pipeline, and social sharing integration.

**#2 - Client Attendance Tracking (RICE: 10.67)**
High reach (8) as attendance management is relevant to every trainer running sessions. High impact (2) because attendance tracking directly ties into billing accuracy, client accountability, and package management. High confidence (1.0) since this is a well-scoped CRUD feature with clear requirements. Moderate effort (1.5 PM) for the tracking UI, calendar integration, no-show flagging, and package usage counters.

**#3 - AI Workout Volume Optimizer (RICE: 7.47)**
Good reach (7) since volume optimization helps any trainer writing programs. High impact (2) as it provides actionable, evidence-based recommendations that save programming time. Medium confidence (0.8) because the underlying exercise science (volume landmarks per muscle group) is well-established and quantifiable. Effort is 1.5 PM for muscle group tagging, volume calculation logic, and recommendation UI.

**#4 - Client Billing (RICE: 6.40)**
High reach (8) since billing is universal for paid training services. Massive impact (3) because automated billing eliminates the #1 administrative burden trainers report. Medium confidence (0.8) since Stripe integration already exists (webhooks are done); extending to recurring billing is a known path. Higher effort (3 PM) due to subscription management complexity, failed payment handling, receipt generation, and financial compliance requirements.

**#5 - Before/After Comparison Generator (RICE: 5.60)**
Good reach (7) as transformation photos are a staple of fitness marketing. High impact (2) since a polished comparison tool with branding elevates the trainer's professional image. Medium confidence (0.8) because image processing and canvas-based overlays are well-understood. Effort is 2 PM for the photo upload flow, comparison layout engine, measurement overlays, and branded export.

**#6 - Invoice Generation (RICE: 6.00)**
Moderate reach (6) as not all trainers invoice (some use billing packages instead). High impact (2) because professional invoices improve payment collection and business legitimacy. High confidence (1.0) as PDF generation is a solved problem with libraries like jsPDF or server-side rendering. Effort is 2 PM for invoice templates, auto-population from session data, and PDF export.

**#7 - Auto-Periodization (RICE: 3.60)**
Moderate reach (6) since periodization is most relevant to intermediate/advanced trainers, not all users. Massive impact (3) as this is the single highest-value AI feature -- automating weeks of programming work. Low confidence (0.5) because the AI model needs significant training data and the output quality is uncertain. Effort is 2.5 PM for the periodization engine, training block UI, and progressive overload logic.

**#8 - Workout Completion Certificates (RICE: 4.80)**
Moderate reach (6) as certificates appeal to a subset of client-trainer relationships (challenges, milestones). Medium impact (1) since certificates are a nice-to-have engagement feature, not a core workflow. Medium confidence (0.8) because the design and generation pipeline is straightforward. Low effort (1 PM) for certificate templates, trigger logic, and share functionality.

**#9 - Apple Health / Google Fit (RICE: 2.33)**
Good reach (7) since most clients have smartphones with health apps. High impact (2) because passive data enrichment (steps, sleep, heart rate) gives trainers holistic client insight. Low confidence (0.5) due to complex API integrations, OAuth flows, and platform-specific differences between HealthKit and Google Fit. High effort (3 PM) for both platform integrations, data normalization, and privacy compliance.

**#10 - AI Nutrition Plan Generator (RICE: 2.00)**
Moderate reach (5) since nutrition is adjacent to but distinct from workout programming; not all trainers offer nutrition. High impact (2) for those who do, as meal planning is extremely time-consuming. Low confidence (0.5) because AI-generated nutrition plans carry liability risk and require careful validation. Effort is 2.5 PM for the nutrition database, macro calculator, meal plan generator, and dietary restriction handling.

**#11 - Exercise Library Contributions (RICE: 2.00)**
Moderate reach (5) as it primarily benefits trainers who use non-standard exercises. Medium impact (1) since it enriches the library but doesn't change core workflows. Medium confidence (0.8) because user-generated content systems have well-known patterns. Effort is 2 PM for the submission flow, review/approval system, voting mechanism, and content moderation.

**#12 - Wearable Data Import (RICE: 1.14)**
Lower reach (4) since wearable ownership varies and data import is a power-user feature. High impact (2) for those who use it, as HRV and recovery data can inform programming decisions. Low confidence (0.5) because each wearable brand has different APIs, data formats, and authentication. High effort (3.5 PM) for Fitbit, Garmin, and Apple Watch integrations individually.

**#13 - Tax Report Generation (RICE: 1.60)**
Lower reach (4) since only self-employed trainers (not gym employees) need tax reporting. Medium impact (1) since trainers currently use spreadsheets or accountants. Medium confidence (0.8) because financial reporting is well-defined but jurisdiction-specific. Effort is 2 PM for income aggregation, category classification, and CSV/PDF export.

**#14 - MyFitnessPal Sync (RICE: 1.00)**
Moderate reach (5) since MyFitnessPal is the most popular food logging app. Medium impact (1) because it saves data re-entry but doesn't create new capabilities. Low confidence (0.5) because MFP's API access has been restricted and unreliable; they've deprecated their public API multiple times. Effort is 2.5 PM assuming API access is obtainable.

**#15 - Injury Risk Assessment (RICE: 0.75)**
Low reach (3) since meaningful injury prediction requires significant training data that most clients won't have. High impact (2) for those who can use it, as injury prevention is extremely valuable. Low confidence (0.5) because the AI/ML model for injury prediction is a research problem, not a solved engineering task. Very high effort (4 PM) for data collection, model training, validation, and UI.

---

## 3. Ranked Backlog

Ordered by RICE score. This is the recommended build sequence, subject to dependency and strategic adjustments.

| Priority | Feature                               | RICE  | Effort | Category    |
| :------: | ------------------------------------- | :---: | :----: | ----------- |
|    1     | Client Progress Reports (Shareable)   | 10.80 | 2.0 PM | Viral       |
|    2     | Client Attendance Tracking            | 10.67 | 1.5 PM | Business    |
|    3     | AI Workout Volume Optimizer           | 7.47  | 1.5 PM | AI          |
|    4     | Client Billing (Automated Recurring)  | 6.40  | 3.0 PM | Business    |
|    5     | Invoice Generation + PDF Export       | 6.00  | 2.0 PM | Business    |
|    6     | Before/After Comparison Generator     | 5.60  | 2.0 PM | Viral       |
|    7     | Workout Completion Certificates       | 4.80  | 1.0 PM | Viral       |
|    8     | Auto-Periodization                    | 3.60  | 2.5 PM | AI          |
|    9     | Apple Health / Google Fit Integration | 2.33  | 3.0 PM | Integration |
|    10    | AI Nutrition Plan Generator           | 2.00  | 2.5 PM | AI          |
|    11    | Exercise Library Contributions        | 2.00  | 2.0 PM | Community   |
|    12    | Tax Report Generation                 | 1.60  | 2.0 PM | Business    |
|    13    | Wearable Data Import                  | 1.14  | 3.5 PM | Integration |
|    14    | MyFitnessPal Sync                     | 1.00  | 2.5 PM | Integration |
|    15    | Injury Risk Assessment                | 0.75  | 4.0 PM | AI          |

**Not scored (deferred to community validation):**

- Trainer Leaderboard (#4) -- Needs opt-in research and privacy considerations
- Template Marketplace (#14) -- Requires critical mass of users; premature before 100+ active trainers
- Trainer Forum / Community Chat (#15) -- Community features need a user base to be valuable
- Zapier/Make Integration (#5) -- Scored in v1 prioritization doc (RICE: 0.50); revisit when API surface stabilizes

---

## 4. Phase Planning

### Phase 1: Next 3 Months (Months 1-3)

**Theme: "Make trainers look professional and save them time"**

Focus on the three highest-RICE features that deliver immediate, tangible value to trainers and their clients. These features also have the highest organic sharing potential.

| Order | Feature                             | RICE  | Effort | Month | Dependencies                  |
| :---: | ----------------------------------- | :---: | :----: | :---: | ----------------------------- |
|   1   | Client Progress Reports (Shareable) | 10.80 | 2.0 PM |  1-2  | None                          |
|   2   | Client Attendance Tracking          | 10.67 | 1.5 PM |  1-2  | None (can parallel with #1)   |
|   3   | AI Workout Volume Optimizer         | 7.47  | 1.5 PM |  2-3  | Exercise muscle group tagging |

**Phase 1 totals:**

- Combined effort: 5.0 person-months
- Combined RICE: 28.94
- Average RICE per feature: 9.65

**Expected outcomes:**

- Trainers can generate and share branded progress reports (organic acquisition channel)
- Session attendance data improves billing accuracy and client accountability
- AI volume recommendations differentiate GymGurus from "dumb" workout builders
- Social sharing of progress reports creates first viral loop

**Success metrics:**

- 30%+ of active trainers generate at least 1 progress report per month
- 50%+ of trainers use attendance tracking weekly
- Volume optimizer recommendations accepted in 40%+ of cases
- 10+ progress reports shared to social media per month (tracked via share button + UTM)

### Phase 2: Months 4-6

**Theme: "Turn GymGurus into the business hub for trainers"**

Add billing and invoicing to make GymGurus indispensable for the business side of personal training. Complement with viral features that drive continued organic growth.

| Order | Feature                              | RICE | Effort | Month | Dependencies                            |
| :---: | ------------------------------------ | :--: | :----: | :---: | --------------------------------------- |
|   4   | Client Billing (Automated Recurring) | 6.40 | 3.0 PM |  4-5  | Stripe webhooks (done), attendance data |
|   5   | Invoice Generation + PDF Export      | 6.00 | 2.0 PM |  4-5  | Can parallel with billing               |
|   6   | Before/After Comparison Generator    | 5.60 | 2.0 PM |  5-6  | Photo upload infrastructure             |
|   7   | Workout Completion Certificates      | 4.80 | 1.0 PM |   6   | None (lightweight)                      |
|   8   | Auto-Periodization                   | 3.60 | 2.5 PM |  5-6  | Volume optimizer data from Phase 1      |

**Phase 2 totals:**

- Combined effort: 10.5 person-months
- Combined RICE: 26.40
- Average RICE per feature: 5.28

**Expected outcomes:**

- Trainers process payments directly through GymGurus (massive lock-in)
- Professional invoicing replaces manual spreadsheet/Venmo workflows
- Before/after tool generates shareable transformation content with GymGurus branding
- Certificates add gamification and milestone celebration for clients
- Auto-periodization is the "wow" feature that justifies premium pricing

**Success metrics:**

- 20%+ of trainers process at least 1 payment through the platform monthly
- Invoice generation used by 15%+ of billing-active trainers
- Before/after comparisons shared at 2x the rate of progress reports
- Auto-periodization adopted by 25%+ of trainers within first month of release

### Phase 3: Months 7-12

**Theme: "Expand the ecosystem and deepen the moat"**

Integration features, remaining AI capabilities, and community features that increase switching costs and expand the platform's data advantage.

| Order | Feature                               | RICE | Effort | Month | Dependencies                               |
| :---: | ------------------------------------- | :--: | :----: | :---: | ------------------------------------------ |
|   9   | Apple Health / Google Fit Integration | 2.33 | 3.0 PM |  7-8  | PWA or native app decision (see ADR-005)   |
|  10   | AI Nutrition Plan Generator           | 2.00 | 2.5 PM |  8-9  | Nutrition database, liability review       |
|  11   | Exercise Library Contributions        | 2.00 | 2.0 PM | 9-10  | Content moderation system                  |
|  12   | Tax Report Generation                 | 1.60 | 2.0 PM | 10-11 | Billing data from Phase 2                  |
|  13   | Wearable Data Import                  | 1.14 | 3.5 PM | 10-12 | Health integration from earlier in Phase 3 |
|  14   | MyFitnessPal Sync                     | 1.00 | 2.5 PM | 11-12 | MFP API availability verification          |
|  15   | Injury Risk Assessment                | 0.75 | 4.0 PM |  12+  | Sufficient training data accumulated       |

**Phase 3 totals:**

- Combined effort: 19.5 person-months
- Combined RICE: 10.82
- Average RICE per feature: 1.55

**Expected outcomes:**

- Health and wearable integrations make GymGurus the central data hub
- Nutrition planning expands service offering beyond workout programming
- Community exercise contributions build a proprietary content library
- Tax reporting deepens the financial lock-in started in Phase 2

**Risk note:** Phase 3 features have lower RICE scores and higher uncertainty. Each should be re-evaluated against actual user feedback and usage data from Phases 1 and 2 before committing engineering resources. Some may be deprioritized or replaced entirely based on what we learn.

---

## 5. Dependencies and Sequencing

```
Phase 1 (Months 1-3)
=====================
Client Progress Reports --------+
                                 |
Client Attendance Tracking ------+--> Billing data foundation
                                 |
AI Volume Optimizer -------------|---> Periodization data

Phase 2 (Months 4-6)
=====================
Client Billing <---- Attendance data + Stripe webhooks (done)
  |
  +--> Invoice Generation (shares billing data model)
  |
  +--> Tax Reports (Phase 3, depends on billing history)

Before/After Generator ---------> Social sharing pipeline
  |
  +--> Workout Certificates (shares asset generation infra)

Auto-Periodization <---- Volume Optimizer data + Exercise tagging

Phase 3 (Months 7-12)
=====================
Apple Health / Google Fit -------> Wearable Data Import (extends health infra)
  |
  +--> Injury Risk Assessment (needs accumulated health data)

AI Nutrition Plan Generator -----> MyFitnessPal Sync (shares nutrition data model)

Exercise Library Contributions --> Template Marketplace (future, needs content volume)
```

---

## 6. Features NOT Prioritized (and Why)

| Feature                 | Reason Deferred                                                                                                 | Revisit When                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Trainer Leaderboard     | Privacy concerns, opt-in complexity, and potential negative competitive dynamics among trainers on the platform | 200+ active trainers, community feedback  |
| Template Marketplace    | Requires critical mass of content creators and buyers; marketplace dynamics don't work with < 100 trainers      | 100+ active trainers with 500+ templates  |
| Trainer Forum           | Community features need a user base to generate value; empty forums signal a dead product                       | 50+ daily active trainers                 |
| Zapier/Make Integration | API surface needs to stabilize post-launch; premature to expose a public API that may change                    | API stable for 3+ months, enterprise asks |

---

## 7. Revenue Impact Estimates

| Feature               | Revenue Mechanism                                 | Estimated Monthly Revenue at 500 Users  |
| --------------------- | ------------------------------------------------- | :-------------------------------------: |
| Client Billing        | Transaction fee (2-3% on top of Stripe)           |             $2,000 - $5,000             |
| Template Marketplace  | Platform fee (10-15% of template sales)           |              $500 - $1,500              |
| Auto-Periodization    | Premium tier upsell ($10-20/mo upgrade)           |             $1,500 - $3,000             |
| AI Nutrition Plans    | Premium tier upsell ($10-20/mo upgrade)           |             $1,000 - $2,000             |
| Wearable Integrations | Premium tier upsell ($5-10/mo upgrade)            |              $500 - $1,000              |
| Invoice Generation    | Included in base plan (retention feature)         |     Indirect (reduces churn by ~5%)     |
| Progress Reports      | Included in base plan (viral acquisition feature) | Indirect (drives 10-15% organic growth) |

---

## 8. Effort Summary

| Phase     | Duration      | Total Effort | Features | Avg RICE | Theme                       |
| --------- | ------------- | :----------: | :------: | :------: | --------------------------- |
| Phase 1   | Months 1-3    |    5.0 PM    |    3     |   9.65   | Professional tools & AI     |
| Phase 2   | Months 4-6    |   10.5 PM    |    5     |   5.28   | Business hub & viral growth |
| Phase 3   | Months 7-12   |   19.5 PM    |    7     |   1.55   | Ecosystem & integrations    |
| **Total** | **12 months** | **35.0 PM**  |  **15**  | **4.43** | **Full roadmap**            |

**Staffing implications:**

- Phase 1 is achievable with 1-2 developers
- Phase 2 requires 2-3 developers (billing complexity needs dedicated focus)
- Phase 3 requires 2-3 developers plus potential specialist for wearable integrations
- Full 12-month roadmap requires an average team of 3 developers

---

## 9. Open Questions

1. **Billing liability:** Do we need a money transmitter license to process payments on behalf of trainers, or does Stripe Connect handle this?
2. **Nutrition liability:** AI-generated nutrition plans could carry health liability. Do we need a disclaimer, or should we limit to macro suggestions only (not meal plans)?
3. **MyFitnessPal API:** Is the MFP API still accessible for third-party integrations, or has it been fully deprecated?
4. **Wearable priority:** Should we prioritize Apple Watch (iOS-heavy user base) or Fitbit/Garmin (broader fitness market) first?
5. **Auto-periodization accuracy:** What training data volume is needed before the AI produces reliable periodization recommendations?
6. **Template marketplace economics:** What commission rate balances trainer incentive with platform revenue? (10%? 15%? 20%?)

---

_This roadmap should be revisited quarterly. RICE scores for Phase 2 and Phase 3 features should be re-evaluated after Phase 1 completion, incorporating real user feedback and usage data. Features may be reordered, split, merged, or dropped entirely based on what we learn._

_Related documents:_

- _[Feature Prioritization v1](./feature-prioritization.md) -- Original RICE scoring for launch features_
- _[ADR-005: Mobile Strategy](../decisions/005-mobile-strategy.md) -- Impacts integration features requiring native APIs_
- _[Market Analysis](./market-analysis.md) -- Competitive landscape informing feature differentiation_
