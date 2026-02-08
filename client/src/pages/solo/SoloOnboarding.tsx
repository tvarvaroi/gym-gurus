import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
} from 'lucide-react';

// Onboarding step definitions
const STEPS = [
  {
    id: 'goals',
    title: 'What are your fitness goals?',
    subtitle: 'Select your primary goal',
  },
  {
    id: 'experience',
    title: 'How long have you been training?',
    subtitle: 'This helps us personalize your experience',
  },
  {
    id: 'environment',
    title: 'Where do you train?',
    subtitle: 'We\'ll suggest exercises based on your equipment',
  },
  {
    id: 'equipment',
    title: 'What equipment do you have?',
    subtitle: 'Select all that apply',
  },
  {
    id: 'schedule',
    title: 'How often can you work out?',
    subtitle: 'We\'ll help you stay consistent',
  },
  {
    id: 'complete',
    title: 'You\'re all set! 🎉',
    subtitle: 'Your AI coach is ready to create your first workout',
  },
];

// Goal options
const GOALS = [
  { value: 'muscle_gain', label: 'Build Muscle', emoji: '💪', description: 'Gain size and strength' },
  { value: 'fat_loss', label: 'Lose Fat', emoji: '🔥', description: 'Burn calories and get lean' },
  { value: 'strength', label: 'Get Stronger', emoji: '🎯', description: 'Increase your maxes' },
  { value: 'endurance', label: 'Build Endurance', emoji: '🫁', description: 'Improve stamina' },
  { value: 'general_fitness', label: 'General Fitness', emoji: '✨', description: 'Overall health' },
  { value: 'maintenance', label: 'Maintain', emoji: '📊', description: 'Keep current progress' },
];

// Experience levels
const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', emoji: '🌱', description: 'New to lifting (0-6 months)' },
  { value: 'intermediate', label: 'Intermediate', emoji: '🌿', description: '6 months - 2 years' },
  { value: 'advanced', label: 'Advanced', emoji: '🌳', description: '2+ years consistent training' },
];

// Training environments
const ENVIRONMENTS = [
  { value: 'home', label: 'Home Gym', icon: Home, description: 'Training at home' },
  { value: 'commercial_gym', label: 'Commercial Gym', icon: Building2, description: 'Full gym access' },
  { value: 'outdoor', label: 'Outdoor/Park', icon: TreePine, description: 'Outdoor training' },
  { value: 'hybrid', label: 'Mix of Everything', icon: Sparkles, description: 'Multiple locations' },
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

interface OnboardingData {
  primaryGoal: string;
  experienceLevel: string;
  workoutEnvironment: string;
  availableEquipment: string[];
  workoutFrequencyPerWeek: number;
}

export function SoloOnboarding() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    primaryGoal: '',
    experienceLevel: '',
    workoutEnvironment: '',
    availableEquipment: [],
    workoutFrequencyPerWeek: 3,
  });

  // Save onboarding data mutation
  const saveOnboardingMutation = useMutation({
    mutationFn: async (onboardingData: OnboardingData) => {
      const response = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to save onboarding data');
      return response.json();
    },
    onSuccess: () => {
      navigate('/dashboard');
    },
  });

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const canProceed = () => {
    switch (step.id) {
      case 'goals':
        return !!data.primaryGoal;
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

  const toggleEquipment = (value: string) => {
    setData((prev) => ({
      ...prev,
      availableEquipment: prev.availableEquipment.includes(value)
        ? prev.availableEquipment.filter((e) => e !== value)
        : [...prev.availableEquipment, value],
    }));
  };

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
                      onClick={() => toggleEquipment(item.value)}
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
                      onClick={() => setData((d) => ({ ...d, workoutFrequencyPerWeek: freq.value }))}
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
                      <li>• Experience: {EXPERIENCE_LEVELS.find((l) => l.value === data.experienceLevel)?.label}</li>
                      <li>• Location: {ENVIRONMENTS.find((e) => e.value === data.workoutEnvironment)?.label}</li>
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
