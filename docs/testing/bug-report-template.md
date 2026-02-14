# GymGurus -- Bug Report Template

Use this template when filing bug reports for GymGurus. Copy the template below
and fill in all applicable fields. The more detail you provide, the faster the
issue can be triaged and resolved.

---

## Bug Report

### Title

<!-- A concise, descriptive title. Include the affected feature area.
     Good:  "BMI Calculator shows NaN when height is set to 0"
     Bad:   "Calculator broken" -->

**[AREA] Short description of the defect**

---

### Environment

| Field                    | Value                                                |
| ------------------------ | ---------------------------------------------------- |
| **Browser**              | <!-- e.g., Chrome 122.0.6261.112 -->                 |
| **OS**                   | <!-- e.g., Windows 11 23H2, macOS 14.3, iOS 17.3 --> |
| **Device**               | <!-- e.g., Desktop, iPhone 14, Pixel 7, iPad Air --> |
| **Viewport**             | <!-- e.g., 1920x1080, 375x667 -->                    |
| **App Version / Commit** | <!-- e.g., v1.2.0, commit abc1234 -->                |
| **User Role**            | <!-- trainer / solo / client -->                     |
| **Network**              | <!-- e.g., WiFi, 4G, throttled to Slow 3G -->        |

---

### Steps to Reproduce

<!-- Numbered steps to reliably reproduce the bug.
     Be specific about which buttons to click, what data to enter, etc. -->

1. Log in as a **[role]** user
2. Navigate to **[page/route]**
3. [Specific action]
4. [Specific action]
5. Observe the result

---

### Expected Behavior

<!-- What SHOULD happen when following the steps above? -->

---

### Actual Behavior

<!-- What ACTUALLY happens? Be specific: error messages, visual glitches,
     incorrect values, blank screens, etc. -->

---

### Screenshots / Screen Recordings

<!-- Attach screenshots, screen recordings, or GIFs that demonstrate the bug.
     Annotate screenshots with arrows or highlights if helpful.

     For console errors, copy the full stack trace.
     For network errors, include the request URL, status code, and response body. -->

<details>
<summary>Screenshot(s)</summary>

<!-- Drag and drop images here, or paste image links -->

</details>

<details>
<summary>Console Logs / Network Errors</summary>

```
Paste console errors, network responses, or stack traces here.
```

</details>

---

### Severity

<!-- Select ONE severity level and delete the others -->

| Level        | Definition                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------- |
| **Critical** | App crash, data loss, security vulnerability, or complete feature failure blocking all users |
| **Major**    | Core feature broken or significantly degraded; workaround may exist but is unacceptable      |
| **Minor**    | Feature works but with cosmetic issues, incorrect text, or minor UX problems                 |
| **Trivial**  | Cosmetic-only issue (typo, pixel alignment, minor style inconsistency)                       |

**Severity:** <!-- Critical / Major / Minor / Trivial -->

---

### Frequency

<!-- How often does the bug occur? -->

- [ ] Always (100% reproducible)
- [ ] Frequently (>50% of attempts)
- [ ] Sometimes (10-50% of attempts)
- [ ] Rarely (<10% of attempts)
- [ ] Only once (could not reproduce)

---

### Impact

<!-- Who is affected by this bug? -->

- [ ] All users
- [ ] Trainers only
- [ ] Solo users only
- [ ] Client users only
- [ ] Specific browser/device only (specify above)
- [ ] Specific data condition (describe below)

**Additional impact notes:** <!-- e.g., "Only affects users with 50+ clients" -->

---

### Workaround

<!-- Is there a way to work around this bug? If so, describe it. -->

- [ ] No workaround known
- [ ] Workaround available (describe below)

**Workaround:** <!-- e.g., "Refresh the page to clear the stale state" -->

---

### Additional Context

<!-- Any other information that might help diagnose the issue:
     - Did this work before? If so, when did it break?
     - Is it related to a recent deployment or code change?
     - Are there specific data conditions that trigger it?
     - Related issues or PRs? -->

