import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Apple,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Crown,
  ChevronRight,
  Flame,
  Beef,
  Wheat,
  Droplets,
  ShoppingCart,
  Clock,
  Settings2,
  Save,
  Trash2,
  History,
  Download,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealFood {
  name: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  name: string;
  time: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  prepTime: number;
  foods: MealFood[];
}

interface GeneratedMealPlan {
  totalCalories: number;
  meals: Meal[];
  groceryList?: string[];
  notes?: string[];
}

// ─── Options ─────────────────────────────────────────────────────────────────

const goalOptions = [
  { value: 'bulk', label: 'Bulk (muscle gain)', calorieModifier: 250 },
  { value: 'cut', label: 'Cut (fat loss)', calorieModifier: -400 },
  { value: 'maintain', label: 'Maintain', calorieModifier: 0 },
  { value: 'recomp', label: 'Body Recomposition', calorieModifier: -100 },
];

const dietaryOptions = [
  'None',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Halal',
  'Keto',
  'Paleo',
];

const mealsPerDayOptions = [3, 4, 5, 6];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NutritionPlanner() {
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();
  const profile = useFitnessProfile();

  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [mealPlan, setMealPlan] = useState<GeneratedMealPlan | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Fetch saved meal plans
  const { data: savedPlans = [] } = useQuery<any[]>({
    queryKey: ['/api/solo/meal-plans'],
    queryFn: async () => {
      const res = await fetch('/api/solo/meal-plans', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleSavePlan = async () => {
    if (!mealPlan) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/solo/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: `${nutritionGoal.charAt(0).toUpperCase() + nutritionGoal.slice(1)} Plan - ${targetCalories} kcal`,
          targetCalories: Number(targetCalories),
          planData: mealPlan,
          source: 'generator',
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ['/api/solo/meal-plans'] });
      toast({
        title: 'Meal plan saved!',
        description: 'You can load it anytime from your history.',
      });
    } catch {
      toast({
        title: 'Save failed',
        description: 'Could not save meal plan.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPlan = async (planId: string) => {
    try {
      const res = await fetch(`/api/solo/meal-plans/${planId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (data.planData && data.planData.meals) {
        setMealPlan(data.planData as GeneratedMealPlan);
        setIsSaved(true);
        toast({ title: 'Plan loaded!', description: data.name });
      } else if (data.planData?.rawContent) {
        toast({
          title: 'AI Chat plan',
          description: 'This plan was saved from AI Coach and cannot be displayed here.',
        });
      }
    } catch {
      toast({
        title: 'Load failed',
        description: 'Could not load meal plan.',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await fetch(`/api/solo/meal-plans/${planId}`, { method: 'DELETE', credentials: 'include' });
      queryClient.invalidateQueries({ queryKey: ['/api/solo/meal-plans'] });
      toast({ title: 'Plan deleted' });
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  // Form state
  const [nutritionGoal, setNutritionGoal] = useState('maintain');
  const [targetCalories, setTargetCalories] = useState('2200');
  const [proteinTarget, setProteinTarget] = useState('160');
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(['None']);
  const [budget, setBudget] = useState('moderate');
  const [cookingSkill, setCookingSkill] = useState('basic');

  // Derive defaults from user's fitness profile (TDEE via Mifflin-St Jeor)
  useEffect(() => {
    if (!profile.isLoaded) return;

    // Map profile goal → nutrition goal
    const goalMap: Record<string, string> = {
      lose_weight: 'cut',
      build_muscle: 'bulk',
      maintain_weight: 'maintain',
      improve_fitness: 'maintain',
    };
    if (profile.primaryGoal && goalMap[profile.primaryGoal]) {
      setNutritionGoal(goalMap[profile.primaryGoal]);
    }

    // Calculate TDEE from profile stats
    if (profile.weightKg && profile.heightCm) {
      const w = profile.weightKg;
      const h = profile.heightCm;
      const a = profile.age || 25;
      const bmr =
        profile.gender === 'female'
          ? 10 * w + 6.25 * h - 5 * a - 161
          : 10 * w + 6.25 * h - 5 * a + 5;

      const activityMultipliers: Record<string, number> = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
        athlete: 2.1,
      };
      const multiplier = activityMultipliers[profile.activityLevel || ''] || 1.55;
      const tdee = Math.round(bmr * multiplier);
      setTargetCalories(String(tdee));

      // Protein: 2.0g per kg body weight
      setProteinTarget(String(Math.round(w * 2.0)));
    } else if (profile.dailyCalorieTarget) {
      setTargetCalories(String(Math.round(profile.dailyCalorieTarget)));
    }

    if (profile.proteinTargetGrams) {
      setProteinTarget(String(Math.round(profile.proteinTargetGrams)));
    }
  }, [profile.isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDietary(value: string) {
    if (value === 'None') {
      setDietaryRestrictions(['None']);
      return;
    }
    setDietaryRestrictions((prev) => {
      const withoutNone = prev.filter((d) => d !== 'None');
      if (prev.includes(value)) {
        const removed = withoutNone.filter((d) => d !== value);
        return removed.length === 0 ? ['None'] : removed;
      }
      return [...withoutNone, value];
    });
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setLimitReached(false);
    setIsSaved(false);

    try {
      const restrictions = dietaryRestrictions.filter((d) => d !== 'None');
      const response = await fetch('/api/ai/generate-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCalories: Number(targetCalories) || 2200,
          macros: {
            protein: Number(proteinTarget) || 160,
            carbs: Math.round(((Number(targetCalories) || 2200) * 0.45) / 4),
            fat: Math.round(((Number(targetCalories) || 2200) * 0.25) / 9),
          },
          dietaryRestrictions: restrictions,
          mealsPerDay,
          goal: nutritionGoal,
          budget,
          cookingSkill,
        }),
      });

      const data = await response.json();

      if (response.status === 402) {
        setLimitReached(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate meal plan');
      }

      setMealPlan(data.mealPlan);
    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate meal plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalMacros = mealPlan
    ? {
        protein: mealPlan.meals.reduce((s, m) => s + (m.totalProtein || 0), 0),
        carbs: mealPlan.meals.reduce((s, m) => s + (m.totalCarbs || 0), 0),
        fat: mealPlan.meals.reduce((s, m) => s + (m.totalFat || 0), 0),
      }
    : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extralight tracking-tight font-['Playfair_Display'] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
              <Apple className="h-8 w-8 text-green-400" />
            </div>
            Nutrition{' '}
            <span className="font-light bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Planner
            </span>
          </h1>
          <p className="text-muted-foreground font-light">
            AI-generated meal plans tailored to your goals
          </p>
        </div>
        <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
          <Sparkles className="h-3 w-3 mr-1" />
          AI Powered
        </Badge>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-light flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-green-400" />
                Nutrition Preferences
              </CardTitle>
              <CardDescription>Tell us about your dietary goals and needs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Nutrition Goal */}
              <div className="space-y-2">
                <Label>Goal</Label>
                <div className="grid grid-cols-2 gap-2">
                  {goalOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={nutritionGoal === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNutritionGoal(opt.value)}
                      className={
                        nutritionGoal === opt.value
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : 'border-border/50'
                      }
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Calories + Protein */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">Target Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(e.target.value)}
                    placeholder="2200"
                    min="1000"
                    max="6000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein">Protein Target (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    value={proteinTarget}
                    onChange={(e) => setProteinTarget(e.target.value)}
                    placeholder="160"
                    min="50"
                    max="400"
                  />
                </div>
              </div>

              {/* Meals Per Day */}
              <div className="space-y-2">
                <Label>Meals Per Day</Label>
                <div className="flex gap-2">
                  {mealsPerDayOptions.map((n) => (
                    <Button
                      key={n}
                      variant={mealsPerDay === n ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMealsPerDay(n)}
                      className={`flex-1 ${
                        mealsPerDay === n
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : 'border-border/50'
                      }`}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Dietary Restrictions */}
              <div className="space-y-2">
                <Label>Dietary Restrictions</Label>
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map((opt) => {
                    const active = dietaryRestrictions.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleDietary(opt)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                          active
                            ? 'bg-green-500/20 border-green-500/50 text-green-400'
                            : 'bg-transparent border-border/50 text-muted-foreground hover:border-green-500/30'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label>Budget</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'budget', label: 'Budget-friendly' },
                    { value: 'moderate', label: 'Moderate' },
                    { value: 'premium', label: 'No limit' },
                  ].map((opt) => (
                    <Button
                      key={opt.value}
                      variant={budget === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBudget(opt.value)}
                      className={`flex-1 text-xs ${
                        budget === opt.value
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : 'border-border/50'
                      }`}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Cooking Skill */}
              <div className="space-y-2">
                <Label>Cooking Skill</Label>
                <Select value={cookingSkill} onValueChange={setCookingSkill}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal — microwave / no-cook meals</SelectItem>
                    <SelectItem value="basic">Basic — simple recipes, 15–20 min</SelectItem>
                    <SelectItem value="intermediate">Intermediate — meal prep friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Meal Plan
                  </>
                )}
              </Button>

              {limitReached && (
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Daily AI limit reached</span>
                  </div>
                  <a
                    href="/pricing"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium"
                  >
                    <Crown className="h-3 w-3" />
                    Upgrade Plan
                  </a>
                </div>
              )}
              {generateError && !limitReached && (
                <p className="text-sm text-red-400 text-center">{generateError}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Generated Meal Plan */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full min-h-[500px] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: prefersReducedMotion ? 0 : Infinity,
                        ease: 'linear',
                      }}
                    >
                      <Apple className="h-16 w-16 text-green-400 mx-auto" />
                    </motion.div>
                    <p className="text-lg font-light">Crafting your meal plan...</p>
                    <p className="text-sm text-muted-foreground">
                      Balancing macros and preferences
                    </p>
                  </div>
                </Card>
              </motion.div>
            ) : mealPlan ? (
              <motion.div
                key="plan"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                {/* Daily Totals */}
                <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-light flex items-center gap-2">
                      <Flame className="h-4 w-4 text-green-400" />
                      Daily Totals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-light text-green-400">
                          {mealPlan.totalCalories}
                        </p>
                        <p className="text-xs text-muted-foreground">kcal</p>
                      </div>
                      {totalMacros && (
                        <>
                          <div>
                            <p className="text-2xl font-light text-red-400">
                              {totalMacros.protein}g
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                              <Beef className="h-3 w-3" /> protein
                            </p>
                          </div>
                          <div>
                            <p className="text-2xl font-light text-yellow-400">
                              {totalMacros.carbs}g
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                              <Wheat className="h-3 w-3" /> carbs
                            </p>
                          </div>
                          <div>
                            <p className="text-2xl font-light text-blue-400">{totalMacros.fat}g</p>
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                              <Droplets className="h-3 w-3" /> fat
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Meals */}
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {mealPlan.meals.map((meal, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <Card className="border-border/40">
                        <CardHeader className="pb-2 pt-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs text-green-400 font-semibold">
                                {i + 1}
                              </div>
                              {meal.name}
                              {meal.time && (
                                <span className="text-xs text-muted-foreground font-normal">
                                  {meal.time}
                                </span>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{meal.totalCalories} kcal</span>
                              {meal.prepTime > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {meal.prepTime}m
                                </span>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <ul className="space-y-1.5">
                            {(meal.foods || []).map((food, j) => (
                              <li key={j} className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <ChevronRight className="h-3 w-3 shrink-0" />
                                  <span>
                                    {food.name}
                                    {food.amount && (
                                      <span className="text-muted-foreground/70">
                                        {' '}
                                        — {food.amount}
                                      </span>
                                    )}
                                  </span>
                                </span>
                                <div className="flex items-center gap-2 shrink-0 text-muted-foreground/70">
                                  {food.protein > 0 && <span>{food.protein}g P</span>}
                                  {food.calories > 0 && <span>{food.calories} kcal</span>}
                                </div>
                              </li>
                            ))}
                          </ul>
                          {/* Per-meal macros */}
                          <div className="flex gap-3 mt-2 pt-2 border-t border-border/30 text-xs text-muted-foreground">
                            <span className="text-red-400">{meal.totalProtein}g protein</span>
                            <span className="text-yellow-400">{meal.totalCarbs}g carbs</span>
                            <span className="text-blue-400">{meal.totalFat}g fat</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}

                  {/* Grocery List */}
                  {mealPlan.groceryList && mealPlan.groceryList.length > 0 && (
                    <Card className="border-border/40 bg-muted/20">
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-green-400" />
                          Grocery List
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex flex-wrap gap-1.5">
                          {mealPlan.groceryList.map((item, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Save + Regenerate */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-border/50"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button
                    onClick={handleSavePlan}
                    disabled={isSaving || isSaved}
                    className={`flex-1 ${
                      isSaved
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    }`}
                    variant={isSaved ? 'outline' : 'default'}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : isSaved ? (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Plan
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full min-h-[500px] flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                      <Apple className="h-10 w-10 text-green-400/50" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-light">Ready to Plan</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Set your nutrition goals and click "Generate Meal Plan" to get a
                        personalised daily plan
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Badge variant="outline" className="border-border/50">
                        <Flame className="h-3 w-3 mr-1" />
                        Macro-balanced
                      </Badge>
                      <Badge variant="outline" className="border-border/50">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Grocery list included
                      </Badge>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Saved Meal Plans History (F5) */}
      {savedPlans.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-light flex items-center gap-2">
                <History className="h-5 w-5 text-green-400" />
                My Saved Plans
              </CardTitle>
              <CardDescription>
                {savedPlans.length} saved meal plan{savedPlans.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {savedPlans.map((plan: any) => (
                  <div
                    key={plan.id}
                    className="p-3 rounded-xl border border-border/40 bg-card/30 hover:border-green-500/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.targetCalories ? `${plan.targetCalories} kcal` : 'No calories set'}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ml-2 ${
                          plan.source === 'ai_chat'
                            ? 'border-purple-500/30 text-purple-400'
                            : 'border-green-500/30 text-green-400'
                        }`}
                      >
                        {plan.source === 'ai_chat' ? 'AI Chat' : 'Generated'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7 border-green-500/20 text-green-400 hover:bg-green-500/10"
                        onClick={() => handleLoadPlan(plan.id)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Load
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete meal plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{plan.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex justify-end gap-3">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePlan(plan.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
