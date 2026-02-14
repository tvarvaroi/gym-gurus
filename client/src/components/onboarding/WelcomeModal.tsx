import { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  X,
  Dumbbell,
  Trophy,
  Flame,
  Brain,
  Monitor,
  UserCheck,
  UsersRound,
  Wifi,
} from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
const Confetti = lazy(() => import('react-confetti'));
import { useWindowSize } from '@/hooks/use-window-size';

interface WelcomeModalProps {
  open: boolean;
  onComplete: (selectedGoal: string) => void;
  userName?: string;
  userRole?: 'trainer' | 'client' | 'solo';
}

type TrainerStep = 'welcome' | 'goals' | 'training-style' | 'client-count' | 'completion';
type SoloStep = 'welcome' | 'fitness-level' | 'goals' | 'completion';
type Step = TrainerStep | SoloStep;

const trainerGoals = [
  {
    id: 'manage_clients',
    icon: Users,
    title: 'Manage Clients Better',
    description: 'Organize client information and track their fitness journeys',
  },
  {
    id: 'grow_clients',
    icon: TrendingUp,
    title: 'Grow My Client Base',
    description: 'Attract and onboard more clients efficiently',
  },
  {
    id: 'save_time',
    icon: Clock,
    title: 'Save Time on Admin',
    description: 'Automate scheduling, billing, and client communication',
  },
  {
    id: 'track_progress',
    icon: Target,
    title: 'Track Client Progress',
    description: 'Monitor metrics and celebrate client achievements',
  },
];

const soloGoals = [
  {
    id: 'build_muscle',
    icon: Dumbbell,
    title: 'Build Muscle',
    description: 'Follow structured programs to gain strength and size',
  },
  {
    id: 'lose_weight',
    icon: Flame,
    title: 'Lose Weight',
    description: 'Track calories, workouts, and body composition',
  },
  {
    id: 'get_stronger',
    icon: Trophy,
    title: 'Get Stronger',
    description: 'Hit new PRs and track your strength progression',
  },
  {
    id: 'stay_consistent',
    icon: Target,
    title: 'Stay Consistent',
    description: 'Build habits with streaks, XP, and achievements',
  },
];

const trainingStyles = [
  {
    id: 'one_on_one',
    icon: UserCheck,
    title: '1-on-1 Training',
    description: 'Personal training sessions',
  },
  {
    id: 'group',
    icon: UsersRound,
    title: 'Group Training',
    description: 'Small group fitness classes',
  },
  {
    id: 'online',
    icon: Wifi,
    title: 'Online Coaching',
    description: 'Remote program design & check-ins',
  },
  { id: 'hybrid', icon: Monitor, title: 'Hybrid', description: 'Mix of in-person and online' },
];

const clientCounts = [
  { id: '1-10', label: '1–10', description: 'Just getting started' },
  { id: '11-25', label: '11–25', description: 'Growing steadily' },
  { id: '26-50', label: '26–50', description: 'Established business' },
  { id: '50+', label: '50+', description: 'Large operation' },
];

const fitnessLevels = [
  {
    id: 'beginner',
    icon: Sparkles,
    title: 'Beginner',
    description: 'New to working out or getting back into it',
  },
  {
    id: 'intermediate',
    icon: Dumbbell,
    title: 'Intermediate',
    description: 'Consistent for 6+ months, know the basics',
  },
  {
    id: 'advanced',
    icon: Trophy,
    title: 'Advanced',
    description: 'Years of experience, chasing specific goals',
  },
  {
    id: 'athlete',
    icon: Flame,
    title: 'Athlete',
    description: 'Competitive or sport-specific training',
  },
];

