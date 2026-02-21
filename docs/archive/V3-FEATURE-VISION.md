# GymGurus V3 Features - Archived for Future Implementation

**Archived Date:** 2026-02-19
**Reason:** Schema cleanup before auth rewrite. Zero current usage in codebase.
**Status:** Feature designs preserved for potential future development.

---

## Overview

This document describes the V3 features that were designed but never implemented. These features represent ambitious expansion plans for GymGurus that would transform it from a training management platform into a comprehensive fitness lifestyle app.

All table definitions have been preserved in `docs/archive/v3-tables-archive.ts`.

---

## 1. Strength Standards & Benchmarking

**Tables:** `strengthStandardsReference`

### The Vision

Allow users to compare their lifts against population-wide benchmarks, providing context for their personal records beyond just absolute numbers.

### User Experience

When a user logs a new PR, they would see:

- **Classification:** "Intermediate" level for their bodyweight and gender
- **Percentile Rank:** "You're stronger than 72% of lifters your size"
- **Next Milestone:** "15 lbs away from Advanced classification"
- **Progress Visualization:** Visual chart showing their journey from Beginner → Elite

### Why It Matters

- **Motivation:** Users see tangible progress even when PRs slow down
- **Realistic Goals:** Understand what's achievable at their experience level
- **Community Context:** Feel part of a larger fitness community
- **Training Decisions:** Know when to push harder vs. when to maintain

### Implementation Considerations

- Would need to populate reference data from sources like:
  - Symmetric Strength database
  - ExRx.net standards
  - Scientific studies on strength norms
- Would need separate tables by:
  - Gender (male/female)
  - Bodyweight categories (e.g., 60kg, 70kg, 80kg, etc.)
  - Exercise type (squat, bench, deadlift, etc.)
- Classification levels: Untrained → Beginner → Novice → Intermediate → Advanced → Elite

---

## 2. Leaderboards & Social Competition

**Tables:** `leaderboards`, `leaderboardEntries`

### The Vision

Create competitive leaderboards where users can see how they rank against others globally, within their gym, or among friends. Make fitness social and gamified.

### User Experience

**Leaderboard Types:**

- **Exercise PRs:** Top bench press, squat, deadlift by absolute weight
- **Relative Strength:** Top lifters by bodyweight ratio (Wilks score style)
- **Volume Leaders:** Most total weight lifted this month
- **XP Champions:** Highest experience points earned
- **Streak Warriors:** Longest current workout streak

**Filtering Options:**

- **Scope:** Global / My Gym / Friends Only / My Trainer's Clients
- **Timeframe:** Daily / Weekly / Monthly / All-Time
- **Demographics:** Gender, Age Group, Weight Class

**Social Features:**

- See your current rank (e.g., "#47 out of 1,203 lifters")
- View users ranked just above and below you
- Get notifications when someone surpasses you
- Set goals to reach specific ranks
- Celebrate when you break into top 10/100

### Why It Matters

- **Motivation Through Competition:** External motivation when internal motivation wanes
- **Community Building:** Connect users with similar goals and capabilities
- **Engagement:** Reason to log workouts consistently (to maintain rank)
- **Virality:** Users invite friends to compete
- **Achievement Unlocks:** Tie achievements to leaderboard positions

### Implementation Considerations

**Current Implementation (Kept):**

- Leaderboards currently query `userGamification` table directly
- Simpler approach: calculate ranks on-the-fly
- Works for smaller user bases
- Less infrastructure needed

**Archived Table Approach (V3 Vision):**

- Pre-calculate and cache leaderboard entries
- Update nightly via cron job
- Much faster queries for large user bases (10k+ users)
- Enables complex filtering without heavy computation
- Can track rank changes over time ("↑5 since yesterday")

**When to Implement:**

- If user base exceeds 5,000 active users
- If leaderboard queries start slowing down app
- If adding complex social features (friends-only, gym-specific, etc.)

---

## 3. Social Following System

**Tables:** `userFollows`

### The Vision

Allow users to follow each other, creating a social fitness network. See friends' PRs, celebrate achievements together, and build accountability partnerships.

### User Experience

**Following Features:**

- Follow friends, gym buddies, or inspiring lifters
- See a feed of followed users' achievements
- Celebrate others' PRs with reactions/comments
- Get notified when followed users hit milestones
- Compare progress with followed users

**Trainer Integration:**

- Trainers automatically follow their clients
- Clients can follow their trainers for motivation
- See leaderboards scoped to "People I Follow"

**Discovery:**

- "Suggested Users" based on similar goals
- Find users at your gym
- Connect with users at similar strength levels

### Why It Matters

