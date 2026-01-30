import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Users, Clock, TrendingUp, CheckCircle2, Sparkles, X } from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "@/hooks/use-window-size";

interface WelcomeModalProps {
  open: boolean;
  onComplete: (selectedGoal: string) => void;
  userName?: string;
}

type Step = "welcome" | "goals" | "completion";

const goals = [
  {
    id: "manage_clients",
    icon: Users,
    title: "Manage Clients Better",
    description: "Organize client information and track their fitness journeys",
  },
  {
    id: "grow_clients",
    icon: TrendingUp,
    title: "Grow My Client Base",
    description: "Attract and onboard more clients efficiently",
  },
  {
    id: "save_time",
    icon: Clock,
    title: "Save Time on Admin",
    description: "Automate scheduling, billing, and client communication",
  },
  {
    id: "track_progress",
    icon: Target,
    title: "Track Client Progress",
    description: "Monitor metrics and celebrate client achievements",
  },
];

export function WelcomeModal({ open, onComplete, userName }: WelcomeModalProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedGoal, setSelectedGoal] = useState<string>("");
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  const currentStepIndex = step === "welcome" ? 0 : step === "goals" ? 1 : 2;
  const progressValue = ((currentStepIndex + 1) / 3) * 100;

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
  };

  const handleContinueFromGoals = () => {
    if (selectedGoal) {
      setShowConfetti(true);
      setStep("completion");
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const handleComplete = () => {
    onComplete(selectedGoal);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onComplete("skip")}>
      <DialogContent
        className="max-w-2xl glass-strong border-border/50 shadow-premium-lg"
      >
        {/* Accessibility - Screen reader only */}
        <DialogTitle className="sr-only">
          {step === "welcome" && "Welcome to GymGurus"}
          {step === "goals" && "Select Your Main Goal"}
          {step === "completion" && "Setup Complete"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {step === "welcome" && "Get started with a quick 2-minute setup to personalize your experience"}
          {step === "goals" && "Choose your main goal to help us personalize your experience"}
          {step === "completion" && "You're all set! Start building your fitness training empire"}
        </DialogDescription>

        {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-sm font-light text-muted-foreground/70">
            <span>Step {currentStepIndex + 1} of 3</span>
            <span>{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Welcome Content */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="relative inline-block"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
                    animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>

                <div className="space-y-2">
                  <h2 className="text-3xl md:text-4xl font-extralight tracking-tight">
                    Welcome to{" "}
                    <span className="font-light bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                      GymGurus
                    </span>
                    {userName && `, ${userName}`}!
                  </h2>
                  <p className="text-base font-light text-muted-foreground/80 max-w-md mx-auto">
                    Let's get you started with a quick 2-minute setup to personalize your experience
                  </p>
                </div>
              </div>

              {/* Features Preview */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Users, title: "Client Management", desc: "Track all your clients" },
                  { icon: Target, title: "Workout Plans", desc: "Create custom programs" },
                  { icon: TrendingUp, title: "Progress Tracking", desc: "Monitor achievements" },
                  { icon: Clock, title: "Smart Scheduling", desc: "Never miss a session" },
                ].map((feature, index) => (
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

              {/* CTA */}
              <div className="flex justify-center">
                <Button
                  onClick={() => setStep("goals")}
                  size="lg"
                  className="relative bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-premium hover:shadow-premium-lg transition-all duration-300 overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative z-10">Get Started</span>
                </Button>
              </div>
            </motion.div>
          )}

          {step === "goals" && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Goals Content */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-extralight tracking-tight">
                  What's your main goal right now?
                </h2>
                <p className="text-sm font-light text-muted-foreground/80">
                  This helps us personalize your experience and show you relevant features
                </p>
              </div>

              {/* Goal Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((goal, index) => {
                  const Icon = goal.icon;
                  const isSelected = selectedGoal === goal.id;

                  return (
                    <motion.button
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index, duration: 0.3 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGoalSelect(goal.id)}
                      className={`relative glass border-2 rounded-xl p-6 text-left space-y-3 transition-all duration-300 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-premium"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                            isSelected ? "bg-primary/20" : "bg-primary/10"
                          }`}
                        >
                          <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-primary/70"}`} />
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          </motion.div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-light text-lg">{goal.title}</h3>
                        <p className="text-sm font-light text-muted-foreground/70">{goal.description}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep("welcome")} className="font-light">
                  Back
                </Button>
                <Button
                  onClick={handleContinueFromGoals}
                  disabled={!selectedGoal}
                  className="relative bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-premium hover:shadow-premium-lg transition-all duration-300 overflow-hidden group disabled:opacity-50"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative z-10">Continue</span>
                </Button>
              </div>
            </motion.div>
          )}

          {step === "completion" && (
            <motion.div
              key="completion"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Completion Content */}
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                  className="relative inline-block"
                >
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-12 h-12 text-primary" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
                    animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>

                <div className="space-y-3">
                  <h2 className="text-3xl md:text-4xl font-extralight tracking-tight">
                    You're all set!
                  </h2>
                  <p className="text-base font-light text-muted-foreground/80 max-w-md mx-auto">
                    Let's start building your fitness training empire. We'll guide you through adding your first
                    client.
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
                    {[
                      { step: 1, title: "Add your first client", desc: "We'll help you set this up" },
                      { step: 2, title: "Create a workout plan", desc: "Choose from templates or build custom" },
                      { step: 3, title: "Schedule your first session", desc: "Get your calendar organized" },
                    ].map((item, index) => (
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

              {/* CTA */}
              <div className="flex justify-center">
                <Button
                  onClick={handleComplete}
                  size="lg"
                  className="relative bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-premium hover:shadow-premium-lg transition-all duration-300 overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative z-10">Start Using GymGurus</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Close Button - Rendered last to ensure it's on top */}
        <div
          style={{
            position: 'fixed',
            right: '20px',
            top: '20px',
            width: '60px',
            height: '60px',
            backgroundColor: 'red',
            borderRadius: '50%',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '3px solid white',
          }}
          onClick={() => onComplete("skip")}
        >
          <X style={{ width: '30px', height: '30px', color: 'white', strokeWidth: 3 }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
