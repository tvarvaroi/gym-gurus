import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

// Shared page transition component
export const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);

// Shared stagger container component
export const StaggerContainer = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
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
    >
      {children}
    </motion.div>
  );
};

// Shared stagger item component
export const StaggerItem = ({ children, index = 0 }: { children: React.ReactNode; index?: number }) => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};