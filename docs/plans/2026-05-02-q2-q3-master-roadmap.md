# GymGurus Q2-Q3 Master Roadmap

**Authored:** 2026-04 (Claude web + tvarvaroi)
**Saved:** 2026-05-02
**Status:** Approved, plan-only — implementation pending
**Horizon:** Q2 + Q3 2026, ~24-34 weeks

---

## Executive Summary

We're building infrastructure for GymGurus to become the central nervous system of a user's fitness life — not just a workout logger. The architecture decision driving everything: every datapoint that comes in (training, sleep, body, mood, cycle, hydration, photos) feeds ONE unified intelligence layer (the AI Coach + Recovery Engine + Adaptive Programming) which then improves every feature for every role.

Key research findings shaping the architecture:

- Apple Health has NO web API. Either users export an XML file (painful) or you ship a native iOS shell.
- Google Fit deprecated 2026 → Google Health Connect is Android-native SDK only.
- Web push notifications convert at ~16% on iOS (PWA only) vs 40-70% on native — the long-term win is a native shell, not pure web.
- 500+ wearable APIs exist (Whoop, Oura, Garmin, Fitbit, Strava, Polar, Suunto, Withings...) — all OAuth-based and accessible from web/mobile. Use a unified API instead of integrating 6+ separately.
- Sleep+HRV scientifically correlate with athletic performance (PSQI -0.72 with performance, sleep efficiency +0.76).
- Notifications boost retention 5x.

Three architectural principles:

1. Wearables first via unified API, Apple Health via XML import + native shell on roadmap
2. One "wellness/biometrics" data lake — every source writes to it, every feature reads from it
3. Notifications are infrastructure, not a feature — every system event flows through the same notification engine

Mobile-first / desktop-enhanced: phone is the primary surface (in-gym use, sensor sync, daily check-in). Desktop is the analyst's larger screen (Guru reviewing rosters, multi-month trends).

---

## Locked Decisions

1. **Wearable infrastructure: Open Wearables** (self-hosted, MIT, $0 per-user, deploy as separate Railway service). Rejected: Terra API ($0.50-$2/user/month at scale = $60k-$240k/year at 10k users).

2. **Native shell: Capacitor** (wraps existing React app, ~95% code reuse, native code only for HealthKit/Health Connect/FCM bridges). Rejected: React Native (rewrite cost), separate native apps (sync nightmare).

3. **Daily wellness check-in: optional with gentle nudges**. After 7 skipped days → "are you still using GymGurus?" re-engagement check. Rejected: required (friction risk), pure-optional (habit never forms).

4. **Disciple → Guru data sharing: yes by default with consent at Disciple onboarding**. Granular per-data-type opt-out in settings. Rationale: the entire point of having a Guru is they can see your data.

5. **Pricing: bundle into existing tiers**. 1 wearable connection on Ronin/Guru, unlimited + AI context-aware coaching + Adaptive Programming on Ronin AI / Pro Guru. Rejected: new SKU (sprawl).

---

## What's Currently Working (Audit Findings)

The repo is in good shape. 40 tables, clean architecture. Existing infrastructure to EXTEND:

- userFitnessProfile already stores height/weight/body fat/goals/equipment/dietary prefs
- progressEntries exists but only links to clientId — Ronin can't log body progress today (gap)
- userMuscleFatigue + workoutRecoveryLog already track per-muscle ACWR + RPE + soreness + sleep quality (linked to workouts only)
- notifications table exists with type/title/message/data — backend ready, no push delivery layer
- userGamification + xpTransactions + streaks already wired
- aiService.ts has aiChat, aiGenerateWorkout, aiGenerateMealPlan, aiProgressInsights, aiGenerateProgram
- AI usage limits exist with daily caps per tier
- 3 roles work cleanly with role-aware CSS, bg-primary system locked

Gaps the plan fills:

| Gap                                         | Impact                                    | Solved by                                |
| ------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| progressEntries only for clients            | Ronin can't log body progress             | Refactor to user-or-client polymorphic   |
| No daily wellness check-in                  | Can't detect early overtraining           | New dailyWellnessLog table               |
| No external biometric data ingestion        | App feels "dumb" vs Whoop/Garmin          | Wearable integration via Open Wearables  |
| No menstrual cycle tracking                 | Excludes 50% of solo athletes             | New menstrualCycles + cycleSymptoms      |
| No hydration / standalone nutrition logging | Calorie target exists but no daily log    | New dailyNutritionLogs + hydrationLogs   |
| No photo progress timeline                  | Existing photoUrl is flat                 | New progressPhotos with sequence         |
| No notification delivery                    | Notifications written but never delivered | Web push + email fallback + native FCM   |
| No cardio/heart rate / outdoor training     | Strength-only platform                    | activitySessions + Strava/Garmin imports |
| No habits beyond workout streak             | Single behavior loop                      | Habit tracking system                    |
| No mood/stress standalone                   | Trapped in workoutRecoveryLog             | Promote into dailyWellnessLog            |
| Recovery engine ignores sleep/HRV           | ACWR exists but ignores rest quality      | Recovery Engine v2                       |

