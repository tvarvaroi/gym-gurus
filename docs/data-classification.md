# GymGurus GDPR Data Classification

**Document Purpose**: This document classifies all data stored by the GymGurus platform according to GDPR requirements, identifies compliance gaps, and provides actionable recommendations. It covers data sensitivity levels, consent requirements, right-to-delete obligations, retention policies, and encryption priorities.

**Classification Levels**:
- **Public** -- Safe to display publicly (exercise names, store info)
- **Internal** -- System/operational data, not PII (IDs, timestamps, flags)
- **PII** -- Personally Identifiable Information (names, emails, phone numbers)
- **Sensitive Health Data** -- GDPR Article 9 "special category" data (body measurements, medical conditions, injuries, medications)

---

## 1. Table Classification Summary

| Table | Classification | Contains PII | Contains Health Data | GDPR Article 9 |
|-------|---------------|:------------:|:--------------------:|:--------------:|
| sessions | Internal | No | No | No |
| users | PII | Yes | No | No |
| clients | PII + Health | Yes | Yes | Yes |
| exercises | Public | No | No | No |
| workouts | Internal | No | No | No |
| workout_exercises | Internal | No | No | No |
| workout_assignments | Internal | No | No | No |
| progress_entries | Health | No | Yes | Yes |
| training_sessions | Internal | No | No | No |
| appointments | Internal | No | No | No |
| user_onboarding_progress | Internal | No | No | No |
| user_fitness_profile | PII + Health | Yes | Yes | Yes |
| user_gamification | Internal | No | No | No |
| achievements | Public | No | No | No |
| user_achievements | Internal | No | No | No |
| xp_transactions | Internal | No | No | No |
| personal_records | Health | No | Yes | Yes |
| personal_record_history | Health | No | Yes | Yes |
| user_strength_standards | Health | No | Yes | Yes |
| strength_standards_reference | Public | No | No | No |
| user_muscle_fatigue | Health | No | Yes | Yes |
| user_muscle_volume | Health | No | Yes | Yes |
| workout_recovery_log | Health | No | Yes | Yes |
| ai_chat_conversations | Internal | No | No | No |
| ai_chat_messages | Health | No | Yes | Yes |
| meal_plans | Health | No | Yes | Yes |
| meals | Health | No | Yes | Yes |
| food_log | Health | No | Yes | Yes |
| grocery_stores | Public | No | No | No |
| shopping_lists | Internal | No | No | No |
| shopping_list_items | Health | No | Yes | Yes |
| leaderboards | Public | No | No | No |
| leaderboard_entries | Health | Yes* | Yes | Yes |
| user_follows | Internal | No | No | No |
| workout_sessions | Health | No | Yes | Yes |
| workout_set_logs | Health | No | Yes | Yes |
| ai_generated_workouts | Health | No | Yes | Yes |
| notifications | Health* | Potentially | Potentially | Potentially |
| payment_plans | Internal | No | No | No |
| payments | PII + Financial | Yes | No | No |
| client_intake | PII + Health | Yes | Yes | **Yes -- CRITICAL** |

*leaderboard_entries expose health metrics publicly when tied to user identity. notifications content varies by type.

---

## 2. Key PII and Sensitive Health Data Fields

### PII Fields (Tier 1 Priority)

| Table | Field | Notes |
|-------|-------|-------|
| users | email | Login identifier, unique |
| users | firstName, lastName | Full name |
| users | profileImageUrl | Biometric identifier (photo) |
| clients | name, email | Duplicated from user registration |
| client_intake | emergencyContactName | Third-party PII |
| client_intake | emergencyContactPhone | Third-party PII |
| payments | stripePaymentIntentId, stripeInvoiceId | Financial identifiers |
| payments | amountInCents | Financial transaction data |

### Sensitive Health Data Fields (GDPR Article 9)

| Table | Fields | Severity |
|-------|--------|----------|
| clients | age, gender, height, weight, neckCircumference, waistCircumference, hipCircumference | High |
| user_fitness_profile | heightCm, weightKg, bodyFatPercentage, dateOfBirth, gender | High |
| user_fitness_profile | injuries, medicalConditions, allergies | **Critical** |
| user_fitness_profile | latitude, longitude | Location (High) |
| client_intake | parqHeartCondition, parqChestPainActivity, parqChestPainRest, parqDizziness, parqBoneJoint, parqBloodPressureMeds | **Critical** |
| client_intake | medicalConditions, medications, previousInjuries | **Critical** |
| client_intake | dietaryRestrictions | High |
| ai_chat_messages | content | **Critical** (may contain health discussions) |
| workout_set_logs | weightKg, reps, rpe, duration, distance | High |
| personal_records | weightKg, estimated1rm, bodyweightAtPr | High |
| food_log | calories, protein, carbs, fat | High |
| workout_recovery_log | perceivedExertion, muscleSoreness, sleepQualityLastNight | High |
| progress_entries | value (weight, body_fat, measurements) | High |

---

## 3. Key Data Flows

