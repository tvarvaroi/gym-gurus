# GymGurus Email Marketing Sequences & Strategy

**Document Version:** 1.0
**Last Updated:** February 2026
**Status:** Pre-launch Planning
**Brand Colors:** Electric Blue (#3B82F6) | Emerald (#10B981)
**Brand Voice:** Professional but approachable, Gen Z friendly, fitness-enthusiast energy

---

## Table of Contents

1. [Welcome Email Sequence (Trainer Signups)](#1-welcome-email-sequence-trainer-signups)
2. [Trial Expiration Sequence](#2-trial-expiration-sequence)
3. [Solo User Welcome Sequence](#3-solo-user-welcome-sequence)
4. [Send Schedule Summary](#4-send-schedule-summary)
5. [Email Service Provider Recommendation](#5-email-service-provider-recommendation)
6. [Technical Integration (Express.js)](#6-technical-integration-expressjs)
7. [Unsubscribe & Legal Compliance](#7-unsubscribe--legal-compliance)
8. [KPI Tracking & Targets](#8-kpi-tracking--targets)
9. [Personalization Variables Reference](#9-personalization-variables-reference)

---

## 1. Welcome Email Sequence (Trainer Signups)

**Trigger:** New user signs up with `role = 'trainer'`
**Sequence Length:** 5 emails over 14 days
**Goal:** Activate the trainer (add first client, create first workout, explore AI coach and calculators) and establish the product as indispensable within the trial period.

---

### Email 1: Welcome & Quick Start

| Field                         | Value                                                                  |
| ----------------------------- | ---------------------------------------------------------------------- |
| **Send Timing**               | Day 0 (immediately on signup)                                          |
| **Subject Line**              | Welcome to GymGurus -- here's how to get started                       |
| **Preview Text**              | Add your first client and build your first workout in under 5 minutes. |
| **CTA**                       | Add Your First Client                                                  |
| **CTA URL**                   | `{{appUrl}}/clients`                                                   |
| **Personalization Variables** | `{{firstName}}`, `{{appUrl}}`                                          |

**Plaintext Body:**

```
Hey {{firstName}},

Welcome to GymGurus -- we're pumped to have you here.

You just joined the AI-powered platform that's helping independent trainers manage clients smarter, build programs faster, and save hours every week. Let's make sure you get the most out of it from Day 1.

Here's your 3-step quick start:

1. ADD YOUR FIRST CLIENT
Head to your Clients page and tap "Add Client." Enter their name, email, and goals. That's it -- they're in.
{{appUrl}}/clients

2. CREATE YOUR FIRST WORKOUT
Go to Workouts and build a program from scratch, or start from one of our pre-built templates. Drag, drop, customize. Done.
{{appUrl}}/workouts

3. ASSIGN IT
Link the workout to your client's profile and set a schedule. Your client gets notified automatically.

Want a visual walkthrough? Watch our 2-minute onboarding video:
{{appUrl}}/onboarding-video

If you hit any walls, reply to this email. A real human reads every one.

Let's build something great together.

-- The GymGurus Team

P.S. You have full access to every feature during your trial. No credit card required. No strings.
```

---

### Email 2: Meet Your AI Fitness Coach

| Field                         | Value                                                                       |
| ----------------------------- | --------------------------------------------------------------------------- |
| **Send Timing**               | Day 2                                                                       |
| **Subject Line**              | Meet your AI fitness coach                                                  |
| **Preview Text**              | It answers client questions 24/7 so you don't have to. Here's how it works. |
| **CTA**                       | Try the AI Coach Now                                                        |
| **CTA URL**                   | `{{appUrl}}/solo/coach`                                                     |
| **Personalization Variables** | `{{firstName}}`, `{{appUrl}}`                                               |

**Plaintext Body:**

```
Hey {{firstName}},

Quick question: how many hours a week do you spend answering the same client questions?

"What weight should I use for Romanian deadlifts?"
"Can I substitute front squats for back squats?"
"How many sets should I do if I'm cutting?"

What if those questions answered themselves?

That's exactly what the GymGurus AI Coach does. It's trained on exercise science, understands programming context, and is available 24/7. Your clients get instant, accurate answers. You get your time back.

HERE'S WHAT A REAL CONVERSATION LOOKS LIKE:

  Client: "I tweaked my lower back yesterday. Should I still do deadlifts
  tomorrow or swap to something else?"

  AI Coach: "If you're experiencing lower back discomfort, I'd recommend
  skipping conventional deadlifts for now. Instead, try trap bar deadlifts
  or hip thrusts -- both train the posterior chain with less spinal loading.
  If the pain persists beyond 48 hours, consult a physio before training."

That's not a canned response. It's contextual, science-backed advice delivered in seconds.

Try it yourself:
{{appUrl}}/solo/coach

The AI Coach is included in your trial -- no extra cost, no usage limits during your trial period.

Train smarter,
The GymGurus Team

P.S. The AI Coach works for you too. Ask it for programming ideas, warm-up sequences, or periodization advice. It's like having an assistant coach on speed dial.
```

---

### Email 3: Your Clients Are Going to Love This

| Field                         | Value                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------- |
| **Send Timing**               | Day 5                                                                           |
| **Subject Line**              | Your clients are going to love this                                             |
| **Preview Text**              | Client management features that make you look like a pro (because you are one). |
| **CTA**                       | Invite Your First Client                                                        |
| **CTA URL**                   | `{{appUrl}}/clients`                                                            |
| **Personalization Variables** | `{{firstName}}`, `{{clientCount}}`, `{{appUrl}}`                                |

**Plaintext Body:**

```
Hey {{firstName}},

Let's talk about the part of your job that isn't programming sets and reps -- managing people.

GymGurus was built around the trainer-client relationship. Here's what your clients experience when they're on the platform:

THEIR OWN DASHBOARD
Clients see their assigned workouts, weekly schedule, and progress -- all in a clean, dark-themed interface that feels like a premium app, not a spreadsheet.

WORKOUT EXECUTION MODE
When it's gym time, they open their assigned workout and get a step-by-step guided experience. Sets, reps, rest timers, exercise instructions -- all laid out.

PROGRESS TRACKING
They log weights, track personal records, and see visual progress over time. Gamification elements (XP, streaks, achievements) keep them coming back.

REAL-TIME MESSAGING
You and your clients can message directly inside the platform. No more scattered WhatsApp threads.

HOW TO INVITE CLIENTS:

1. Go to your Clients page: {{appUrl}}/clients
2. Click "Add Client" and enter their email
3. They'll receive an invite to create their own account
4. Once they're in, assign them workouts and they're off to the races

{{#if clientCount > 0}}
You've already added {{clientCount}} client(s) -- nice work. Keep building that roster.
{{else}}
You haven't added any clients yet. That's your next move. It takes 30 seconds.
{{/if}}

Let's make your clients feel like they have a world-class trainer -- because they do.

-- The GymGurus Team
```

---

### Email 4: Are Your Workouts Backed by Science?

| Field                         | Value                                                                  |
| ----------------------------- | ---------------------------------------------------------------------- |
| **Send Timing**               | Day 10                                                                 |
| **Subject Line**              | Are your workouts backed by science?                                   |
| **Preview Text**              | 12 pro-grade calculators your clients will actually use. Free forever. |
| **CTA**                       | Explore All 12 Calculators                                             |
| **CTA URL**                   | `{{appUrl}}/calculators`                                               |
| **Personalization Variables** | `{{firstName}}`, `{{appUrl}}`                                          |

**Plaintext Body:**

```
Hey {{firstName}},

Every serious trainer needs data. Not guesses -- data.

GymGurus includes 12 professional fitness calculators built on peer-reviewed formulas. They're free, fast, and built right into the platform. No ads, no affiliate links, no nonsense.

Here are the ones trainers use the most:

ONE REP MAX (1RM) CALCULATOR
Know exactly what your client can lift. Uses Brzycki, Epley, and Lander formulas for accuracy.
{{appUrl}}/calculators/1rm

BMI CALCULATOR
Quick body composition baseline. Useful for intake assessments and progress tracking.
{{appUrl}}/calculators/bmi

TDEE CALCULATOR
Total Daily Energy Expenditure -- the foundation of any nutrition plan.
{{appUrl}}/calculators/tdee

STRENGTH STANDARDS
See where your client ranks compared to population benchmarks by age, weight, and gender.
{{appUrl}}/calculators/strength-standards

MACRO CALCULATOR
Protein, carb, and fat targets based on goals (cut, maintain, bulk).
{{appUrl}}/calculators/macros

AND 7 MORE:
- Body Fat Percentage
- Heart Rate Zones
- VO2 Max Estimate
- Calories Burned
- Ideal Weight
- Water Intake
- Plate Loading

All 12 are here: {{appUrl}}/calculators

These tools aren't just for you. Share the links with your clients. When they see data-backed recommendations, their trust in your programming goes through the roof.

Data-driven gains,
The GymGurus Team

P.S. Pro tip: Use the Strength Standards calculator during client intake assessments. It instantly shows clients where they are and where they could be. Nothing motivates like a benchmark.
```

---

### Email 5: How's It Going?

| Field                         | Value                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Send Timing**               | Day 14                                                                                                                           |
| **Subject Line**              | How's it going? We'd love to hear from you                                                                                       |
| **Preview Text**              | Quick feedback request + something special if you're ready to commit.                                                            |
| **CTA (Primary)**             | Share Your Feedback (2 min)                                                                                                      |
| **CTA (Secondary)**           | Upgrade to Trainer Plan                                                                                                          |
| **CTA URL (Primary)**         | `{{feedbackFormUrl}}`                                                                                                            |
| **CTA URL (Secondary)**       | `{{appUrl}}/upgrade`                                                                                                             |
| **Personalization Variables** | `{{firstName}}`, `{{clientCount}}`, `{{workoutCount}}`, `{{daysActive}}`, `{{appUrl}}`, `{{feedbackFormUrl}}`, `{{calendlyUrl}}` |

**Plaintext Body:**

```
Hey {{firstName}},

It's been 14 days since you joined GymGurus. Here's what you've built so far:

  Clients added:    {{clientCount}}
  Workouts created: {{workoutCount}}
  Days active:      {{daysActive}}

We'd love to know how things are going. Good, bad, confusing, amazing -- we want to hear it all.

Take 2 minutes to share your experience:
{{feedbackFormUrl}}

Your feedback directly shapes what we build next. This isn't a formality -- we read every response and act on it.

---

READY TO KEEP GOING?

If GymGurus is working for you, the Trainer plan locks in everything you've been using:

  - Up to 15 clients (no per-client fees)
  - 100 AI Coach messages per day
  - 50 workout templates
  - Advanced per-client analytics
  - CSV export
  - Email support (48-hour response)

All for $49/month flat. No surprises. No price increases as you grow.

Upgrade now: {{appUrl}}/upgrade

Save 20% with annual billing -- that's $39.17/month ($470/year instead of $588).

---

WANT A WALKTHROUGH?

If you'd rather see the full product in action with someone who knows it inside out, book a free 15-minute demo call:
{{calendlyUrl}}

No sales pitch. Just a trainer-to-trainer conversation about how to get the most out of the platform.

Thanks for giving GymGurus a shot. We don't take that lightly.

-- The GymGurus Team

P.S. Even if you're not ready to upgrade, your feedback is incredibly valuable. Two minutes of your time helps us build a better tool for every trainer out there.
```

---

## 2. Trial Expiration Sequence

**Trigger:** Trial end date approaching (calculated from `user.createdAt + trialDuration`)
**Sequence Length:** 3 emails over 7 days
**Goal:** Convert trial users to paid subscribers by leveraging loss aversion, social proof, and urgency.

---

### Email 1: Your Trial Is Almost Over

| Field                         | Value                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Send Timing**               | 7 days before trial expiry                                                                                                           |
| **Subject Line**              | Your trial is almost over -- here's what you'll lose                                                                                 |
| **Preview Text**              | You've built {{workoutCount}} workouts for {{clientCount}} clients. Don't let that disappear.                                        |
| **CTA**                       | Keep Everything -- Upgrade Now                                                                                                       |
| **CTA URL**                   | `{{appUrl}}/upgrade`                                                                                                                 |
| **Personalization Variables** | `{{firstName}}`, `{{clientCount}}`, `{{workoutCount}}`, `{{aiMessageCount}}`, `{{calculatorUses}}`, `{{trialEndDate}}`, `{{appUrl}}` |

**Plaintext Body:**

```
Hey {{firstName}},

Your GymGurus trial ends on {{trialEndDate}}. That's 7 days from now.

Before you decide, here's what you've built during your trial:

  Clients managed:       {{clientCount}}
  Workouts created:      {{workoutCount}}
  AI Coach messages:     {{aiMessageCount}}
  Calculator uses:       {{calculatorUses}}

Here's what goes away when your trial expires:

  [X] Client management dashboard -- your client profiles, notes, and history
  [X] Workout programming tools -- every template and custom program you've built
  [X] AI Coach access -- no more instant answers for you or your clients
  [X] Progress tracking -- all logged data and analytics
  [X] Scheduling and assignments -- your entire client workflow
  [X] Real-time messaging -- direct communication with clients

Here's what stays:

  [OK] Calculator access (always free)
  [OK] Your account (data preserved for 30 days)

We're not trying to scare you. We just want you to make an informed decision. If GymGurus has been useful, upgrading keeps everything running. If it hasn't, no hard feelings -- your data is exportable.

Upgrade to the Trainer plan ($49/month):
{{appUrl}}/upgrade

Questions? Reply to this email. We're here.

-- The GymGurus Team
```

---

### Email 2: Last Chance to Lock In

| Field                         | Value                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| **Send Timing**               | 3 days before trial expiry                                                                         |
| **Subject Line**              | Last chance: lock in your Trainer plan                                                             |
| **Preview Text**              | Join {{upgradedTrainersThisMonth}} trainers who upgraded this month. Save 20% with annual billing. |
| **CTA**                       | Upgrade Now -- Save 20% Annually                                                                   |
| **CTA URL**                   | `{{appUrl}}/upgrade?plan=annual`                                                                   |
| **Personalization Variables** | `{{firstName}}`, `{{upgradedTrainersThisMonth}}`, `{{trialEndDate}}`, `{{appUrl}}`                 |

**Plaintext Body:**

```
Hey {{firstName}},

3 days left on your trial. Let's make this simple.

{{upgradedTrainersThisMonth}} trainers upgraded to a paid plan this month. Here's why they made the switch:

  "I was managing clients across three different apps. GymGurus replaced all
  of them and the AI Coach alone saves me 5+ hours a week."
  -- Beta Trainer

  "My clients actually enjoy using it. The gamification keeps them engaged
  between sessions. I've seen better compliance since switching."
  -- Beta Trainer

  "At $49/month with no per-client fees? It's a no-brainer compared to what
  I was paying for TrueCoach."
  -- Beta Trainer

YOUR OPTIONS:

  MONTHLY: $49/month
  - Cancel anytime
  - All features included
  - No per-client fees

  ANNUAL: $39.17/month ($470/year)
  - Save 20% ($118/year savings)
  - All features included
  - No per-client fees
  - Priority support

Lock in your plan: {{appUrl}}/upgrade?plan=annual

Your trial ends on {{trialEndDate}}. After that, your account reverts to the free Solo tier and you'll lose access to client management, workout programming, and AI Coach (beyond the 10 free daily messages).

This is the last pricing email you'll get before your trial ends. The next email will be on your expiry date.

Train smarter,
The GymGurus Team

P.S. Annual billing saves you $118/year. Think of it this way: that's the cost of 2-3 client sessions, and GymGurus helps you retain far more than that.
```

---

### Email 3: Your Trial Ends Today

| Field                         | Value                                                                |
| ----------------------------- | -------------------------------------------------------------------- |
| **Send Timing**               | Day of trial expiry (morning, 8:00 AM user local time)               |
| **Subject Line**              | Your trial ends today                                                |
| **Preview Text**              | One click to keep everything. 30-day money-back guarantee.           |
| **CTA**                       | Upgrade Now -- Keep Everything                                       |
| **CTA URL**                   | `{{appUrl}}/upgrade`                                                 |
| **Personalization Variables** | `{{firstName}}`, `{{clientCount}}`, `{{workoutCount}}`, `{{appUrl}}` |

**Plaintext Body:**

```
Hey {{firstName}},

This is it. Your GymGurus trial expires today.

After today, you'll lose access to:
  - {{clientCount}} client profile(s) and their data
  - {{workoutCount}} workout program(s) you've built
  - AI Coach (beyond 10 free messages/day)
  - Progress tracking and analytics
  - Scheduling and workout assignments
  - Direct client messaging

One click keeps everything:

  >>> UPGRADE TO TRAINER PLAN -- $49/MONTH <<<
  {{appUrl}}/upgrade

ZERO RISK: Every paid plan comes with a 30-day money-back guarantee. If GymGurus doesn't work for your business within the first month, email us and we'll refund every penny. No questions asked.

Your data is preserved for 30 days after trial expiry. If you upgrade within that window, everything is restored exactly as you left it.

We built GymGurus for trainers like you. We hope you'll stick around.

-- The GymGurus Team
```

---

## 3. Solo User Welcome Sequence

**Trigger:** New user signs up with `role = 'solo'`
**Sequence Length:** 3 emails over 7 days
**Goal:** Activate the solo user (log a workout, use calculators, engage with gamification), then nudge toward sharing or upgrading.

---

### Email 1: Welcome + Gamification Intro

| Field                         | Value                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| **Send Timing**               | Day 0 (immediately on signup)                                                            |
| **Subject Line**              | Welcome to GymGurus -- your fitness journey levels up here                               |
| **Preview Text**              | Free AI coach, 12 calculators, and a gamification system that makes every workout count. |
| **CTA**                       | Start Your First Workout                                                                 |
| **CTA URL**                   | `{{appUrl}}/solo`                                                                        |
| **Personalization Variables** | `{{firstName}}`, `{{appUrl}}`                                                            |

**Plaintext Body:**

```
Hey {{firstName}},

Welcome to GymGurus. You just unlocked free access to tools that most fitness apps charge premium prices for.

Here's what's in your toolkit:

AI FITNESS COACH
Ask it anything -- programming advice, form cues, nutrition basics, recovery tips. It's trained on exercise science and available 24/7. You get 10 free messages per day.
{{appUrl}}/solo/coach

12 FITNESS CALCULATORS
BMI, One Rep Max, TDEE, Strength Standards, Macros, Body Fat, VO2 Max, Heart Rate Zones, and more. All free, all backed by peer-reviewed formulas.
{{appUrl}}/calculators

GAMIFICATION SYSTEM
This is where it gets fun. Every workout you log earns you XP (experience points). Stack XP to level up. Keep a daily streak going for bonus rewards. Unlock achievements for hitting milestones.

Here's how it works:
  - Complete a workout = Base XP earned
  - Hit a personal record = Bonus XP
  - Maintain a streak = Streak multiplier
  - Hit milestones = Achievement badges unlocked

Your level and rank update in real time. Check your progress anytime:
{{appUrl}}/solo/achievements

YOUR FIRST MOVE:
Head to your Solo Dashboard and log your first workout. That's it. One workout and you're on the board.
{{appUrl}}/solo

Let's go,
The GymGurus Team

P.S. GymGurus is free for solo users. No trial, no expiration, no bait-and-switch. If you ever want to train clients professionally, you can upgrade to the Trainer plan -- but that's entirely up to you.
```

---

### Email 2: Calculator Showcase + XP Explained

| Field                         | Value                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Send Timing**               | Day 3                                                                                                      |
| **Subject Line**              | Do you know your strength level?                                                                           |
| **Preview Text**              | Use our Strength Standards calculator to see where you rank -- plus how XP and achievements actually work. |
| **CTA**                       | Check Your Strength Level                                                                                  |
| **CTA URL**                   | `{{appUrl}}/calculators/strength-standards`                                                                |
| **Personalization Variables** | `{{firstName}}`, `{{currentXp}}`, `{{currentLevel}}`, `{{currentStreak}}`, `{{appUrl}}`                    |

**Plaintext Body:**

```
Hey {{firstName}},

Here's a question that separates serious lifters from casual gym-goers:

Do you actually know where your strength stands?

Not "I feel strong." Actual data. Percentile rankings. Compared to population benchmarks.

The GymGurus Strength Standards Calculator tells you exactly where you rank for any lift, based on your age, bodyweight, and gender. It takes 30 seconds.

Try it: {{appUrl}}/calculators/strength-standards

CALCULATORS THAT ACTUALLY MATTER:

  1RM Calculator     -- Know your true max without testing it
  {{appUrl}}/calculators/1rm

  TDEE Calculator    -- Your daily calorie target, calculated properly
  {{appUrl}}/calculators/tdee

  Macro Calculator   -- Protein, carbs, and fats tailored to your goal
  {{appUrl}}/calculators/macros

  Body Fat Calculator -- More useful than BMI for most lifters
  {{appUrl}}/calculators/body-fat

---

YOUR PROGRESS SO FAR:

  Current XP:    {{currentXp}}
  Level:         {{currentLevel}}
  Streak:        {{currentStreak}} day(s)

HOW XP AND ACHIEVEMENTS WORK:

Every action you take in GymGurus earns XP. Here's the breakdown:

  Action                    XP Earned
  -------                   ---------
  Complete a workout        Base XP (scales with duration)
  Hit a personal record     Bonus XP
  Maintain daily streak     Streak multiplier (grows each day)
  Use a calculator          Small XP bonus

As your XP accumulates, you level up. Each level unlocks a new rank title. Hit specific milestones (like your first 10 workouts or a 7-day streak) and you unlock achievement badges that appear on your profile.

Check your full achievement board: {{appUrl}}/solo/achievements

Keep stacking,
The GymGurus Team
```

---

### Email 3: Invite to Upgrade or Share

| Field                         | Value                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Send Timing**               | Day 7                                                                                                        |
| **Subject Line**              | You've been putting in the work -- here's what's next                                                        |
| **Preview Text**              | Share your progress, explore the AI Workout Generator, or unlock Trainer mode.                               |
| **CTA (Primary)**             | Generate a Workout with AI                                                                                   |
| **CTA (Secondary)**           | Explore the Trainer Plan                                                                                     |
| **CTA URL (Primary)**         | `{{appUrl}}/solo/generate`                                                                                   |
| **CTA URL (Secondary)**       | `{{appUrl}}/upgrade`                                                                                         |
| **Personalization Variables** | `{{firstName}}`, `{{totalWorkouts}}`, `{{currentXp}}`, `{{currentLevel}}`, `{{currentStreak}}`, `{{appUrl}}` |

**Plaintext Body:**

```
Hey {{firstName}},

One week in. Here's your scorecard:

  Workouts logged:  {{totalWorkouts}}
  Total XP:         {{currentXp}}
  Level:            {{currentLevel}}
  Current streak:   {{currentStreak}} day(s)

{{#if totalWorkouts > 0}}
You're building momentum. That's the hardest part -- and you're doing it.
{{else}}
You haven't logged a workout yet, but it's never too late to start. One workout puts you on the board.
{{/if}}

HERE'S WHAT TO TRY NEXT:

1. AI WORKOUT GENERATOR
Tell the AI your goals, equipment, and available time. It builds a complete workout program for you. No more guessing.
{{appUrl}}/solo/generate

2. RECOVERY TRACKER
Log your recovery metrics (sleep, soreness, energy) and get AI-powered recommendations on when to push hard and when to dial it back.
{{appUrl}}/solo/recovery

3. SHARE YOUR RESULTS
Hit a PR? Reached a new level? Share your calculator results or achievement badges on social media. Inspire your crew.

---

THINKING ABOUT TRAINING OTHERS?

If you're a certified trainer (or working toward it), the GymGurus Trainer plan gives you everything you need to manage clients professionally:

  - Manage up to 15 clients (Pro plan: unlimited)
  - Build and assign custom workout programs
  - AI Coach with 100 messages/day
  - Client progress tracking and analytics
  - Real-time messaging
  - Scheduling and workout assignments

All for $49/month. No per-client fees. No hidden costs.

Learn more: {{appUrl}}/upgrade

Whether you're training yourself or training others, GymGurus has your back.

Keep leveling up,
The GymGurus Team
```

---

## 4. Send Schedule Summary

### Trainer Welcome Sequence

| Email # | Day           | Subject Line                                     | Primary Goal                                         |
| ------- | ------------- | ------------------------------------------------ | ---------------------------------------------------- |
| 1       | 0 (immediate) | Welcome to GymGurus -- here's how to get started | Activation: Add first client, create first workout   |
| 2       | 2             | Meet your AI fitness coach                       | Feature discovery: AI Coach                          |
| 3       | 5             | Your clients are going to love this              | Feature discovery: Client management, invite clients |
| 4       | 10            | Are your workouts backed by science?             | Feature discovery: 12 calculators                    |
| 5       | 14            | How's it going? We'd love to hear from you       | Feedback + upgrade nudge                             |

### Trial Expiration Sequence

| Email # | Timing               | Subject Line                                         | Primary Goal                   |
| ------- | -------------------- | ---------------------------------------------------- | ------------------------------ |
| 1       | 7 days before expiry | Your trial is almost over -- here's what you'll lose | Loss aversion                  |
| 2       | 3 days before expiry | Last chance: lock in your Trainer plan               | Social proof + annual pricing  |
| 3       | Day of expiry        | Your trial ends today                                | Urgency + money-back guarantee |

### Solo User Welcome Sequence

| Email # | Day           | Subject Line                                               | Primary Goal                               |
| ------- | ------------- | ---------------------------------------------------------- | ------------------------------------------ |
| 1       | 0 (immediate) | Welcome to GymGurus -- your fitness journey levels up here | Activation: Gamification + first workout   |
| 2       | 3             | Do you know your strength level?                           | Feature discovery: Calculators + XP system |
| 3       | 7             | You've been putting in the work -- here's what's next      | Engagement: AI Generator + upgrade path    |

---

## 5. Email Service Provider Recommendation

### Comparison Matrix

| Criteria                      | SendGrid                                      | Mailgun                       | AWS SES                                               |
| ----------------------------- | --------------------------------------------- | ----------------------------- | ----------------------------------------------------- |
| **Free Tier**                 | 100 emails/day forever                        | 5,000 emails/month (3 months) | 62,000 emails/month (if sent from EC2)                |
| **Startup Pricing**           | $19.95/mo (50K emails)                        | $35/mo (50K emails)           | ~$0.10 per 1,000 emails                               |
| **Deliverability**            | Excellent (dedicated IPs available)           | Very good                     | Good (requires warm-up)                               |
| **API Quality**               | Excellent (REST + SMTP)                       | Excellent (REST + SMTP)       | Good (SDK-heavy)                                      |
| **Node.js SDK**               | `@sendgrid/mail` (well-maintained)            | `mailgun.js` (solid)          | `@aws-sdk/client-ses` (verbose)                       |
| **Template Engine**           | Built-in (Handlebars)                         | Built-in (Handlebars)         | None (build your own)                                 |
| **Analytics**                 | Excellent (opens, clicks, bounces, real-time) | Good (webhook-based)          | Basic (SNS notifications)                             |
| **Ease of Setup**             | Very easy (5 min)                             | Easy (10 min)                 | Moderate (DNS + IAM + verification)                   |
| **Scalability**               | Excellent                                     | Excellent                     | Excellent (cheapest at scale)                         |
| **Transactional + Marketing** | Both (same platform)                          | Both                          | Transactional only (pair with Pinpoint for marketing) |
| **Startup Program**           | Yes (free credits available)                  | No official program           | AWS Activate (startup credits)                        |
| **GDPR Tools**                | Yes (suppression lists, consent tracking)     | Yes (suppression lists)       | Manual implementation                                 |

### Recommendation

**Phase 1 (Pre-launch to 1,000 users): SendGrid**

SendGrid is the best choice for a startup at GymGurus's stage. Rationale:

1. **Free tier covers initial needs** -- 100 emails/day is sufficient for early beta and launch.
2. **Best-in-class analytics** -- Real-time open rates, click tracking, and bounce management out of the box. Critical for optimizing email sequences.
3. **Template engine** -- Handlebars-based dynamic templates mean you can use `{{firstName}}`, `{{workoutCount}}`, and conditional blocks (`{{#if}}`) without building a custom rendering layer.
4. **Node.js SDK is excellent** -- `@sendgrid/mail` is well-documented, actively maintained, and integrates cleanly with Express.js.
5. **Transactional + marketing in one platform** -- No need to run two providers for password resets vs. drip campaigns.
6. **Startup credits available** -- SendGrid offers free credits through various startup programs (Y Combinator, Techstars, etc.).

**Phase 2 (1,000+ users, cost optimization): Migrate to AWS SES**

Once email volume reaches 50,000+/month, AWS SES becomes significantly cheaper (~$5/month vs. $89.95/month on SendGrid). At that point, invest in building a simple template rendering layer and use SES for raw sending with SendGrid-style analytics via a tool like PostHog or a custom webhook consumer.

---

## 6. Technical Integration (Express.js)

### Architecture Overview

```
server/
  services/
    email/
      emailService.ts        -- Core send function (provider-agnostic)
      emailTemplates.ts       -- HTML template definitions
      emailScheduler.ts       -- Drip sequence scheduler (cron-based)
      emailTracking.ts        -- Open/click tracking webhook handler
  routes/
    email.ts                  -- Webhook endpoints for SendGrid events
```

### Core Email Service (`emailService.ts`)

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  categories?: string[]; // For analytics grouping
  customArgs?: Record<string, string>; // For webhook tracking
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const msg = {
      to: options.to,
      from: {
        email: 'hello@gymgurus.app',
        name: 'GymGurus',
      },
      replyTo: 'support@gymgurus.app',
      subject: options.subject,
      text: options.text,
      html: options.html,
      templateId: options.templateId,
      dynamicTemplateData: options.dynamicTemplateData,
      categories: options.categories || [],
      customArgs: options.customArgs || {},
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
        subscriptionTracking: {
          enable: true,
          text: 'Unsubscribe: <%asm_group_unsubscribe_raw_url%>',
          html: '<a href="<%asm_group_unsubscribe_raw_url%>">Unsubscribe</a>',
        },
      },
      asm: {
        groupId: parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID!),
      },
    };

    await sgMail.send(msg);
    console.log(`[Email] Sent "${options.subject}" to ${options.to}`);
    return true;
  } catch (error: any) {
    console.error(
      `[Email] Failed to send "${options.subject}" to ${options.to}:`,
      error.response?.body || error.message
    );
    return false;
  }
}

// Convenience: Send using a SendGrid dynamic template
export async function sendTemplateEmail(
  to: string,
  templateId: string,
  data: Record<string, any>,
  categories: string[] = []
): Promise<boolean> {
  return sendEmail({
    to,
    subject: '', // Subject is defined in the SendGrid template
    text: '',
    html: '',
    templateId,
    dynamicTemplateData: data,
    categories,
  });
}
```

### Drip Sequence Scheduler (`emailScheduler.ts`)

```typescript
import cron from 'node-cron';
import { storage } from '../storage';
import { sendTemplateEmail } from './emailService';

interface SequenceStep {
  delayDays: number;
  templateId: string;
  categories: string[];
  getTemplateData: (user: any) => Promise<Record<string, any>>;
}

// Define sequences
const TRAINER_WELCOME_SEQUENCE: SequenceStep[] = [
  {
    delayDays: 0,
    templateId: process.env.SG_TEMPLATE_TRAINER_WELCOME_1!,
    categories: ['trainer-welcome', 'welcome-1'],
    getTemplateData: async (user) => ({
      firstName: user.firstName,
      appUrl: process.env.APP_URL,
    }),
  },
  {
    delayDays: 2,
    templateId: process.env.SG_TEMPLATE_TRAINER_WELCOME_2!,
    categories: ['trainer-welcome', 'welcome-2'],
    getTemplateData: async (user) => ({
      firstName: user.firstName,
      appUrl: process.env.APP_URL,
    }),
  },
  // ... steps 3-5 follow the same pattern
];

// Run every hour to check for pending emails
cron.schedule('0 * * * *', async () => {
  console.log('[EmailScheduler] Checking for pending sequence emails...');

  // Query users with active sequences
  // Compare user.createdAt + step.delayDays against current time
  // Send emails that are due and haven't been sent yet
  // Mark emails as sent in a tracking table (email_sequence_log)
});
```

### Database Schema Addition

```sql
CREATE TABLE email_sequence_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  sequence_name TEXT NOT NULL,       -- 'trainer_welcome', 'trial_expiry', 'solo_welcome'
  step_number INTEGER NOT NULL,      -- 1, 2, 3...
  template_id TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'sent',        -- 'sent', 'opened', 'clicked', 'bounced', 'failed'
  UNIQUE(user_id, sequence_name, step_number)
);

CREATE TABLE email_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  marketing_emails BOOLEAN DEFAULT true,
  product_updates BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Webhook Handler for Event Tracking

```typescript
// server/routes/email.ts
import { Router, Request, Response } from 'express';

const router = Router();

// SendGrid Event Webhook
// POST /api/email/webhooks/sendgrid
router.post('/webhooks/sendgrid', async (req: Request, res: Response) => {
  const events = req.body;

  for (const event of events) {
    const { email, event: eventType, sg_message_id, timestamp } = event;

    switch (eventType) {
      case 'open':
        // Update email_sequence_log.opened_at
        break;
      case 'click':
        // Update email_sequence_log.clicked_at
        break;
      case 'bounce':
      case 'dropped':
        // Mark email as bounced, suppress future sends
        break;
      case 'unsubscribe':
        // Update email_preferences
        break;
      case 'spam_report':
        // Immediately suppress + alert team
        break;
    }
  }

  res.sendStatus(200);
});

export default router;
```

### Environment Variables

```env
# Email Service
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_UNSUBSCRIBE_GROUP_ID=12345

# Template IDs (created in SendGrid dashboard)
SG_TEMPLATE_TRAINER_WELCOME_1=d-abc123...
SG_TEMPLATE_TRAINER_WELCOME_2=d-abc124...
SG_TEMPLATE_TRAINER_WELCOME_3=d-abc125...
SG_TEMPLATE_TRAINER_WELCOME_4=d-abc126...
SG_TEMPLATE_TRAINER_WELCOME_5=d-abc127...
SG_TEMPLATE_TRIAL_EXPIRY_1=d-def123...
SG_TEMPLATE_TRIAL_EXPIRY_2=d-def124...
SG_TEMPLATE_TRIAL_EXPIRY_3=d-def125...
SG_TEMPLATE_SOLO_WELCOME_1=d-ghi123...
SG_TEMPLATE_SOLO_WELCOME_2=d-ghi124...
SG_TEMPLATE_SOLO_WELCOME_3=d-ghi125...

# App
APP_URL=https://gymgurus.app
FEEDBACK_FORM_URL=https://forms.gymgurus.app/feedback
CALENDLY_URL=https://calendly.com/gymgurus/demo
```

---

## 7. Unsubscribe & Legal Compliance

### CAN-SPAM Act (USA) Requirements

| Requirement                       | GymGurus Implementation                                                         |
| --------------------------------- | ------------------------------------------------------------------------------- |
| **Physical mailing address**      | Include in every email footer: "GymGurus, [Business Address]"                   |
| **Clear "From" identification**   | From: "GymGurus" <hello@gymgurus.app>                                           |
| **Honest subject lines**          | No deceptive subjects; all subjects accurately reflect content                  |
| **Unsubscribe mechanism**         | One-click unsubscribe link in every email footer                                |
| **Honor opt-outs within 10 days** | Automated via SendGrid suppression groups (instant)                             |
| **Identify as advertisement**     | Marketing emails include "This is a marketing email" in footer (where required) |

### GDPR (EU/EEA) Requirements

| Requirement                    | GymGurus Implementation                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Explicit consent**           | Checkbox on signup: "I agree to receive emails from GymGurus about product updates and tips." Pre-checked boxes are NOT allowed. |
| **Consent record**             | Store `consent_given_at`, `consent_ip`, and `consent_text` in the database for each user.                                        |
| **Right to erasure**           | Users can request full data deletion via email or in-app settings. Process within 30 days.                                       |
| **Data portability**           | Export all user data (including email preferences) as JSON/CSV on request.                                                       |
| **Granular preferences**       | Allow users to opt in/out of specific email categories (marketing, product updates, weekly digest) independently.                |
| **Unsubscribe in every email** | One-click unsubscribe link in every email, including transactional sequences.                                                    |
| **Privacy policy link**        | Include link to privacy policy in every email footer: `{{appUrl}}/privacy`                                                       |
| **DPO contact**                | List data protection officer contact in privacy policy.                                                                          |

### Email Footer Template (Required in All Emails)

```
---
GymGurus | AI-Powered Fitness Platform
[Business Address Line 1]
[City, State ZIP]

You're receiving this email because you signed up for GymGurus.
Manage your email preferences: {{appUrl}}/settings/email-preferences
Unsubscribe from all marketing emails: {{unsubscribeUrl}}
Privacy Policy: {{appUrl}}/privacy
```

### Suppression Handling

1. **Hard bounces:** Immediately suppress. Never send to this address again.
2. **Soft bounces:** Retry up to 3 times over 72 hours. Suppress after 3 failures.
3. **Spam reports:** Immediately suppress + add to global suppression list.
4. **Unsubscribes:** Honor immediately. Do not send any marketing emails. Transactional emails (password reset, security alerts) are still permitted.
5. **Inactive users:** After 90 days of no opens, move to a re-engagement segment. If no engagement after re-engagement attempt, suppress from all marketing.

---

## 8. KPI Tracking & Targets

### Email Performance Targets

| Metric                        | Target (Launch) | Target (Mature) | Industry Benchmark (SaaS) |
| ----------------------------- | --------------- | --------------- | ------------------------- |
| **Open Rate**                 | > 35%           | > 40%           | 25-30%                    |
| **Click-Through Rate (CTR)**  | > 5%            | > 7%            | 3-5%                      |
| **Click-to-Open Rate (CTOR)** | > 15%           | > 18%           | 10-15%                    |
| **Unsubscribe Rate**          | < 0.5%          | < 0.3%          | 0.2-0.5%                  |
| **Bounce Rate**               | < 2%            | < 1%            | 1-3%                      |
| **Spam Complaint Rate**       | < 0.05%         | < 0.02%         | < 0.1%                    |

### Sequence-Specific Conversion Targets

| Sequence             | Primary Conversion                            | Target Rate      |
| -------------------- | --------------------------------------------- | ---------------- |
| **Trainer Welcome**  | Trial user adds first client (activation)     | > 60% by Email 3 |
| **Trainer Welcome**  | Trial user creates first workout (activation) | > 50% by Email 3 |
| **Trainer Welcome**  | Feedback form completion (Email 5)            | > 15%            |
| **Trial Expiration** | Trial-to-paid conversion                      | > 8% overall     |
| **Trial Expiration** | Annual plan selection (of those who convert)  | > 25%            |
| **Solo Welcome**     | Solo user logs first workout (activation)     | > 40% by Email 2 |
| **Solo Welcome**     | Solo user tries a calculator (engagement)     | > 50% by Email 2 |
| **Solo Welcome**     | Solo-to-Trainer upgrade                       | > 2% (long-term) |

### Tracking Implementation

Track these events via SendGrid webhooks + internal analytics:

```typescript
// Events to track per email
interface EmailEvent {
  userId: string;
  sequenceName: string;
  stepNumber: number;
  eventType:
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'bounced'
    | 'unsubscribed'
    | 'spam_report';
  timestamp: Date;
  metadata?: {
    linkClicked?: string; // Which CTA was clicked
    userAgent?: string; // Device/client info
    ipAddress?: string; // Geolocation (for send time optimization)
  };
}
```

### Reporting Cadence

| Report                        | Frequency      | Audience             | Contents                                                           |
| ----------------------------- | -------------- | -------------------- | ------------------------------------------------------------------ |
| **Email Dashboard**           | Real-time      | Product team         | Live open/click rates per sequence                                 |
| **Weekly Email Report**       | Every Monday   | Founders + marketing | Week-over-week performance, anomalies, top/bottom performers       |
| **Monthly Sequence Audit**    | First of month | Full team            | Conversion funnel analysis, A/B test results, copy recommendations |
| **Quarterly Strategy Review** | End of quarter | Leadership           | Sequence ROI, provider cost analysis, compliance audit             |

---

## 9. Personalization Variables Reference

### Available Variables (All Sequences)

| Variable             | Source                  | Example Value          | Used In             |
| -------------------- | ----------------------- | ---------------------- | ------------------- |
| `{{firstName}}`      | `users.firstName`       | "Alex"                 | All emails          |
| `{{lastName}}`       | `users.lastName`        | "Rivera"               | Formal emails       |
| `{{email}}`          | `users.email`           | "alex@example.com"     | Internal tracking   |
| `{{appUrl}}`         | Environment variable    | "https://gymgurus.app" | All emails          |
| `{{unsubscribeUrl}}` | SendGrid auto-generated | SendGrid URL           | All emails (footer) |

### Trainer-Specific Variables

| Variable              | Source                                      | Example Value    | Used In                  |
| --------------------- | ------------------------------------------- | ---------------- | ------------------------ |
| `{{clientCount}}`     | `COUNT(clients WHERE trainerId = user.id)`  | "12"             | Welcome 3, 5; Trial 1, 3 |
| `{{workoutCount}}`    | `COUNT(workouts WHERE trainerId = user.id)` | "8"              | Welcome 5; Trial 1, 3    |
| `{{aiMessageCount}}`  | AI usage log                                | "147"            | Trial 1                  |
| `{{calculatorUses}}`  | Analytics events                            | "23"             | Trial 1                  |
| `{{daysActive}}`      | Days with at least one login                | "11"             | Welcome 5                |
| `{{trialEndDate}}`    | `user.createdAt + trialDuration`            | "March 15, 2026" | Trial 1, 2, 3            |
| `{{feedbackFormUrl}}` | Environment variable                        | Form URL         | Welcome 5                |
| `{{calendlyUrl}}`     | Environment variable                        | Calendly link    | Welcome 5                |

### Solo User-Specific Variables

| Variable            | Source                                | Example Value | Used In   |
| ------------------- | ------------------------------------- | ------------- | --------- |
| `{{currentXp}}`     | `gamification_profiles.totalXp`       | "1,250"       | Solo 2, 3 |
| `{{currentLevel}}`  | `gamification_profiles.level`         | "5"           | Solo 2, 3 |
| `{{currentStreak}}` | `gamification_profiles.currentStreak` | "4"           | Solo 2, 3 |
| `{{totalWorkouts}}` | `COUNT(workout completions)`          | "6"           | Solo 3    |

### Global Dynamic Variables

| Variable                        | Source                    | Example Value | Used In |
| ------------------------------- | ------------------------- | ------------- | ------- |
| `{{upgradedTrainersThisMonth}}` | Billing events this month | "47"          | Trial 2 |
| `{{currentYear}}`               | System                    | "2026"        | Footer  |

### Conditional Logic (Handlebars)

The following conditional blocks are used in email templates:

```handlebars
{{! Show different content based on client count }}
{{#if clientCount > 0}}
  You've already added {{clientCount}} client(s).
{{else}}
  You haven't added any clients yet.
{{/if}}

{{! Show different content based on workout activity }}
{{#if totalWorkouts > 0}}
  You're building momentum.
{{else}}
  You haven't logged a workout yet.
{{/if}}
```

---

## Appendix: Email Template Design Guidelines

### Visual Style

- **Background:** Dark (#0F172A) to match the app's dark theme
- **Card Background:** Slightly lighter (#1E293B)
- **Primary Text:** White (#F8FAFC)
- **Secondary Text:** Slate (#94A3B8)
- **Primary CTA Button:** Electric Blue (#3B82F6) with white text
- **Secondary CTA Button:** Emerald (#10B981) with white text
- **Links:** Electric Blue (#3B82F6) with underline
- **Dividers:** Slate border (#334155)
- **Border Radius:** 8px on cards and buttons
- **Font:** System font stack (San Francisco, Segoe UI, Roboto, Helvetica Neue, Arial)
- **Max Width:** 600px

### HTML Email Template (Base Layout)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>{{subject}}</title>
    <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
    <![endif]-->
    <style>
      /* Reset */
      body,
      table,
      td,
      a {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      table,
      td {
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
      }
      img {
        -ms-interpolation-mode: bicubic;
      }
      img {
        border: 0;
        height: auto;
        line-height: 100%;
        outline: none;
        text-decoration: none;
      }
      body {
        margin: 0;
        padding: 0;
        width: 100% !important;
        height: 100% !important;
      }

      /* Dark theme */
      body {
        background-color: #0f172a;
        color: #f8fafc;
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 16px;
        line-height: 1.6;
      }

      .email-wrapper {
        max-width: 600px;
        margin: 0 auto;
        padding: 40px 20px;
      }

      .email-header {
        text-align: center;
        padding-bottom: 32px;
        border-bottom: 1px solid #334155;
        margin-bottom: 32px;
      }

      .email-header img {
        height: 40px;
        width: auto;
      }

      .email-body {
        background-color: #1e293b;
        border-radius: 8px;
        padding: 32px;
        margin-bottom: 32px;
      }

      h1 {
        font-size: 24px;
        font-weight: 700;
        color: #f8fafc;
        margin: 0 0 16px 0;
        line-height: 1.3;
      }

      h2 {
        font-size: 18px;
        font-weight: 600;
        color: #f8fafc;
        margin: 24px 0 12px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      p {
        color: #cbd5e1;
        margin: 0 0 16px 0;
      }

      a {
        color: #3b82f6;
        text-decoration: underline;
      }

      .cta-button {
        display: inline-block;
        background-color: #3b82f6;
        color: #ffffff !important;
        text-decoration: none;
        padding: 14px 32px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        margin: 24px 0;
        text-align: center;
      }

      .cta-button-secondary {
        display: inline-block;
        background-color: #10b981;
        color: #ffffff !important;
        text-decoration: none;
        padding: 14px 32px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        margin: 24px 0;
        text-align: center;
      }

      .stats-box {
        background-color: #0f172a;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        color: #94a3b8;
      }

      .stats-box strong {
        color: #3b82f6;
      }

      .feature-item {
        padding: 12px 0;
        border-bottom: 1px solid #334155;
      }

      .feature-item:last-child {
        border-bottom: none;
      }

      .email-footer {
        text-align: center;
        padding-top: 24px;
        border-top: 1px solid #334155;
        font-size: 13px;
        color: #64748b;
        line-height: 1.5;
      }

      .email-footer a {
        color: #64748b;
        text-decoration: underline;
      }

      /* Responsive */
      @media only screen and (max-width: 480px) {
        .email-wrapper {
          padding: 20px 12px;
        }
        .email-body {
          padding: 20px;
        }
        h1 {
          font-size: 20px;
        }
        .cta-button,
        .cta-button-secondary {
          display: block;
          text-align: center;
        }
      }

      /* Dark mode support for email clients that support it */
      @media (prefers-color-scheme: dark) {
        body {
          background-color: #0f172a !important;
        }
        .email-body {
          background-color: #1e293b !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <!-- Header -->
      <div class="email-header">
        <!--
        Replace with actual logo hosted on CDN:
        <img src="https://cdn.gymgurus.app/email/logo-white.png" alt="GymGurus" height="40">
      -->
        <div style="font-size: 28px; font-weight: 700; color: #F8FAFC; letter-spacing: -0.5px;">
          Gym<span style="color: #3B82F6;">Gurus</span>
        </div>
        <div
          style="font-size: 12px; color: #64748B; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase;"
        >
          AI-Powered Fitness Platform
        </div>
      </div>

      <!-- Body -->
      <div class="email-body">{{emailContent}}</div>

      <!-- Footer -->
      <div class="email-footer">
        <p>GymGurus | AI-Powered Fitness Platform</p>
        <p>[Business Address]<br />[City, State ZIP]</p>
        <p>
          You're receiving this because you signed up for GymGurus.<br />
          <a href="{{appUrl}}/settings/email-preferences">Manage email preferences</a> |
          <a href="{{unsubscribeUrl}}">Unsubscribe</a> |
          <a href="{{appUrl}}/privacy">Privacy Policy</a>
        </p>
        <p style="margin-top: 16px; color: #475569;">
          &copy; {{currentYear}} GymGurus. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
```

### Sample CTA Button HTML (For Use Inside Templates)

**Primary CTA (Electric Blue):**

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
  <tr>
    <td style="border-radius: 8px; background-color: #3B82F6;">
      <a
        href="{{ctaUrl}}"
        target="_blank"
        style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px;"
      >
        {{ctaText}}
      </a>
    </td>
  </tr>
</table>
```

**Secondary CTA (Emerald):**

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
  <tr>
    <td style="border-radius: 8px; background-color: #10B981;">
      <a
        href="{{ctaUrl}}"
        target="_blank"
        style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px;"
      >
        {{ctaText}}
      </a>
    </td>
  </tr>
</table>
```

---

_This document should be reviewed and updated as email sequences are A/B tested and performance data becomes available. All copy should be refined based on actual open rates, click rates, and conversion metrics._
