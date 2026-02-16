import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, TrendingUp, Mail, Edit2, Activity, Flame, Weight, Percent } from "lucide-react"
import { motion } from "framer-motion"
import { useState, useEffect, memo } from "react"
import { useLocation } from "wouter"
import { EditClientButton } from "./ClientFormModal"
import type { Client } from "@shared/schema"
import { TruncatedText } from "./TruncatedText"
import {
  calculateBodyFatPercentage,
  calculateBMR,
  calculateTDEE,
  type ClientBiometrics
} from "@/lib/biometricCalculations"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

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
  const prefersReducedMotion = useReducedMotion()
  const [, setLocation] = useLocation()
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()
  const [isHovered, setIsHovered] = useState(false)
  const [animatedProgress, setAnimatedProgress] = useState(0)

  // Calculate biometric data
  const biometrics: ClientBiometrics = {
    age: client.age ?? undefined,
    gender: (client.gender as 'male' | 'female' | undefined) ?? undefined,
    height: client.height ? parseFloat(client.height as string) : undefined,
    weight: client.weight ? parseFloat(client.weight as string) : undefined,
    activityLevel: (client.activityLevel as 'sedentary' | 'lightly_active' | 'moderately_active' | 'active' | 'very_active' | undefined) ?? undefined,
    neckCircumference: client.neckCircumference ? parseFloat(client.neckCircumference as string) : undefined,
    waistCircumference: client.waistCircumference ? parseFloat(client.waistCircumference as string) : undefined,
    hipCircumference: client.hipCircumference ? parseFloat(client.hipCircumference as string) : undefined,
  }

  const bodyFat = calculateBodyFatPercentage(biometrics)
  const bmr = calculateBMR(biometrics)
  const tdee = calculateTDEE(bmr, biometrics.activityLevel)
  const hasBiometrics = biometrics.age && biometrics.gender && biometrics.height && biometrics.weight

  const statusConfig = {
    active: {
      color: "bg-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      label: "Active"
    },
    inactive: {
      color: "bg-gray-400",
      badge: "bg-gray-500/10 text-gray-600 border-gray-500/20",
      label: "Inactive"
    },
    paused: {
      color: "bg-amber-500",
      badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      label: "Paused"
    }
  }

  // Smooth progress animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress)
    }, 300)
    return () => clearTimeout(timer)
  }, [progress])

  // Get progress color
  const getProgressColor = (prog: number) => {
    if (prog >= 75) return "from-emerald-500 to-emerald-400"
    if (prog >= 50) return "from-blue-500 to-blue-400"
    if (prog >= 25) return "from-amber-500 to-amber-400"
    return "from-rose-500 to-rose-400"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -6 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className="relative overflow-hidden glass-strong border-border/40 hover:shadow-premium-lg hover:border-primary/30 transition-all duration-500 group cursor-pointer"
        data-testid={`card-client-${name.toLowerCase().replace(' ', '-')}`}
        onClick={() => setLocation(`/clients/${client.id}`)}
      >
        {/* Enhanced animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        {/* Premium top glow effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar with status indicator - Enhanced */}
              <div className="relative flex-shrink-0">
                <motion.div
                  whileHover={{ scale: 1.08, rotate: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-premium ring-2 ring-primary/10">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                    <AvatarFallback className="bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 text-foreground font-semibold text-base">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <motion.div
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${statusConfig[status].color} shadow-lg`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 15 }}
                >
                  {status === 'active' && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-emerald-500"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
                    />
                  )}
                </motion.div>
              </div>

              {/* Name and email - Enhanced */}
              <div className="flex-1 min-w-0">
                <TruncatedText
                  as="h3"
                  text={name}
                  className="text-lg font-semibold mb-0.5 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent group-hover:from-primary group-hover:via-foreground group-hover:to-foreground transition-all duration-500"
                />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <TruncatedText text={email} />
                </div>
              </div>
            </div>

            {/* Status badge and edit button */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <Badge
                variant="outline"
                className={`text-xs ${statusConfig[status].badge} border`}
              >
                {statusConfig[status].label}
              </Badge>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                <EditClientButton
                  client={client}
                  trainerId={trainerId}
                />
              </motion.div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          {/* Goal */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Goal</p>
            <p className="text-sm leading-relaxed line-clamp-2" data-testid="text-client-goal">{goal}</p>
          </div>

          {/* Progress - Enhanced */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Progress</p>
              <motion.div
                className="flex items-center gap-1.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.div
                  animate={{ rotate: isHovered ? 360 : 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                >
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </motion.div>
                <span className="text-base font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent" data-testid="text-progress-percentage">
                  {progress}%
                </span>
              </motion.div>
            </div>

            {/* Progress bar - Enhanced with glow */}
            <div className="relative w-full bg-muted/30 rounded-full h-2 overflow-hidden">
              <motion.div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProgressColor(progress)} rounded-full shadow-lg`}
                initial={{ width: "0%" }}
                animate={{ width: `${animatedProgress}%` }}
                transition={{
                  delay: 0.4,
                  duration: 1.2,
                  ease: [0.34, 1.56, 0.64, 1]
                }}
              >
                {/* Glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${getProgressColor(progress)} blur-sm opacity-50`} />
              </motion.div>
            </div>
          </div>

          {/* Biometric Stats - Premium Glass Style */}
          {hasBiometrics && (
            <motion.div
              className="space-y-2 pt-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Biometric Data</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* BMR */}
                {bmr && (
                  <motion.div
                    className="relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 backdrop-blur-sm group/metric min-h-[88px]"
                    whileHover={{ scale: 1.03, y: -2 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover/metric:opacity-100 transition-opacity duration-200" />
                    <div className="relative p-2.5 flex flex-col h-full justify-between">
                      {/* Icon - centered and prominent */}
                      <div className="flex justify-center mb-1">
                        <div className="p-1.5 rounded-md bg-orange-500/10">
                          <Flame className="h-4 w-4 text-orange-600" />
                        </div>
                      </div>
                      {/* Value - large and bold */}
                      <div className="text-center">
                        <p className="text-xl font-semibold bg-gradient-to-r from-orange-600 to-orange-500/70 bg-clip-text text-transparent leading-tight">
                          {bmr}
                        </p>
                      </div>
                      {/* Label and unit - compact */}
                      <div className="text-center">
                        <p className="text-[10px] font-medium text-orange-600/90 uppercase tracking-wider">BMR</p>
                        <p className="text-[9px] text-muted-foreground/60 leading-tight">cal/day</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TDEE */}
                {tdee && (
                  <motion.div
                    className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 backdrop-blur-sm group/metric min-h-[88px]"
                    whileHover={{ scale: 1.03, y: -2 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover/metric:opacity-100 transition-opacity duration-200" />
                    <div className="relative p-2.5 flex flex-col h-full justify-between">
                      {/* Icon - centered and prominent */}
                      <div className="flex justify-center mb-1">
                        <div className="p-1.5 rounded-md bg-blue-500/10">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      {/* Value - large and bold */}
                      <div className="text-center">
                        <p className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-500/70 bg-clip-text text-transparent leading-tight">
                          {tdee}
                        </p>
                      </div>
                      {/* Label and unit - compact */}
                      <div className="text-center">
                        <p className="text-[10px] font-medium text-blue-600/90 uppercase tracking-wider">TDEE</p>
                        <p className="text-[9px] text-muted-foreground/60 leading-tight">cal/day</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Body Fat % */}
                {bodyFat && biometrics.gender && (
                  <motion.div
                    className="relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 backdrop-blur-sm group/metric min-h-[88px]"
                    whileHover={{ scale: 1.03, y: -2 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover/metric:opacity-100 transition-opacity duration-200" />
                    <div className="relative p-2.5 flex flex-col h-full justify-between">
                      {/* Icon - centered and prominent */}
                      <div className="flex justify-center mb-1">
                        <div className="p-1.5 rounded-md bg-purple-500/10">
                          <Percent className="h-4 w-4 text-purple-600" />
                        </div>
                      </div>
                      {/* Value - large and bold */}
                      <div className="text-center px-6 flex justify-center">
                        <p className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-purple-500/70 bg-clip-text text-transparent pb-1 whitespace-nowrap"
                           style={{ lineHeight: '2', minWidth: '80px', paddingLeft: '8px', paddingRight: '8px' }}>
                          {bodyFat}%
                        </p>
                      </div>
                      {/* Label and unit - compact */}
                      <div className="text-center">
                        <p className="text-[10px] font-medium text-purple-600/90 uppercase tracking-wider">BF %</p>
                        <p className="text-[9px] text-muted-foreground/60 leading-tight">{biometrics.weight} kg</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Session info */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Session</p>
              <p className="text-xs font-medium" data-testid="text-last-session">{lastSession}</p>
            </div>
            {nextSession && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Next Session</p>
                <p className="text-xs font-medium" data-testid="text-next-session">{nextSession}</p>
              </div>
            )}
          </div>

          {/* Action buttons - Enhanced */}
          <div className="flex gap-2 pt-2">
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                variant="outline"
                size="sm"
                className="relative w-full text-xs border-border/50 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-600 transition-all duration-300 overflow-hidden group/btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation('/schedule');
                }}
                data-testid="button-schedule-session"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                <Calendar className="h-3.5 w-3.5 mr-1.5 relative z-10" />
                <span className="relative z-10">Schedule</span>
              </Button>
            </motion.div>

            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                variant="outline"
                size="sm"
                className="relative w-full text-xs border-border/50 hover:bg-blue-500/10 hover:border-blue-500/40 hover:text-blue-600 transition-all duration-300 overflow-hidden group/btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation(`/clients/${client.id}?tab=progress`);
                }}
                data-testid="button-view-progress"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                <TrendingUp className="h-3.5 w-3.5 mr-1.5 relative z-10" />
                <span className="relative z-10">Progress</span>
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
})

export default ClientCard
