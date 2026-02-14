# GymGurus Unit Economics Model

**Last Updated:** February 2026
**Status:** Strategic Planning Document
**Target Market:** Independent Personal Trainers

---

## Table of Contents

1. [Revenue Model & Pricing Tiers](#1-revenue-model--pricing-tiers)
2. [Customer Lifetime Value (LTV)](#2-customer-lifetime-value-ltv)
3. [Customer Acquisition Cost (CAC) Targets](#3-customer-acquisition-cost-cac-targets)
4. [Break-even Analysis](#4-break-even-analysis)
5. [Scenario Modeling](#5-scenario-modeling)
6. [Price Sensitivity Analysis](#6-price-sensitivity-analysis)
7. [Annual Pricing](#7-annual-pricing)
8. [Key Metrics Dashboard](#8-key-metrics-dashboard)

---

## 1. Revenue Model & Pricing Tiers

GymGurus operates on a freemium SaaS model targeting independent personal trainers. The free tier serves as a product-led growth funnel, converting solo users into paying trainers as their business grows.

### Tier Breakdown

| Feature                               | Solo (Free)                     | Trainer ($49/mo)          | Pro ($99/mo)                |
| ------------------------------------- | ------------------------------- | ------------------------- | --------------------------- |
| **Monthly Price**                     | $0                              | $49                       | $99                         |
| **Target User**                       | Individual tracking own fitness | Trainer with 1-15 clients | Trainer with 15+ clients    |
| **Client Slots**                      | Self only                       | Up to 15 clients          | Unlimited clients           |
| **Workout Templates**                 | 5 templates                     | 50 templates              | Unlimited templates         |
| **AI Coaching (Claude)**              | 10 messages/day                 | 100 messages/day          | Unlimited messages          |
| **Calculators (BMI, 1RM, Standards)** | Full access                     | Full access               | Full access                 |
| **Progress Analytics**                | Basic                           | Advanced per-client       | Advanced + aggregate trends |
| **Custom Branding**                   | No                              | No                        | Yes (white-label dashboard) |
| **Client Onboarding Flows**           | No                              | Basic                     | Customizable                |
| **Export & Reporting**                | No                              | CSV export                | CSV + PDF branded reports   |
| **Priority Support**                  | Community only                  | Email (48hr response)     | Email + chat (4hr response) |
| **API Access**                        | No                              | No                        | Yes                         |

### Revenue Composition Assumptions (at scale)

| Source                | % of Revenue | Notes                                               |
| --------------------- | ------------ | --------------------------------------------------- |
| Trainer subscriptions | ~55%         | Bulk of paying users                                |
| Pro subscriptions     | ~35%         | Fewer users, higher ARPU                            |
| Annual plans          | ~8%          | Subset of Trainer + Pro on annual billing           |
| Overage / add-ons     | ~2%          | Future: additional client slots, extra API messages |

---

## 2. Customer Lifetime Value (LTV)

### LTV by Tier

Customer lifetime is calculated as the inverse of monthly churn rate: **Avg. Lifetime (months) = 1 / Monthly Churn Rate**.

#### Trainer Tier ($49/mo)

| Metric                             | Value                                    |
| ---------------------------------- | ---------------------------------------- |
| Monthly Price                      | $49.00                                   |
| Monthly Churn Rate                 | 10%                                      |
| Average Lifetime                   | 1 / 0.10 = **10 months**                 |
| Gross LTV                          | $49 x 10 = **$490**                      |
| Stripe Fees per Payment            | (2.9% x $49) + $0.30 = $1.72             |
| Total Stripe Fees over Lifetime    | $1.72 x 10 = $17.20                      |
| Avg. API Cost per User/Month       | ~$0.003 x ~30 msgs/day x 30 days = $2.70 |
| Total API Cost over Lifetime       | $2.70 x 10 = $27.00                      |
| **Net LTV (after variable costs)** | $490 - $17.20 - $27.00 = **$445.80**     |

#### Pro Tier ($99/mo)

| Metric                             | Value                                        |
| ---------------------------------- | -------------------------------------------- |
| Monthly Price                      | $99.00                                       |
| Monthly Churn Rate                 | 7%                                           |
| Average Lifetime                   | 1 / 0.07 = **~14.3 months**                  |
| Gross LTV                          | $99 x 14.3 = **$1,415.70**                   |
| Stripe Fees per Payment            | (2.9% x $99) + $0.30 = $3.17                 |
| Total Stripe Fees over Lifetime    | $3.17 x 14.3 = $45.33                        |
| Avg. API Cost per User/Month       | ~$0.003 x ~80 msgs/day x 30 days = $7.20     |
| Total API Cost over Lifetime       | $7.20 x 14.3 = $102.96                       |
| **Net LTV (after variable costs)** | $1,415.70 - $45.33 - $102.96 = **$1,267.41** |

#### Blended LTV

Assuming a 70/30 split between Trainer and Pro subscribers:

| Metric                 | Calculation                           | Value           |
| ---------------------- | ------------------------------------- | --------------- |
| Blended Gross LTV      | (0.70 x $490) + (0.30 x $1,415.70)    | **$767.71**     |
| Blended Net LTV        | (0.70 x $445.80) + (0.30 x $1,267.41) | **$692.29**     |
| Blended ARPU (monthly) | (0.70 x $49) + (0.30 x $99)           | **$64.00**      |
| Blended Avg. Lifetime  | (0.70 x 10) + (0.30 x 14.3)           | **11.3 months** |

### LTV Sensitivity to Churn

Small reductions in churn produce outsized LTV gains:

| Trainer Churn  | Trainer LTV | Pro Churn     | Pro LTV    | Blended LTV |
| -------------- | ----------- | ------------- | ---------- | ----------- |
| 15%            | $327        | 12%           | $825       | $476        |
| 12%            | $408        | 10%           | $990       | $583        |
| **10% (base)** | **$490**    | **7% (base)** | **$1,416** | **$768**    |
| 8%             | $613        | 5%            | $1,980     | $1,023      |
| 6%             | $817        | 4%            | $2,475     | $1,314      |

**Key Insight:** Reducing Trainer churn from 10% to 8% increases blended LTV by 33%. Churn reduction should be prioritized over acquisition in early-stage growth.

---

## 3. Customer Acquisition Cost (CAC) Targets

### LTV:CAC Ratio Framework

The industry standard for healthy SaaS economics is a **LTV:CAC ratio of 3:1 or higher**. Below 3:1 indicates unsustainable acquisition spend. Above 5:1 may indicate underinvestment in growth.

| Tier    | Net LTV   | Target LTV:CAC | Max CAC | Ideal CAC   |
| ------- | --------- | -------------- | ------- | ----------- |
| Trainer | $445.80   | 3:1            | $148.60 | $50 - $100  |
| Pro     | $1,267.41 | 3:1            | $422.47 | $100 - $200 |
| Blended | $692.29   | 3:1            | $230.76 | $70 - $130  |

### CAC by Acquisition Channel

| Channel                    | Estimated CAC | Volume Potential | Time to ROI | Notes                                                                                                                   |
| -------------------------- | ------------- | ---------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| **SEO / Organic Search**   | $10 - $20     | High (long-term) | 6-12 months | Rank for "personal trainer software," fitness calculator queries. Lowest CAC but requires sustained content investment. |
| **Content Marketing**      | $15 - $30     | Medium-High      | 3-9 months  | Blog posts, YouTube tutorials, fitness industry guides. Compounds over time.                                            |
| **Referral Program**       | $20 - $40     | Medium           | 1-2 months  | Offer 1 free month for referrer + referee. Viral coefficient target: 0.3+.                                              |
| **Social Media (Organic)** | $20 - $35     | Medium           | 2-6 months  | Instagram, TikTok demos, trainer testimonials.                                                                          |
| **Paid Ads (Google)**      | $50 - $100    | High             | Immediate   | Search ads for high-intent keywords. CPCs in fitness SaaS range $3-8.                                                   |
| **Paid Ads (Meta/IG)**     | $40 - $80     | High             | Immediate   | Retargeting and lookalike audiences from free-tier signups.                                                             |
| **Partnerships**           | $25 - $50     | Low-Medium       | 3-6 months  | Gym chains, certification bodies, fitness influencers.                                                                  |
| **Product-Led Growth**     | $5 - $15      | High             | Ongoing     | Free-tier users converting to paid. Lowest CAC.                                                                         |

### Blended CAC Target

| Phase                | Target Blended CAC | Primary Channels            | LTV:CAC        |
| -------------------- | ------------------ | --------------------------- | -------------- |
| Pre-launch / Early   | $30 - $50          | PLG, content, referrals     | 14:1 - 23:1    |
| Growth (Months 3-12) | $50 - $80          | SEO, content, light paid    | 8.7:1 - 13.8:1 |
| Scale (Year 2+)      | $80 - $130         | Paid ads, partnerships, PLG | 5.3:1 - 8.7:1  |

### CAC Payback Period

| Tier    | CAC (Target) | Monthly Revenue | Monthly Margin | Payback Period |
| ------- | ------------ | --------------- | -------------- | -------------- |
| Trainer | $75          | $49             | $44.58         | **1.7 months** |
| Pro     | $150         | $99             | $88.83         | **1.7 months** |
| Blended | $100         | $64             | $57.50         | **1.7 months** |

A payback period under 12 months is healthy. Under 3 months is exceptional and leaves room to invest more aggressively.

---

## 4. Break-even Analysis

### Monthly Cost Structure

#### Fixed Costs (Early Stage)

| Cost Item                         | Monthly Cost   | Notes                                  |
| --------------------------------- | -------------- | -------------------------------------- |
| Cloud Hosting (Replit / VPS)      | $50 - $100     | Scales with traffic; starts low        |
| Domain & DNS                      | ~$2            | ~$20/year amortized                    |
| Email Service (Resend / Postmark) | $0 - $20       | Free tier initially                    |
| Monitoring & Logging              | $0 - $25       | Free tiers available (Sentry, LogTail) |
| Analytics (PostHog / Mixpanel)    | $0 - $30       | Free tier covers early stage           |
| Development Tools & Subscriptions | $20 - $50      | GitHub, CI/CD, misc tooling            |
| **Total Fixed Costs**             | **$72 - $227** |                                        |
| **Midpoint Estimate**             | **~$150/mo**   |                                        |

#### Variable Costs (Per User)

| Cost Item                    | Cost per Unit              | Notes                                    |
| ---------------------------- | -------------------------- | ---------------------------------------- |
| Anthropic Claude API         | $0.003 / message           | ~$2.70/mo per Trainer, ~$7.20/mo per Pro |
| Stripe Processing            | 2.9% + $0.30 / transaction | ~$1.72/mo per Trainer, ~$3.17/mo per Pro |
| Email Notifications          | ~$0.001 / email            | Negligible at early scale                |
| **Total Variable / Trainer** | **~$4.42/mo**              |                                          |
| **Total Variable / Pro**     | **~$10.37/mo**             |                                          |
| **Blended Variable / User**  | **~$6.21/mo**              | Assumes 70/30 Trainer/Pro                |

#### Contribution Margin

| Tier        | Price      | Variable Cost | Contribution Margin | Margin %  |
| ----------- | ---------- | ------------- | ------------------- | --------- |
| Trainer     | $49.00     | $4.42         | $44.58              | 91.0%     |
| Pro         | $99.00     | $10.37        | $88.63              | 89.5%     |
| **Blended** | **$64.00** | **$6.21**     | **$57.79**          | **90.3%** |

### Break-even Calculation

**Break-even Point = Fixed Costs / Blended Contribution Margin**

| Fixed Cost Scenario | Monthly Fixed | Blended Margin | Break-even Users    | Break-even MRR |
| ------------------- | ------------- | -------------- | ------------------- | -------------- |
| Lean ($150/mo)      | $150          | $57.79         | **3 paying users**  | $192           |
| Moderate ($300/mo)  | $300          | $57.79         | **6 paying users**  | $384           |
| Growth ($500/mo)    | $500          | $57.79         | **9 paying users**  | $576           |
| Scaled ($1,000/mo)  | $1,000        | $57.79         | **18 paying users** | $1,152         |

**Key Insight:** GymGurus breaks even with as few as 3-6 paying subscribers in the lean phase. The 90%+ contribution margin means nearly every dollar of new revenue flows to the bottom line after fixed costs are covered.

### Monthly Burn Rate (Pre-Revenue)

| Item                       | Monthly Cost |
| -------------------------- | ------------ |
| Hosting + Infrastructure   | $75          |
| API costs (testing/dev)    | $15          |
| Tools & services           | $30          |
| Domain + email             | $5           |
| **Total Pre-Revenue Burn** | **~$125/mo** |

At this burn rate, a $1,500 initial budget provides ~12 months of runway before a single dollar of revenue.

---

## 5. Scenario Modeling

### 6-Month Growth Scenarios

All scenarios assume the 70/30 Trainer/Pro split and a ramp period where users are acquired gradually over the 6 months (not all on Day 1).

#### Conservative Scenario: 50 Paying Trainers by Month 6

| Month | New Users | Total Paying | MRR    | Cumulative Revenue | Monthly Costs | Monthly Profit |
| ----- | --------- | ------------ | ------ | ------------------ | ------------- | -------------- |
| 1     | 3         | 3            | $192   | $192               | $200          | -$8            |
| 2     | 5         | 8            | $512   | $704               | $215          | $297           |
| 3     | 7         | 14           | $896   | $1,600             | $240          | $656           |
| 4     | 9         | 22           | $1,408 | $3,008             | $270          | $1,138         |
| 5     | 12        | 33           | $2,112 | $5,120             | $310          | $1,802         |
| 6     | 18        | 50           | $3,200 | $8,320             | $360          | $2,840         |

| Metric                          | Value      |
| ------------------------------- | ---------- |
| Month 6 MRR                     | $3,200     |
| Month 6 ARR (annualized)        | $38,400    |
| Total 6-Month Revenue           | $8,320     |
| Total 6-Month Costs             | $1,595     |
| Total 6-Month Profit            | $6,725     |
| CAC Budget Spent (50 x $75 avg) | $3,750     |
| **Net 6-Month Position**        | **$2,975** |

#### Moderate Scenario: 200 Paying Trainers by Month 6

| Month | New Users | Total Paying | Churned | Net Paying | MRR     | Monthly Costs | Monthly Profit |
| ----- | --------- | ------------ | ------- | ---------- | ------- | ------------- | -------------- |
| 1     | 10        | 10           | 0       | 10         | $640    | $220          | $420           |
| 2     | 20        | 30           | 1       | 29         | $1,856  | $280          | $1,576         |
| 3     | 30        | 59           | 3       | 56         | $3,584  | $400          | $3,184         |
| 4     | 40        | 96           | 5       | 91         | $5,824  | $550          | $5,274         |
| 5     | 50        | 141          | 9       | 132        | $8,448  | $720          | $7,728         |
| 6     | 80        | 212          | 12      | 200        | $12,800 | $950          | $11,850        |

| Metric                           | Value       |
| -------------------------------- | ----------- |
| Month 6 MRR                      | $12,800     |
| Month 6 ARR (annualized)         | $153,600    |
| Total 6-Month Revenue            | $33,152     |
| CAC Budget Spent (200 x $75 avg) | $15,000     |
| **Net 6-Month Position**         | **$15,032** |

#### Aggressive Scenario: 500 Paying Trainers by Month 6

| Month | New Users | Total Paying | Churned | Net Paying | MRR     | Monthly Costs | Monthly Profit |
| ----- | --------- | ------------ | ------- | ---------- | ------- | ------------- | -------------- |
| 1     | 25        | 25           | 0       | 25         | $1,600  | $300          | $1,300         |
| 2     | 50        | 75           | 2       | 73         | $4,672  | $500          | $4,172         |
| 3     | 75        | 148          | 7       | 141        | $9,024  | $800          | $8,224         |
| 4     | 100       | 241          | 13      | 228        | $14,592 | $1,200        | $13,392        |
| 5     | 120       | 348          | 21      | 327        | $20,928 | $1,700        | $19,228        |
| 6     | 200       | 527          | 30      | 497        | $31,808 | $2,500        | $29,308        |

| Metric                           | Value       |
| -------------------------------- | ----------- |
| Month 6 MRR                      | $31,808     |
| Month 6 ARR (annualized)         | $381,696    |
| Total 6-Month Revenue            | $82,624     |
| CAC Budget Spent (500 x $85 avg) | $42,500     |
| **Net 6-Month Position**         | **$33,124** |

### Scenario Comparison Summary

| Metric                 | Conservative | Moderate | Aggressive |
| ---------------------- | ------------ | -------- | ---------- |
| Paying Users (Month 6) | 50           | 200      | 500        |
| Month 6 MRR            | $3,200       | $12,800  | $31,808    |
| Month 6 ARR            | $38,400      | $153,600 | $381,696   |
| 6-Month Revenue        | $8,320       | $33,152  | $82,624    |
| 6-Month Net Position   | $2,975       | $15,032  | $33,124    |
| Avg. New Users/Month   | ~8           | ~33      | ~83        |

---

## 6. Price Sensitivity Analysis

Understanding how price changes affect conversion, churn, and ultimate LTV is critical. The table below models the Trainer tier at various price points.

### Trainer Tier Price Modeling

| Price Point          | Est. Conversion Rate (Free to Paid) | Est. Monthly Churn | Avg. Lifetime (months) | Gross LTV | Monthly Contribution Margin | Net LTV |
| -------------------- | ----------------------------------- | ------------------ | ---------------------- | --------- | --------------------------- | ------- |
| **$29/mo**           | 8.0%                                | 12%                | 8.3                    | $241      | $24.87                      | $206    |
| **$39/mo**           | 6.5%                                | 11%                | 9.1                    | $355      | $34.72                      | $316    |
| **$49/mo (current)** | 5.0%                                | 10%                | 10.0                   | $490      | $44.58                      | $446    |
| **$69/mo**           | 3.5%                                | 9%                 | 11.1                   | $766      | $64.30                      | $714    |
| **$79/mo**           | 2.8%                                | 8.5%               | 11.8                   | $932      | $74.01                      | $873    |

### Revenue Impact per 1,000 Free Users

This models how many users convert and the total revenue generated per cohort of 1,000 free signups.

| Price   | Converts (per 1,000) | MRR from Cohort | Cohort Gross LTV | Cohort Net LTV |
| ------- | -------------------- | --------------- | ---------------- | -------------- |
| $29     | 80                   | $2,320          | $19,280          | $16,480        |
| $39     | 65                   | $2,535          | $23,075          | $20,540        |
| **$49** | **50**               | **$2,450**      | **$24,500**      | **$22,300**    |
| $69     | 35                   | $2,415          | $26,810          | $24,990        |
| $79     | 28                   | $2,212          | $26,096          | $24,444        |

### Analysis

- **$29/mo** produces the highest conversion rate but the lowest LTV per user. Total cohort value is the weakest option. Not recommended unless the goal is pure user count for a fundraising narrative.

- **$39/mo** is a viable alternative if conversion rate assumptions are validated. It generates competitive cohort revenue with a lower barrier to entry.

- **$49/mo (current)** hits the sweet spot. It produces the second-highest cohort MRR and strong individual LTV. The round number feels psychologically accessible while signaling professional-grade software.

- **$69/mo** maximizes per-cohort LTV but conversion drops meaningfully. This price may be appropriate after the product has strong social proof and case studies. Consider this as a future price increase target.

- **$79/mo** starts to see diminishing returns on cohort LTV as the conversion drop outweighs the per-user gain. Only viable with a significantly differentiated product.

**Recommendation:** Launch at $49/mo. After establishing product-market fit and accumulating testimonials, test raising the Trainer tier to $59 or $69 for new customers while grandfathering existing users.

---

## 7. Annual Pricing

### Annual Plan Structure

| Billing Period                  | Trainer             | Pro                 |
| ------------------------------- | ------------------- | ------------------- |
| Monthly                         | $49/mo ($588/yr)    | $99/mo ($1,188/yr)  |
| Annual (20% discount)           | $39.17/mo ($470/yr) | $79.17/mo ($950/yr) |
| **Annual Savings for Customer** | **$118/yr**         | **$238/yr**         |

### Impact Analysis

#### Pros of Annual Pricing

| Benefit                 | Impact                                                                          |
| ----------------------- | ------------------------------------------------------------------------------- |
| Cash flow upfront       | Receive $470 or $950 immediately instead of monthly installments                |
| Reduced churn           | Annual subscribers have effectively 0% monthly churn during the contract period |
| Higher effective LTV    | Locked-in revenue even if user would have churned at month 4-5                  |
| Lower Stripe fees       | 1 transaction vs 12: saves $0.30 x 11 = $3.30 per year in per-transaction fees  |
| Planning predictability | More accurate revenue forecasting                                               |

#### Cons of Annual Pricing

| Risk                    | Impact                                                    |
| ----------------------- | --------------------------------------------------------- |
| Reduced monthly revenue | 20% less per user than monthly billing                    |
| Refund exposure         | Risk of refund requests if user is unhappy at month 2-3   |
| Cash flow timing        | Revenue recognized upfront but obligations span 12 months |

#### LTV Comparison: Annual vs Monthly

**Trainer Tier:**

| Metric                                  | Monthly Billing | Annual Billing     |
| --------------------------------------- | --------------- | ------------------ |
| Revenue Year 1 (with 10% monthly churn) | $49 x 10 = $490 | $470 (guaranteed)  |
| Revenue Year 2 (60% renew annual)       | --              | $470 x 0.60 = $282 |
| 2-Year LTV                              | $490            | $752               |
| Stripe Fees (2 years)                   | $17.20          | $14.48             |
| **Net 2-Year LTV**                      | **$472.80**     | **$737.52**        |

Annual billing produces a **56% higher 2-year net LTV** for the Trainer tier because it eliminates the early-month churn that destroys monthly LTV.

**Pro Tier:**

| Metric                                 | Monthly Billing       | Annual Billing     |
| -------------------------------------- | --------------------- | ------------------ |
| Revenue Year 1 (with 7% monthly churn) | $99 x 14.3 = $1,416\* | $950 (guaranteed)  |
| Revenue Year 2 (70% renew annual)      | --                    | $950 x 0.70 = $665 |
| 2-Year LTV                             | $1,416                | $1,615             |
| Stripe Fees (2 years)                  | $45.33                | $27.90             |
| **Net 2-Year LTV**                     | **$1,370.67**         | **$1,587.10**      |

\*Pro monthly LTV spans beyond 12 months due to lower churn, so Year 1 capture is partial.

#### Recommendation

Annual pricing is **worth offering** with the following guidelines:

1. **Do not default to annual billing.** Present monthly as the default with annual as a highlighted option ("Save 20%").
2. **Target annual conversion rate of 20-30%** of all paid subscribers.
3. **Offer a 30-day refund policy** on annual plans to reduce purchase friction.
4. **Consider a 2-month-free framing** ($49 x 10 months = $490 vs "Get 2 months free at $470/year") which psychologically feels better than "20% off."

---

## 8. Key Metrics Dashboard

### The 10 Most Important Metrics

Track these metrics weekly (at minimum) to maintain a clear picture of business health.

| #   | Metric                                                  | Definition                                                                                                  | Target (Early Stage)        | Why It Matters                                                                                                                                         |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **MRR** (Monthly Recurring Revenue)                     | Sum of all active subscription revenue for the month                                                        | $3,000+ by Month 6          | The single most important metric for a subscription business. Measures overall business size.                                                          |
| 2   | **MRR Growth Rate**                                     | (Current MRR - Previous MRR) / Previous MRR                                                                 | 15-25% month-over-month     | Indicates trajectory. Healthy early-stage SaaS grows 15-25% MoM. Declining growth rate is an early warning signal.                                     |
| 3   | **Monthly Churn Rate**                                  | Users lost this month / Total users at start of month                                                       | < 10% Trainer, < 7% Pro     | The silent killer of SaaS businesses. Even small churn improvements compound dramatically over time.                                                   |
| 4   | **Net Revenue Retention (NRR)**                         | (MRR from existing customers this month, including expansions) / (MRR from those same customers last month) | > 95% (> 100% is excellent) | Captures churn AND expansion. NRR above 100% means existing customers generate more revenue over time even without new acquisitions.                   |
| 5   | **Customer Acquisition Cost (CAC)**                     | Total sales & marketing spend / New customers acquired                                                      | $50 - $100 blended          | Must stay well below LTV. Track per-channel to identify most efficient acquisition sources.                                                            |
| 6   | **LTV:CAC Ratio**                                       | Customer Lifetime Value / Customer Acquisition Cost                                                         | > 3:1                       | The fundamental health metric of unit economics. Below 3:1 is unsustainable. Above 5:1 suggests room to spend more on growth.                          |
| 7   | **CAC Payback Period**                                  | CAC / Monthly Contribution Margin                                                                           | < 6 months                  | How quickly you recoup acquisition spend. Shorter payback = faster reinvestment into growth.                                                           |
| 8   | **Free-to-Paid Conversion Rate**                        | Paid subscribers / Total free signups (cohorted)                                                            | 4-6% within 30 days         | Measures product-led growth effectiveness. The free tier only has value if it converts.                                                                |
| 9   | **Activation Rate**                                     | Users who complete key onboarding actions / Total signups                                                   | > 60% within 7 days         | Defined as: creating a profile + logging 1 workout OR adding 1 client. Unactivated users almost never convert or retain.                               |
| 10  | **Daily Active Users / Monthly Active Users (DAU/MAU)** | Ratio of daily to monthly active users                                                                      | > 25% (stickiness ratio)    | Measures product stickiness. A DAU/MAU above 25% indicates the product is part of the user's daily workflow, which correlates strongly with retention. |

### Secondary Metrics (Track Monthly)

| Metric                      | Definition                                             | Target                  |
| --------------------------- | ------------------------------------------------------ | ----------------------- |
| ARPU (Avg Revenue Per User) | MRR / Total paying users                               | $60+ (blended)          |
| Expansion Revenue %         | Revenue from upgrades / Total new revenue              | > 15%                   |
| Support Ticket Volume       | Tickets per 100 users per month                        | < 5                     |
| NPS (Net Promoter Score)    | Survey-based satisfaction score                        | > 40                    |
| Time to Value               | Time from signup to first meaningful action            | < 10 minutes            |
| Feature Adoption Rate       | % of users using key features (AI coaching, templates) | > 50% for core features |

---

## Appendix: Key Assumptions & Risks

### Assumptions

| Assumption                   | Value Used   | Sensitivity                                         |
| ---------------------------- | ------------ | --------------------------------------------------- |
| Trainer/Pro subscriber split | 70/30        | Medium -- could shift with feature differentiation  |
| Trainer monthly churn        | 10%          | High -- actual churn will define business viability |
| Pro monthly churn            | 7%           | High -- same as above                               |
| Claude API cost per message  | $0.003       | Medium -- may decrease as AI costs trend downward   |
| Stripe fee structure         | 2.9% + $0.30 | Low -- standard and predictable                     |
| Free-to-paid conversion      | 5%           | High -- depends heavily on onboarding quality       |
| CAC blended average          | $75          | Medium -- channel mix will shift over time          |

### Key Risks

| Risk                        | Probability | Impact | Mitigation                                                           |
| --------------------------- | ----------- | ------ | -------------------------------------------------------------------- |
| Higher-than-expected churn  | Medium      | High   | Invest in onboarding, customer success, and feature stickiness       |
| AI API cost increases       | Low         | Medium | Implement caching, set usage limits, evaluate alternative models     |
| Low free-to-paid conversion | Medium      | High   | A/B test pricing page, optimize trial experience, add feature gates  |
| Competitor price pressure   | Medium      | Medium | Differentiate on AI features and trainer-specific workflows          |
| Slower-than-expected growth | Medium      | Medium | Maintain low burn rate; extend runway by keeping fixed costs minimal |

---

_This model should be revisited monthly during the first year and quarterly thereafter. All assumptions should be replaced with actual data as it becomes available._
