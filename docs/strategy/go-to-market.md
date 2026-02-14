# GymGurus Go-to-Market Strategy

**Document Version:** 1.0
**Last Updated:** February 2026
**Status:** Pre-launch Planning

---

## Table of Contents

1. [Pre-launch Phase (Now)](#1-pre-launch-phase-now)
2. [Soft Launch (Month 1)](#2-soft-launch-month-1)
3. [Public Launch (Month 2-3)](#3-public-launch-month-2-3)
4. [Growth Phase (Month 4-6)](#4-growth-phase-month-4-6)
5. [Channel Strategy](#5-channel-strategy)
6. [Top 20 Pre-launch Marketing Ideas ($0 Budget)](#6-top-20-pre-launch-marketing-ideas-0-budget)

---

## 1. Pre-launch Phase (Now)

**Objective:** Establish a rock-solid foundation before any outbound marketing begins. Every dollar and minute of attention from early users must land on a polished, trustworthy experience.

### 1.1 Security Hardening

| Task                                           | Priority | Status  |
| ---------------------------------------------- | -------- | ------- |
| Implement CSRF protection on all API routes    | Critical | Pending |
| Add rate limiting to authentication endpoints  | Critical | Pending |
| Enable HTTP security headers (Helmet.js)       | High     | Pending |
| Input validation and sanitization on all forms | High     | Pending |
| Session management audit                       | High     | Pending |
| SQL injection review on all database queries   | Critical | Pending |
| Dependency vulnerability scan (`npm audit`)    | Medium   | Pending |

**Gate:** No marketing activity begins until all Critical items are resolved.

### 1.2 SEO Pages Live and Indexed

- [ ] Confirm all 12 calculator pages are server-rendered or pre-rendered for crawlability
- [ ] Submit XML sitemap to Google Search Console
- [ ] Verify each calculator page has unique meta title, description, and H1
- [ ] Add structured data (JSON-LD) for calculator tools where applicable
- [ ] Create comparison landing pages:
  - GymGurus vs TrueCoach
  - GymGurus vs Trainerize
  - GymGurus vs My PT Hub
  - GymGurus vs Excel Spreadsheets
- [ ] Internal linking strategy between calculators, blog, and signup page
- [ ] Confirm canonical URLs are set correctly
- [ ] Target indexing within 2 weeks of submission

### 1.3 Analytics Tracking

- [x] Google Analytics 4 installed
- [x] Core event tracking configured
- [ ] Define and implement conversion funnel events:
  - Landing page visit -> Calculator use -> Signup -> Onboarding complete -> First client added
- [ ] Set up Google Search Console property
- [ ] Configure goal tracking for trial-to-paid conversion
- [ ] Implement UTM parameter handling for campaign attribution

### 1.4 Legal Pages

- [x] Privacy Policy published
- [x] Terms of Service published
- [ ] Cookie consent banner (if targeting EU users)
- [ ] Acceptable Use Policy
- [ ] Data Processing Agreement template (for trainer-client data)

### 1.5 Beta Invite System

- [ ] Build email capture landing page with waitlist
- [ ] Implement invite code system (unique codes per beta cohort)
- [ ] Set up automated welcome email sequence for waitlist signups
- [ ] Create a "founding member" tier with permanent pricing benefits
- [ ] Design referral mechanic: each beta user gets 3 invite codes

---

## 2. Soft Launch (Month 1)

**Objective:** Acquire 20-50 beta trainers, gather intensive feedback, and validate product-market fit before spending any money on growth.

### 2.1 Where to Find Beta Trainers

| Channel                                                       | Approach                                                                  | Target Volume  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------- |
| **Reddit** (r/personaltraining, r/fitness, r/fitnessindustry) | Value-first posts sharing calculator tools, then invite to beta           | 10-15 trainers |
| **LinkedIn**                                                  | Direct outreach to independent trainers, post articles about trainer tech | 5-10 trainers  |
| **Local gyms**                                                | In-person visits to independent and boutique gyms within driving distance | 5-10 trainers  |
| **Facebook Groups**                                           | Fitness business owner groups, personal trainer communities               | 5-10 trainers  |
| **Twitter/X**                                                 | Engage with #personaltrainer, #fitnessbusiness hashtags                   | 3-5 trainers   |
| **Trainer certification forums**                              | NASM, ACE, ISSA community boards                                          | 3-5 trainers   |

**Outreach Script Template:**

> Hi [Name], I'm building a new client management platform for independent trainers that includes an AI fitness coach and free pro-grade calculators. We're inviting 50 founding trainers to shape the product and lock in a permanent discount. Would you be open to a 15-minute walkthrough?

### 2.2 Beta Feedback Process

**Weekly Feedback Loop:**

1. **Monday:** Push any fixes/features from prior week feedback
2. **Wednesday:** Send short in-app survey (3 questions max, NPS + open text)
3. **Friday:** 1-on-1 call with 2-3 beta users (rotating)

**Feedback Collection Tools:**

- In-app feedback widget (e.g., Canny or simple form)
- Dedicated Slack/Discord channel for beta trainers
- Monthly video call with all beta users (office hours format)

**Key Questions to Ask:**

- What did you try to do this week that was frustrating?
- What feature would make you pay for this today?
- Would you recommend this to a trainer friend right now? Why or why not?
- What are you currently using that this would replace?

### 2.3 Onboarding Optimization

- [ ] Track completion rate of each onboarding step
- [ ] Identify drop-off points in the first-time user flow
- [ ] A/B test welcome modal content
- [ ] Create a "quick start" checklist (add first client, create first program, try AI coach)
- [ ] Build interactive product tour for first login
- [ ] Target: 80%+ onboarding completion rate before public launch

### 2.4 Metrics to Track

| Metric                     | Target         | Measurement                                 |
| -------------------------- | -------------- | ------------------------------------------- |
| Beta signups               | 50 trainers    | Waitlist + invite redemptions               |
| Onboarding completion rate | > 80%          | Users completing all setup steps            |
| Weekly active usage        | > 60%          | Users logging in 3+ days/week               |
| NPS score                  | > 40           | Weekly in-app survey                        |
| Feature requests logged    | 50+            | Feedback channel aggregation                |
| Churn (beta exits)         | < 15%          | Users who stop logging in for 14+ days      |
| Time to first value        | < 10 min       | Time from signup to first meaningful action |
| Calculator page traffic    | 500+ visits/mo | Google Analytics                            |

---

## 3. Public Launch (Month 2-3)

**Objective:** Execute a coordinated public launch to generate awareness, drive signups, and establish GymGurus as a credible new player in the fitness SaaS space.

### 3.1 Product Hunt Launch Playbook

**4 Weeks Before Launch:**

- [ ] Create Product Hunt maker profile, add team members
- [ ] Draft product description, tagline, and gallery images
- [ ] Prepare 4-5 high-quality screenshots and a 60-second demo video
- [ ] Line up 10-15 "first comment" supporters (beta users, friends, network)
- [ ] Research optimal launch day (Tuesday-Thursday tend to perform best)
- [ ] Engage on Product Hunt community: upvote, comment on other products for 2-3 weeks

**1 Week Before Launch:**

- [ ] Finalize all creative assets
- [ ] Pre-write launch day social media posts
- [ ] Email beta users asking for Product Hunt support on launch day
- [ ] Prepare a special Product Hunt deal (e.g., 50% off first 3 months)
- [ ] Brief all team members on launch day responsibilities

**Launch Day Protocol:**

- **12:01 AM PT:** Submit product (scheduled post if available)
- **6:00 AM PT:** Post announcement on Twitter/X, LinkedIn, Reddit
- **7:00 AM PT:** Send email blast to waitlist and beta users with direct upvote link
- **All Day:** Respond to every comment on Product Hunt within 30 minutes
- **All Day:** Share progress updates on social media
- **6:00 PM PT:** Thank-you post on social media with results

**Target:** Top 5 Product of the Day, 300+ upvotes, 100+ signups

### 3.2 Blog Content Push

Publish 10 SEO-optimized articles in the first 60 days post-launch:

| #   | Article Title                                                    | Target Keyword                      | Funnel Stage |
| --- | ---------------------------------------------------------------- | ----------------------------------- | ------------ |
| 1   | "How to Start a Personal Training Business in 2026"              | start personal training business    | Top          |
| 2   | "Best Client Management Software for Personal Trainers"          | client management software trainers | Middle       |
| 3   | "How to Calculate One Rep Max: Complete Guide"                   | calculate one rep max               | Top          |
| 4   | "Personal Trainer Pricing Guide: How Much to Charge"             | personal trainer pricing            | Top          |
| 5   | "TrueCoach vs GymGurus: Honest Comparison"                       | truecoach alternative               | Middle       |
| 6   | "How AI Is Changing Personal Training"                           | AI personal training                | Top          |
| 7   | "Client Retention Strategies for Personal Trainers"              | client retention personal trainers  | Top          |
| 8   | "Strength Standards by Age, Weight, and Gender"                  | strength standards chart            | Top          |
| 9   | "How to Scale Your Personal Training Business Beyond 20 Clients" | scale personal training business    | Middle       |
| 10  | "BMI Calculator vs Body Fat: Which Metric Matters?"              | BMI vs body fat                     | Top          |

**Content Specifications:**

- Minimum 1,500 words per article
- Include internal links to relevant calculators and product pages
- Add a clear CTA (call to action) in each article
- Optimize for featured snippets where applicable

### 3.3 SEO Ramp-up Strategy

**On-Page SEO:**

- Optimize all 12 calculator pages for primary keywords
- Add FAQ schema to calculator pages
- Create a /tools/ hub page linking to all calculators
- Ensure all blog posts have proper heading hierarchy, alt tags, and internal links

**Off-Page SEO:**

- Submit to fitness software directories and review sites (G2, Capterra, GetApp)
- Guest posting on 3-5 fitness industry blogs
- HARO (Help a Reporter Out) responses for fitness/tech queries
- Build backlinks from comparison and "best of" lists

**Technical SEO:**

- Page speed optimization (target Core Web Vitals green scores)
- Mobile responsiveness audit
- Implement breadcrumb navigation
- Fix any crawl errors in Search Console

### 3.4 Initial Paid Ads Budget ($500-1,000/month)

| Channel                           | Monthly Budget | Campaign Type                                                                                      | Target CPA   |
| --------------------------------- | -------------- | -------------------------------------------------------------------------------------------------- | ------------ |
| **Google Ads**                    | $300-500       | Search ads on high-intent keywords ("personal trainer software", "client management for trainers") | < $25/signup |
| **Meta Ads (Facebook/Instagram)** | $200-500       | Retargeting website visitors + lookalike audiences from beta user list                             | < $20/signup |

**Google Ads Keywords (High Intent):**

- "personal trainer client management software"
- "truecoach alternative"
- "trainerize alternative"
- "personal training app for trainers"
- "AI fitness platform"

**Meta Ads Strategy:**

- Retarget calculator page visitors with product demo ad
- Lookalike audience from email list and beta users
- Creative: short video testimonial from beta trainer + product walkthrough
- A/B test 3 ad creatives per campaign

**Optimization Cadence:**

- Week 1-2: Test broad targeting, gather data
- Week 3-4: Narrow to best-performing audiences and keywords
- Monthly: Reallocate budget to highest-ROI channel

---

## 4. Growth Phase (Month 4-6)

**Objective:** Transition from launch momentum to sustainable, repeatable growth through referrals, email marketing, partnerships, and community building.

### 4.1 Referral Program Design

**Program Structure:**

- **Incentive:** Referring trainer gets 1 free month; referred trainer gets 50% off first month
- **Mechanic:** Unique referral link in dashboard, trackable via UTM parameters
- **Viral Loop:** After a successful referral, prompt the new user to refer their own contacts
- **Tiers:**
  - 1 referral: 1 month free
  - 3 referrals: "GymGurus Ambassador" badge + 3 months free
  - 10 referrals: Lifetime discount (25% off forever)

**Implementation Checklist:**

- [ ] Build referral link generator in user dashboard
- [ ] Create referral tracking backend
- [ ] Design referral landing page
- [ ] Set up automated reward fulfillment
- [ ] Add referral prompts at key moments (after positive NPS response, after milestone achievements)

### 4.2 Email Sequences

**Sequence 1: Welcome Series (triggered on signup)**

| Email # | Timing    | Subject Line                                             | Content                                    |
| ------- | --------- | -------------------------------------------------------- | ------------------------------------------ |
| 1       | Immediate | Welcome to GymGurus -- let's get you set up              | Account setup guide, quick start checklist |
| 2       | Day 1     | Your first client is waiting                             | How to add a client and create a program   |
| 3       | Day 3     | Have you met your AI coach?                              | AI coach feature walkthrough               |
| 4       | Day 5     | 12 calculators your clients will love                    | Calculator feature showcase                |
| 5       | Day 7     | How [Beta Trainer Name] manages 25 clients with GymGurus | Social proof / case study                  |

**Sequence 2: Onboarding Nudge (triggered if user hasn't completed setup)**

| Email # | Timing                     | Subject Line               | Content                                     |
| ------- | -------------------------- | -------------------------- | ------------------------------------------- |
| 1       | Day 2 (if no client added) | Need help getting started? | Video walkthrough + support link            |
| 2       | Day 5 (if still inactive)  | Quick question             | 1-question survey: what's holding you back? |
| 3       | Day 10 (if still inactive) | We saved your spot         | Offer a 1-on-1 onboarding call              |

**Sequence 3: Retention Series (ongoing, weekly)**

| Email # | Trigger                   | Subject Line                    | Content                               |
| ------- | ------------------------- | ------------------------------- | ------------------------------------- |
| 1       | Weekly digest             | Your week in numbers            | Usage stats, client progress summary  |
| 2       | Feature release           | New: [Feature Name] is live     | Feature announcement + how to use it  |
| 3       | 30-day anniversary        | You've been with us for a month | Celebration + referral prompt         |
| 4       | At-risk (7 days inactive) | We miss you                     | Re-engagement offer, ask for feedback |

### 4.3 Partnership Outreach

**Tier 1: Fitness Influencers (Month 4)**

| Partner Type                              | Outreach Volume    | Offer                                                    | Expected ROI              |
| ----------------------------------------- | ------------------ | -------------------------------------------------------- | ------------------------- |
| Micro-influencers (5K-50K followers)      | 20 outreach emails | Free account + affiliate commission (20% recurring)      | 5-10 signups per partner  |
| Mid-tier influencers (50K-200K followers) | 5 outreach emails  | Free account + affiliate commission + co-branded content | 20-50 signups per partner |

**Tier 2: Certification Bodies (Month 5)**

- **Target:** NASM, ACE, ISSA, NSCA
- **Pitch:** "Offer GymGurus as a recommended tool for newly certified trainers"
- **Value Exchange:** Discounted rate for their members, co-marketing, featured in their resource directory

**Tier 3: Complementary SaaS Partners (Month 6)**

- **Target:** Scheduling tools (Calendly, Acuity), payment processors (Stripe, Square), nutrition tracking apps
- **Pitch:** Integration partnerships and co-marketing
- **Goal:** Build an ecosystem that makes GymGurus the hub of a trainer's tech stack

### 4.4 Webinar Strategy

**Monthly Webinar Series: "Train Smarter"**

| Month   | Topic                                       | Guest                          | Goal                        |
| ------- | ------------------------------------------- | ------------------------------ | --------------------------- |
| Month 4 | "How to Use AI to Program for 30+ Clients"  | Internal (product demo)        | Product education, lead gen |
| Month 5 | "The Business of Personal Training in 2026" | Successful trainer (beta user) | Social proof, community     |
| Month 6 | "From Side Hustle to Full-Time Trainer"     | Fitness business coach         | Audience expansion          |

**Webinar Playbook:**

1. Promote via email list, social media, and partner channels 2 weeks in advance
2. Host on Zoom or YouTube Live (free tools)
3. Record and repurpose: clip into 5-10 short-form videos for social media
4. Follow up with attendees: replay link + special offer
5. Target: 50-100 live attendees per webinar

---

## 5. Channel Strategy

### Owned Channels

| Channel              | Strategy                                                                | Content Cadence                                  | KPI                                                    |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| **Blog**             | SEO-optimized articles targeting trainer pain points and fitness topics | 2 posts/week (months 1-3), 1 post/week (ongoing) | Organic traffic, time on page, signup conversions      |
| **Email List**       | Nurture sequences, product updates, educational content                 | 2-3 emails/week (sequences), 1 newsletter/week   | Open rate > 30%, click rate > 5%, unsubscribe < 0.5%   |
| **Calculator Pages** | 12 free tools as SEO lead magnets, each with CTA to sign up             | Update quarterly with new data/features          | Page views, calculator completions, signup conversions |
| **Product (in-app)** | Onboarding flows, feature announcements, referral prompts               | Continuous                                       | Activation rate, feature adoption, referral rate       |

### Earned Channels

| Channel                 | Strategy                                                                                                     | Effort Level     | KPI                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------- | -------------------------------------------- |
| **Product Hunt**        | One-time coordinated launch (see Section 3.1)                                                                | High (one-time)  | Upvotes, rank, signups from PH               |
| **Reddit**              | Value-first posting in r/personaltraining, r/fitness, r/fitnessindustry; answer questions, share calculators | Medium (ongoing) | Referral traffic, brand mentions             |
| **Twitter/X**           | Daily engagement in fitness/SaaS communities; share tips, product updates, behind-the-scenes                 | Medium (ongoing) | Followers, engagement rate, referral traffic |
| **Trainer Communities** | Active participation in Facebook groups, NASM/ACE forums, Slack/Discord communities                          | Medium (ongoing) | Referral traffic, beta signups               |
| **Press/PR**            | HARO responses, pitch to fitness trade publications (PTontheNet, IDEA Fitness)                               | Low-Medium       | Backlinks, brand awareness                   |
| **Word of Mouth**       | Referral program, NPS follow-ups, delightful product experience                                              | Low (automated)  | Referral signups, NPS score                  |

### Paid Channels

| Channel                           | Monthly Budget | Strategy                                                                | KPI                               |
| --------------------------------- | -------------- | ----------------------------------------------------------------------- | --------------------------------- |
| **Google Ads**                    | $300-500       | Search ads on high-intent keywords; retarget blog/calculator visitors   | CPA < $25, ROAS > 3x              |
| **Meta Ads (Facebook/Instagram)** | $200-500       | Retargeting + lookalike audiences; video testimonials and product demos | CPA < $20, ROAS > 3x              |
| **Sponsorships**                  | $0-200         | Sponsor fitness podcasts or newsletters (when budget allows)            | Brand awareness, referral traffic |

---

## 6. Top 20 Pre-launch Marketing Ideas ($0 Budget)

These tactics require only time and effort -- no paid spend.

| #   | Tactic                                                                                                                                                                             | Effort | Expected Impact | Timeline  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------- | --------- |
| 1   | **Calculator SEO Traffic** -- Optimize all 12 calculator pages with long-tail keywords, meta tags, and structured data. Each calculator is a permanent lead magnet.                | Medium | High            | Weeks 1-4 |
| 2   | **Reddit Value-Posting** -- Post genuinely helpful answers in r/personaltraining, r/fitness, and r/fitnessindustry. Link to calculators where relevant. Never spam.                | Low    | Medium-High     | Ongoing   |
| 3   | **Twitter/X Fitness Community Engagement** -- Follow and engage with personal trainers, fitness business coaches, and SaaS founders. Share tips, retweet, and build relationships. | Low    | Medium          | Ongoing   |
| 4   | **Local Trainer Outreach** -- Visit independent gyms and boutique studios. Offer a free walkthrough of GymGurus. Collect feedback and beta signups.                                | Medium | High            | Weeks 1-4 |
| 5   | **LinkedIn Articles for Trainers** -- Publish 2-3 articles on LinkedIn targeting trainer business topics ("How to manage 20+ clients without burning out").                        | Medium | Medium          | Weeks 2-6 |
| 6   | **Product Hunt Ship Page** -- Create an "Upcoming" page on Product Hunt to start collecting followers before official launch.                                                      | Low    | Medium          | Week 1    |
| 7   | **Personal Trainer Facebook Groups** -- Join 5-10 active groups. Contribute value, answer questions, and mention GymGurus when contextually relevant.                              | Low    | Medium          | Ongoing   |
| 8   | **Cold DMs to Trainers on Instagram** -- Identify trainers with 1K-10K followers. Send personalized DMs offering free beta access and feedback in exchange.                        | Medium | Medium          | Weeks 2-4 |
| 9   | **Comparison Blog Posts** -- Write "GymGurus vs TrueCoach" and "GymGurus vs Trainerize" posts. Target trainers actively searching for alternatives.                                | Medium | High            | Weeks 3-6 |
| 10  | **Free Tool Embeds** -- Offer embeddable versions of popular calculators (BMI, 1RM) that fitness bloggers can add to their sites with a "Powered by GymGurus" backlink.            | High   | High            | Weeks 4-8 |
| 11  | **HARO Responses** -- Sign up for Help a Reporter Out. Respond to fitness, health, and SaaS queries as a founder/expert. Earn free press mentions and backlinks.                   | Low    | Medium          | Ongoing   |
| 12  | **Quora Answers** -- Answer high-traffic questions about personal training software, fitness calculators, and trainer business topics. Link to relevant GymGurus pages.            | Low    | Low-Medium      | Ongoing   |
| 13  | **Trainer Podcast Guest Appearances** -- Pitch yourself as a guest on fitness business podcasts. Share your story and plug GymGurus naturally.                                     | Medium | Medium-High     | Weeks 4-8 |
| 14  | **Email Signature CTA** -- Add "Building GymGurus -- AI-powered tools for personal trainers. Join the beta: [link]" to your personal email signature.                              | Low    | Low             | Week 1    |
| 15  | **GitHub Open Source Visibility** -- If any components are open-sourced, share on dev communities. Attract technical co-founders, contributors, and attention.                     | Low    | Low             | Ongoing   |
| 16  | **Cross-Post Calculator Results on Social** -- Add "Share your results" buttons to calculators. When users share their BMI, 1RM, or strength standards, it drives organic traffic. | Medium | Medium-High     | Weeks 2-4 |
| 17  | **Testimonial Collection** -- After each beta user session, ask for a written or video testimonial. Use on landing page and social proof throughout the site.                      | Low    | High            | Ongoing   |
| 18  | **Fitness Subreddit Wiki Contributions** -- Contribute to wiki pages and resource lists in fitness subreddits where tool recommendations are listed.                               | Low    | Medium          | Weeks 2-4 |
| 19  | **Google Business Profile** -- Create a Google Business Profile for GymGurus (even as a SaaS). Helps with branded search and adds legitimacy.                                      | Low    | Low-Medium      | Week 1    |
| 20  | **Waitlist with Social Proof Counter** -- Add a live counter to the waitlist page ("247 trainers already signed up"). Creates urgency and social proof.                            | Low    | Medium          | Week 2    |

---

## Key Milestones Summary

| Milestone                  | Target Date          | Success Criteria                                                  |
| -------------------------- | -------------------- | ----------------------------------------------------------------- |
| Pre-launch complete        | End of current month | All security issues resolved, SEO pages indexed, beta system live |
| 50 beta trainers onboarded | Month 1              | 50 active accounts, 80%+ onboarding completion                    |
| Product Hunt launch        | Month 2              | Top 5 Product of the Day, 300+ upvotes                            |
| 10 blog articles published | Month 3              | All articles live, indexed, receiving organic traffic             |
| 100 paying customers       | Month 3              | $4,900/mo MRR at $49/user                                         |
| Referral program live      | Month 4              | 20%+ of new signups from referrals                                |
| 500 paying customers       | Month 6              | $24,500/mo MRR, sustainable CAC:LTV ratio                         |

---

_This document should be reviewed and updated monthly as market conditions and product capabilities evolve._
