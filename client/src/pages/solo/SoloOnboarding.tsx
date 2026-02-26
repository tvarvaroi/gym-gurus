import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Target,
  Dumbbell,
  Calendar,
  Home,
  Building2,
  TreePine,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Minus,
  Plus,
} from 'lucide-react';

// Onboarding step definitions
const STEPS = [
  {
    id: 'goals',
    title: 'What are your fitness goals?',
    subtitle: 'Select your primary goal',
  },
  {
    id: 'basics',
    title: "Let's get to know you",
    subtitle: 'Basic info to personalize your experience',
  },
  {
    id: 'body',
    title: 'Your current stats',
    subtitle: 'Used for accurate calculations and AI recommendations',
  },
  {
    id: 'health',
    title: 'Any limitations or preferences?',
    subtitle: 'This keeps your workouts safe and your meals right',
  },
  {
    id: 'experience',
    title: 'How long have you been training?',
    subtitle: 'This helps us personalize your experience',
  },
  {
    id: 'environment',
    title: 'Where do you train?',
    subtitle: "We'll suggest exercises based on your equipment",
  },
  {
    id: 'equipment',
    title: 'What equipment do you have?',
    subtitle: 'Select all that apply',
  },
  {
    id: 'schedule',
    title: 'How often can you work out?',
    subtitle: "We'll help you stay consistent",
  },
  {
    id: 'complete',
    title: "You're all set! 🎉",
    subtitle: 'Your AI coach is ready to create your first workout',
  },
];

// Goal options
const GOALS = [
  {
    value: 'muscle_gain',
    label: 'Build Muscle',
    emoji: '💪',
    description: 'Gain size and strength',
  },
  { value: 'fat_loss', label: 'Lose Fat', emoji: '🔥', description: 'Burn calories and get lean' },
  { value: 'strength', label: 'Get Stronger', emoji: '🎯', description: 'Increase your maxes' },
  { value: 'endurance', label: 'Build Endurance', emoji: '🫁', description: 'Improve stamina' },
  {
    value: 'general_fitness',
    label: 'General Fitness',
    emoji: '✨',
    description: 'Overall health',
  },
  { value: 'maintenance', label: 'Maintain', emoji: '📊', description: 'Keep current progress' },
];

// Gender options
const GENDERS = [
  { value: 'male', label: 'Male', emoji: '♂️' },
  { value: 'female', label: 'Female', emoji: '♀️' },
  { value: 'other', label: 'Other', emoji: '⭐' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', emoji: '🤐' },
];

// Experience levels
const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', emoji: '🌱', description: 'New to lifting (0-6 months)' },
  { value: 'intermediate', label: 'Intermediate', emoji: '🌿', description: '6 months - 2 years' },
  {
    value: 'advanced',
    label: 'Advanced',
    emoji: '🌳',
    description: '2+ years consistent training',
  },
];

// Training environments
const ENVIRONMENTS = [
  { value: 'home', label: 'Home Gym', icon: Home, description: 'Training at home' },
  {
    value: 'commercial_gym',
    label: 'Commercial Gym',
    icon: Building2,
    description: 'Full gym access',
  },
  { value: 'outdoor', label: 'Outdoor/Park', icon: TreePine, description: 'Outdoor training' },
  {
    value: 'hybrid',
    label: 'Mix of Everything',
    icon: Sparkles,
    description: 'Multiple locations',
  },
];

// Equipment options
const EQUIPMENT = [
  { value: 'barbell', label: 'Barbell', emoji: '🏋️' },
  { value: 'dumbbells', label: 'Dumbbells', emoji: '🏋️' },
  { value: 'kettlebells', label: 'Kettlebells', emoji: '🔔' },
  { value: 'cables', label: 'Cable Machine', emoji: '🔌' },
  { value: 'machines', label: 'Weight Machines', emoji: '⚙️' },
  { value: 'pullup_bar', label: 'Pull-up Bar', emoji: '🪜' },
  { value: 'bench', label: 'Bench', emoji: '🪑' },
  { value: 'squat_rack', label: 'Squat Rack', emoji: '🏗️' },
  { value: 'resistance_bands', label: 'Resistance Bands', emoji: '🎗️' },
  { value: 'bodyweight_only', label: 'Bodyweight Only', emoji: '🧘' },
];

// Frequency options
const FREQUENCIES = [
  { value: 2, label: '2 days/week', description: 'Light schedule' },
  { value: 3, label: '3 days/week', description: 'Balanced approach' },
  { value: 4, label: '4 days/week', description: 'Committed training' },
  { value: 5, label: '5 days/week', description: 'Serious dedication' },
  { value: 6, label: '6 days/week', description: 'Advanced athlete' },
];

