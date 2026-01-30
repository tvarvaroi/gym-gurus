# Calculator.net Comparison Analysis

## Overview
Comprehensive comparison between our GymGurus calculations and Calculator.net's industry-standard fitness calculators.

---

## 1. Body Fat Calculator

### ✅ What We Match Perfectly:

**Method Used:**
- Both use: **US Navy Method** (Hodgdon & Beckett, 1984)
- Both cite: ~3.5% accuracy
- Same formula implementation

**Required Inputs:**
- Gender ✓
- Height ✓
- Neck circumference ✓
- Waist circumference ✓
- Hip circumference (women only) ✓

**Our Status:** ✅ **100% MATCH** - We're using the exact same validated method

---

## 2. BMR (Basal Metabolic Rate) Calculator

### ✅ What We Match:

**Primary Formula:**
- Both use: **Mifflin-St Jeor Equation** (most accurate)
- Calculator.net says: "has been shown to be more accurate than the revised Harris-Benedict Equation"
- We also prioritize this formula

**Inputs:**
- Weight (kg) ✓
- Height (cm) ✓
- Age ✓
- Gender ✓

**Our Status:** ✅ **100% MATCH** - We're using the gold standard formula

### 📊 What They Offer (We Don't):
1. **Harris-Benedict Equation** (alternative formula)
2. **Katch-McArdle Formula** (uses body fat % - more accurate for lean individuals)

**Recommendation:** Consider adding Katch-McArdle as an option when body fat % is known.

---

## 3. TDEE (Total Daily Energy Expenditure) Calculator

### ⚠️ ACTIVITY MULTIPLIERS DIFFER

**Calculator.net uses 6 levels:**
1. Sedentary: **1.2**
2. Light exercise (1-3x/week): **1.375**
3. Moderate (4-5x/week): **1.465**
4. Active (daily or intense 3-4x/week): **1.55**
5. Very active (6-7x/week): **1.725**
6. Extremely active (daily intense): **1.9**

**Our Current Implementation (5 levels):**
1. Sedentary: **1.2** ✓
2. Lightly active: **1.375** ✓
3. Moderately active: **1.55** ❌ (theirs: 1.465)
4. Active: **1.725** ❌ (theirs: 1.55)
5. Very active: **1.9** ❌ (theirs: 1.725)

### Analysis:
- **Our multipliers are HIGHER** than Calculator.net's
- This means we're estimating **higher TDEE** = potentially overestimating calories
- **Their system is more conservative** and granular (6 levels vs our 5)

### 🚨 RECOMMENDATION: Adjust activity multipliers to match Calculator.net

**Proposed Fix:**
```typescript
const activityMultipliers = {
  sedentary: 1.2,              // ✓ Keep
  lightly_active: 1.375,       // ✓ Keep
  moderately_active: 1.55,     // ❌ Change to 1.465
  active: 1.725,               // ❌ Change to 1.55
  very_active: 1.9,            // ❌ Change to 1.725
}
```

Or add a 6th level:
```typescript
const activityMultipliers = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.465,    // NEW (4-5x/week)
  active: 1.55,                // (daily exercise)
  very_active: 1.725,          // (intense 6-7x/week)
  extremely_active: 1.9,       // (athlete level)
}
```

---

## 4. Calorie Calculator (Deficit/Surplus Recommendations)

### ✅ What We Match:

**Weight Loss Recommendations:**
- Both recommend: **-500 cal for 1 lb/week loss**
- Both recommend: **Max -1000 cal for 2 lbs/week loss**
- Both warn: "losing more than 2 pounds per week can be unhealthy"

