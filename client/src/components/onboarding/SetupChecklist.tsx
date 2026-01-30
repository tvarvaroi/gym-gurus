import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface SetupChecklistProps {
  items: ChecklistItem[];
  onDismiss?: () => void;
  className?: string;
}

export function SetupChecklist({ items, onDismiss, className }: SetupChecklistProps) {
  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = (completedCount / totalCount) * 100;
  const allCompleted = completedCount === totalCount;

  if (allCompleted && onDismiss) {
    // Auto-dismiss after all items completed (optional)
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={cn("relative", className)}
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-xl shadow-premium-lg">
        {/* Premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5 pointer-events-none" />

        {/* Animated border gradient */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(201, 168, 85, 0.1), rgba(13, 148, 136, 0.1))',
          }}
        />

        <div className="relative z-10 p-8">
          {/* Header Section */}
          <div className="space-y-6 mb-8">
            <div className="flex items-start justify-between pr-12">
              <div className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-3"
                >
                  {!allCompleted && (
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-cyan-500/20">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <h2 className="font-extralight text-2xl tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text">
                    {allCompleted ? "Setup Complete! 🎉" : "Getting Started"}
                  </h2>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm font-light text-muted-foreground/80 max-w-md"
                >
                  {allCompleted
                    ? "You're all set! You can dismiss this checklist and start managing your clients."
                    : "Complete these steps to unlock the full potential of GymGurus"}
                </motion.p>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="flex flex-col items-center"
              >
                <span className="text-3xl font-extralight bg-gradient-to-br from-primary via-primary/80 to-cyan-500 bg-clip-text text-transparent">
                  {completedCount}
                </span>
                <span className="text-xs font-light text-muted-foreground/60">
                  of {totalCount}
                </span>
              </motion.div>
            </div>

            {/* Premium Progress Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <div className="relative h-3 rounded-full overflow-hidden bg-muted/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary/90 to-cyan-500"
                  style={{
                    boxShadow: '0 0 20px rgba(201, 168, 85, 0.4)',
                  }}
                />
                {/* Shimmer effect */}
                <motion.div
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-light text-muted-foreground/70">
                  {Math.round(progressPercentage)}% complete
                </span>
                <span className="text-xs font-light text-primary/70">
                  {totalCount - completedCount} remaining
                </span>
              </div>
            </motion.div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{
                    delay: index * 0.08,
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  className={cn(
                    "group relative flex items-center gap-4 p-5 rounded-xl border transition-all duration-500",
                    item.completed
                      ? "bg-gradient-to-br from-primary/10 via-primary/5 to-cyan-500/10 border-primary/30"
                      : "bg-background/40 border-border/30 hover:border-primary/40 hover:bg-background/60 hover:shadow-premium cursor-pointer"
                  )}
                  whileHover={!item.completed ? { y: -2, scale: 1.01 } : {}}
                >
                  {/* Completion Indicator */}
                  <div className="flex-shrink-0">
                    {item.completed ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="relative"
                      >
                        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
                        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg">
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary/50 flex items-center justify-center transition-all duration-300">
                        <motion.div
                          className="w-3 h-3 rounded-full bg-muted-foreground/20 group-hover:bg-primary/30"
                          whileHover={{ scale: 1.2 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={cn(
                        "font-light text-base mb-1 transition-all duration-300",
                        item.completed
                          ? "text-muted-foreground/70 line-through"
                          : "text-foreground group-hover:text-primary"
                      )}
                    >
                      {item.title}
                    </h3>
                    {!item.completed && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-xs font-light text-muted-foreground/70 leading-relaxed"
                      >
                        {item.description}
                      </motion.p>
                    )}
                  </div>

                  {/* Action Button */}
                  {!item.completed && item.action && (
                    <motion.button
                      whileHover={{ scale: 1.05, x: 4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={item.action}
                      className="flex-shrink-0 px-4 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-cyan-500/10 hover:from-primary/20 hover:to-cyan-500/20 border border-primary/20 hover:border-primary/40 transition-all duration-300 group/button"
                    >
                      <span className="text-sm font-light text-primary group-hover/button:text-primary flex items-center gap-2">
                        {item.actionLabel || "Start"}
                        <ChevronRight className="w-4 h-4 group-hover/button:translate-x-1 transition-transform" />
                      </span>
                    </motion.button>
                  )}

                  {/* Hover glow effect */}
                  {!item.completed && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 via-cyan-500/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      initial={false}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Completion Celebration */}
          {allCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mt-6 relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-cyan-500/10 p-8 text-center"
            >
              {/* Animated background gradient */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/10 via-cyan-500/10 to-primary/10"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />

              <div className="relative z-10 space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 15 }}
                  className="relative inline-block"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-primary/80 to-cyan-500 flex items-center justify-center mx-auto shadow-premium-lg">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/30 blur-2xl"
                    animate={{
                      opacity: [0.3, 0.7, 0.3],
                      scale: [1, 1.3, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>

                <div className="space-y-3">
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="font-light text-2xl bg-gradient-to-r from-primary via-primary/90 to-cyan-500 bg-clip-text text-transparent"
                  >
                    Exceptional Work!
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="text-sm font-light text-muted-foreground/80 max-w-md mx-auto leading-relaxed"
                  >
                    You've completed the initial setup and you're ready to build your fitness empire.
                    Your clients are about to experience world-class training management.
                  </motion.p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Dismiss Button - Rendered last to be on top */}
        {onDismiss && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDismiss}
            className="absolute top-6 right-6 z-50 rounded-full p-2.5 bg-background/80 hover:bg-background border border-border/50 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-premium group"
            aria-label="Dismiss checklist"
          >
            <X className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