// Injury options
const INJURIES = [
  { value: 'shoulder', label: 'Shoulder Issues', emoji: '🦴' },
  { value: 'lower_back', label: 'Lower Back Pain', emoji: '🦴' },
  { value: 'knee', label: 'Knee Problems', emoji: '🦵' },
  { value: 'wrist', label: 'Wrist/Hand Issues', emoji: '🤚' },
  { value: 'hip', label: 'Hip Issues', emoji: '🦴' },
  { value: 'neck', label: 'Neck Pain', emoji: '🦴' },
  { value: 'elbow', label: 'Elbow/Tennis Elbow', emoji: '💪' },
  { value: 'ankle', label: 'Ankle Issues', emoji: '🦶' },
  { value: 'none', label: "None — I'm healthy!", emoji: '✅' },
];

// Dietary restriction options
const DIETARY = [
  { value: 'none', label: 'No Restrictions', emoji: '🍽️' },
  { value: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
  { value: 'vegan', label: 'Vegan', emoji: '🌱' },
  { value: 'gluten_free', label: 'Gluten-Free', emoji: '🌾' },
  { value: 'dairy_free', label: 'Dairy-Free', emoji: '🥛' },
  { value: 'halal', label: 'Halal', emoji: '🍖' },
  { value: 'kosher', label: 'Kosher', emoji: '✡️' },
  { value: 'keto', label: 'Keto/Low-Carb', emoji: '🥑' },
  { value: 'paleo', label: 'Paleo', emoji: '🥩' },
  { value: 'pescatarian', label: 'Pescatarian', emoji: '🐟' },
];

interface OnboardingData {
  // Existing
  primaryGoal: string;
  experienceLevel: string;
  workoutEnvironment: string;
  availableEquipment: string[];
  workoutFrequencyPerWeek: number;
  // New
  age: number | null;
  gender: string;
  unitPreference: string; // 'metric' | 'imperial'
  weight: number | null; // kg if metric, lbs if imperial
  heightCm: number | null; // used when metric
  heightFt: number | null; // used when imperial
  heightIn: number | null; // used when imperial (0-11)
  bodyFatPercentage: number | null;
  injuries: string[];
  dietaryRestrictions: string[];
}

export function SoloOnboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    primaryGoal: '',
    experienceLevel: '',
    workoutEnvironment: '',
    availableEquipment: [],
    workoutFrequencyPerWeek: 3,
    age: null,
    gender: '',
    unitPreference: 'metric',
    weight: null,
    heightCm: null,
    heightFt: null,
    heightIn: null,
    bodyFatPercentage: null,
    injuries: [],
    dietaryRestrictions: [],
  });

  // Toggle helper for multi-select lists with a "none" option
  const toggleWithNone = (current: string[], value: string, noneValue = 'none'): string[] => {
    if (value === noneValue) return [noneValue];
    const withoutNone = current.filter((v) => v !== noneValue);
    return withoutNone.includes(value)
      ? withoutNone.filter((v) => v !== value)
      : [...withoutNone, value];
  };

  // Save onboarding data mutation
  const saveOnboardingMutation = useMutation({
    mutationFn: async (d: OnboardingData) => {
      // Convert units to metric for storage
      const weightKg =
        d.weight !== null
          ? d.unitPreference === 'imperial'
            ? Math.round((d.weight / 2.2046) * 10) / 10
            : d.weight
          : null;

      const heightCm =
        d.unitPreference === 'metric'
          ? d.heightCm
          : d.heightFt !== null
            ? Math.round((d.heightFt * 12 + (d.heightIn ?? 0)) * 2.54 * 10) / 10
            : null;

      const payload = {
        primaryGoal: d.primaryGoal,
        experienceLevel: d.experienceLevel,
        workoutEnvironment: d.workoutEnvironment,
        availableEquipment: d.availableEquipment,
        workoutFrequencyPerWeek: d.workoutFrequencyPerWeek,
        gender: d.gender || null,
        age: d.age,
        weightKg,
        heightCm,
        bodyFatPercentage: d.bodyFatPercentage,
        injuries: d.injuries,
        dietaryRestrictions: d.dietaryRestrictions,
      };

      const response = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to save onboarding data');
      return response.json();
    },
    onSuccess: async () => {
      // Wait for the user query to refetch so onboardingCompleted is true
      // before navigating — otherwise the AuthWrapper redirect will send
      // the user back to /solo/onboarding because the stale user object
      // still has onboardingCompleted: false.
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error Saving Preferences',
        description: error.message || 'Failed to save onboarding data',
      });
    },
  });

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const canProceed = () => {
    switch (step.id) {
      case 'goals':
        return !!data.primaryGoal;
      case 'basics':
        return !!data.gender && data.age !== null && data.age >= 13 && !!data.unitPreference;
      case 'body':
        if (data.weight === null || data.weight <= 0) return false;
        return data.unitPreference === 'metric'
          ? data.heightCm !== null && data.heightCm > 0
          : data.heightFt !== null && data.heightFt > 0;
      case 'health':
        return data.injuries.length > 0 && data.dietaryRestrictions.length > 0;
      case 'experience':
        return !!data.experienceLevel;
      case 'environment':
        return !!data.workoutEnvironment;
      case 'equipment':
        return data.availableEquipment.length > 0;
      case 'schedule':
        return data.workoutFrequencyPerWeek >= 2;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      saveOnboardingMutation.mutate(data);
    } else if (canProceed()) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  // Display helpers for complete step
  const heightDisplay =
    data.unitPreference === 'metric'
      ? data.heightCm
        ? `${data.heightCm} cm`
        : ''
      : data.heightFt !== null
        ? `${data.heightFt}ft ${data.heightIn ?? 0}in`
        : '';

  const weightDisplay = data.weight
    ? `${data.weight} ${data.unitPreference === 'metric' ? 'kg' : 'lbs'}`
    : '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-secondary">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Step Counter */}
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-muted-foreground text-center mb-2"
          >
            Step {currentStep + 1} of {STEPS.length}
          </motion.p>

          {/* Title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center mb-8"
            >
              <h1 className="text-2xl font-bold mb-2">{step.title}</h1>
              <p className="text-muted-foreground">{step.subtitle}</p>
            </motion.div>
          </AnimatePresence>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Goals Step */}
              {step.id === 'goals' && (
                <div className="grid grid-cols-2 gap-3">
                  {GOALS.map((goal) => (
                    <button
                      key={goal.value}
                      onClick={() => setData((d) => ({ ...d, primaryGoal: goal.value }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        data.primaryGoal === goal.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-2xl mb-2 block">{goal.emoji}</span>
                      <p className="font-medium">{goal.label}</p>
                      <p className="text-xs text-muted-foreground">{goal.description}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Basics Step — gender, age, unit preference */}
              {step.id === 'basics' && (
                <div className="space-y-6">
                  {/* Gender */}
                  <div>
                    <p className="text-sm font-medium mb-3">Gender</p>
                    <div className="grid grid-cols-2 gap-3">
                      {GENDERS.map((g) => (
                        <button
                          key={g.value}
                          onClick={() => setData((d) => ({ ...d, gender: g.value }))}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            data.gender === g.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <span className="text-2xl mb-1 block">{g.emoji}</span>
                          <p className="font-medium text-sm">{g.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Age */}
                  <div>
                    <p className="text-sm font-medium mb-3">Age</p>
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() =>
                          setData((d) => ({ ...d, age: Math.max(13, (d.age ?? 19) - 1) }))
                        }
                        className="w-12 h-12 rounded-full border-2 border-border hover:border-primary/50 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="text-center">
                        <input
                          type="number"
                          value={data.age ?? ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 13 && val <= 100) {
                              setData((d) => ({ ...d, age: val }));
                            } else if (e.target.value === '') {
                              setData((d) => ({ ...d, age: null }));
                            }
                          }}
                          className="text-6xl font-bold text-primary bg-transparent border-none outline-none text-center w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="--"
                          min={13}
                          max={100}
                        />
                        <p className="text-sm text-muted-foreground mt-1">years old</p>
                      </div>
                      <button
                        onClick={() =>
                          setData((d) => ({ ...d, age: Math.min(100, (d.age ?? 17) + 1) }))
                        }
                        className="w-12 h-12 rounded-full border-2 border-border hover:border-primary/50 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Unit Preference */}
                  <div>
                    <p className="text-sm font-medium mb-3">Preferred Units</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'metric', label: 'Metric', description: 'kg, cm' },
                        { value: 'imperial', label: 'Imperial', description: 'lbs, ft/in' },
                      ].map((unit) => (
                        <button
                          key={unit.value}
                          onClick={() =>
                            setData((d) => ({
                              ...d,
                              unitPreference: unit.value,
                              // Reset measurements when switching units
                              weight: null,
                              heightCm: null,
                              heightFt: null,
                              heightIn: null,
                            }))
                          }
                          className={`p-4 rounded-xl border-2 text-center transition-all ${
                            data.unitPreference === unit.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <p className="font-medium">{unit.label}</p>
                          <p className="text-xs text-muted-foreground">{unit.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Body Step — weight, height, body fat */}
              {step.id === 'body' && (
                <div className="space-y-6">
                  {/* Weight */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Weight ({data.unitPreference === 'metric' ? 'kg' : 'lbs'})
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={data.weight ?? ''}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            weight: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                        className="flex-1 p-3 rounded-xl border-2 border-border bg-background text-center text-2xl font-bold focus:border-primary outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder={data.unitPreference === 'metric' ? '70' : '155'}
                        min={data.unitPreference === 'metric' ? 30 : 65}
                        max={data.unitPreference === 'metric' ? 300 : 660}
                      />
                      <span className="text-muted-foreground font-medium w-8">
                        {data.unitPreference === 'metric' ? 'kg' : 'lbs'}
                      </span>
                    </div>
                  </div>

                  {/* Height */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Height</label>
                    {data.unitPreference === 'metric' ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={data.heightCm ?? ''}
                          onChange={(e) =>
                            setData((d) => ({
                              ...d,
                              heightCm: e.target.value ? Number(e.target.value) : null,
                            }))
                          }
                          className="flex-1 p-3 rounded-xl border-2 border-border bg-background text-center text-2xl font-bold focus:border-primary outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="175"
                          min={100}
                          max={250}
                        />
                        <span className="text-muted-foreground font-medium w-8">cm</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="number"
                            value={data.heightFt ?? ''}
                            onChange={(e) =>
                              setData((d) => ({
                                ...d,
                                heightFt: e.target.value ? Number(e.target.value) : null,
                              }))
                            }
                            className="flex-1 p-3 rounded-xl border-2 border-border bg-background text-center text-2xl font-bold focus:border-primary outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="5"
                            min={3}
                            max={8}
                          />
                          <span className="text-muted-foreground font-medium">ft</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="number"
                            value={data.heightIn ?? ''}
                            onChange={(e) =>
                              setData((d) => ({
                                ...d,
                                heightIn: e.target.value ? Number(e.target.value) : null,
                              }))
                            }
                            className="flex-1 p-3 rounded-xl border-2 border-border bg-background text-center text-2xl font-bold focus:border-primary outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="11"
                            min={0}
                            max={11}
                          />
                          <span className="text-muted-foreground font-medium">in</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Body Fat % (optional) */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Body Fat %{' '}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {"Don't know? No problem — skip it and we'll estimate from your stats"}
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={data.bodyFatPercentage ?? ''}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            bodyFatPercentage: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                        className="flex-1 p-3 rounded-xl border-2 border-border bg-background text-center text-2xl font-bold focus:border-primary outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="—"
                        min={3}
                        max={60}
                      />
                      <span className="text-muted-foreground font-medium w-8">%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Health Step — injuries and dietary restrictions */}
              {step.id === 'health' && (
                <div className="space-y-6">
                  {/* Injuries */}
                  <div>
                    <p className="text-sm font-medium mb-3">
                      Current injuries or limitations{' '}
                      <span className="text-muted-foreground font-normal">
                        (select all that apply)
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {INJURIES.map((item) => (
                        <button
                          key={item.value}
                          onClick={() =>
                            setData((d) => ({
                              ...d,
                              injuries: toggleWithNone(d.injuries, item.value),
                            }))
                          }
                          className={`p-3 rounded-lg border-2 text-left transition-all flex items-center gap-2 ${
                            data.injuries.includes(item.value)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <span className="text-xl">{item.emoji}</span>
                          <span className="text-sm font-medium">{item.label}</span>
                          {data.injuries.includes(item.value) && (
                            <Check className="w-4 h-4 text-primary ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dietary Restrictions */}
                  <div>
                    <p className="text-sm font-medium mb-3">
                      Dietary restrictions{' '}
                      <span className="text-muted-foreground font-normal">
                        (select all that apply)
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {DIETARY.map((item) => (
                        <button
                          key={item.value}
                          onClick={() =>
                            setData((d) => ({
                              ...d,
                              dietaryRestrictions: toggleWithNone(
                                d.dietaryRestrictions,
                                item.value
                              ),
                            }))
                          }
                          className={`p-3 rounded-lg border-2 text-left transition-all flex items-center gap-2 ${
                            data.dietaryRestrictions.includes(item.value)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <span className="text-xl">{item.emoji}</span>
                          <span className="text-sm font-medium">{item.label}</span>
                          {data.dietaryRestrictions.includes(item.value) && (
                            <Check className="w-4 h-4 text-primary ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Experience Step */}
              {step.id === 'experience' && (
                <div className="space-y-3">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setData((d) => ({ ...d, experienceLevel: level.value }))}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                        data.experienceLevel === level.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-3xl">{level.emoji}</span>
                      <div>
                        <p className="font-medium">{level.label}</p>
                        <p className="text-sm text-muted-foreground">{level.description}</p>
                      </div>
                      {data.experienceLevel === level.value && (
                        <Check className="w-5 h-5 text-primary ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Environment Step */}
              {step.id === 'environment' && (
                <div className="grid grid-cols-2 gap-3">
                  {ENVIRONMENTS.map((env) => {
                    const Icon = env.icon;
                    return (
                      <button
                        key={env.value}
                        onClick={() => setData((d) => ({ ...d, workoutEnvironment: env.value }))}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          data.workoutEnvironment === env.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Icon className="w-8 h-8 mb-2 text-primary" />
                        <p className="font-medium">{env.label}</p>
                        <p className="text-xs text-muted-foreground">{env.description}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Equipment Step */}
              {step.id === 'equipment' && (
                <div className="grid grid-cols-2 gap-2">
                  {EQUIPMENT.map((item) => (
                    <button
                      key={item.value}
                      onClick={() =>
                        setData((prev) => ({
                          ...prev,
                          availableEquipment: prev.availableEquipment.includes(item.value)
                            ? prev.availableEquipment.filter((e) => e !== item.value)
                            : [...prev.availableEquipment, item.value],
                        }))
                      }
                      className={`p-3 rounded-lg border-2 text-left transition-all flex items-center gap-2 ${
                        data.availableEquipment.includes(item.value)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-xl">{item.emoji}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                      {data.availableEquipment.includes(item.value) && (
                        <Check className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Schedule Step */}
              {step.id === 'schedule' && (
                <div className="space-y-3">
                  {FREQUENCIES.map((freq) => (
                    <button
                      key={freq.value}
                      onClick={() =>
                        setData((d) => ({ ...d, workoutFrequencyPerWeek: freq.value }))
                      }
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                        data.workoutFrequencyPerWeek === freq.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{freq.label}</p>
                        <p className="text-sm text-muted-foreground">{freq.description}</p>
                      </div>
                      {data.workoutFrequencyPerWeek === freq.value && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Complete Step */}
              {step.id === 'complete' && (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.5 }}
                    className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center"
                  >
                    <Sparkles className="w-12 h-12 text-white" />
                  </motion.div>
                  <p className="text-muted-foreground mb-4">
                    Based on your preferences, we'll create personalized workouts just for you.
                  </p>
                  <div className="bg-card p-4 rounded-xl text-left">
                    <h4 className="font-medium mb-2">Your Profile Summary:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Goal: {GOALS.find((g) => g.value === data.primaryGoal)?.label}</li>
                      {data.age && <li>• Age: {data.age}</li>}
                      {data.gender && data.gender !== 'prefer_not_to_say' && (
                        <li>• Gender: {GENDERS.find((g) => g.value === data.gender)?.label}</li>
                      )}
                      {weightDisplay && <li>• Weight: {weightDisplay}</li>}
                      {heightDisplay && <li>• Height: {heightDisplay}</li>}
                      {data.bodyFatPercentage && <li>• Body Fat: {data.bodyFatPercentage}%</li>}
                      {data.injuries.length > 0 && !data.injuries.includes('none') && (
                        <li>• Limitations: {data.injuries.join(', ')}</li>
                      )}
                      {data.dietaryRestrictions.length > 0 &&
                        !data.dietaryRestrictions.includes('none') && (
                          <li>• Diet: {data.dietaryRestrictions.join(', ')}</li>
                        )}
                      <li>
                        • Experience:{' '}
                        {EXPERIENCE_LEVELS.find((l) => l.value === data.experienceLevel)?.label}
                      </li>
                      <li>
                        • Location:{' '}
                        {ENVIRONMENTS.find((e) => e.value === data.workoutEnvironment)?.label}
                      </li>
                      <li>• Equipment: {data.availableEquipment.length} items selected</li>
                      <li>• Frequency: {data.workoutFrequencyPerWeek} days/week</li>
                    </ul>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="p-6 border-t bg-card/50">
        <div className="max-w-lg mx-auto flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="px-6 py-3 rounded-xl border border-border hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed() || saveOnboardingMutation.isPending}
            className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
              canProceed()
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            }`}
          >
            {saveOnboardingMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up...
              </>
            ) : isLastStep ? (
              <>
                Get Started
                <Sparkles className="w-5 h-5" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SoloOnboarding;