### PII Creation and Storage
1. **User Registration** -- email, firstName, lastName, profileImageUrl stored in `users`; displayed on profile pages; transmitted during auth flows.
2. **Client Onboarding** -- name and email duplicated into `clients` table (data normalization issue); displayed on trainer dashboards.
3. **Payments** -- Stripe IDs stored in `payments`; financial data subject to PCI-DSS via Stripe.

### Sensitive Health Data Flows
1. **Biometric Collection** -- height, weight, body fat, circumferences collected at onboarding; stored in `clients` and `user_fitness_profile`; used for fitness calculations; displayed on trainer dashboard and progress charts. **Consent: MISSING.**
2. **Health Screening (PAR-Q)** -- Medical conditions, injuries, medications collected via `client_intake`; accessed by trainer only. **Requires explicit written Art. 9 consent.**
3. **Workout Performance** -- Set-by-set data flows into `workout_set_logs` -> `personal_records` -> `user_muscle_volume` -> `leaderboard_entries`. Performance metrics may be publicly exposed via leaderboards.
4. **AI Chat** -- User health discussions sent to external AI API via `ai_chat_messages`. **Requires Data Processing Agreement and explicit consent.**
5. **Nutrition Tracking** -- Daily intake logged in `food_log`; targets in `meal_plans`; may indicate eating disorders or health conditions.

---

## 4. Missing Consent Mechanisms

### Current State
- No `consent_records` or `user_consents` table exists in the schema
- Implicit consent model only (usage = consent)
- No Article 9 explicit consent storage
- No consent version tracking
- `client_intake.consentSigned` exists but only covers the intake form itself

### Required Consent Forms

| Consent Type | Trigger Point | GDPR Basis | Priority |
|-------------|---------------|------------|----------|
| Health Data Collection | Before biometric input | Art. 9 explicit | **Critical** |
| Medical Screening (PAR-Q) | Before intake form | Art. 9 explicit written | **Critical** |
| AI Features & Data Sharing | Before first AI chat | Art. 6 + Art. 9 | **Critical** |
| Location Data | Before enabling shopping helper | Art. 6 consent | High |
| Leaderboard Public Display | Before opting into public boards | Art. 9 explicit | High |
| Marketing Communications | Account creation | Art. 6 consent | Medium |

### Recommended Implementation
Add a `user_consents` table:
```
user_consents (
  id, userId, consentType, version, consentGiven,
  consentedAt, ipAddress, userAgent
)
```
- Each consent type tracked independently
- Checkboxes must not be pre-checked (affirmative action required)
- Record timestamp, IP, and consent form version for proof

---

## 5. Right-to-Delete Requirements

### Cascade Delete Paths

**User Deletion** (complete account removal):
```
users
 +-- sessions (auth)
 +-- user_fitness_profile
 +-- user_gamification
 +-- user_achievements
 +-- xp_transactions
 +-- personal_records
 +-- personal_record_history
 +-- user_strength_standards
 +-- user_muscle_fatigue
 +-- user_muscle_volume
 +-- workout_recovery_log
 +-- ai_chat_conversations --> ai_chat_messages
 +-- meal_plans --> meals
 |              +-> shopping_lists --> shopping_list_items
 +-- food_log
 +-- workout_sessions --> workout_set_logs
 +-- ai_generated_workouts
 +-- notifications
 +-- leaderboard_entries (remove from public)
 +-- user_follows (both follower and following)
 +-- workouts (if trainer)
 +-- training_sessions
 +-- appointments
 +-- user_onboarding_progress
 +-- payments ** ARCHIVE, do not delete (7-year legal hold) **
```

**Client Deletion** (trainer removes client):
```
clients
 +-- client_intake
 +-- workout_assignments
 +-- progress_entries
 +-- training_sessions
 +-- appointments
 +-- payments ** ARCHIVE, do not delete **
```

### Delete Priority Tiers

| Priority | Action | Tables |
|----------|--------|--------|
| Immediate | Hard delete | AI conversations/messages, fitness profiles, meal plans, food logs, workout sessions/set logs, gamification, personal records |
| 30-day grace | Soft delete then purge | User account, notifications, user follows |
| Archive only | Pseudonymize, retain | Payments (7 years), consent records (3 years) |
| Special handling | Remove user linkage | Leaderboard entries, client intake (legal liability archive) |

---

## 6. Data Retention Policy Recommendations

### Active Accounts

| Data Type | Recommended Retention | Rationale |
|-----------|-----------------------|-----------|
| Auth sessions | 30 days | Session timeout |
| Fitness performance logs | 24 months | Progress tracking |
| AI conversations | 90 days (auto-rotate) | Data minimization |
| Meal/nutrition logs | 6 months | Active tracking period |
| Notifications (read) | 30 days auto-delete | Performance |
| Medical intake forms | Duration + 7 years | Legal liability |
| Consent records | Duration + 3 years | Legal proof |

### Deleted Accounts

