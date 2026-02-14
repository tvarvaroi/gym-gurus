# Popup & Lead Capture Strategy

> GymGurus Fitness Platform
> Last updated: 2026-02-14

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Popup Types](#popup-types)
3. [Display Rules](#display-rules)
4. [A/B Testing Plan](#ab-testing-plan)
5. [Analytics & KPIs](#analytics--kpis)
6. [Compliance](#compliance)
7. [Implementation Notes](#implementation-notes)

---

## Design Philosophy

Every popup and lead capture mechanism on GymGurus must follow these core principles:

### Non-Annoying, Value-First Approach

- Every popup must offer **genuine value** before asking for anything in return. If the popup does not clearly benefit the user, it should not exist.
- Lead with what the user **gets**, not what we want from them. Frame every CTA around the user's goals (saving progress, getting personalized advice, unlocking content), never around our acquisition metrics.
- The user should feel like they are being **helped**, not interrupted.

### Respect User Attention

- Attention is a finite resource. Each popup consumes a portion of the user's goodwill toward the platform.
- Treat popups as a **budget**: once spent in a session, do not ask again.
- Never stack multiple popups. Never chain them. One opportunity per session, maximum.
- If the user dismisses a popup, that is a clear signal. Honor it.

### Mobile-First Design

- Over 70% of fitness content is consumed on mobile devices. Every lead capture element must be designed for small screens first, then adapted for desktop.
- No modal overlays on mobile. Modals on small screens feel hostile and are difficult to dismiss. Use slide-up cards, inline elements, and banners instead.
- Touch targets must be at least 44x44px. Dismiss controls must be easy to reach with one thumb.
- Popups must not shift layout or cause content to jump. Use fixed positioning or smooth animations that do not displace existing content.

### GDPR/Privacy Compliant

- Every lead capture form must include a clear, concise disclosure of how user data will be used.
- Consent must be affirmative (no pre-checked boxes).
- Users must be able to withdraw consent as easily as they gave it.
- Data collection must be minimal: collect only what is necessary for the stated purpose.
- All lead capture mechanisms must integrate with the platform's cookie consent system.

---

## Popup Types

### 1. Calculator Result Capture

**Purpose:** Convert anonymous calculator users into registered accounts by offering to save their results.

| Attribute       | Detail                                                                         |
| --------------- | ------------------------------------------------------------------------------ |
| **Trigger**     | After user completes any calculator (BMI, TDEE, 1RM, Strength Standards, etc.) |
| **Delay**       | 30 seconds after result display                                                |
| **Format**      | Inline card rendered below the results section (not a modal overlay)           |
| **Dismissible** | Yes, with X button; card collapses smoothly                                    |

**Message:**

> Save your results -- create a free account

**Value Proposition:**

- Save your calculation history and track changes over time
- Get personalized recommendations based on your numbers
- Compare your progress week over week with visual charts
- Receive AI-powered insights when your metrics change

**Design Specifications:**

- Rendered as a bordered card component directly below the calculator results
- Background: subtle gradient or light accent color that complements the results section
- Icon: bookmark or save icon to reinforce the "save" concept
- CTA button: "Save My Results" (primary) / "Maybe Later" (text link, secondary)
- On mobile: full-width card with stacked layout (icon, text, buttons)
- On desktop: horizontal card with icon left, text center, buttons right

**User Flow:**

1. User completes a calculation and views results
2. After 30 seconds, the inline card fades in below the results
3. User clicks "Save My Results" and is directed to the signup/login flow
4. After account creation, the calculation results are automatically saved to their profile
5. If dismissed, the card collapses and is not shown again for that calculator type for 7 days

**Why This Works:**

- The user has just invested effort in a calculation and has a natural desire to preserve the output
- The popup appears in context, directly adjacent to the content the user cares about
- No overlay means the user's results remain visible and accessible
- The 30-second delay ensures the user has had time to read and understand their results before being prompted

---

### 2. Scroll-Based Blog/Content Capture

**Purpose:** Convert engaged content readers into registered users by gating extended content or offering supplementary materials.

| Attribute       | Detail                                                  |
| --------------- | ------------------------------------------------------- |
| **Trigger**     | After scrolling 60% of page content                     |
| **Delay**       | None (triggers immediately at scroll threshold)         |
| **Format**      | Slide-up from bottom on mobile; corner popup on desktop |
| **Dismissible** | Yes, with X button, click/tap outside, or Escape key    |

**Message:**

> Get the full workout guide -- join free

**Value Proposition:**

- Access the complete exercise library with video demonstrations
- Unlock AI-powered coaching and form feedback
- Get personalized workout plans tailored to your goals
- Join a community of people working toward similar fitness goals

**Design Specifications:**

_Mobile:_

- Slide-up card from the bottom of the viewport
- Maximum height: 40% of viewport (does not obscure the content the user is reading)
- Rounded top corners, subtle shadow
- Clear X button in the top-right corner of the card
- CTA button: "Join Free" (primary) / "No Thanks" (text link)
- Smooth spring animation on entry; slides down on dismiss

_Desktop:_

- Corner popup in the bottom-right of the viewport
- Fixed width: 380px maximum
- Subtle entrance animation (fade + slide from right)
- Does not obscure main content column
- CTA button: "Get Full Access" (primary) / "Dismiss" (text link)

**User Flow:**

1. User reads blog/content page and scrolls past the 60% mark
2. Popup animates into view
3. User clicks CTA and is directed to signup flow
4. After account creation, user is redirected back to the content they were reading
5. If dismissed, popup is not shown again for the remainder of the session

**Why This Works:**

- A user who has scrolled 60% of content is demonstrably engaged and invested
- The trigger point is deep enough to filter out casual visitors but early enough to capture interest before the user finishes and leaves
- The design does not block the content, preserving the reading experience

---

### 3. Return Visitor Recognition

**Purpose:** Convert returning anonymous visitors by acknowledging their repeated interest and offering a personalized entry point.

| Attribute       | Detail                                                       |
| --------------- | ------------------------------------------------------------ |
| **Trigger**     | 2nd visit within 7 days (tracked via localStorage timestamp) |
| **Delay**       | 3 seconds after page load (allows content to render first)   |
| **Format**      | Full-width banner at the top of the page                     |
| **Dismissible** | Yes, with X button; banner collapses smoothly                |

**Message:**

> Welcome back! Ready to start your free trial?

**Value Proposition:**

- Pick up where you left off with saved preferences
- Get a personalized experience based on your browsing history
- Start a free trial with no credit card required
- Access all premium features for 14 days

**Design Specifications:**

- Full-width banner pinned to the top of the viewport (below any cookie consent banner)
- Height: 56px on desktop, 64px on mobile (single line with button)
- Background: brand accent color or subtle gradient
- Text: left-aligned on desktop, centered on mobile
- CTA button: "Start Free Trial" (compact, inline)
- X dismiss button: right-aligned, clearly visible
- Does not push content down; uses fixed positioning with appropriate body padding

**User Flow:**

1. On first visit, a timestamp is stored in localStorage
2. On subsequent visit within 7 days, the banner appears after a 3-second delay
3. User clicks "Start Free Trial" and enters the onboarding flow
4. If dismissed, the banner is not shown again for 7 days (localStorage flag)

**Visitor Detection Logic:**

```
On page load:
  1. Check localStorage for 'gymgurus_first_visit' timestamp
  2. If not found: set timestamp to now, do not show banner
  3. If found and within 7 days: check 'gymgurus_return_banner_dismissed'
     a. If dismissed within last 7 days: do not show
     b. If not dismissed recently: show banner after 3-second delay
  4. If found but older than 7 days: reset timestamp, treat as new visitor
```

**Why This Works:**

- A return visitor has already demonstrated interest by coming back voluntarily
- The banner format is the least intrusive of all popup types (no overlay, no content obstruction)
- Acknowledging the return ("Welcome back!") creates a sense of recognition and personalization
- The free trial offer matches the higher intent level of a returning visitor

---

## Display Rules

These rules are **absolute constraints** that override any individual popup type's trigger logic. No popup may violate these rules under any circumstance.

### Core Constraints

1. **Never show on first page load.** The user must have performed at least one meaningful interaction (scrolled, clicked, or spent 10+ seconds on the page) OR be a recognized return visitor before any popup is eligible to display.

2. **Maximum 1 popup per session.** Once any popup type has been displayed (whether dismissed, converted, or still visible), no other popup may appear during the same browser session. This is tracked via sessionStorage.

3. **Do not show to logged-in users.** If the user is authenticated, all lead capture popups are suppressed. Logged-in users have already converted; showing them signup prompts degrades their experience.

4. **Respect the "dismissed" state.** When a user dismisses a popup, that specific popup type must not reappear for 7 days. This is tracked per popup type in localStorage with a timestamp.

5. **Mobile: slide-up or inline only, never modal overlay.** On viewports under 768px, modal overlays are prohibited. Use bottom slide-up cards or inline elements exclusively.

6. **Easy dismiss: three methods minimum.** Every popup must be dismissible via:
   - Dedicated X (close) button with a minimum 44x44px touch target
   - Click/tap outside the popup area (for non-inline types)
   - Escape key press (for keyboard users and accessibility)

### Priority Order

When multiple popup types are eligible in the same session, the following priority determines which one displays:

1. Calculator Result Capture (highest priority -- most contextual and highest conversion potential)
2. Return Visitor Recognition (medium priority -- leverages demonstrated repeat interest)
3. Scroll-Based Content Capture (lowest priority -- broadest trigger, least specific intent)

Only the highest-priority eligible popup is shown. The others are suppressed for the session.

### Suppression Scenarios

| Scenario                                    | Result                |
| ------------------------------------------- | --------------------- |
| User is logged in                           | All popups suppressed |
| User has dismissed any popup this session   | All popups suppressed |
| User dismissed this popup type < 7 days ago | This type suppressed  |
| Cookie consent not yet given                | All popups suppressed |
| User is on checkout or payment page         | All popups suppressed |
| User is on account settings or profile page | All popups suppressed |

---

## A/B Testing Plan

### Test 1: CTA Copy Variations

**Hypothesis:** Action-oriented CTA copy with specific benefit language will outperform generic copy.

| Variant   | CTA Text              | Expected Impact           |
| --------- | --------------------- | ------------------------- |
| Control   | "Sign Up Free"        | Baseline                  |
| Variant A | "Save My Results"     | +15% CTR (calculator)     |
| Variant B | "Get My Free Plan"    | +10% CTR (content)        |
| Variant C | "Start My Free Trial" | +20% CTR (return visitor) |

**Duration:** 2 weeks minimum per test, or until statistical significance (95% confidence) is reached.
**Sample size:** Minimum 1,000 impressions per variant before drawing conclusions.

### Test 2: Timing Variations

**Hypothesis:** Delayed popups perform better than immediate ones because they allow the user to establish intent.

| Variant   | Timing                         | Expected Impact         |
| --------- | ------------------------------ | ----------------------- |
| Control   | 30 seconds after result        | Baseline (calculator)   |
| Variant A | 15 seconds after result        | Lower CTR, higher reach |
| Variant B | 45 seconds after result        | Higher CTR, lower reach |
| Variant C | On scroll past results section | Context-dependent CTR   |

**Duration:** 2 weeks minimum per test.
**Key metric:** Net conversions (impressions x conversion rate), not just conversion rate alone.

### Test 3: Design Variations

**Hypothesis:** Inline and non-intrusive designs will achieve comparable conversion rates to modals while causing significantly less bounce rate increase.

| Variant   | Design                        | Expected Impact           |
| --------- | ----------------------------- | ------------------------- |
| Control   | Inline card below content     | Baseline                  |
| Variant A | Modal overlay (center screen) | Higher CTR, higher bounce |
| Variant B | Bottom banner (full-width)    | Moderate CTR, low bounce  |
| Variant C | Floating corner card          | Lower CTR, lowest bounce  |

**Duration:** 3 weeks minimum (longer due to bounce rate measurement sensitivity).
**Key metric:** Composite score = (conversion rate x 2) - (bounce rate increase x 1).

### Testing Infrastructure

- Use feature flags to control variant assignment
- Assign variants at the user level (not session level) to prevent cross-contamination
- Store variant assignment in localStorage for consistency across sessions
- Log all variant assignments and outcomes to the analytics pipeline
- Exclude internal team traffic from test populations

---

## Analytics & KPIs

### Primary Metrics

| Metric                       | Definition                                                  | Target        |
| ---------------------------- | ----------------------------------------------------------- | ------------- |
| Popup Impression Rate        | % of eligible sessions where a popup was displayed          | 30-50%        |
| Dismiss Rate                 | % of impressions where user explicitly dismissed the popup  | < 60%         |
| CTA Click-Through Rate (CTR) | % of impressions where user clicked the primary CTA         | > 8%          |
| Signup Conversion from Popup | % of CTA clicks that result in a completed account creation | > 40%         |
| Bounce Rate Impact           | Change in bounce rate for sessions with popup vs. without   | < +2%         |
| Revenue Attributed to Popups | MRR from users whose first conversion was via a popup CTA   | Track monthly |

### Secondary Metrics

| Metric                   | Definition                                                        | Purpose                   |
| ------------------------ | ----------------------------------------------------------------- | ------------------------- |
| Time to Dismiss          | Average seconds between popup display and dismissal               | Gauge intrusiveness       |
| Popup-to-Paid Conversion | % of popup signups that convert to paid within 30 days            | Measure lead quality      |
| Repeat Dismiss Rate      | % of users who dismiss popups on multiple visits                  | Identify popup fatigue    |
| Page Depth After Popup   | Average pages viewed after popup display (dismissed or converted) | Measure engagement impact |
| Session Duration Impact  | Change in session duration for sessions with popup vs. without    | Measure experience impact |

### Tracking Implementation

Every popup interaction must fire an analytics event with the following structure:

```
Event: popup_shown
Properties:
  - popup_type: "calculator_capture" | "scroll_capture" | "return_visitor"
  - page_url: string
  - trigger_condition: string (e.g., "scroll_60_percent", "30s_after_result")
  - device_type: "mobile" | "tablet" | "desktop"
  - is_return_visitor: boolean
  - ab_test_variant: string | null

Event: popup_dismissed
Properties:
  - popup_type: string
  - dismiss_method: "x_button" | "click_outside" | "escape_key"
  - time_visible_seconds: number
  - page_url: string

Event: popup_cta_clicked
Properties:
  - popup_type: string
  - cta_text: string
  - time_visible_seconds: number
  - page_url: string

Event: popup_converted
Properties:
  - popup_type: string
  - signup_method: "email" | "google" | "github"
  - time_from_popup_to_signup_seconds: number
  - page_url: string
```

### Reporting Cadence

- **Daily:** Impression count, dismiss rate, CTR (automated dashboard)
- **Weekly:** Conversion funnel analysis, bounce rate impact, A/B test progress
- **Monthly:** Revenue attribution, lead quality analysis, popup fatigue assessment
- **Quarterly:** Full strategy review with recommendations for changes

---

## Compliance

### Cookie Consent Integration

- All popup tracking and localStorage/sessionStorage usage requires prior cookie consent.
- If the user has not yet interacted with the cookie consent banner, no popups are shown and no tracking cookies or storage entries are created.
- Popup display logic must check the consent state before executing.
- Consent categories: popups fall under "Marketing" or "Functional" cookies depending on the jurisdiction's classification.

### GDPR (General Data Protection Regulation)

- **Clear data usage disclosure:** Every lead capture form must include a visible, plain-language statement explaining what data is collected and how it will be used. Example: "We'll use your email to send your results and occasional fitness tips. You can unsubscribe anytime."
- **Affirmative consent:** No pre-checked boxes. The user must actively opt in to email communications.
- **Right to erasure:** Users must be able to request deletion of all data collected via lead capture forms.
- **Data minimization:** Collect only what is strictly necessary. For calculator result capture, this means email address only. Do not collect name, phone number, or other fields unless the user voluntarily provides them later.
- **Privacy policy link:** Every lead capture form must include a link to the full privacy policy.

### CAN-SPAM Act Compliance

- Every follow-up email sent to captured leads must include:
  - A clear and conspicuous unsubscribe mechanism
  - The physical mailing address of the business
  - Accurate "From" and "Subject" lines
  - Identification that the message is an advertisement (where applicable)
- Unsubscribe requests must be honored within 10 business days.
- Do not sell or transfer email addresses to third parties without explicit consent.

### California Privacy Rights Act (CPRA) Compliance

- Provide a "Do Not Sell or Share My Personal Information" link accessible from all pages where lead capture occurs.
- Honor Global Privacy Control (GPC) browser signals.
- Maintain records of all data collection and sharing activities related to lead capture.
- Provide California residents with the right to:
  - Know what personal information is collected
  - Delete personal information
  - Opt out of the sale or sharing of personal information
  - Non-discrimination for exercising privacy rights

### Easy Opt-Out Mechanism

- Every email includes a one-click unsubscribe link (no login required to unsubscribe).
- Account settings page includes a clear toggle for marketing communications.
- Unsubscribing from popup-initiated emails does not affect transactional emails (password resets, security alerts, etc.).
- Opt-out state is respected across all communication channels (email, push notifications, in-app messages).

---

## Implementation Notes

### Component Architecture

```
client/src/
  components/
    lead-capture/
      LeadCapturePopup.tsx        # Main popup container component
      CalculatorCapture.tsx        # Inline card for calculator results
      ScrollCapture.tsx            # Slide-up / corner popup for content pages
      ReturnVisitorBanner.tsx      # Full-width top banner for return visitors
  hooks/
    useLeadCapture.ts             # Core hook: eligibility, display logic, event tracking
    useScrollPosition.ts          # Scroll percentage tracking (used by ScrollCapture)
    useReturnVisitor.ts           # localStorage-based return visitor detection
  utils/
    leadCaptureStorage.ts         # Abstraction over localStorage/sessionStorage operations
    leadCaptureAnalytics.ts       # Analytics event helpers
```

### LeadCapturePopup.tsx

The main container component that:

- Checks user authentication state (suppresses if logged in)
- Checks session state (suppresses if a popup was already shown)
- Checks cookie consent state (suppresses if consent not given)
- Evaluates which popup type is eligible based on the current page context
- Renders the highest-priority eligible popup type
- Handles dismiss and conversion callbacks

### useLeadCapture.ts

The core hook that manages all lead capture state and logic:

```typescript
interface UseLeadCaptureReturn {
  isEligible: boolean; // Whether any popup can be shown
  activePopupType: PopupType | null; // Which popup type to display
  showPopup: () => void; // Trigger popup display
  dismissPopup: (method: DismissMethod) => void; // Handle dismissal
  convertPopup: () => void; // Handle CTA click
  popupState: PopupState; // Current state (hidden, visible, dismissed, converted)
}

type PopupType = 'calculator_capture' | 'scroll_capture' | 'return_visitor';
type DismissMethod = 'x_button' | 'click_outside' | 'escape_key';
type PopupState = 'hidden' | 'visible' | 'dismissed' | 'converted';
```

### State Management

**sessionStorage (per-session, cleared when browser tab closes):**

- `gymgurus_popup_shown_this_session` -- boolean flag, set to true when any popup is displayed
- `gymgurus_popup_type_shown` -- string, the popup type that was shown this session

**localStorage (cross-session, persists across browser restarts):**

- `gymgurus_first_visit` -- ISO timestamp of the user's first visit
- `gymgurus_dismissed_calculator_capture` -- ISO timestamp of last dismissal
- `gymgurus_dismissed_scroll_capture` -- ISO timestamp of last dismissal
- `gymgurus_dismissed_return_visitor` -- ISO timestamp of last dismissal
- `gymgurus_return_banner_dismissed` -- ISO timestamp, used by return visitor logic

### Analytics Integration

All analytics calls use a centralized `trackEvent` function:

```typescript
trackEvent('popup_shown', { popup_type, page_url, trigger_condition, device_type });
trackEvent('popup_dismissed', { popup_type, dismiss_method, time_visible_seconds });
trackEvent('popup_cta_clicked', { popup_type, cta_text, time_visible_seconds });
trackEvent('popup_converted', { popup_type, signup_method, time_from_popup_to_signup_seconds });
```

### Accessibility Requirements

- All popups must be announced to screen readers via `aria-live="polite"`
- Focus must be trapped within modal-type popups (desktop scroll capture)
- Inline popups (calculator capture) must not trap focus
- All interactive elements must be keyboard-navigable
- Dismiss via Escape key must work for all popup types
- Color contrast must meet WCAG 2.1 AA standards (minimum 4.5:1 for text)
- Animations must respect `prefers-reduced-motion` media query

### Performance Considerations

- Popup components should be lazy-loaded (React.lazy + Suspense) to avoid increasing initial bundle size
- Scroll listeners must be throttled (100ms minimum) to prevent layout thrashing
- localStorage/sessionStorage reads should happen once on mount, not on every render
- Popup animations should use CSS transforms and opacity (GPU-accelerated) rather than layout properties

---

## Appendix: Decision Log

| Date       | Decision                                                  | Rationale                                                                                                                   |
| ---------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-14 | Use inline cards instead of modals for calculator capture | Modal overlays on calculator pages obscure the results the user wants to save                                               |
| 2026-02-14 | Set max 1 popup per session                               | Multiple popups per session consistently increase bounce rates in industry benchmarks                                       |
| 2026-02-14 | 30-second delay for calculator capture                    | Allows user to fully digest results before being prompted; reduces perception of interruption                               |
| 2026-02-14 | 60% scroll threshold for content capture                  | Industry data shows 60% scroll depth correlates with high engagement without being so deep that most users never trigger it |
| 2026-02-14 | 7-day cooldown on dismissed popups                        | Balances re-engagement opportunity with respect for user preference                                                         |
