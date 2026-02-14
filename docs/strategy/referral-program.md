# GymGurus Referral Program Design

**Document Version:** 1.0
**Last Updated:** February 2026
**Status:** Pre-implementation Planning
**Brand Colors:** Electric Blue (#3B82F6) | Emerald (#10B981)

---

## Table of Contents

1. [Program Structure](#1-program-structure)
2. [Psychology & Incentive Design](#2-psychology--incentive-design)
3. [Technical Implementation](#3-technical-implementation)
4. [Dashboard Widget Design](#4-dashboard-widget-design)
5. [Email Notifications](#5-email-notifications)
6. [Anti-Fraud Measures](#6-anti-fraud-measures)
7. [Launch Playbook](#7-launch-playbook)
8. [KPIs & Success Metrics](#8-kpis--success-metrics)

---

## 1. Program Structure

### Core Value Exchange

The GymGurus referral program uses a **dual-sided incentive** model where both the referrer and the referee receive meaningful value. This eliminates the awkwardness of asking someone to sign up for your benefit alone -- both sides win.

| Role         | Reward                             | When Triggered                                      |
| ------------ | ---------------------------------- | --------------------------------------------------- |
| **Referrer** | 1 free month of their current plan | When the referred trainer subscribes to a paid plan |
| **Referee**  | 50% off their first month          | Applied automatically at checkout via referral code |

### Reward Economics

At GymGurus pricing ($49/mo Trainer, $99/mo Pro), the referral cost structure is:

| Scenario                   | Referrer Reward Value | Referee Discount | Total Cost to GymGurus | LTV of Referred User (Net) | ROI       |
| -------------------------- | --------------------- | ---------------- | ---------------------- | -------------------------- | --------- |
| Referee subscribes Trainer | $49 (1 month free)    | $24.50 (50% off) | $73.50                 | $445.80                    | 6.1:1     |
| Referee subscribes Pro     | $99 (1 month free)    | $49.50 (50% off) | $148.50                | $1,267.41                  | 8.5:1     |
| **Blended (70/30 split)**  | **$64.00**            | **$32.00**       | **$96.00**             | **$692.29**                | **7.2:1** |

At a blended cost of $96 per successful referral conversion, the effective CAC is $96 -- well within the $230 max CAC target from the unit economics model, and the reward is only paid on actual conversion (zero risk on non-converting referrals).

### Sharing Mechanism

Each trainer receives a **unique referral code** that can be shared via:

- **Referral link:** `https://gymgurus.com/join?ref=CODE`
- **Manual code entry:** Referee enters the code during signup

Referral codes are 8-character alphanumeric strings, generated from the user's ID hash for uniqueness. Trainers can optionally customize their code to something memorable (e.g., `COACH-MIKE`), subject to availability and profanity filtering.

### Attribution Model

Referrals are attributed using a **last-touch** model:

1. Referee clicks referral link or enters code during signup
2. The `ref` query parameter is stored in a cookie (30-day expiration) and in localStorage
3. On account creation, the referral code is submitted with the signup payload
4. The system validates the code, creates a referral conversion record, and applies the referee discount
5. When the referee subscribes to a paid plan, the referrer's reward is triggered

**Attribution window:** 30 days from first click to signup. If the referee signs up after 30 days, no attribution is recorded.

### Tiered Milestones

To drive sustained referral behavior beyond a single share, the program includes achievement tiers:

| Tier          | Referrals Required | Reward                                            |
| ------------- | :----------------: | ------------------------------------------------- |
| **Starter**   |         1          | 1 free month                                      |
| **Connector** |         3          | "GymGurus Ambassador" badge + 3 months free total |
| **Champion**  |         5          | Exclusive beta access to new features             |
| **Legend**    |         10         | Lifetime 25% discount on subscription             |

Tier badges are displayed on the trainer's profile and in-app, reinforcing social status within the platform.

---

## 2. Psychology & Incentive Design

### 2.1 Network Effects

**Framing:** "More trainers = more exercise content = a better platform for everyone."

GymGurus operates on a content flywheel: as more trainers join and create workout templates, the exercise library and template pool grows. This is a genuine network effect that benefits every user. The referral messaging should lean into this:

> "Every trainer you bring to GymGurus adds new workout templates, exercise ideas, and coaching perspectives to the platform. Help us build the best fitness community for trainers."

This framing transforms the referral from a transactional ask into a community-building act.

### 2.2 Reciprocity

The dual-sided reward structure activates the **reciprocity principle**: both parties receive value, which makes the referral feel like a gift rather than a sales pitch.

**Messaging to the referrer:**

> "Share GymGurus with a fellow trainer. They get 50% off their first month, and you get a free month. Win-win."

**Messaging to the referee:**

> "[Trainer Name] thinks you'd love GymGurus -- and they're giving you 50% off your first month to try it."

The referee receives a personalized message that names the referrer, making the recommendation feel like a genuine endorsement rather than an automated promotion.

### 2.3 Social Identity

Personal trainers have a strong professional identity. The referral program taps into this by framing referrals as **helping fellow professionals discover better tools**.

**Identity-aligned messaging:**

- "Help fellow trainers discover smarter tools"
- "The best trainers help other trainers level up"
- "Join the GymGurus trainer network"

The "GymGurus Ambassador" badge at 3 referrals reinforces this identity -- it signals that the trainer is a trusted voice in the community.

### 2.4 Loss Aversion in Referral Reminders

Loss aversion is twice as powerful as potential gains. Referral reminders should frame the value in terms of what the trainer is **missing** rather than what they could gain:

| Timing                      | Reminder Message                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| 7 days after signup         | "You haven't shared your referral link yet. You're leaving free months on the table."     |
| After positive NPS response | "You rated us highly! Share your link and earn a free month -- don't let it go to waste." |
| Monthly summary (0 refs)    | "You could have earned X free months this month. Share your link before the month ends."  |
| Near milestone              | "You're 1 referral away from Ambassador status. Don't miss out -- share your link today." |

### 2.5 Gamification Integration

The referral program connects directly to GymGurus' existing gamification system (XP, levels, achievements, and Gen Z rank progression). Referrals are treated as a first-class XP source.

| Referral Event                   | XP Reward | Achievement Unlocked                               |
| -------------------------------- | :-------: | -------------------------------------------------- |
| Share referral link (first time) |   25 XP   | "Networker" -- Shared your referral link           |
| Referee signs up (free account)  |   50 XP   | --                                                 |
| Referee subscribes (paid plan)   |  200 XP   | "Talent Scout" -- Referred a paying trainer        |
| Reach 3 converted referrals      |  500 XP   | "Ambassador" -- Brought 3 trainers to GymGurus     |
| Reach 10 converted referrals     |  2000 XP  | "Legend Recruiter" -- Built a GymGurus squad of 10 |

These XP rewards feed into the existing `xp_transactions` table with `reason: 'referral_signup'`, `'referral_conversion'`, or `'referral_milestone'`, and `source_type: 'referral'`.

**Streak bonus:** If a trainer refers at least one person per month for 3 consecutive months, they earn a 500 XP "Consistent Connector" streak bonus.

---

## 3. Technical Implementation

### 3.1 Database Schema Additions

The referral system requires two new tables that follow the existing Drizzle ORM patterns used in `shared/schema.ts`. These tables integrate with the existing `users` table via foreign key references.

#### `referral_codes` Table

Stores each user's unique referral code. One code per user.

```typescript
// In shared/schema.ts

export const referralCodes = pgTable(
  'referral_codes',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 20 }).notNull().unique(),
    customCode: varchar('custom_code', { length: 30 }).unique(), // Optional vanity code
    isActive: boolean('is_active').default(true).notNull(),
    totalShares: integer('total_shares').default(0), // Times the link was shared/copied
    totalClicks: integer('total_clicks').default(0), // Times the link was clicked
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_referral_codes_user_id').on(table.userId),
    index('idx_referral_codes_code').on(table.code),
    index('idx_referral_codes_custom_code').on(table.customCode),
  ]
);
```

#### `referral_conversions` Table

Tracks each referral from initial signup through conversion and reward fulfillment.

```typescript
export const referralConversions = pgTable(
  'referral_conversions',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    referrerId: varchar('referrer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refereeId: varchar('referee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    referralCodeId: varchar('referral_code_id')
      .notNull()
      .references(() => referralCodes.id),

    // Conversion tracking
    status: text('status').notNull().default('pending'),
    // pending    = referee signed up, hasn't subscribed yet
    // converted  = referee subscribed to a paid plan
    // rewarded   = referrer received their free month
    // expired    = referee never subscribed within reward window (90 days)
    // revoked    = reward clawed back due to fraud or refund

    // Reward tracking
    rewardStatus: text('reward_status').notNull().default('pending'),
    // pending    = waiting for conversion
    // eligible   = conversion confirmed, reward ready to apply
    // applied    = free month applied to referrer's account
    // expired    = reward not claimed within 60 days
    // revoked    = reward removed (fraud, refund, etc.)

    rewardType: text('reward_type'), // 'free_month', 'discount', 'xp_bonus'
    rewardAmountCents: integer('reward_amount_cents'), // Dollar value of the reward
    rewardAppliedAt: timestamp('reward_applied_at'),

    // Referee discount tracking
    refereeDiscountPercent: integer('referee_discount_percent').default(50),
    refereeDiscountApplied: boolean('referee_discount_applied').default(false),
    refereeDiscountAmountCents: integer('referee_discount_amount_cents'),

    // Attribution metadata
    referralSource: text('referral_source'), // 'link', 'code', 'email', 'social'
    referralMedium: text('referral_medium'), // 'twitter', 'whatsapp', 'email', 'copy_paste'
    refereeSignupIp: text('referee_signup_ip'), // For fraud detection (hashed)
    refereeDeviceFingerprint: text('referee_device_fingerprint'), // For fraud detection (hashed)

    // Timestamps
    signedUpAt: timestamp('signed_up_at').defaultNow().notNull(),
    convertedAt: timestamp('converted_at'),
    rewardedAt: timestamp('rewarded_at'),
    expiresAt: timestamp('expires_at'), // 90 days after signup
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_referral_conversions_referrer_id').on(table.referrerId),
    index('idx_referral_conversions_referee_id').on(table.refereeId),
    index('idx_referral_conversions_status').on(table.status),
    index('idx_referral_conversions_reward_status').on(table.rewardStatus),
    index('idx_referral_conversions_referral_code').on(table.referralCodeId),
    uniqueIndex('idx_referral_conversions_unique_referee').on(table.refereeId),
  ]
);
```

#### Relations

```typescript
export const referralCodesRelations = relations(referralCodes, ({ one, many }) => ({
  user: one(users, { fields: [referralCodes.userId], references: [users.id] }),
  conversions: many(referralConversions),
}));

export const referralConversionsRelations = relations(referralConversions, ({ one }) => ({
  referrer: one(users, {
    fields: [referralConversions.referrerId],
    references: [users.id],
    relationName: 'referrer',
  }),
  referee: one(users, {
    fields: [referralConversions.refereeId],
    references: [users.id],
    relationName: 'referee',
  }),
  referralCode: one(referralCodes, {
    fields: [referralConversions.referralCodeId],
    references: [referralCodes.id],
  }),
}));
```

#### Insert Schemas & Types

```typescript
export const insertReferralCodeSchema = createInsertSchema(referralCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReferralConversionSchema = createInsertSchema(referralConversions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;
export type ReferralCode = typeof referralCodes.$inferSelect;

export type InsertReferralConversion = z.infer<typeof insertReferralConversionSchema>;
export type ReferralConversion = typeof referralConversions.$inferSelect;
```

#### Migration SQL

```sql
-- server/migrations/004_referral_program.sql

CREATE TABLE IF NOT EXISTS referral_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  custom_code VARCHAR(30) UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_shares INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_custom_code ON referral_codes(custom_code);

CREATE TABLE IF NOT EXISTS referral_conversions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code_id VARCHAR NOT NULL REFERENCES referral_codes(id),
  status TEXT NOT NULL DEFAULT 'pending',
  reward_status TEXT NOT NULL DEFAULT 'pending',
  reward_type TEXT,
  reward_amount_cents INTEGER,
  reward_applied_at TIMESTAMP,
  referee_discount_percent INTEGER DEFAULT 50,
  referee_discount_applied BOOLEAN DEFAULT false,
  referee_discount_amount_cents INTEGER,
  referral_source TEXT,
  referral_medium TEXT,
  referee_signup_ip TEXT,
  referee_device_fingerprint TEXT,
  signed_up_at TIMESTAMP NOT NULL DEFAULT NOW(),
  converted_at TIMESTAMP,
  rewarded_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_conversions_referrer_id ON referral_conversions(referrer_id);
CREATE INDEX idx_referral_conversions_referee_id ON referral_conversions(referee_id);
CREATE INDEX idx_referral_conversions_status ON referral_conversions(status);
CREATE INDEX idx_referral_conversions_reward_status ON referral_conversions(reward_status);
CREATE INDEX idx_referral_conversions_referral_code ON referral_conversions(referral_code_id);
CREATE UNIQUE INDEX idx_referral_conversions_unique_referee ON referral_conversions(referee_id);
```

### 3.2 API Endpoints

All referral endpoints are authenticated and follow the existing route patterns in `server/routes.ts`. They should be registered as a dedicated route module at `server/routes/referrals.ts`.

```typescript
// server/routes/referrals.ts
// Registered in routes.ts as:
// app.use('/api/referrals', secureAuth, apiRateLimit, referralRoutes);
```

#### `GET /api/referrals/code`

Get or generate the authenticated user's referral code.

**Response:**

```json
{
  "code": "GG-a8f3x2k9",
  "customCode": null,
  "referralLink": "https://gymgurus.com/join?ref=GG-a8f3x2k9",
  "isActive": true,
  "totalShares": 12,
  "totalClicks": 8,
  "createdAt": "2026-02-01T00:00:00Z"
}
```

**Logic:**

1. Check if user already has a referral code in `referral_codes`
2. If not, generate an 8-character code: `GG-` prefix + 8 random alphanumeric characters
3. Insert into `referral_codes` and return

#### `GET /api/referrals/stats`

Get referral performance stats for the authenticated user.

**Response:**

```json
{
  "totalReferred": 7,
  "totalConverted": 3,
  "totalPending": 2,
  "totalExpired": 2,
  "rewardsEarned": 3,
  "freeMonthsEarned": 3,
  "rewardValueCents": 14700,
  "currentTier": "Connector",
  "nextTier": "Champion",
  "referralsToNextTier": 2,
  "conversionRate": 42.9,
  "referrals": [
    {
      "refereeFirstName": "Sarah",
      "refereeLastName": "K.",
      "status": "converted",
      "rewardStatus": "applied",
      "signedUpAt": "2026-01-15T00:00:00Z",
      "convertedAt": "2026-01-20T00:00:00Z"
    }
  ]
}
```

#### `POST /api/referrals/apply`

Apply a referral code during signup. This endpoint should be called during account creation, not after.

**Request:**

```json
{
  "code": "GG-a8f3x2k9",
  "source": "link",
  "medium": "twitter"
}
```

**Response:**

```json
{
  "success": true,
  "referrerName": "Mike T.",
  "discountPercent": 50,
  "message": "Mike T. referred you! You'll get 50% off your first month."
}
```

**Logic:**

1. Validate code exists and is active
2. Verify referee is not the same as referrer (no self-referrals)
3. Check referee hasn't already been referred (unique constraint on `referee_id`)
4. Create `referral_conversions` record with status `pending`
5. Set `expires_at` to 90 days from now
6. Increment `total_clicks` on the referral code
7. Return referrer's display name and discount details

#### `POST /api/referrals/convert`

Internal endpoint called by the Stripe webhook handler when a referred user subscribes. Not exposed publicly.

**Logic:**

1. On `checkout.session.completed` or `invoice.paid` webhook, check if the subscriber has a pending referral conversion
2. Update conversion status to `converted`, set `converted_at`
3. Update reward status to `eligible`
4. Apply free month credit to referrer's Stripe subscription (via Stripe credit balance or coupon)
5. Update reward status to `applied`, set `reward_applied_at`
6. Award XP to referrer (200 XP for conversion)
7. Check and update tier milestones
8. Send notification and email to referrer

#### `PUT /api/referrals/code/customize`

Allow the user to set a custom vanity code.

**Request:**

```json
{
  "customCode": "COACH-MIKE"
}
```

**Validation:**

- 4-20 characters, alphanumeric and hyphens only
- Must not already be taken
- Profanity filter check
- One customization per 30 days

#### `POST /api/referrals/share`

Track when a user shares their referral link (for analytics).

**Request:**

```json
{
  "medium": "whatsapp"
}
```

**Logic:**

1. Increment `total_shares` on the referral code
2. Award 25 XP if this is the first share (check `xp_transactions` for existing `referral_share` entry)
3. Log share event for analytics

### 3.3 Referral Link Format

**Standard link:** `https://gymgurus.com/join?ref=GG-a8f3x2k9`

**Vanity link:** `https://gymgurus.com/join?ref=COACH-MIKE`

The `/join` route is a dedicated referral landing page that:

1. Reads the `ref` query parameter
2. Stores it in a cookie (`gymgurus_ref`, 30-day expiry) and `localStorage`
3. Displays a personalized welcome message: "Mike T. invited you to GymGurus"
4. Shows the 50% discount prominently
5. Presents the signup form with the referral code pre-filled (hidden field)

### 3.4 Stripe Integration

Referral rewards are applied through Stripe's billing system:

**Referee discount (50% off first month):**

- Create a Stripe Coupon: `REFERRAL_50_OFF` (50% off, once, first invoice only)
- Apply coupon to the referee's subscription at checkout

**Referrer reward (1 free month):**

- On referee conversion, add a credit to the referrer's Stripe Customer Balance equal to their current plan price
- The credit automatically applies to their next invoice
- If the referrer is not yet a paying customer, store the reward as a pending credit in the database

### 3.5 Integration with Existing Systems

The referral system touches several existing modules:

| System              | Integration Point                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Auth (signup)**   | `POST /api/auth/signup` calls referral apply logic if `ref` code is present                    |
| **Stripe webhooks** | `invoice.paid` webhook triggers conversion check and reward application                        |
| **Gamification**    | XP awards via existing `xpTransactions` table and `awardWorkoutCompletionXp` pattern           |
| **Achievements**    | New achievement entries in `achievements` table for referral milestones                        |
| **Notifications**   | In-app notifications via existing `notifications` table and `notificationService`              |
| **Rate limiting**   | Referral endpoints use `apiRateLimit` (30/min); apply endpoint uses `strictRateLimit` (10/min) |

---

## 4. Dashboard Widget Design

### 4.1 Widget Placement

The referral widget appears in two locations:

1. **Dashboard sidebar** -- A compact card showing the referral code, copy button, and summary stats
2. **Dedicated referral page** (`/referrals`) -- Full-page view with detailed stats, referral history, tier progress, and sharing tools

### 4.2 Compact Dashboard Widget

```
+--------------------------------------------------+
|  REFER & EARN                            [?]     |
|                                                   |
|  Your referral code:                              |
|  +------------------------------------+ +------+ |
|  | GG-a8f3x2k9                        | | COPY | |
|  +------------------------------------+ +------+ |
|                                                   |
|  Share via:  [Email] [Twitter/X] [WhatsApp]       |
|                                                   |
|  +------+  +----------+  +-----------------+     |
|  |  7   |  |    3     |  |    3 months     |     |
|  | Refs  |  | Converted|  |    FREE earned  |     |
|  +------+  +----------+  +-----------------+     |
|                                                   |
|  [View Full Referral Dashboard ->]                |
+--------------------------------------------------+
```

**Design specs:**

- Background: White card with subtle Electric Blue (#3B82F6) left border
- Copy button: Emerald (#10B981) background, white text
- Share buttons: Outlined style with brand color icons
- Stats: Bold numbers in Electric Blue, labels in gray
- Hover on copy: "Copied!" toast in Emerald

### 4.3 Full Referral Dashboard Page

#### Hero Section

```
+------------------------------------------------------------------+
|                                                                    |
|  SHARE GYMGURUS. EARN FREE MONTHS.                                |
|                                                                    |
|  Your code: GG-a8f3x2k9  [COPY LINK]  [CUSTOMIZE CODE]          |
|                                                                    |
|  gymgurus.com/join?ref=GG-a8f3x2k9                               |
|                                                                    |
|  Share via:                                                        |
|  [  Email  ]  [  Twitter/X  ]  [  WhatsApp  ]  [  Copy Link  ]   |
|                                                                    |
+------------------------------------------------------------------+
```

#### Stats Row

```
+----------------+  +------------------+  +------------------+  +------------------+
|                |  |                  |  |                  |  |                  |
|    7           |  |       3          |  |     42.9%        |  |   3 months       |
|   Referred     |  |    Converted     |  |  Conversion Rate |  |   FREE earned    |
|                |  |                  |  |                  |  |                  |
+----------------+  +------------------+  +------------------+  +------------------+
```

#### Tier Progress Bar

```
+------------------------------------------------------------------+
|                                                                    |
|  Your tier: CONNECTOR (3 referrals)                               |
|                                                                    |
|  [====Starter====][==Connector===][...Champion...][...Legend...]   |
|  1 ref            3 refs          5 refs          10 refs          |
|                                 ^ You are here                     |
|                                                                    |
|  2 more referrals to CHAMPION tier                                |
|  Unlock: Exclusive beta access to new features                    |
|                                                                    |
+------------------------------------------------------------------+
```

**Progress bar design:**

- Completed tiers: Emerald (#10B981) fill
- Current tier: Electric Blue (#3B82F6) fill with pulse animation
- Future tiers: Gray (#E5E7EB) fill
- Milestone markers: Circular badges at each tier threshold

#### Referral History Table

```
+------------------------------------------------------------------+
|  Referral History                                                  |
+------------------------------------------------------------------+
|  Name          | Status      | Reward       | Date               |
|  ------------- | ----------- | ------------ | ------------------ |
|  Sarah K.      | Converted   | +1 month     | Jan 20, 2026       |
|  James R.      | Converted   | +1 month     | Jan 28, 2026       |
|  Emily W.      | Converted   | +1 month     | Feb 5, 2026        |
|  David L.      | Pending     | --           | Feb 10, 2026       |
|  Lisa M.       | Pending     | --           | Feb 12, 2026       |
|  Chris P.      | Expired     | --           | Nov 1, 2025        |
|  Anna S.       | Expired     | --           | Nov 15, 2025       |
+------------------------------------------------------------------+
```

**Status badges:**

- Converted: Emerald (#10B981) badge
- Pending: Amber (#F59E0B) badge
- Expired: Gray (#9CA3AF) badge
- Revoked: Red (#EF4444) badge

### 4.4 Share Functionality

#### Copy-to-Clipboard Button

```typescript
// Copies referral link and shows success toast
const copyReferralLink = async () => {
  await navigator.clipboard.writeText(referralLink);
  toast.success('Referral link copied!');
  // Track share event
  await fetch('/api/referrals/share', {
    method: 'POST',
    body: JSON.stringify({ medium: 'copy_paste' }),
  });
};
```

#### Share Buttons

| Platform     | Share URL Format                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| **Email**    | `mailto:?subject=Try GymGurus&body=I've been using GymGurus... {link}`                                |
| **Twitter**  | `https://twitter.com/intent/tweet?text=I use @GymGurus to manage my PT business. Get 50% off: {link}` |
| **WhatsApp** | `https://wa.me/?text=Check out GymGurus! Get 50% off your first month: {link}`                        |

Each share button triggers the `POST /api/referrals/share` endpoint with the corresponding `medium` value for attribution tracking.

---

## 5. Email Notifications

### 5.1 Referral Event Emails

The referral program triggers five automated email sequences. These integrate with the email infrastructure planned in the go-to-market strategy (Resend or SendGrid).

#### Email 1: "Someone signed up with your link!"

**Trigger:** Referee creates an account using the referrer's code.

**Subject:** "[First Name], someone just signed up with your referral link!

**Body:**

```
Hi [Referrer First Name],

Great news -- [Referee First Name] just signed up for GymGurus using your
referral link.

They're exploring the platform now. When they subscribe to a paid plan,
you'll earn 1 free month automatically.

Your referral stats:
  Referred: [X]  |  Converted: [Y]  |  Free months earned: [Z]

Keep sharing your link to earn more:
[REFERRAL LINK]

-- The GymGurus Team
```

#### Email 2: "Your referral just subscribed -- you earned 1 month free!"

**Trigger:** Referee subscribes to a paid plan (conversion confirmed).

**Subject:** "You just earned a free month! [Referee First Name] subscribed."

**Body:**

```
Hi [Referrer First Name],

[Referee First Name] just subscribed to GymGurus [Plan Name]!

Your reward: 1 FREE MONTH has been applied to your account.
It will appear as a credit on your next invoice.

You've now earned [Z] free months total.
[Y] more referral(s) to reach [Next Tier Name] tier!

Share your link:
[REFERRAL LINK]

-- The GymGurus Team
```

#### Email 3: Monthly Referral Summary

**Trigger:** 1st of each month (only sent to users with at least 1 referral or share).

**Subject:** "Your January referral report"

**Body:**

```
Hi [First Name],

Here's your referral summary for [Month]:

  New referrals this month: [X]
  Conversions this month:   [Y]
  Free months earned:       [Z]
  Total lifetime referrals: [Total]

Your current tier: [Tier Name]
[Progress bar visualization]
[N] referrals to [Next Tier Name]

Your referral link: [LINK]

-- The GymGurus Team
```

#### Email 4: Referral Expiration Warning

**Trigger:** 7 days before a pending referral expires (day 83 of 90-day window).

**Subject:** "[Referee First Name]'s referral expires in 7 days"

**Body:**

```
Hi [Referrer First Name],

[Referee First Name] signed up with your link [X] days ago but hasn't
subscribed yet. Their referral expires in 7 days.

If they subscribe before [Expiry Date], you'll earn a free month.

Want to nudge them? Forward this to [Referee First Name]:

"Hey [Referee First Name], I noticed you signed up for GymGurus! If you
subscribe this week, you'll get 50% off your first month. Here's the
link: [REFERRAL LINK]"

-- The GymGurus Team
```

#### Email 5: Milestone Celebration

**Trigger:** User reaches a new referral tier (3, 5, or 10 conversions).

**Subject:** "You've reached [Tier Name] status!"

**Body:**

```
Hi [First Name],

Congratulations! You've referred [X] trainers to GymGurus and reached
[Tier Name] status.

Your reward: [Tier Reward Description]

[Badge Image]

You're now in the top [Y]% of GymGurus referrers. Thank you for
helping build the trainer community.

Next milestone: [Next Tier] at [N] referrals.

-- The GymGurus Team
```

### 5.2 Email Design Specs

| Element             | Specification                                                   |
| ------------------- | --------------------------------------------------------------- |
| **Header**          | GymGurus logo, Electric Blue (#3B82F6) gradient top bar         |
| **CTA buttons**     | Emerald (#10B981) background, white text, rounded corners       |
| **Stats highlight** | Electric Blue (#3B82F6) number, gray label text                 |
| **Footer**          | Unsubscribe link, company info, social media icons              |
| **Responsive**      | Single-column layout, 600px max width, mobile-optimized         |
| **Sending address** | referrals@gymgurus.com (dedicated subdomain for deliverability) |

---

## 6. Anti-Fraud Measures

Referral fraud can rapidly erode program economics. GymGurus implements a layered defense strategy that balances fraud prevention with user experience.

### 6.1 Rate Limiting on Referral Signups

| Limit                                       | Threshold | Action                                 |
| ------------------------------------------- | --------- | -------------------------------------- |
| Referral code applications per IP per hour  | 3         | Block additional signups, flag IP      |
| Referral conversions per referrer per day   | 5         | Queue for manual review                |
| Referral conversions per referrer per month | 15        | Auto-pause referral code, notify admin |

Rate limiting uses the existing `strictRateLimit` middleware (10 requests/minute) on the `POST /api/referrals/apply` endpoint, supplemented by custom IP-based and user-based limits in the referral service layer.

### 6.2 Minimum Engagement Threshold

Rewards are not granted immediately on subscription. The referee must meet a **minimum engagement threshold** before the referrer's reward is applied:

| Engagement Gate                                  | Purpose                                         |
| ------------------------------------------------ | ----------------------------------------------- |
| Referee must be subscribed for at least 7 days   | Prevents immediate subscribe-and-cancel fraud   |
| Referee must have logged in at least 3 times     | Confirms genuine usage, not a throwaway account |
| Referee must not request a refund within 14 days | If referee refunds, reward is clawed back       |

**Implementation:** The conversion webhook sets status to `converted` immediately but sets reward status to `eligible` only after a 7-day delay job confirms the engagement gates are met. A scheduled task runs daily to check pending rewards.

### 6.3 Same IP / Device Detection

```typescript
// Fraud signals checked at referral application
interface FraudSignals {
  sameIpAsReferrer: boolean; // Referee IP matches referrer's known IPs
  sameDeviceFingerprint: boolean; // Browser fingerprint matches referrer's
  disposableEmail: boolean; // Referee email is from a known disposable domain
  rapidSignupPattern: boolean; // Multiple signups from same IP in short window
  vpnDetected: boolean; // IP resolves to known VPN/proxy
}
```

**Detection logic:**

1. On `POST /api/referrals/apply`, hash the referee's IP and a lightweight browser fingerprint (screen resolution + timezone + language + user agent hash)
2. Compare against the referrer's stored IP hashes and fingerprints
3. If 2+ fraud signals fire, the referral is flagged as `suspicious` and queued for manual review
4. The referee still gets their discount (no user-facing friction), but the referrer's reward is held pending review

**IP hashing:** IPs are stored as SHA-256 hashes with a rotating salt, never in plaintext, to comply with privacy regulations.

### 6.4 Manual Review for High-Volume Referrers

Any referrer who triggers more than 10 conversions in a 30-day period is automatically flagged for manual review. The admin review dashboard shows:

- Referrer's account age and engagement history
- Geographic distribution of referees
- IP overlap between referrer and referees
- Device fingerprint overlap
- Referee engagement metrics (login frequency, feature usage)
- Referee churn rate (if referees churn faster than baseline, it suggests low-quality referrals)

**Admin actions:**

- **Approve:** Release held rewards
- **Reject:** Revoke rewards, mark referrals as fraudulent
- **Suspend:** Temporarily disable referral code
- **Ban:** Permanently disable referral code and flag account

### 6.5 Disposable Email Blocking

The signup flow already validates email format. The referral system adds a check against a list of known disposable email domains (mailinator.com, guerrillamail.com, etc.). Signups with disposable emails are blocked from receiving referral discounts, though they can still create accounts.

### 6.6 Clawback Policy

Referrer rewards are clawed back under these conditions:

| Clawback Trigger                                   | Action                                  |
| -------------------------------------------------- | --------------------------------------- |
| Referee requests refund within 14 days             | Revoke referrer's free month credit     |
| Referee account banned for TOS violation           | Revoke referrer's free month credit     |
| Fraud detected on referrer's account               | Revoke all pending and applied rewards  |
| Referee was referred by the same person previously | Referral marked as duplicate, no reward |

---

## 7. Launch Playbook

### Phase 1: Invite-Only Beta (Month 4, Week 1-2)

**Objective:** Validate the referral program mechanics with a small, trusted cohort before opening to all users.

**Cohort selection:** Top 10% most active trainers by login frequency and feature usage (approximately 5-20 users at early scale).

| Task                                            | Owner    | Timeline |
| ----------------------------------------------- | -------- | -------- |
| Deploy referral database tables (migration 004) | Backend  | Day 1    |
| Implement API endpoints (code, stats, apply)    | Backend  | Day 1-3  |
| Build dashboard widget (compact + full page)    | Frontend | Day 2-5  |
| Integrate with Stripe coupon/credit system      | Backend  | Day 3-5  |
| Connect to gamification (XP awards)             | Backend  | Day 4-5  |
| Set up fraud detection signals                  | Backend  | Day 5-7  |
| Email beta cohort with personal invitation      | Growth   | Day 7    |
| Collect feedback via Slack/Discord channel      | Growth   | Day 7-14 |

**Success criteria for Phase 1:**

- 50%+ of beta users generate and share their referral code
- At least 5 referral signups from the beta cohort
- Zero fraud incidents
- No critical bugs in reward application

### Phase 2: Open to All Trainers (Month 4, Week 3 - Month 5)

**Objective:** Roll out the referral program to the entire trainer user base and begin driving meaningful referral-sourced acquisition.

| Task                                                         | Owner    | Timeline |
| ------------------------------------------------------------ | -------- | -------- |
| Fix any bugs identified in Phase 1                           | Backend  | Week 3   |
| Build referral email notification system (5 templates)       | Backend  | Week 3   |
| Add referral prompt after positive NPS response              | Frontend | Week 3   |
| Add referral prompt after achievement unlock                 | Frontend | Week 3   |
| Enable referral widget in dashboard for all trainers         | Frontend | Week 3   |
| Announce program via in-app notification + email blast       | Growth   | Week 3   |
| A/B test referral widget placement (sidebar vs main content) | Growth   | Week 4-6 |
| A/B test referral CTA copy (3 variants)                      | Growth   | Week 4-6 |
| Monitor fraud signals daily                                  | Backend  | Ongoing  |
| Monthly referral summary email goes live                     | Backend  | Month 5  |

**Success criteria for Phase 2:**

- 20%+ of active trainers generate a referral code
- 10%+ of active trainers share their code at least once
- Referral channel accounts for 15%+ of new signups
- Conversion rate of referred signups > 30%
- Fraud rate < 2% of total referrals

### Phase 3: Client-to-Trainer Referrals (Month 6+)

**Objective:** Expand the referral program beyond trainer-to-trainer to include client-to-trainer referrals, creating a second referral channel.

In this phase, clients who use GymGurus (through their trainer's account) can refer other trainers to the platform. This is a natural extension because clients often know other fitness professionals through their gym network.

| Task                                                         | Owner    | Timeline |
| ------------------------------------------------------------ | -------- | -------- |
| Extend referral code generation to client/solo user roles    | Backend  | Month 6  |
| Modify reward structure (clients earn premium features)      | Product  | Month 6  |
| Build client-facing referral widget                          | Frontend | Month 6  |
| Add "Refer your trainer" flow for solo users                 | Frontend | Month 6  |
| Track client-sourced vs trainer-sourced referrals separately | Backend  | Month 6  |

**Client referral rewards:**

- Clients who refer a trainer: Unlock premium features (advanced analytics, custom reports) for 1 month
- Solo users who refer a trainer: 1 month free Pro access

---

## 8. KPIs & Success Metrics

### Primary KPIs

These are the metrics that determine whether the referral program is achieving its strategic objective of sustainable, low-cost acquisition.

| KPI                      | Definition                                                    | Target (Month 1) | Target (Month 6) | Measurement Frequency |
| ------------------------ | ------------------------------------------------------------- | :--------------: | :--------------: | --------------------- |
| **Referral Rate**        | % of active users who share their referral link at least once |       10%        |       25%        | Weekly                |
| **Conversion Rate**      | % of referred signups who subscribe to a paid plan            |       20%        |       35%        | Weekly                |
| **Virality Coefficient** | K-factor = Referral Rate x Conversion Rate x Avg Invites      |       0.1        |       0.3        | Monthly               |
| **Referral Revenue**     | MRR attributable to referral-sourced subscribers              |       $500       |      $5,000      | Monthly               |
| **Referral CAC**         | Total referral reward costs / Number of converted referrals   |      < $100      |      < $80       | Monthly               |

### Secondary KPIs

| KPI                         | Definition                                                         | Target    |
| --------------------------- | ------------------------------------------------------------------ | --------- |
| **Referral Share Rate**     | Average number of times a user shares their code per month         | 3+        |
| **Time to First Share**     | Days from account creation to first referral link share            | < 14 days |
| **Code Generation Rate**    | % of users who generate a referral code (even if they don't share) | 40%       |
| **Referred User Retention** | 30-day retention of referred users vs organic                      | > organic |
| **Referred User LTV**       | Lifetime value of referred users vs organic                        | > organic |
| **Reward Redemption Rate**  | % of eligible rewards that are actually applied                    | > 90%     |
| **Fraud Rate**              | % of referral conversions flagged or confirmed as fraud            | < 2%      |
| **Referral NPS**            | NPS score from referred users ("How did you hear about GymGurus?") | > 50      |
| **Tier Progression Rate**   | % of referrers who reach Connector tier (3+ referrals)             | 15%       |

### Virality Coefficient (K-Factor) Deep Dive

The K-factor determines whether the referral program produces self-sustaining growth. It is calculated as:

```
K = i x c

Where:
  i = average number of invites sent per user
  c = conversion rate of invites to signups
```

| Scenario        | Invites per User (i) | Invite-to-Signup Rate (c) | K-Factor | Interpretation                      |
| --------------- | :------------------: | :-----------------------: | :------: | ----------------------------------- |
| **Pessimistic** |          2           |            5%             |   0.10   | Each 10 users produce 1 new signup  |
| **Baseline**    |          3           |            10%            |   0.30   | Each 10 users produce 3 new signups |
| **Optimistic**  |          5           |            15%            |   0.75   | Each 4 users produce 3 new signups  |
| **Viral**       |          7           |            20%            |   1.40   | Self-sustaining exponential growth  |

**Target:** Achieve K > 0.3 by Month 6. A K-factor above 0.3 means referrals contribute meaningfully to growth even if they do not produce fully viral (K > 1) dynamics. For a niche B2B SaaS product targeting personal trainers, K = 0.3-0.5 is a strong outcome.

### CAC Comparison: Referral vs Other Channels

| Channel                  | Estimated CAC | Referral CAC Advantage |
| ------------------------ | :-----------: | :--------------------: |
| Referral Program         |    $80-100    |           --           |
| Google Ads (Search)      |    $50-100    |       Comparable       |
| Meta Ads (Facebook/IG)   |    $40-80     |       Comparable       |
| SEO / Organic Search     |    $10-20     |     SEO is cheaper     |
| Product-Led Growth (PLG) |     $5-15     |     PLG is cheaper     |

The referral program's CAC is comparable to paid channels, but referral-sourced users typically have **higher retention and LTV** because they arrive with a personal recommendation and social proof from someone they trust. Industry benchmarks show referred users retain 18-37% better than non-referred users.

### Reporting Dashboard

A dedicated admin analytics page should display:

1. **Referral funnel:** Code generated -> Link shared -> Referee signed up -> Referee subscribed -> Reward applied
2. **Conversion rate by source:** Which share channels (email, Twitter, WhatsApp, copy-paste) produce the highest conversion?
3. **Top referrers leaderboard:** Which users are driving the most conversions?
4. **Revenue attribution:** How much MRR is directly attributable to the referral channel?
5. **Fraud dashboard:** Flagged referrals, held rewards, IP overlap patterns
6. **Cohort analysis:** Do referred users retain better than organic users at 30, 60, and 90 days?

---

## Appendix: Integration Checklist

A summary of all files that need modification or creation to implement the referral program.

### New Files

| File                                                | Purpose                                   |
| --------------------------------------------------- | ----------------------------------------- |
| `server/routes/referrals.ts`                        | API route handlers for referral endpoints |
| `server/services/referralService.ts`                | Business logic for referral operations    |
| `server/services/referralFraudDetection.ts`         | Fraud detection and prevention logic      |
| `server/migrations/004_referral_program.sql`        | Database migration for referral tables    |
| `client/src/pages/ReferralDashboard.tsx`            | Full referral dashboard page              |
| `client/src/components/referral/ReferralWidget.tsx` | Compact dashboard widget component        |
| `client/src/components/referral/ShareButtons.tsx`   | Share button row component                |
| `client/src/components/referral/TierProgress.tsx`   | Tier progress bar component               |

### Modified Files

| File                                  | Change                                         |
| ------------------------------------- | ---------------------------------------------- |
| `shared/schema.ts`                    | Add referral tables, relations, types          |
| `server/routes.ts`                    | Register referral route module                 |
| `server/routes/payments.ts`           | Add conversion check to Stripe webhook handler |
| `client/src/App.tsx`                  | Add `/referrals` route                         |
| `client/src/components/Dashboard.tsx` | Add referral widget to sidebar                 |
| `client/src/pages/LandingPage.tsx`    | Handle `?ref=` query parameter                 |

---

_This document should be reviewed after Phase 1 beta results are available and updated based on actual referral metrics. All assumptions about conversion rates, fraud rates, and K-factor should be replaced with observed data as it becomes available._
