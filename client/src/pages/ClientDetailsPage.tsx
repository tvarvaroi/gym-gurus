import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Mail, Target, Calendar, TrendingUp,
  Dumbbell, Plus, Edit2, UserCircle,
  Activity, Weight, CheckCircle2, Clock, Send, CalendarPlus,
  X, TrendingDown, Percent, BarChart3, Flame, Heart, Apple, Beef, ClipboardCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import ProgressFormModal from "@/components/ProgressFormModal";
import { EditClientButton } from "@/components/ClientFormModal";
import {
  calculateBodyFatPercentage,
  calculateBMR,
  calculateTDEE,
  calculateCalorieRecommendations,
  calculateNutritionPlan,
  getActivityLevelDisplay,
  getBodyFatCategory,
  type ClientBiometrics
} from "@/lib/biometricCalculations";
import type { Client as ClientSchema } from "@shared/schema";
import ClientIntakeForm from "@/components/ClientIntakeForm";
import { QueryErrorState } from "@/components/query-states/QueryErrorState";

// API response type - dates are serialized as strings
interface ClientAPI {
  id: string;
  name: string;
  email: string;
  goal: string;
  status: string;
  trainerId: string;
  lastSession: string | null;
  nextSession: string | null;
  createdAt: string;
  // Biometric data
  age: number | null;
  gender: 'male' | 'female' | null;
  height: string | null;
  weight: string | null;
  activityLevel: string | null;
  neckCircumference: string | null;
  waistCircumference: string | null;
  hipCircumference: string | null;
}

// Helper to convert API response to Client schema type
function apiToClient(apiClient: ClientAPI): ClientSchema {
  return {
    ...apiClient,
    createdAt: new Date(apiClient.createdAt),
    lastSession: apiClient.lastSession ? new Date(apiClient.lastSession) : null,
    nextSession: apiClient.nextSession ? new Date(apiClient.nextSession) : null,
  };
}

interface WorkoutAssignment {
  id: string;
  workoutId: string;
  clientId: string;
  assignedAt: string;
  completedAt?: string;
  notes?: string;
  workout: {
    id: string;
    title: string;
    description?: string;
    duration?: number;
    difficulty?: string;
    category?: string;
  };
}

interface ProgressEntry {
  id: string;
  clientId: string;
  type: string;
  value: string;
  unit: string;
  notes?: string;
  recordedAt: string;
}

interface TrainingSession {
  id: string;
  clientId: string;
  scheduledAt: string;
  duration?: number;
  status: string;
  notes?: string;
}

