import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Calendar, TrendingUp, Edit } from "lucide-react"
import { motion, useSpring, useTransform } from "framer-motion"
import { useState, useEffect, memo } from "react"
import { EditClientButton } from "./ClientFormModal"
import type { Client } from "@shared/schema"

interface ClientCardProps {
  client: Client
  trainerId: string
  name: string
  email: string
  avatarUrl?: string
  goal: string
  progress: number
  lastSession: string
  status: "active" | "inactive" | "paused"
  nextSession?: string
}

const ClientCard = memo(function ClientCard({ 
  client,
  trainerId,
  name, 
  email, 
  avatarUrl, 
  goal, 
  progress, 
  lastSession, 
  status,
  nextSession 
}: ClientCardProps) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()
  const [isHovered, setIsHovered] = useState(false)
  const [animatedProgress, setAnimatedProgress] = useState(0)
  
  const statusColors = {
    active: "bg-green-500",
    inactive: "bg-gray-500", 
    paused: "bg-yellow-500"
  }

  // Smooth progress animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress)
    }, 300)
    return () => clearTimeout(timer)
  }, [progress])

  // Premium card animation variants
  const cardVariants = {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      rotateX: 10
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 300,
        duration: 0.6
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      rotateX: 2,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 400,
        duration: 0.3
      }
    }
  }

  // Button animation variants
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    tap: { 
      scale: 0.95,
      transition: { duration: 0.1, ease: "easeOut" }
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{ perspective: 1000 }}
    >
      <Card 
        className="bg-card/50 backdrop-blur-sm border-border/50 transition-shadow duration-300 will-change-transform" 
        data-testid={`card-client-${name.toLowerCase().replace(' ', '-')}`}
        style={{
          boxShadow: isHovered 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
            : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.02)'
        }}
      >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 sm:pb-6">
        <motion.div 
          className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        >
          <div className="relative flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
            >
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-border/20">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                <AvatarFallback className="bg-primary/10 text-foreground font-light text-base sm:text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            <motion.div 
              className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-background ${statusColors[status]}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", damping: 10, stiffness: 500 }}
            />
          </div>
          <motion.div 
            className="space-y-1 min-w-0 flex-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <CardTitle className="text-lg sm:text-xl font-light truncate" data-testid={`text-client-name-${name.toLowerCase().replace(' ', '-')}`}>
              {name}
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground font-light truncate">{email}</p>
          </motion.div>
        </motion.div>
        <motion.div
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
        >
          <EditClientButton 
            client={client} 
            trainerId={trainerId}
          />
        </motion.div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-light text-muted-foreground tracking-wide">GOAL</p>
          <p className="text-base font-light" data-testid="text-client-goal">{goal}</p>
        </div>
        
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="flex justify-between items-center">
            <p className="text-sm font-light text-muted-foreground tracking-wide">PROGRESS</p>
            <motion.span 
              className="text-lg font-light" 
              data-testid="text-progress-percentage"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: "spring", damping: 10, stiffness: 200 }}
            >
              {progress}%
            </motion.span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full" 
              initial={{ width: "0%" }}
              animate={{ width: `${animatedProgress}%` }}
              transition={{ 
                delay: 0.6, 
                duration: 1.2, 
                ease: [0.25, 0.46, 0.45, 0.94] 
              }}
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground font-light">Last Session</p>
            <p className="font-light" data-testid="text-last-session">{lastSession}</p>
          </div>
          {nextSession && (
            <div className="space-y-1">
              <p className="text-muted-foreground font-light">Next Session</p>
              <p className="font-light" data-testid="text-next-session">{nextSession}</p>
            </div>
          )}
        </div>

        <motion.div 
          className="flex flex-col sm:flex-row gap-2 pt-3 sm:pt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          {[
            { icon: MessageSquare, label: "Message", testId: "button-message-client" },
            { icon: Calendar, label: "Schedule", testId: "button-schedule-session" },
            { icon: TrendingUp, label: "Progress", testId: "button-view-progress" }
          ].map(({ icon: Icon, label, testId }, index) => (
            <motion.div
              key={label}
              variants={buttonVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              className="flex-1"
              style={{ 
                transformOrigin: "center",
                willChange: "transform"
              }}
              transition={{
                delay: index * 0.05
              }}
            >
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full font-light border-border/50 bg-background/50 min-h-[36px] sm:min-h-[32px]" 
                data-testid={testId}
              >
                <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 opacity-80" />
                <span className="text-xs sm:text-sm">{label}</span>
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
    </motion.div>
  )
})

export default ClientCard