- **Accountability:** Working out is easier with friends watching
- **Inspiration:** See what's possible by following advanced lifters
- **Community:** Fitness is more enjoyable when social
- **Retention:** Social connections = stronger app retention
- **Network Effects:** More valuable as more friends join

### Privacy Considerations

- Users should control who can follow them (public/friends-only/private)
- Option to hide specific stats from followers
- Block/unfollow functionality
- Private profiles for users who want solo training

---

## 4. Meal Planning & Nutrition Tracking

**Tables:** `mealPlans`, `meals`, `foodLog`

### The Vision

Integrate nutrition tracking with workout programming, making GymGurus a one-stop fitness app. Help users eat to support their training goals.

### User Experience

**Meal Planning:**

- AI-generated meal plans based on:
  - Daily calorie target (from fitness profile)
  - Macro split (protein/carbs/fat targets)
  - Dietary restrictions (vegan, gluten-free, etc.)
  - Meal preferences and allergies
  - Training schedule (pre/post workout meals)

**Sample Day:**

- **Breakfast:** Oatmeal with berries and protein powder (450 cal, 30g protein)
- **Snack:** Greek yogurt with almonds (200 cal, 15g protein)
- **Lunch:** Chicken breast with rice and broccoli (600 cal, 45g protein)
- **Pre-Workout:** Banana and peanut butter (250 cal, 8g protein)
- **Dinner:** Salmon with quinoa and asparagus (550 cal, 40g protein)
- **Total:** 2,050 calories, 138g protein

**Food Logging:**

- Quick-add common foods from database
- Barcode scanning for packaged foods
- AI meal photo recognition ("That looks like a chicken burrito, ~650 calories")
- Track daily/weekly nutrition progress
- See macro balance visualizations

**Integration with Training:**

- "You burned 450 calories today. Add a post-workout snack?"
- "Low protein intake this week. Your recovery might suffer."
- Adjust calorie targets on rest days vs. training days
- Suggest meal timing around workouts

### Why It Matters

- **Holistic Fitness:** Nutrition is 50% of results
- **Convenience:** One app instead of MyFitnessPal + training app
- **Personalization:** Meal plans that actually match training load
- **Education:** Users learn to eat for performance, not just weight loss
- **Trainer Value:** Trainers can provide nutrition coaching in-app

### Implementation Challenges

- **Food Database:** Would need comprehensive food nutrition database
  - Option: License from USDA FoodData Central (free, 300k+ foods)
  - Option: Integrate with Nutritionix API or similar
- **Recipe Generation:** Would need AI to create balanced, tasty meals
- **Dietary Expertise:** Would need nutrition consultant for safety/accuracy
- **Compliance:** Ensure not providing medical nutrition advice (legal concerns)

---

## 5. Shopping Helper & Grocery Integration

**Tables:** `groceryStores`, `shoppingLists`, `shoppingListItems`

### The Vision

Turn meal plans into actionable grocery lists, find the nearest stores, and potentially integrate with grocery delivery services for ultimate convenience.

### User Experience

**Shopping List Generation:**

1. User selects their weekly meal plan
2. App generates shopping list with:
   - All ingredients needed
   - Quantities (e.g., "2 lbs chicken breast", "1 dozen eggs")
   - Organized by category (Produce, Meat, Dairy, Grains)
   - Estimated total cost

**Store Integration:**

- "Find Nearest Store" using user's location
- Shows nearby options:
  - Whole Foods (0.8 mi) - $$ - Best for organic
  - Trader Joe's (1.2 mi) - $ - Budget friendly
  - Safeway (1.5 mi) - $ - Good selection
- Display store hours, phone number, website

**Smart Shopping:**

- Check items off as you shop
- Suggest cheaper alternatives (e.g., "Generic oats save $2")
- Flag unavailable items with substitution ideas
- Track actual spending vs. estimated cost
- Reorder list by store aisle layout (if store data available)

**Advanced Features (Future):**

- Integration with Instacart/Amazon Fresh for delivery
- Price comparison across stores
- Weekly budget tracking
- Coupon/deal notifications for items on your list
- Recurring lists for staple items

### Why It Matters

- **Removes Friction:** Biggest barrier to meal prep is shopping
- **Saves Time:** No more forgetting ingredients or wandering aisles
- **Saves Money:** Budget tracking prevents overspending
- **Increases Adherence:** Easier shopping = more likely to stick to meal plan
- **Competitive Advantage:** Few fitness apps offer this level of shopping integration

### Implementation Considerations

**Grocery Store Data:**

- **Google Places API:** Store locations, hours, phone, reviews
- **Kroger API:** Product availability, pricing (requires partnership)
- **Walmart API:** Similar to Kroger
- **Challenge:** Most grocery APIs require business partnerships or have limited data

**Product Matching:**