export default function ClientDetailsPage() {
  const [, params] = useRoute("/clients/:id");
  const [location, setLocation] = useLocation();
  const clientId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showProgressOverview, setShowProgressOverview] = useState(false);
  const [availableWorkouts, setAvailableWorkouts] = useState<any[]>([]);
  const [showWorkoutAssign, setShowWorkoutAssign] = useState(false);

  // Get tab from URL query parameter
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const tabParam = searchParams.get('tab') || 'overview';

  // Fetch client details
  const { data: clientAPI, isLoading: loadingClient, error: clientError } = useQuery<ClientAPI>({
    queryKey: [`/api/clients/detail/${clientId}`],
    enabled: !!clientId
  });

  // Convert API response to Client schema type
  const client = clientAPI ? apiToClient(clientAPI) : undefined;

  // Fetch client's workout assignments
  const { data: rawWorkoutAssignments = [] } = useQuery<WorkoutAssignment[]>({
    queryKey: [`/api/clients/${clientId}/workouts`],
    enabled: !!clientId
  });

  // Filter out assignments with missing workout data
  const workoutAssignments = rawWorkoutAssignments.filter(a => a.workout != null);

  // Fetch client's progress entries
  const { data: progressEntries = [] } = useQuery<ProgressEntry[]>({
    queryKey: [`/api/progress/${clientId}`],
    enabled: !!clientId
  });

  // Fetch client's training sessions
  const { data: trainingSessions = [] } = useQuery<TrainingSession[]>({
    queryKey: [`/api/clients/${clientId}/sessions`],
    enabled: !!clientId
  });

  // Fetch client's compliance rates
  const { data: complianceData } = useQuery<{
    rate7d: { rate: number; completed: number; total: number };
    rate30d: { rate: number; completed: number; total: number };
    rate90d: { rate: number; completed: number; total: number };
    allTime: { rate: number; completed: number; total: number };
  }>({
    queryKey: [`/api/clients/${clientId}/compliance`],
    enabled: !!clientId,
  });

  // Fetch available workouts for assignment
  const { data: workouts = [] } = useQuery({
    queryKey: ['/api/workouts'],
    queryFn: async () => {
      const response = await fetch('/api/workouts', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch workouts');
      return response.json();
    },
    enabled: showWorkoutAssign
  });

  // Workout assignment moved to Schedule page
  // (per requirements: workouts must be assigned with specific date/time from Schedule)

  // Process progress data for charts
  const progressChartData = (type: string) => {
    return progressEntries
      .filter(entry => entry.type === type)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map(entry => ({
        date: format(new Date(entry.recordedAt), 'MMM d'),
        value: parseFloat(entry.value),
        fullDate: entry.recordedAt
      }));
  };

  const weightData = progressChartData('weight');
  const bodyFatData = progressChartData('body_fat');

  // Calculate stats
  const totalWorkouts = workoutAssignments.length;
  const completedWorkouts = workoutAssignments.filter(w => w.completedAt).length;
  const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

  const upcomingSessions = trainingSessions.filter(s =>
    s.status === 'scheduled' && new Date(s.scheduledAt) > new Date()
  ).length;

  const latestWeight = weightData[weightData.length - 1];
  const firstWeight = weightData[0];
  const weightChange = latestWeight && firstWeight ? (latestWeight.value - firstWeight.value).toFixed(1) : null;

  if (loadingClient) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-64 bg-muted rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (clientError) {
    return (
      <div className="container mx-auto p-6">
        <QueryErrorState
          error={clientError}
          title="Failed to load client"
          onRetry={() => queryClient.invalidateQueries({ queryKey: [`/api/clients/detail/${clientId}`] })}
        />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Client not found</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto p-6 space-y-6"
    >
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/clients")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Button>
      </div>

      {/* Client Header Card - Enhanced Glass Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-background via-background/95 to-background/90 shadow-premium backdrop-blur-xl">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-y-32 -translate-x-32" />

          <CardContent className="relative pt-8 pb-8">
            <div className="space-y-6">
              {/* Top Section - Avatar, Name, Status, Edit */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-6">
                  {/* Animated Avatar */}
                  <motion.div
                    className="relative"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full blur-xl"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 3, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
                    />
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/30 shadow-lg">
                      <UserCircle className="w-16 h-16 text-primary" />
                    </div>
                    {/* Status indicator */}
                    <motion.div
                      className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-background ${
                        client.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                      } shadow-lg`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                    >
                      {client.status === 'active' && (
                        <motion.div
                          className="absolute inset-0 rounded-full bg-emerald-500"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
                        />
                      )}
                    </motion.div>
                  </motion.div>

                  {/* Name and Status */}
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  >
                    <h1 className="text-4xl font-light tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {client.name}
                    </h1>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`${
                          client.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-gray-500/10 text-gray-600 border-gray-500/20'
                        } border backdrop-blur-sm`}
                        variant="outline"
                      >
                        {client.status}
                      </Badge>
                      {client.createdAt && (
                        <span className="text-sm text-muted-foreground">
                          Member since {format(new Date(client.createdAt), 'MMM yyyy')}
                        </span>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Edit Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <EditClientButton
                    client={client}
                    trainerId={client.trainerId}
                  />
                </motion.div>
              </div>

              {/* Contact Information Grid */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                {/* Email */}
                {client.email && (
                  <motion.div
                    className="group flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300"
                    whileHover={{ scale: 1.02, y: -2 }}
                  >
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium truncate">{client.email}</p>
                    </div>
                  </motion.div>
                )}

                {/* Goal */}
                {client.goal && (
                  <motion.div
                    className="group flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-orange-500/30 transition-all duration-300 md:col-span-full"
                    whileHover={{ scale: 1.01, y: -2 }}
                  >
                    <div className="p-2 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                      <Target className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Primary Goal</p>
                      <p className="text-sm font-medium">{client.goal}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Stats Row */}
              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <motion.div
                  className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div
                    className="text-3xl font-light bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                  >
                    {totalWorkouts}
                  </motion.div>
                  <div className="text-xs text-muted-foreground mt-1">Total Workouts</div>
                </motion.div>

                <motion.div
                  className="text-center p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div
                    className="text-3xl font-light bg-gradient-to-r from-emerald-600 to-emerald-500/70 bg-clip-text text-transparent"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                  >
                    {completionRate}%
                  </motion.div>
                  <div className="text-xs text-muted-foreground mt-1">Completion Rate</div>
                </motion.div>

                <motion.div
                  className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div
                    className="text-3xl font-light bg-gradient-to-r from-blue-600 to-blue-500/70 bg-clip-text text-transparent"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
                  >
                    {progressEntries.length}
                  </motion.div>
                  <div className="text-xs text-muted-foreground mt-1">Progress Entries</div>
                </motion.div>

                <motion.div
                  className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20"
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div
                    className="text-3xl font-light bg-gradient-to-r from-purple-600 to-purple-500/70 bg-clip-text text-transparent"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.0, type: "spring", stiffness: 200 }}
                  >
                    {upcomingSessions}
                  </motion.div>
                  <div className="text-xs text-muted-foreground mt-1">Upcoming Sessions</div>
                </motion.div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Biometric & Nutrition Calculations Card */}
      {(() => {
        // Calculate biometric data
        const biometrics: ClientBiometrics = {
          age: client.age ?? undefined,
          gender: (client.gender as 'male' | 'female') ?? undefined,
          height: client.height ? parseFloat(client.height as string) : undefined,
          weight: client.weight ? parseFloat(client.weight as string) : undefined,
          activityLevel: (client.activityLevel as 'active' | 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active') ?? undefined,
          neckCircumference: client.neckCircumference ? parseFloat(client.neckCircumference as string) : undefined,
          waistCircumference: client.waistCircumference ? parseFloat(client.waistCircumference as string) : undefined,
          hipCircumference: client.hipCircumference ? parseFloat(client.hipCircumference as string) : undefined,
        };

        const bodyFat = calculateBodyFatPercentage(biometrics);
        const bmr = calculateBMR(biometrics);
        const tdee = calculateTDEE(bmr, biometrics.activityLevel);
        const calorieRecs = calculateCalorieRecommendations(tdee, biometrics.gender, biometrics.weight);
        const nutritionPlan = calculateNutritionPlan(biometrics);

        const hasBasicBiometrics = biometrics.age && biometrics.gender && biometrics.height && biometrics.weight;

        if (hasBasicBiometrics) {
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-background via-background/95 to-background/90 shadow-premium backdrop-blur-xl">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 opacity-50" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-48 translate-x-48" />

                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-light flex items-center gap-3">
                        <Activity className="w-6 h-6 text-primary" />
                        Biometric & Nutrition Analysis
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Scientifically-backed calculations based on {client.name}'s biometric data
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="relative space-y-6">
                  {/* Biometric Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Age & Gender */}
                    <motion.div
                      className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50"
                      whileHover={{ scale: 1.03, y: -2 }}
                    >
                      <p className="text-xs text-muted-foreground mb-1">Age & Gender</p>
                      <p className="text-2xl font-light">{biometrics.age}</p>
                      <p className="text-sm text-muted-foreground capitalize">{biometrics.gender}</p>
                    </motion.div>

                    {/* Height & Weight */}
                    <motion.div
                      className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50"
                      whileHover={{ scale: 1.03, y: -2 }}
                    >
                      <p className="text-xs text-muted-foreground mb-1">Height & Weight</p>
                      <p className="text-lg font-light">{biometrics.height} cm</p>
                      <p className="text-lg font-light">{biometrics.weight} kg</p>
                    </motion.div>

                    {/* Body Fat % */}
                    {bodyFat && biometrics.gender && (
                      <motion.div
                        className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20"
                        whileHover={{ scale: 1.03, y: -2 }}
                      >
                        <p className="text-xs text-muted-foreground mb-1">Body Fat %</p>
                        <p className="text-2xl font-light bg-gradient-to-r from-purple-600 to-purple-500/70 bg-clip-text text-transparent">
                          {bodyFat}%
                        </p>
                        <Badge
                          variant="outline"
                          className={`${getBodyFatCategory(bodyFat, biometrics.gender).color} border-0 text-xs`}
                        >
                          {getBodyFatCategory(bodyFat, biometrics.gender).category}
                        </Badge>
                      </motion.div>
                    )}

                    {/* Activity Level */}
                    <motion.div
                      className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50"
                      whileHover={{ scale: 1.03, y: -2 }}
                    >
                      <p className="text-xs text-muted-foreground mb-1">Activity Level</p>
                      <p className="text-sm font-medium">{getActivityLevelDisplay(biometrics.activityLevel)}</p>
                    </motion.div>
                  </div>

                  {/* Energy Expenditure */}
                  {bmr && tdee && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-600" />
                        Energy Expenditure
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* BMR */}
                        <motion.div
                          className="p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20"
                          whileHover={{ scale: 1.02, y: -2 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Heart className="w-4 h-4 text-orange-600" />
                            <p className="text-sm font-medium text-muted-foreground">BMR (Basal Metabolic Rate)</p>
                          </div>
                          <p className="text-3xl font-light bg-gradient-to-r from-orange-600 to-orange-500/70 bg-clip-text text-transparent">
                            {bmr} <span className="text-base">cal/day</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">Calories burned at rest</p>
                        </motion.div>

                        {/* TDEE */}
                        <motion.div
                          className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
                          whileHover={{ scale: 1.02, y: -2 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Flame className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-medium text-muted-foreground">TDEE (Total Daily Energy)</p>
                          </div>
                          <p className="text-3xl font-light bg-gradient-to-r from-blue-600 to-blue-500/70 bg-clip-text text-transparent">
                            {tdee} <span className="text-base">cal/day</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">Total calories burned daily</p>
                        </motion.div>
                      </div>
                    </div>
                  )}

                  {/* Calorie & Macro Recommendations */}
                  {calorieRecs && nutritionPlan && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Apple className="w-5 h-5 text-emerald-600" />
                        Daily Calorie & Macro Targets
                      </h3>
                      <p className="text-xs text-muted-foreground -mt-1">All values are per day</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Aggressive Weight Loss */}
                        <motion.div
                          className="p-5 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20"
                          whileHover={{ scale: 1.02, y: -2 }}
                        >
                          <div className="space-y-3">
                            <div>
                              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 mb-2">
                                Aggressive Weight Loss
                              </Badge>
                              <p className="text-2xl font-light">{calorieRecs.aggressiveWeightLoss} cal/day</p>
                              <p className="text-xs text-muted-foreground">~2 lbs/week loss</p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Beef className="w-3.5 h-3.5 text-red-600" />
                                  Protein
                                </span>
                                <span className="font-medium">{nutritionPlan.aggressiveWeightLoss.protein.grams}g ({nutritionPlan.aggressiveWeightLoss.protein.percentage}%)</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Apple className="w-3.5 h-3.5 text-emerald-600" />
                                  Carbs
                                </span>
                                <span className="font-medium">{nutritionPlan.aggressiveWeightLoss.carbs.grams}g ({nutritionPlan.aggressiveWeightLoss.carbs.percentage}%)</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                                  Fats
                                </span>
                                <span className="font-medium">{nutritionPlan.aggressiveWeightLoss.fats.grams}g ({nutritionPlan.aggressiveWeightLoss.fats.percentage}%)</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Steady Weight Loss */}
                        <motion.div
                          className="p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20"
                          whileHover={{ scale: 1.02, y: -2 }}
                        >
                          <div className="space-y-3">
                            <div>
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 mb-2">
                                Steady Weight Loss
                              </Badge>
                              <p className="text-2xl font-light">{calorieRecs.steadyWeightLoss} cal/day</p>
                              <p className="text-xs text-muted-foreground">~1 lb/week loss</p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Beef className="w-3.5 h-3.5 text-red-600" />
                                  Protein
                                </span>
                                <span className="font-medium">{nutritionPlan.steadyWeightLoss.protein.grams}g ({nutritionPlan.steadyWeightLoss.protein.percentage}%)</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Apple className="w-3.5 h-3.5 text-emerald-600" />
                                  Carbs
                                </span>
                                <span className="font-medium">{nutritionPlan.steadyWeightLoss.carbs.grams}g ({nutritionPlan.steadyWeightLoss.carbs.percentage}%)</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                                  Fats
                                </span>
                                <span className="font-medium">{nutritionPlan.steadyWeightLoss.fats.grams}g ({nutritionPlan.steadyWeightLoss.fats.percentage}%)</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Maintain Weight */}
                        <motion.div
                          className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
                          whileHover={{ scale: 1.02, y: -2 }}
                        >
                          <div className="space-y-3">
                            <div>
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 mb-2">
                                Maintain Weight
                              </Badge>
                              <p className="text-2xl font-light">{calorieRecs.maintain} cal/day</p>
                              <p className="text-xs text-muted-foreground">Maintenance calories</p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Beef className="w-3.5 h-3.5 text-red-600" />
                                  Protein
                                </span>
                                <span className="font-medium">{nutritionPlan.maintain.protein.grams}g ({nutritionPlan.maintain.protein.percentage}%)</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Apple className="w-3.5 h-3.5 text-emerald-600" />
                                  Carbs
                                </span>
                                <span className="font-medium">{nutritionPlan.maintain.carbs.grams}g ({nutritionPlan.maintain.carbs.percentage}%)</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                                  Fats
                                </span>
                                <span className="font-medium">{nutritionPlan.maintain.fats.grams}g ({nutritionPlan.maintain.fats.percentage}%)</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Muscle Gain */}
                        <motion.div
                          className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
                          whileHover={{ scale: 1.02, y: -2 }}
                        >
                          <div className="space-y-3">
                            <div>
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 mb-2">
                                Muscle Gain
                              </Badge>
                              <p className="text-2xl font-light">{calorieRecs.muscleGain} cal/day</p>
                              <p className="text-xs text-muted-foreground">+300 cal surplus</p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Beef className="w-3.5 h-3.5 text-red-600" />
                                  Protein
                                </span>
                                <span className="font-medium">{nutritionPlan.muscleGain.protein.grams}g ({nutritionPlan.muscleGain.protein.percentage}%)</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Apple className="w-3.5 h-3.5 text-emerald-600" />
                                  Carbs
                                </span>
                                <span className="font-medium">{nutritionPlan.muscleGain.carbs.grams}g ({nutritionPlan.muscleGain.carbs.percentage}%)</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                                  Fats
                                </span>
                                <span className="font-medium">{nutritionPlan.muscleGain.fats.grams}g ({nutritionPlan.muscleGain.fats.percentage}%)</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Formula Attribution */}
                      <motion.div
                        className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/30"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                      >
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <strong>Formulas used:</strong> Body Fat % (US Navy Method, ~3.5% accuracy) • BMR (Mifflin-St Jeor Equation) • TDEE (BMR × Activity Multiplier) • Macros based on evidence-based research for optimal body composition
                        </p>
                      </motion.div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        }
        return null;
      })()}

      {/* Quick Actions Bar */}
      <Card className="glass border-primary/20 shadow-premium">
        <CardHeader>
          <CardTitle className="text-lg font-light">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="w-full h-auto flex-col gap-2 py-4 border-border/50 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLocation('/schedule');
              }}
            >
              <CalendarPlus className="w-5 h-5 text-emerald-600" />
              <span className="text-xs">Schedule Session</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto flex-col gap-2 py-4 border-border/50 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLocation('/schedule');
              }}
            >
              <Dumbbell className="w-5 h-5 text-blue-600" />
              <span className="text-xs">Assign Workout</span>
              <span className="text-[10px] text-muted-foreground">via Schedule →</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto flex-col gap-2 py-4 border-border/50 hover:bg-orange-500/10 hover:border-orange-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Add Progress clicked');
                setShowProgressModal(true);
              }}
            >
              <Activity className="w-5 h-5 text-orange-600" />
              <span className="text-xs">Add Progress</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto flex-col gap-2 py-4 border-border/50 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('View Progress clicked');
                setShowProgressOverview(true);
              }}
            >
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span className="text-xs">View Progress</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workout Assignment: Now handled via Schedule page */}

      {/* Main Content Tabs */}
      <Tabs defaultValue={tabParam} className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="intake">Intake</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Workout Compliance Rates */}
          {complianceData && (
            <Card className="glass-strong border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Workout Compliance
                </CardTitle>
                <CardDescription>Workout completion rates over different time periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: '7 Days', data: complianceData.rate7d },
                    { label: '30 Days', data: complianceData.rate30d },
                    { label: '90 Days', data: complianceData.rate90d },
                    { label: 'All Time', data: complianceData.allTime },
                  ].map(({ label, data }) => (
                    <div key={label} className="text-center p-3 rounded-lg bg-muted/30">
                      <div className={`text-2xl font-bold ${
                        data.rate >= 80 ? 'text-emerald-500' :
                        data.rate >= 50 ? 'text-yellow-500' :
                        data.rate > 0 ? 'text-red-500' :
                        'text-muted-foreground'
                      }`}>
                        {data.total > 0 ? `${data.rate}%` : '--'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{label}</div>
                      {data.total > 0 && (
                        <div className="text-xs text-muted-foreground">{data.completed}/{data.total} done</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weight Chart */}
            {weightData.length > 0 && (
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Weight className="w-5 h-5 text-primary" />
                    Weight Progress
                  </CardTitle>
                  <CardDescription>
                    {weightData.length} measurements tracked
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Body Fat Chart */}
            {bodyFatData.length > 0 && (
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Body Fat %
                  </CardTitle>
                  <CardDescription>
                    {bodyFatData.length} measurements tracked
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={bodyFatData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Activity */}
          <Card className="glass-strong border-border/50">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workoutAssignments.slice(0, 5).map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">{assignment.workout.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.completedAt
                          ? `Completed ${formatDistanceToNow(new Date(assignment.completedAt))} ago`
                          : `Assigned ${formatDistanceToNow(new Date(assignment.assignedAt))} ago`
                        }
                      </p>
                    </div>
                  </div>
                  <Badge variant={assignment.completedAt ? 'default' : 'outline'}>
                    {assignment.completedAt ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
              ))}
              {workoutAssignments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No workouts assigned yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workouts Tab */}
        <TabsContent value="workouts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-light">Assigned Workouts</h3>
            <Button
              onClick={() => setShowWorkoutAssign(!showWorkoutAssign)}
              className="gap-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              Assign Workout
            </Button>
          </div>

          {/* Assigned Workouts List */}
          {workoutAssignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workoutAssignments.map(assignment => (
                <Card key={assignment.id} className="glass border-border/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{assignment.workout.title}</CardTitle>
                        <CardDescription>{assignment.workout.description}</CardDescription>
                      </div>
                      <Badge variant={assignment.completedAt ? 'default' : 'outline'}>
                        {assignment.completedAt ? 'Completed' : 'Pending'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2">
                      {assignment.workout.difficulty && (
                        <Badge variant="secondary">{assignment.workout.difficulty}</Badge>
                      )}
                      {assignment.workout.duration && (
                        <Badge variant="secondary">{assignment.workout.duration} min</Badge>
                      )}
                      {assignment.workout.category && (
                        <Badge variant="secondary">{assignment.workout.category}</Badge>
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        Assigned: {format(new Date(assignment.assignedAt), 'PPP')}
                      </p>
                      {assignment.completedAt && (
                        <p className="text-muted-foreground">
                          Completed: {format(new Date(assignment.completedAt), 'PPP')}
                        </p>
                      )}
                      {assignment.notes && (
                        <p className="text-muted-foreground">Notes: {assignment.notes}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass-strong border-border/50">
              <CardContent className="py-16 text-center">
                <Dumbbell className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-light mb-2">No Workouts Assigned Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Assign a workout to {client.name} to get started
                </p>
                <Button onClick={() => setShowWorkoutAssign(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Assign First Workout
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <h3 className="text-2xl font-light">Progress Tracking</h3>

          {progressEntries.length > 0 ? (
            <div className="space-y-4">
              {progressEntries
                .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
                .map(entry => (
                  <Card key={entry.id} className="glass border-border/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge>{entry.type.replace('_', ' ')}</Badge>
                            <span className="text-2xl font-light">{entry.value} {entry.unit}</span>
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{entry.notes}</p>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.recordedAt), 'PPP')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card className="glass-strong border-border/50">
              <CardContent className="py-16 text-center">
                <Activity className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-light mb-2">No Progress Entries Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start tracking {client.name}'s progress by adding measurements
                </p>
                <Button onClick={() => setShowProgressModal(true)}>
                  Add First Entry
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <h3 className="text-2xl font-light">Training Sessions</h3>

          {trainingSessions.length > 0 ? (
            <div className="space-y-4">
              {trainingSessions
                .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                .map(session => (
                  <Card key={session.id} className="glass border-border/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium">
                              {format(new Date(session.scheduledAt), 'PPP p')}
                            </span>
                            <Badge variant={session.status === 'completed' ? 'default' : session.status === 'scheduled' ? 'outline' : 'secondary'}>
                              {session.status}
                            </Badge>
                          </div>
                          {session.duration && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {session.duration} minutes
                            </p>
                          )}
                          {session.notes && (
                            <p className="text-sm text-muted-foreground">{session.notes}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card className="glass-strong border-border/50">
              <CardContent className="py-16 text-center">
                <Calendar className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-light mb-2">No Sessions Scheduled</h3>
                <p className="text-muted-foreground">
                  Schedule a training session with {client.name}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Intake Tab */}
        <TabsContent value="intake" className="space-y-6">
          {clientId && <ClientIntakeForm clientId={clientId} />}
        </TabsContent>
      </Tabs>

      {/* Progress Form Modal */}
      {clientId && (
        <ProgressFormModal
          open={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          clientId={clientId}
        />
      )}

      {/* Progress Overview Modal */}
      <Dialog open={showProgressOverview} onOpenChange={setShowProgressOverview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto glass border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              Progress Overview - {client?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Summary Stats Cards */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Weight Change Card */}
              {weightData.length > 0 && (
                <motion.div
                  className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 backdrop-blur-xl"
                  whileHover={{ scale: 1.03, y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Weight className="w-4 h-4 text-blue-600" />
                    <p className="text-xs text-muted-foreground">Weight Change</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-light bg-gradient-to-r from-blue-600 to-blue-500/70 bg-clip-text text-transparent">
                      {weightChange}
                    </span>
                    <span className="text-sm text-muted-foreground">{weightData[0]?.value ? 'kg' : ''}</span>
                  </div>
                  {weightChange && (
                    <div className="flex items-center gap-1 mt-2">
                      {parseFloat(weightChange) < 0 ? (
                        <TrendingDown className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                      )}
                      <span className={`text-xs ${parseFloat(weightChange) < 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {Math.abs(parseFloat(weightChange))} kg
                      </span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Body Fat Change Card */}
              {bodyFatData.length > 0 && (() => {
                const latestBodyFat = bodyFatData[bodyFatData.length - 1];
                const firstBodyFat = bodyFatData[0];
                const bodyFatChange = latestBodyFat && firstBodyFat ? (latestBodyFat.value - firstBodyFat.value).toFixed(1) : null;

                return (
                  <motion.div
                    className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 backdrop-blur-xl"
                    whileHover={{ scale: 1.03, y: -4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Percent className="w-4 h-4 text-purple-600" />
                      <p className="text-xs text-muted-foreground">Body Fat Change</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-light bg-gradient-to-r from-purple-600 to-purple-500/70 bg-clip-text text-transparent">
                        {bodyFatChange}
                      </span>
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    {bodyFatChange && (
                      <div className="flex items-center gap-1 mt-2">
                        {parseFloat(bodyFatChange) < 0 ? (
                          <TrendingDown className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-orange-600" />
                        )}
                        <span className={`text-xs ${parseFloat(bodyFatChange) < 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                          {Math.abs(parseFloat(bodyFatChange))}%
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })()}

              {/* Total Measurements Card */}
              <motion.div
                className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 backdrop-blur-xl"
                whileHover={{ scale: 1.03, y: -4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs text-muted-foreground">Total Entries</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-light bg-gradient-to-r from-emerald-600 to-emerald-500/70 bg-clip-text text-transparent">
                    {progressEntries.length}
                  </span>
                  <span className="text-sm text-muted-foreground">entries</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {progressEntries.length > 0 && format(new Date(progressEntries[0].recordedAt), 'MMM d, yyyy')}
                </p>
              </motion.div>

              {/* Completion Rate Card */}
              <motion.div
                className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 backdrop-blur-xl"
                whileHover={{ scale: 1.03, y: -4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-600" />
                  <p className="text-xs text-muted-foreground">Workout Rate</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-light bg-gradient-to-r from-orange-600 to-orange-500/70 bg-clip-text text-transparent">
                    {completionRate}
                  </span>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {completedWorkouts} of {totalWorkouts} completed
                </p>
              </motion.div>
            </motion.div>

            {/* Progress Charts */}
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {/* Weight Chart */}
              {weightData.length > 0 && (
                <Card className="glass-strong border-border/50 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Weight className="w-5 h-5 text-primary" />
                      Weight Progress
                    </CardTitle>
                    <CardDescription className="flex items-center justify-between">
                      <span>{weightData.length} measurements</span>
                      {firstWeight && latestWeight && (
                        <span className="text-sm font-medium">
                          {firstWeight.value} kg → {latestWeight.value} kg
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={weightData}>
                        <defs>
                          <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            backdropFilter: 'blur(16px)'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          fill="url(#weightGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Body Fat Chart */}
              {bodyFatData.length > 0 && (() => {
                const latestBodyFat = bodyFatData[bodyFatData.length - 1];
                const firstBodyFat = bodyFatData[0];

                return (
                  <Card className="glass-strong border-border/50 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Body Fat %
                      </CardTitle>
                      <CardDescription className="flex items-center justify-between">
                        <span>{bodyFatData.length} measurements</span>
                        {firstBodyFat && latestBodyFat && (
                          <span className="text-sm font-medium">
                            {firstBodyFat.value}% → {latestBodyFat.value}%
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={bodyFatData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis
                            dataKey="date"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              backdropFilter: 'blur(16px)'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })()}
            </motion.div>

            {/* Recent Progress Entries */}
            {progressEntries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <Card className="glass-strong border-border/50 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-light">Recent Progress Entries</CardTitle>
                    <CardDescription>Last 5 measurements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {progressEntries
                        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
                        .slice(0, 5)
                        .map((entry, index) => (
                          <motion.div
                            key={entry.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 transition-all"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                            whileHover={{ scale: 1.02, x: 4 }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Activity className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {entry.type.replace('_', ' ')}
                                  </Badge>
                                  <span className="font-medium">{entry.value} {entry.unit}</span>
                                </div>
                                {entry.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.recordedAt), 'MMM d, yyyy')}
                            </p>
                          </motion.div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* No Progress Data State */}
            {progressEntries.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="glass-strong border-border/50 backdrop-blur-xl">
                  <CardContent className="py-16 text-center">
                    <Activity className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-xl font-light mb-2">No Progress Data Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Start tracking {client?.name}'s progress to see charts and insights here
                    </p>
                    <Button
                      onClick={() => {
                        setShowProgressOverview(false);
                        setShowProgressModal(true);
                      }}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Entry
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