**Minimum Calorie Limits:**
- Calculator.net (Harvard Health): Women ≥1,200 cal, Men ≥1,500 cal
- **Our implementation:**
  - Women: 1,200-1,500 cal (we're MORE conservative) ✅
  - Men: 1,500-1,800 cal (we're MORE conservative) ✅

**Muscle Gain:**
- Both recommend: **~300 cal surplus** for lean bulk

**Our Status:** ✅ **MATCHES + MORE ADVANCED**

### 🎯 What We Added (Calculator.net Doesn't Have):

**Percentage-Based Deficit Protection:**
- We implement: **Max 0.7% body weight loss per week**
- Calculator.net: Only uses fixed -500/-1000 cal
- **Our approach is MORE SOPHISTICATED** - scales to individual body size!

Example:
- 50kg person: Max 385 cal deficit (safer)
- 100kg person: Max 770 cal deficit (more aggressive allowed)

**Result:** ✅ **We're AHEAD of Calculator.net here**

---

## 5. Macro Calculator

### ❌ No Specific Data Available
Calculator.net's macro calculator doesn't reveal their specific percentage recommendations in the public interface.

**What We Know:**
- They offer presets: Balanced, Low Fat, Low Carb, High Protein
- No specific percentages disclosed

**Our Implementation:**
- Weight loss: 30% carbs / 45% protein / 25% fat
- Muscle gain: 40% carbs / 30% protein / 30% fat
- Maintenance: 35% carbs / 35% protein / 30% fat

**Status:** ⚠️ **Can't compare** - their values are hidden

---

## 6. Additional Calculators They Have (We Don't)

### Potentially Useful Additions:

1. **BMI Calculator**
   - Simple height/weight ratio
   - Widely recognized metric
   - **Recommendation:** Easy to add, useful for initial assessment

2. **Lean Body Mass Calculator**
   - Calculates muscle mass
   - Useful for progress tracking
   - **Recommendation:** Medium priority

3. **Ideal Weight Calculator**
   - Target weight range
   - Based on height and frame size
   - **Recommendation:** Low priority (subjective)

4. **Calories Burned Calculator**
   - Estimates calories burned during specific exercises
   - **Recommendation:** High priority for workout tracking

---

## Summary Comparison Table

| Feature | Calculator.net | GymGurus | Status |
|---------|---------------|----------|--------|
| Body Fat (US Navy) | ✓ | ✓ | ✅ Perfect Match |
| BMR (Mifflin-St Jeor) | ✓ | ✓ | ✅ Perfect Match |
| BMR (Harris-Benedict) | ✓ | ✗ | ⚠️ Could Add |
| BMR (Katch-McArdle) | ✓ | ✗ | ⚠️ Could Add |
| Activity Multipliers | 6 levels (conservative) | 5 levels (higher) | ❌ **NEEDS FIX** |
| Min Calories (Women) | 1,200 | 1,200-1,500 | ✅ More conservative |
| Min Calories (Men) | 1,500 | 1,500-1,800 | ✅ More conservative |
| Max Weight Loss | -1000 cal | -1000 cal OR 0.7%/week | ✅ **MORE ADVANCED** |
| Macro Percentages | Hidden | Disclosed | ✅ More transparent |
| BMI Calculator | ✓ | ✗ | ⚠️ Could Add |
| Lean Body Mass | ✓ | ✗ | ⚠️ Could Add |

---

## 🚨 CRITICAL ISSUES TO FIX

### 1. Activity Multipliers (HIGH PRIORITY)
**Problem:** Our multipliers overestimate TDEE
- Moderately active: 1.55 → should be 1.465
- Active: 1.725 → should be 1.55
- Very active: 1.9 → should be 1.725

**Impact:** Clients get higher calorie recommendations than they should
**Risk:** Slower progress toward goals, potential weight gain instead of loss

**Fix:** Update multipliers to match industry standard (Calculator.net, Harris-Benedict)

---

## ✅ WHAT WE DO BETTER

### 1. Gender-Specific Minimums
- **More conservative:** Men get 1,500-1,800 (vs their 1,500)
- **Better safety:** Women get 1,200-1,500 (vs their 1,200)

### 2. Percentage-Based Deficit Protection
- **More sophisticated:** 0.7% body weight/week rule
- **Scales to individual:** Prevents excessive deficits for smaller people
- **Calculator.net doesn't have this!**

### 3. Evidence-Based Macros
- **Transparent:** Clear percentages for each goal
- **Research-backed:** 2024 studies, high protein for muscle preservation
- **Conservative carbs:** Max 40% (modern lean bulk approach)

### 4. Body-Weight-Based Protein Targets
- **More accurate:** 2.2g/kg for weight loss, 1.8g/kg for gain
- **Adjusts automatically:** Recalculates other macros to fit
- **Calculator.net doesn't do this!**

---

## 📋 RECOMMENDED IMPROVEMENTS

### Priority 1 (CRITICAL):
- [ ] Fix activity multipliers to match Calculator.net standards
  - Change moderately_active: 1.55 → 1.465
  - Change active: 1.725 → 1.55
  - Change very_active: 1.9 → 1.725
  - OR add 6th level (extremely_active: 1.9)

### Priority 2 (HIGH):
- [ ] Add BMI calculator (simple, widely used)
- [ ] Add Lean Body Mass calculation
- [ ] Add Katch-McArdle BMR formula (for clients with known body fat %)

### Priority 3 (MEDIUM):
- [ ] Add Harris-Benedict formula as alternative
- [ ] Add Calories Burned calculator for workouts
- [ ] Add comparison view (show all formula results side-by-side)

### Priority 4 (LOW):
- [ ] Add Ideal Weight calculator
- [ ] Add Body Type calculator

---

## Conclusion

**Overall Assessment:** 🟢 **STRONG MATCH + IMPROVEMENTS**

### What We're Doing Right:
✅ Using industry-standard formulas (Mifflin-St Jeor, US Navy)
✅ More conservative calorie minimums (safer for clients)
✅ Advanced percentage-based deficit protection
✅ Evidence-based macro distributions
✅ Body-weight-based protein targets

### What Needs Fixing:
❌ **Activity multipliers are too high** (overestimating TDEE)
⚠️ Could add alternative BMR formulas for comparison
⚠️ Could add BMI and Lean Body Mass calculators

### Bottom Line:
Our calculations are **scientifically sound** and in many ways **MORE ADVANCED** than Calculator.net, but we need to **fix the activity multipliers** to match industry standards and prevent overestimating calorie needs.