export function WelcomeModal({
  open,
  onComplete,
  userName,
  userRole = 'trainer',
}: WelcomeModalProps) {
  const isSolo = userRole === 'solo';
  const isTrainer = userRole === 'trainer';

  const [step, setStep] = useState<Step>('welcome');
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [trainingStyle, setTrainingStyle] = useState<string>('');
  const [clientCount, setClientCount] = useState<string>('');
  const [fitnessLevel, setFitnessLevel] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  const goals = isSolo ? soloGoals : trainerGoals;

  // Step configuration per role
  const trainerSteps: TrainerStep[] = [
    'welcome',
    'goals',
    'training-style',
    'client-count',
    'completion',
  ];
  const soloSteps: SoloStep[] = ['welcome', 'fitness-level', 'goals', 'completion'];
  const steps = isTrainer ? trainerSteps : soloSteps;
  const totalSteps = steps.length;
  const currentStepIndex = steps.indexOf(step as never);
  const progressValue = ((currentStepIndex + 1) / totalSteps) * 100;

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
  };

  const goToCompletion = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
    setStep('completion');
    trackEvent('onboarding_completed', { role: userRole });
  };

  const handleContinueFromGoals = () => {
    if (!selectedGoal) return;
    trackEvent('onboarding_goal_selected', { goal: selectedGoal, role: userRole });
    if (isTrainer) {
      setStep('training-style');
    } else {
      goToCompletion();
    }
  };

  const handleContinueFromTrainingStyle = () => {
    if (!trainingStyle) return;
    trackEvent('onboarding_training_style', { style: trainingStyle });
    setStep('client-count');
  };

  const handleContinueFromClientCount = () => {
    if (!clientCount) return;
    trackEvent('onboarding_client_count', { count: clientCount });
    goToCompletion();
  };

  const handleContinueFromFitnessLevel = () => {
    if (!fitnessLevel) return;
    trackEvent('onboarding_fitness_level', { level: fitnessLevel });
    setStep('goals');
  };

  const handleComplete = () => {
    onComplete(selectedGoal);
  };

  const handleDismiss = () => {
    onComplete('skip');
  };

  // Next steps vary by role
  const nextSteps = isTrainer
    ? [
        { step: 1, title: 'Add your first client', desc: "We'll help you set this up" },
        { step: 2, title: 'Create a workout plan', desc: 'Choose from templates or build custom' },
        { step: 3, title: 'Try the AI coach', desc: 'Get AI-powered workout suggestions' },
      ]
    : [
        { step: 1, title: 'Log your first workout', desc: 'Start earning XP right away' },
        { step: 2, title: 'Try a calculator', desc: 'Check your 1RM, BMI, or TDEE' },
        {
          step: 3,
          title: 'Unlock your first achievement',
          desc: 'Complete a workout to start your streak',
        },
      ];

  // Shared gradient button component
  const GradientButton = ({
    onClick,
    disabled,
    children,
    size = 'default',
  }: {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    size?: 'default' | 'lg';
  }) => (
    <Button
      onClick={onClick}
      disabled={disabled}
      size={size}
      className="relative bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-premium hover:shadow-premium-lg transition-all duration-300 overflow-hidden group disabled:opacity-50"
    >
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
      <span className="relative z-10">{children}</span>
    </Button>
  );

  // Reusable option card
  const OptionCard = ({
    id,
    icon: Icon,
    title,
    description,
    isSelected,
    onClick,
    index,
  }: {
    id: string;
    icon: React.ElementType;
    title: string;
    description: string;
    isSelected: boolean;
    onClick: (id: string) => void;
    index: number;
  }) => (
    <motion.button
      key={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(id)}
      className={`relative glass border-2 rounded-xl p-6 text-left space-y-3 transition-all duration-300 ${
        isSelected
          ? 'border-primary bg-primary/5 shadow-premium'
          : 'border-border/50 hover:border-primary/30'
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
            isSelected ? 'bg-primary/20' : 'bg-primary/10'
          }`}
        >
          <Icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-primary/70'}`} />
        </div>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </motion.div>
        )}
      </div>
      <div>
        <h3 className="font-light text-lg">{title}</h3>
        <p className="text-sm font-light text-muted-foreground/70">{description}</p>
      </div>
    </motion.button>
  );

  // Navigation buttons
  const NavButtons = ({
    onBack,
    onContinue,
    continueDisabled,
    continueLabel = 'Continue',
  }: {
    onBack?: () => void;
    onContinue: () => void;
    continueDisabled: boolean;
    continueLabel?: string;
  }) => (
    <div className="flex justify-between pt-4">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} className="font-light">
          Back
        </Button>
      ) : (
        <div />
      )}
      <GradientButton onClick={onContinue} disabled={continueDisabled}>
        {continueLabel}
      </GradientButton>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDismiss()}>
      <DialogContent className="max-w-2xl glass-strong border-border/50 shadow-premium-lg">
        {/* Accessibility - Screen reader only */}
        <DialogTitle className="sr-only">
          {step === 'welcome' && 'Welcome to GymGurus'}
          {step === 'goals' && 'Select Your Main Goal'}
          {step === 'fitness-level' && "What's Your Fitness Level?"}
          {step === 'training-style' && "What's Your Training Style?"}
          {step === 'client-count' && 'How Many Clients Do You Have?'}
          {step === 'completion' && 'Setup Complete'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {step === 'welcome' && 'Get started with a quick setup to personalize your experience'}
          {step === 'goals' && 'Choose your main goal to help us personalize your experience'}
          {step === 'fitness-level' &&
            'Tell us your fitness level so we can tailor recommendations'}
          {step === 'training-style' && 'Tell us how you train so we can optimize your workflow'}
          {step === 'client-count' && 'How many clients do you currently manage?'}
          {step === 'completion' && "You're all set! Start using GymGurus"}
        </DialogDescription>

        {showConfetti && (
          <Suspense fallback={null}>
            <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />
          </Suspense>
        )}

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-sm font-light text-muted-foreground/70">
            <span>
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            <span>{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          {/* STEP: Welcome */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="relative inline-block"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </motion.div>

                <div className="space-y-2">
                  <h2 className="text-3xl md:text-4xl font-extralight tracking-tight">
                    Welcome to{' '}
                    <span className="font-light bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                      GymGurus
                    </span>
                    {userName && `, ${userName}`}!
                  </h2>
                  <p className="text-base font-light text-muted-foreground/80 max-w-md mx-auto">
                    {isSolo
                      ? "Let's personalize your fitness journey — this takes about a minute"
                      : "Let's get you started with a quick 2-minute setup to personalize your experience"}
                  </p>
                </div>
              </div>

              {/* Features Preview - role-specific */}
              <div className="grid grid-cols-2 gap-4">
                {(isSolo
                  ? [
                      { icon: Dumbbell, title: 'Workout Tracking', desc: 'Log every rep and set' },
                      { icon: Brain, title: 'AI Coach', desc: 'Smart workout suggestions' },
                      { icon: Trophy, title: 'Achievements', desc: 'Earn XP and level up' },
                      { icon: Target, title: 'Calculators', desc: '1RM, BMI, TDEE & more' },
                    ]
                  : [
                      { icon: Users, title: 'Client Management', desc: 'Track all your clients' },
                      { icon: Target, title: 'Workout Plans', desc: 'Create custom programs' },
                      {
                        icon: TrendingUp,
                        title: 'Progress Tracking',
                        desc: 'Monitor achievements',
                      },
                      { icon: Clock, title: 'Smart Scheduling', desc: 'Never miss a session' },
                    ]
                ).map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                    className="glass border-border/50 rounded-lg p-4 space-y-2"
                  >
                    <feature.icon className="w-6 h-6 text-primary" />
                    <div>
                      <h3 className="font-light text-sm">{feature.title}</h3>
                      <p className="text-xs font-light text-muted-foreground/70">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center">
                <GradientButton
                  onClick={() => {
                    trackEvent('onboarding_started', { role: userRole });
                    setStep(isSolo ? 'fitness-level' : 'goals');
                  }}
                  size="lg"
                >
                  Get Started
                </GradientButton>
              </div>
            </motion.div>
          )}

          {/* STEP: Fitness Level (Solo only) */}
          {step === 'fitness-level' && (
            <motion.div
              key="fitness-level"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-extralight tracking-tight">
                  What's your fitness level?
                </h2>
                <p className="text-sm font-light text-muted-foreground/80">
                  We'll tailor workout recommendations and difficulty to match
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fitnessLevels.map((level, index) => (
                  <OptionCard
                    key={level.id}
                    id={level.id}
                    icon={level.icon}
                    title={level.title}
                    description={level.description}
                    isSelected={fitnessLevel === level.id}
                    onClick={setFitnessLevel}
                    index={index}
                  />
                ))}
              </div>

              <NavButtons
                onBack={() => setStep('welcome')}
                onContinue={handleContinueFromFitnessLevel}
                continueDisabled={!fitnessLevel}
              />
            </motion.div>
          )}

          {/* STEP: Goals */}
          {step === 'goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-extralight tracking-tight">
                  {isSolo ? "What's your main fitness goal?" : "What's your main goal right now?"}
                </h2>
                <p className="text-sm font-light text-muted-foreground/80">
                  This helps us personalize your experience and show you relevant features
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((goal, index) => (
                  <OptionCard
                    key={goal.id}
                    id={goal.id}
                    icon={goal.icon}
                    title={goal.title}
                    description={goal.description}
                    isSelected={selectedGoal === goal.id}
                    onClick={handleGoalSelect}
                    index={index}
                  />
                ))}
              </div>

              <NavButtons
                onBack={() => setStep(isSolo ? 'fitness-level' : 'welcome')}
                onContinue={handleContinueFromGoals}
                continueDisabled={!selectedGoal}
              />
            </motion.div>
          )}

          {/* STEP: Training Style (Trainer only) */}
          {step === 'training-style' && (
            <motion.div
              key="training-style"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-extralight tracking-tight">
                  What's your training style?
                </h2>
                <p className="text-sm font-light text-muted-foreground/80">
                  We'll optimize your dashboard and tools for how you work
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trainingStyles.map((style, index) => (
                  <OptionCard
                    key={style.id}
                    id={style.id}
                    icon={style.icon}
                    title={style.title}
                    description={style.description}
                    isSelected={trainingStyle === style.id}
                    onClick={setTrainingStyle}
                    index={index}
                  />
                ))}
              </div>

              <NavButtons
                onBack={() => setStep('goals')}
                onContinue={handleContinueFromTrainingStyle}
                continueDisabled={!trainingStyle}
              />
            </motion.div>
          )}

          {/* STEP: Client Count (Trainer only) */}
          {step === 'client-count' && (
            <motion.div
              key="client-count"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-extralight tracking-tight">
                  How many clients do you have?
                </h2>
                <p className="text-sm font-light text-muted-foreground/80">
                  This helps us recommend the right plan and features
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {clientCounts.map((count, index) => (
                  <motion.button
                    key={count.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setClientCount(count.id)}
                    className={`relative glass border-2 rounded-xl p-6 text-center space-y-2 transition-all duration-300 ${
                      clientCount === count.id
                        ? 'border-primary bg-primary/5 shadow-premium'
                        : 'border-border/50 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex justify-end">
                      {clientCount === count.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        </motion.div>
                      )}
                    </div>
                    <h3 className="font-light text-3xl text-primary">{count.label}</h3>
                    <p className="text-sm font-light text-muted-foreground/70">
                      {count.description}
                    </p>
                  </motion.button>
                ))}
              </div>

              <NavButtons
                onBack={() => setStep('training-style')}
                onContinue={handleContinueFromClientCount}
                continueDisabled={!clientCount}
              />
            </motion.div>
          )}

          {/* STEP: Completion */}
          {step === 'completion' && (
            <motion.div
              key="completion"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2,
                  }}
                  className="relative inline-block"
                >
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-12 h-12 text-primary" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
                    animate={{
                      opacity: [0.3, 0.7, 0.3],
                      scale: [1, 1.3, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </motion.div>

                <div className="space-y-3">
                  <h2 className="text-3xl md:text-4xl font-extralight tracking-tight">
                    You're all set!
                  </h2>
                  <p className="text-base font-light text-muted-foreground/80 max-w-md mx-auto">
                    {isSolo
                      ? "Your fitness journey starts now. Let's crush some goals."
                      : "Let's start building your fitness training empire. We'll guide you through adding your first client."}
                  </p>
                </div>

                {/* Next Steps Preview */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass border-border/50 rounded-lg p-6 text-left space-y-4"
                >
                  <h3 className="font-light text-sm text-muted-foreground/70 uppercase tracking-wide">
                    What's next?
                  </h3>
                  <div className="space-y-3">
                    {nextSteps.map((item, index) => (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-primary">{item.step}</span>
                        </div>
                        <div>
                          <p className="font-light text-sm">{item.title}</p>
                          <p className="text-xs font-light text-muted-foreground/70">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              <div className="flex justify-center">
                <GradientButton onClick={handleComplete} size="lg">
                  Start Using GymGurus
                </GradientButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close Button */}
        <div
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors z-50"
          onClick={handleDismiss}
        >
          <X className="w-4 h-4 text-white/70" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