---

## Architecture Overview

```
                EXISTING (extends to all roles)
workouts | programs | gamification | AI coach | notifications (rows)
                              |
        UNIFIED BIOMETRICS LAKE (single source of truth)
                              |
        ┌──────────────────┬──────────────────┬──────────────────┐
        │                  │                  │                  │
   Manual Entry    Wearables Unified    Native iOS+Android   Apple XML
   (web+mobile)      API (Open W.)         shell (Q3)         Import
                              │
                    INTELLIGENCE LAYER
   Recovery Engine v2 | Adaptive Programming | AI Coach context
   Trends | Notification Engine | Anomaly detection
                              │
        ┌────────────────┬─────────────────┐
       GURU              RONIN           DISCIPLE
   client health      own data + AI      own data +
   flags + tools      adaptive programs   Guru visibility
```

---

## Master Schema Plan — 12 New Tables (all additive)

### 1. dailyWellnessLog

The keystone table. ONE row per user per day. Subjective + summary.
Fields: id, userId, date (UNIQUE per user), energyLevel/moodScore/stressLevel/sleepQualitySubjective/motivationLevel/sorenessOverall (all 1-10), hydrationGoalMet/steppedOutside/meditationCompleted (booleans), notes, readinessScore (auto-computed 0-100), timestamps.

### 2. bodyMetrics

Time-series body measurements for ALL roles.
Fields: id, userId, recordedAt, weightKg, bodyFatPercentage, neckCm/chestCm/waistCm/hipsCm, bicepLeftCm/bicepRightCm, thighLeftCm/thighRightCm, calfLeftCm/calfRightCm, muscleMassKg, visceralFatRating, boneMassKg, bodyWaterPercentage, source (manual|wearable|apple_health|smart_scale), sourceProvider, notes.

Migration also adds polymorphic columns to progressEntries: userId nullable + clientId nullable, exactly one must be present. Old data stays under clientId. New Ronin logs go to userId.

### 3. progressPhotos

Sequenced photo timeline with comparison support.
Fields: id, userId, takenAt, imageUrl, thumbnailUrl, pose (front|side_left|side_right|back|other), weightAtPhotoKg, bodyFatAtPhoto, isPrivate, comparesPhotoId (FK self), notes.

### 4. wearableConnections

OAuth tokens + sync state per provider per user.
Fields: id, userId, provider (whoop|oura|garmin|fitbit|strava|polar|apple_health|google_health_connect|withings), providerUserId, accessTokenEncrypted, refreshTokenEncrypted, tokenExpiresAt, status, lastSyncAt, syncErrorCount, lastSyncError, capabilities (jsonb string[]), syncPreferences (jsonb), connectedAt, disconnectedAt.

### 5. sleepSessions

Time-series sleep data normalized across sources.
Fields: id, userId, date, bedtime, wakeTime, totalSleepMinutes, deepSleepMinutes, remSleepMinutes, lightSleepMinutes, awakeMinutes, avgHeartRate, minHeartRate, hrvOvernightMs (RMSSD), respiratoryRate, bloodOxygenMin, bodyTemperatureDeviation, sleepScore (0-100), source, sourceRecordId, rawPayload (jsonb).

### 6. dailyVitals

HRV, resting HR, blood oxygen — daily summary, separate from sleep.
Fields: id, userId, date, restingHeartRate, morningHrvRmssd, vo2max, bloodPressureSystolic, bloodPressureDiastolic, bloodOxygenAvg, bodyTemperature, source, sourceRecordId, rawPayload.

### 7. activitySessions

External activities — runs, rides, swims, etc. Distinct from logged strength workouts.
Fields: id, userId, startedAt, durationMinutes, activityType, distanceMeters, calories, avgHeartRate/maxHeartRate, steps, elevationGainMeters, strainScore, trainingLoadScore, routePolyline, source, sourceRecordId, rawPayload.

### 8. menstrualCycles + cycleSymptoms

Opt-in. Awareness-focused (not prescriptive periodization — research is inconclusive).
menstrualCycles: id, userId, cycleStartDate, cycleEndDate, predictedNextStart, cycleLengthDays, isPredicted.
cycleSymptoms: id, userId, date, flowIntensity, symptoms (jsonb string[]), energyImpact (1-5), notes.