---

### Technical Investigation (for developers)

<!-- Fill this section during triage or investigation -->

<details>
<summary>Developer Notes</summary>

**Root Cause:** <!-- Brief description of why the bug occurs -->

**Affected Files:**

- <!-- e.g., client/src/pages/calculators/BMICalc.tsx -->
- <!-- e.g., server/routes/calculators.ts -->

**Affected Database Tables:**

- <!-- e.g., users, workout_assignments -->

**Related API Endpoints:**

- <!-- e.g., GET /api/calculators/bmi, POST /api/clients -->

**Proposed Fix:** <!-- Brief description of the fix approach -->

**Regression Risk:** <!-- What could break if we fix this? -->

</details>

---

### Checklist (for reporter)

- [ ] I have searched existing issues to confirm this is not a duplicate
- [ ] I have provided steps to reproduce the bug
- [ ] I have specified the environment (browser, OS, device)
- [ ] I have set the severity level
- [ ] I have attached screenshots or logs (if applicable)

---

## Severity Guidelines

### Critical (P0) -- Fix immediately

- Application crash or white screen of death
- Data loss or corruption (e.g., client records deleted unexpectedly)
- Security vulnerability (e.g., unauthorized access to other trainers' data)
- Authentication bypass or session hijacking
- Payment processing failure (Stripe integration)
- Complete feature failure blocking core workflow (cannot add clients, cannot create workouts)

### Major (P1) -- Fix within current sprint

- Core feature significantly degraded (e.g., dashboard loads but stats are wrong)
- API returns 500 errors for valid requests
- Calculator produces incorrect results
- WebSocket disconnects and does not reconnect
- AI coach consistently fails to respond
- CSV export produces corrupted or incomplete files
- Mobile layout is completely unusable (overlapping elements, unreachable buttons)

### Minor (P2) -- Fix in next sprint

- Feature works but UX is suboptimal (e.g., slow loading without indicator)
- Cosmetic issues that affect usability (e.g., text truncation, misaligned elements)
- Edge case handling missing (e.g., 0 or negative inputs not validated)
- Notification badge count incorrect
- Animations jittery or missing
- Dark mode styling inconsistency on one page

### Trivial (P3) -- Fix when convenient

- Typos in UI text
- Pixel-level alignment issues
- Hover state inconsistencies
- Console warnings (non-error)
- Tooltip text could be clearer

---

## Example Bug Reports

### Example 1: Critical

**Title:** [Auth] Session cookie not cleared on logout -- user can access dashboard after clicking "Log Out"

**Severity:** Critical
**Frequency:** Always
**Steps:**

1. Log in as any user
2. Click the user avatar dropdown in the header
3. Click "Log Out"
4. Manually navigate to `/dashboard`
5. The dashboard loads with the previous user's data

---

### Example 2: Major

**Title:** [Calculator] BMI Calculator displays "NaN" when height is set to 0

**Severity:** Major
**Frequency:** Always
**Steps:**

1. Navigate to `/calculators/bmi`
2. Set the height input to `0`
3. Observe the BMI result area

**Expected:** Display "0" or a validation message ("Please enter a valid height")
**Actual:** Displays "NaN" in the result area and "NaN" on the BMI scale

---

### Example 3: Minor

**Title:** [Dashboard] Client count badge shows "0" briefly before data loads

**Severity:** Minor
**Frequency:** Always
**Steps:**

1. Log in as a trainer with 5+ clients
2. Navigate to `/dashboard`
3. Observe the "Total Clients" stat card during page load

**Expected:** Show a loading skeleton until data is ready
**Actual:** Shows "0" for ~500ms before updating to the correct count

---

### Example 4: Trivial

**Title:** [UI] Typo on Strength Standards calculator: "Strenght" instead of "Strength"

**Severity:** Trivial
**Frequency:** Always
**Steps:**

1. Navigate to `/calculators/strength-standards`
2. Scroll to the Classification Legend section
3. Observe the section header text
