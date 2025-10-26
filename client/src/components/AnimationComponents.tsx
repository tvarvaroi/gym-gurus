import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { memo } from "react";

// Shared page transition component
export const PageTransition = memo(({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    style={{ willChange: 'opacity' }}
  >
    {children}
  </motion.div>
));
PageTransition.displayName = 'PageTransition';

// Shared stagger container component
export const StaggerContainer = memo(({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        delay,
        staggerChildren: 0.05,
        delayChildren: 0.1 + delay
      }}
      style={{ willChange: 'opacity' }}
    >
      {children}
    </motion.div>
  );
});
StaggerContainer.displayName = 'StaggerContainer';

// Shared stagger item component
export const StaggerItem = memo(({ children, index = 0 }: { children: React.ReactNode; index?: number }) => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      style={{ willChange: 'opacity' }}
    >
      {children}
    </motion.div>
  );
});
StaggerItem.displayName = 'StaggerItem';