### 9. dailyNutritionLogs

Daily intake summary — not full food logging.
Fields: id, userId, date, caloriesConsumed, proteinG, carbsG, fatG, fiberG, adherenceScore (vs userFitnessProfile targets), source, notes.

### 10. hydrationLogs

Quick-log water intake.
Fields: id, userId, date, totalMl, goalMl (snapshot), entries (jsonb [{loggedAt, ml}, ...]).

### 11. pushSubscriptions

Web push delivery infrastructure.
Fields: id, userId, endpoint (NOT NULL), p256dh, auth, userAgent, platform (web|ios_pwa|android|ios_native|android_native), active, lastUsedAt, failureCount.

### 12. userHabits + userHabitCompletions

Daily habits beyond workout streak.
userHabits: id, userId, habitType (hydration|sleep_8h|meditation|steps_10k|no_alcohol|morning_sun|custom), customName, targetValue, isActive, currentStreakDays, longestStreakDays, lastCompletedDate.
userHabitCompletions: id, habitId, date (UNIQUE), value, achieved.

---

## Implementation Sprint Sequence

### PHASE A — Foundation (4-6 weeks)

**Sprint 1: Biometrics Refactor + Body Metrics for All Roles**
Why first: unblocks every Ronin feature in this plan.

- Migration 011_biometrics_foundation: bodyMetrics, progressPhotos, refactor progressEntries polymorphic
- Backend: /api/biometrics/body, /api/biometrics/photos, R2 upload pipeline reused
- Frontend: /biometrics page available to all roles, role-appropriate views
- Disciple consent toggle for Guru visibility
- Guru aggregate view on /clients/:id

**Sprint 2: Notification Engine — Real Delivery**
Why second: every feature wants to notify the user.

- VAPID keys + web-push library
- Migration 012_push_subscriptions
- notificationService.sendNotification(userId, type, data) writes row + fans out to push subs
- Service worker registration in PWA shell
- Notification preferences UI: per-category toggles + quiet hours + timezone
- Email fallback
- Templates: workout reminder, missed workout, recovery alert, PR achievement, level up, streak milestone, sleep score, payment received, client joined, message, weekly summary

### PHASE B — The Sensor Web (5-7 weeks)

**Sprint 3: Daily Wellness Check-In**
30-second morning ritual. The hook for daily app open.

- Migration 013_wellness_log
- Routes: GET /api/wellness/today, POST /api/wellness/log
- /wellness page with 6 sliders + 3 toggles + free-text + submit
- 2nd parallel streak system (wellness check-in alongside workouts)
- AI Coach context now includes last 7 days of wellness
- Guru flags clients with negative wellness trends

**Sprint 4: Wearable Integration via Open Wearables**

- Deploy Open Wearables as separate Railway service
- Migration 014_wearable_data: wearableConnections, sleepSessions, dailyVitals, activitySessions
- Backend wearableSyncService.ts: OAuth via Open Wearables, webhook receiver, backfill 30 days on connect
- Frontend: /settings/integrations with provider tiles (mobile-only sync, web read-only)
- Priority providers v1: Whoop, Oura, Garmin, Strava, Withings

**Sprint 5: Apple Health XML Import (parallel to Sprint 4)**
Escape valve until Sprint 12 native shell.

- Drag-drop upload zone in /settings/integrations
- Backend: chunked R2 upload, streaming XML parser, normalize records to tables
- Status display + summary

### PHASE C — Intelligence (4-5 weeks)

**Sprint 6: Recovery Engine v2 — Daily Readiness Score**
Inputs: sleep duration, sleep quality (HRV during sleep + deep/REM proportion), morning HRV vs 7-day avg, resting HR vs 7-day avg, subjective wellness, recent training load (existing ACWR), soreness (userMuscleFatigue).
Output: 0-100 score, color band (red <33, amber 33-66, green >66), top 2-3 contributing factors, action recommendation.
Surface: top of /dashboard, /program next to today's session, AI Coach context, Adaptive Programming input.

**Sprint 7: Adaptive Programming**
Recovery Engine talks back to Program Builder.

- Each morning, check active program + readiness score
- readiness <33 → auto-suggest deload (-30% load, drop a set), notify
- readiness >80 → suggest "go heavy" option
- Store decision on programDayCompletions: adaptedFromOriginal, adaptationReason
- Guru sees client adaptations + can override

**Sprint 8: AI Coach Context Upgrade**
Build getUserContext(userId) returning last 7-14 days of: workouts logged (sets/weights/PRs), wellness check-ins, sleep + HRV, active program adherence, body metric trends, cycle phase if tracked, recent anomalies.
Include in system prompt for every aiChat call. Coach now references actual data.

