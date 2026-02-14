# Sprint 9: Email & Lifecycle Marketing

**Status:** COMPLETED
**Estimated Time:** 2–3 hours
**Skills Used:** email-marketing, lifecycle-automation, signup-flow-cro

## Tasks

- [x] **Task 9.1** — Welcome Email Sequence
  - 5-email trainer sequence (Day 0 → Day 14)
  - 3-email solo user sequence (Day 0 → Day 7)
  - Full subject lines, preview text, plaintext copy, personalization variables
  - HTML email base template with brand styling
  - Send schedule summary table

- [x] **Task 9.2** — Trial Expiration Flow
  - 3-email trial expiration sequence (7 days before → day of)
  - Loss aversion, social proof, and urgency tactics
  - ESP recommendation: SendGrid Phase 1, AWS SES Phase 2
  - Technical integration guide for Express.js

- [x] **Task 9.3** — Referral Program
  - Dual-sided incentive design (1 month free referrer, 50% off referee)
  - Tiered milestones (Starter → Legend) with escalating rewards
  - Database schema (referral_codes, referral_conversions tables)
  - 6 API endpoints designed
  - Dashboard widget wireframes
  - Anti-fraud measures (rate limiting, engagement thresholds, IP detection)
  - 3-phase launch playbook

- [x] **Task 9.4** — Popup & Lead Capture Strategy
  - LeadCapturePopup.tsx component (3 trigger types: calculator, scroll, return-visitor)
  - useLeadCapture.ts hook (session tracking, scroll detection, auth checks)
  - Comprehensive strategy doc with display rules and compliance
  - A/B testing plan for CTA copy, timing, and design
  - GDPR/CAN-SPAM/CPRA compliance checklist

- [x] **Task 9.5** — Onboarding Optimization
  - Enhanced WelcomeModal with role-aware flows (5 trainer steps, 4 solo steps)
  - Trainer: goals → training style → client count profiling
  - Solo: fitness level → goals profiling
  - Role-specific feature previews and next steps
  - Analytics events for each onboarding step
  - Comprehensive onboarding strategy doc with activation metrics and KPIs

## Deliverables

- `docs/strategy/email-sequences.md` — Complete email marketing guide with 11 email templates
- `docs/strategy/referral-program.md` — Referral program design and implementation plan
- `docs/strategy/popup-lead-capture-strategy.md` — Popup CRO strategy and compliance
- `docs/strategy/onboarding-optimization.md` — Onboarding optimization strategy
- `client/src/components/LeadCapturePopup.tsx` — Lead capture popup component
- `client/src/hooks/useLeadCapture.ts` — Lead capture state management hook
- `client/src/components/onboarding/WelcomeModal.tsx` — Enhanced role-aware onboarding modal
- `client/src/components/Dashboard.tsx` — Updated to pass role to WelcomeModal