| Data Type | Recommended Retention | Rationale |
|-----------|-----------------------|-----------|
| Financial records | 7 years | Tax/accounting law |
| Consent records | 3 years | Legal proof |
| Audit/deletion logs | 3 years | Compliance proof |
| All other data | Delete immediately | GDPR right to erasure |

### Inactive Accounts (No login > 2 years)
- Send reactivation notification
- If unresponsive after 30 days: archive or delete per user preference
- Auto-delete non-financial data after 2.5 years of inactivity

---

## 7. Encryption Recommendations

### Tier 1 -- CRITICAL (Implement Immediately)

| Table | Fields | Rationale |
|-------|--------|-----------|
| client_intake | All PAR-Q fields, medicalConditions, medications, previousInjuries | Medical data -- highest GDPR sensitivity |
| user_fitness_profile | injuries, medicalConditions, allergies | Article 9 health data |
| ai_chat_messages | content | May contain health discussions, medical queries |
| users | email, firstName, lastName | Core PII |
| clients | name, email | Core PII |

### Tier 2 -- HIGH (Within 30 Days)

| Table | Fields | Rationale |
|-------|--------|-----------|
| clients | age, gender, height, weight, neckCircumference, waistCircumference, hipCircumference | Biometric data |
| progress_entries | value | Body measurements |
| workout_set_logs | weightKg, reps, rpe, duration, distance | Performance metrics |
| payments | stripePaymentIntentId, stripeInvoiceId | Financial identifiers |
| food_log | calories, protein, carbs, fat | Dietary tracking |

### Tier 3 -- MEDIUM (Within 90 Days)

| Table | Fields | Rationale |
|-------|--------|-----------|
| user_fitness_profile | heightCm, weightKg, bodyFatPercentage, dateOfBirth, latitude, longitude | Health + location data |
| workout_recovery_log | perceivedExertion, muscleSoreness, sleepQualityLastNight | Self-reported health |
| personal_records | weightKg, estimated1rm, bodyweightAtPr | Performance history |
| meal_plans | targetCalories, targetProteinGrams, targetCarbsGrams, targetFatGrams | Nutritional targets |
| workout_assignments | customNotes | May contain health notes |

### Encryption Strategy
- **Algorithm**: AES-256 for field-level encryption at the application layer
- **Searchable fields** (e.g., email): Use deterministic encryption to allow lookups
- **Key management**: Store encryption keys outside the database (e.g., environment variables, HSM, or secrets manager)
- **Key rotation**: Annually, with version tracking per encrypted field

---

## 8. Summary of Critical Compliance Actions

### CRITICAL -- Implement Before Launch

- [ ] Create `user_consents` table and implement explicit Article 9 consent forms for health data collection
- [ ] Encrypt Tier 1 fields at rest (client_intake, medical data, AI messages, core PII)
- [ ] Document a Data Processing Agreement with AI service provider
- [ ] Implement right-to-delete cascade logic with audit trail

### HIGH -- Within 30 Days

- [ ] Encrypt Tier 2 fields (biometrics, performance data, financial IDs)
- [ ] Implement leaderboard privacy controls (default to hidden; require opt-in for public)
- [ ] Build user data export functionality (Art. 20 right to data portability)
- [ ] Add location data consent separate from fitness consent
- [ ] Define and document data retention policies

### MEDIUM -- Within 90 Days

- [ ] Encrypt Tier 3 fields (fitness profile, recovery logs, personal records)
- [ ] Implement automated data deletion jobs per retention schedule
- [ ] Auto-delete read notifications after 30 days
- [ ] Implement AI conversation retention limits (90-day rotation)
- [ ] Add soft-delete with audit logging for all PII tables

### LOW -- Within 6 Months

- [ ] Conduct full Data Protection Impact Assessment (DPIA), especially for AI features and public leaderboards
- [ ] Third-party vendor security audit
- [ ] Regular penetration testing schedule
- [ ] Comprehensive GDPR compliance review with legal counsel

---

## Additional Risks

### Leaderboard Privacy
Public leaderboards (`leaderboards.scope = 'global'`) tie user identity to fitness performance metrics. This constitutes public disclosure of health data under Art. 9. **Recommendation**: Default scope to `friends` or `trainer_group`; require explicit opt-in for public display; add a `leaderboard_privacy` column to users (values: `hidden`, `friends`, `public`; default: `hidden`).

### AI Integration
AI chat messages may contain health information sent to external APIs. Without a Data Processing Agreement, this is a GDPR violation. User health queries, symptom descriptions, and medical advice discussions are all Article 9 data. **Recommendation**: Implement DPA, add explicit AI consent, consider message anonymization before API transmission.

### Data Duplication
Client PII (name, email) exists in both `users` and `clients` tables. Biometric data exists in both `clients` and `user_fitness_profile`. This duplication increases the surface area for data breaches and complicates right-to-delete. **Recommendation**: Normalize to avoid duplication; reference `users.id` instead of duplicating fields.

---

*Document generated: 2026-02-14*
*Based on schema analysis of: `shared/schema.ts`*
*Review schedule: Quarterly, or after any schema change*