### PHASE D — Habit & Social (3-4 weeks)

**Sprint 9: Habits + Hydration**

- Migration 015_habits_hydration: userHabits, userHabitCompletions, hydrationLogs
- /habits page with curated + custom habits
- Quick-log widget on dashboard for hydration (+250ml/+500ml)
- Streak fold-in to existing gamification

**Sprint 10: Menstrual Cycle (opt-in)**

- Migration 016_menstrual_cycles: menstrualCycles, cycleSymptoms
- Settings toggle (off by default)
- /wellness/cycle calendar view with symptom logging
- Cycle phase on dashboard if enabled
- AI Coach context includes phase
- Positioning: awareness/symptom tracking, NOT prescriptive periodization

**Sprint 11: Mood/Stress/RPE Standalone + Insights**

- Promote from workoutRecoveryLog to first-class in dailyWellnessLog
- Mood-vs-training correlation chart on /insights
- AI Coach surfaces patterns

### PHASE E — Native + Scale (8-12 weeks, Q3)

**Sprint 12: Native iOS+Android Shell with Capacitor**

- Wrap existing React app via Capacitor
- Apple Health via Capacitor HealthKit plugin
- Google Health Connect via Capacitor plugin
- Native push (FCM iOS+Android) — much higher delivery than web push
- App Store + Play Store submission

**Sprint 13: Insights Page + Trend Detection**

- Sleep vs PRs over time
- HRV vs perceived effort
- Mood vs training volume
- Body weight vs strength curve
- Cycle phase vs energy (if tracked)
- Anomaly callouts: "Your HRV dropped 15% — historically that precedes 2 missed workouts"

---

## Cross-Feature Decisions

**Privacy & consent:** All biometric data private by default. Disciples opt-in to share specific data types with Guru (granular consent). "Forget my data" feature in Settings (full export + delete).

**Data retention:** Sleep/HRV/activity sessions retained indefinitely. Raw payloads (rawPayload jsonb) auto-expire after 90 days. Photos retained until user deletes.

**Architecture detail — wearable webhook receiver:** New file server/routes/webhooks/wearables.ts separate from Stripe webhooks. Verify HMAC signature from Open Wearables. Idempotent writes (sourceRecordId UNIQUE). Retry queue.

**Where each platform lives:**

- Desktop web: full read/view of all data, best for Guru roster reviews + multi-month analysis
- Mobile web + Mobile native: full read/view PARITY with desktop + wearable connection management + in-gym optimized UI + native push (in app)
- Wearable connection / OAuth = mobile-only (web shows read-only "manage on phone")

---

## Skills Per Sprint

| Sprint            | Primary Skills                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------- |
| All               | writing-plans, executing-plans, verification-before-completion                                |
| 1 (biometrics)    | database-schema-designer, senior-backend, senior-frontend                                     |
| 2 (notifications) | senior-architect, senior-backend, incident-commander                                          |
| 3 (wellness)      | frontend-design, ui-ux-pro-max, senior-frontend                                               |
| 4 (wearables)     | senior-architect, senior-backend, mcp-server-builder, dependency-auditor, env-secrets-manager |
| 5 (XML import)    | senior-backend, performance-profiler                                                          |
| 6 (recovery)      | senior-architect, agile-product-owner                                                         |
| 7 (adaptive)      | senior-fullstack, agent-workflow-designer                                                     |
| 8 (AI context)    | rag-architect, prompt-engineer-toolkit                                                        |
| 9 (habits)        | frontend-design, senior-frontend                                                              |
| 10 (cycle)        | ux-researcher-designer                                                                        |
| 12 (native)       | senior-fullstack, senior-frontend                                                             |
| 13 (insights)     | frontend-design, senior-frontend, ui-ux-pro-max                                               |
| All               | cmo-advisor, cpo-advisor for business decisions                                               |

---

## Positioning Outcome (when all 13 sprints ship)

For Ronin: the only platform combining AI workout generation, multi-wearable ingestion, recovery-aware adaptive programming, and gamified consistency. Direct competitor to Whoop's app + a coach.

For Guru: the only platform giving trainers full client biometric visibility (wearable data shared from Disciple), automated risk flagging, and Stripe billing in one place. Direct competitor to Trainerize, with deeper data.

For Disciple: the only client-facing app tying their trainer's program to their actual recovery state with adaptive sessions. Feels coached even when Guru isn't online.

The unified biometrics layer is the moat. After a year of sleep+HRV+training+wellness data, switching costs are prohibitive.
