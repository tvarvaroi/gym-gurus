import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ButtonProps } from "@/components/ui/button"
import { forwardRef } from "react"

// Premium button animation variants based on Tesla & Apple research
const buttonVariants = {
  initial: { 
    scale: 1,
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
  },
  hover: { 
    scale: 1.02,
    y: -1,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    transition: { 
      type: "spring", 
      damping: 20, 
      stiffness: 400,
      duration: 0.15
    } 
  },
  tap: { 
    scale: 0.98,
    y: 0,
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    transition: { 
      type: "spring", 
      damping: 30, 
      stiffness: 600,
      duration: 0.1
    } 
  }
}

// Icon animation variants for enhanced micro-interactions
const iconVariants = {
  initial: { rotate: 0, scale: 1 },
  hover: { 
    rotate: 2, 
    scale: 1.05,
    transition: { 
      type: "spring", 
      damping: 15, 
      stiffness: 300 
    } 
  },
  tap: { 
    rotate: -1, 
    scale: 0.95,
    transition: { 
      type: "spring", 
      damping: 20, 
      stiffness: 400 
    } 
  }
}

interface AnimatedButtonProps extends ButtonProps {
  icon?: React.ReactNode
  children: React.ReactNode
  hapticFeedback?: boolean
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ icon, children, hapticFeedback = true, className, ...props }, ref) => {
    
    const handleTap = () => {
      // Simulate haptic feedback for premium feel
      if (hapticFeedback && navigator.vibrate) {
        navigator.vibrate(1)
      }
    }

    return (
      <motion.div
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        onTap={handleTap}
        style={{ 
          transformOrigin: "center",
          willChange: "transform, box-shadow"
        }}
      >
        <Button
          ref={ref}
          className={`relative overflow-hidden ${className}`}
          {...props}
        >
          <motion.div 
            className="flex items-center justify-center gap-2"
            variants={{
              initial: { x: 0 },
              hover: { x: icon ? 1 : 0 },
              tap: { x: icon ? -0.5 : 0 }
            }}
          >
            {icon && (
              <motion.div
                variants={iconVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                {icon}
              </motion.div>
            )}
            <motion.span
              variants={{
                initial: { scale: 1 },
                hover: { scale: 1.02 },
                tap: { scale: 0.98 }
              }}
            >
              {children}
            </motion.span>
          </motion.div>

          {/* Premium ripple effect on tap */}
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-md"
            initial={{ scale: 0, opacity: 0 }}
            whileTap={{ 
              scale: 1, 
              opacity: [0, 0.3, 0],
              transition: { duration: 0.4, ease: "easeOut" }
            }}
            style={{ transformOrigin: "center" }}
          />
        </Button>
      </motion.div>
    )
  }
)

AnimatedButton.displayName = "AnimatedButton"

export default AnimatedButton