- "1 lb ground beef" → Find actual products at store
- Would need product database or manual mapping
- Could start simple: just list ingredients without specific products

**Legal/Business:**

- No affiliation with stores without partnership
- Can't guarantee pricing accuracy unless live API access
- Consider affiliate programs (earn commission on grocery deliveries)

---

## Retained V3 Features (Currently Active)

These V3 features ARE implemented and actively used:

### Gamification System

- ✅ `userGamification` - XP, levels, streaks, lifetime stats
- ✅ `achievements` - Achievement definitions with XP rewards
- ✅ `userAchievements` - User-earned achievements tracking
- ✅ `xpTransactions` - XP earning/spending history

**Status:** Core engagement system. Heavily used throughout app.

### Personal Records & Strength

- ✅ `personalRecords` - Current PRs per exercise
- ✅ `personalRecordHistory` - Historical PR progression
- ✅ `userStrengthStandards` - Calculated strength classifications

**Status:** Core training feature. Used in strength tracking, progress visualization, and achievement triggers.

### Recovery & Volume Tracking

- ✅ `userMuscleFatigue` - Current muscle fatigue state
- ✅ `userMuscleVolume` - Weekly/monthly volume tracking
- ✅ `workoutRecoveryLog` - Post-workout recovery data

**Status:** Used for workout planning, deload recommendations, and overtraining prevention.

### AI Coaching

- ✅ `aiChatConversations` - AI coach conversation threads
- ✅ `aiChatMessages` - Individual messages in conversations

**Status:** Active AI coaching feature. Powers the AI trainer chatbot.

### Workout Session Tracking

- ✅ `workoutSessions` - Live workout tracking with rest timers
- ✅ `workoutSetLogs` - Set-by-set logging during workouts
- ✅ `aiGeneratedWorkouts` - AI workout template storage

**Status:** Core solo training feature. Enables real-time workout logging and session management.

### Business Features

- ✅ `notifications` - In-app notification system
- ✅ `paymentPlans` - Trainer pricing packages
- ✅ `payments` - Payment transaction history
- ✅ `clientIntake` - PAR-Q health screening

**Status:** Essential for trainer-client business operations.

### User Profile

- ✅ `userFitnessProfile` - Physical stats, goals, preferences, equipment

**Status:** Foundation for personalization. Used in calculators, AI recommendations, and profile management.

---

## Prioritization for Future Development

If/when GymGurus revisits these archived features, recommended priority order:

### Priority 1: Social Features (Medium Effort, High Impact)

- **`userFollows`** - Social following system
- **Why First:** Relatively simple to implement, drives engagement and virality

### Priority 2: Leaderboards v2 (Medium Effort, High Impact)

- **`leaderboards` + `leaderboardEntries`** - Pre-calculated competitive leaderboards
- **Why Second:** Current simple leaderboards exist. Upgrade when user base scales.

### Priority 3: Nutrition Basics (High Effort, Very High Impact)

- **`foodLog`** - Simple daily food tracking
- **Why Third:** Nutrition is critical, but complex. Start with logging before meal planning.

### Priority 4: Meal Planning (Very High Effort, Very High Impact)

- **`mealPlans` + `meals`** - AI meal plan generation
- **Why Fourth:** Requires food database, AI integration, nutrition expertise. Big project.

### Priority 5: Shopping Helper (Very High Effort, Medium Impact)

- **`groceryStores` + `shoppingLists` + `shoppingListItems`** - Grocery shopping assistance
- **Why Last:** Cool feature, but requires external API partnerships. Lower ROI than core nutrition.

### Priority 6: Strength Standards Reference (Low Effort, Low-Medium Impact)

- **`strengthStandardsReference`** - Population benchmark data
- **Why Someday:** Nice-to-have context feature. Current classifications in `userStrengthStandards` work fine.

---

## Technical Debt Avoided

By archiving these unused tables, we avoid:

1. **Migration Complexity:** Fewer tables to migrate during auth rewrite
2. **Query Performance:** Smaller schema = faster queries and better ORM performance
3. **Developer Confusion:** Clearer what's actually used vs. future plans
4. **Maintenance Burden:** No need to update unused table schemas as app evolves
5. **Database Bloat:** Unused indexes and constraints slow down the whole database

The designs are preserved here and can be resurrected when the time is right.

---

## Conclusion

These V3 features represent GymGurus' potential to become a comprehensive fitness platform. The designs are sound, the user value is clear, but the timing isn't right yet.

Focus now: nail the core training experience, stabilize the auth system, and build a thriving user base. When ready to expand, this document provides a roadmap for feature development with pre-designed database schemas ready to go.

**Archive ≠ Abandoned. Archive = Preserved for the Right Moment.**
