import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Activity,
  Weight,
  Target,
  Users,
  Dumbbell,
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProgressFormModal from '../components/ProgressFormModal';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/contexts/UserContext';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { QueryErrorState } from '@/components/query-states/QueryErrorState';
// Import all chart components directly
import {
  Bar,
  BarChart,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ProgressEntry {
  id: string;
  clientId: string;
  type: string;
  value: string;
  unit: string;
  notes?: string;
  recordedAt: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

export default function ProgressPage() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Get current user and role from context
  const { user, isLoading: userLoading, isClient, isTrainer, isSolo } = useUser();

  // Fetch client profile for client users (to get actual client ID)
  const { data: clientProfile } = useQuery<Client>({
    queryKey: ['/api/client/profile'],
    queryFn: async () => {
      const response = await fetch('/api/client/profile', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch client profile');
      return response.json();
    },
    enabled: isClient && !!user?.id,
  });

  // Fetch clients for trainer only
  const {
    data: clients = [],
    isLoading: loadingClients,
    error: clientsError,
  } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    enabled: !!user?.id && isTrainer, // Only fetch when user is available and is a trainer
  });

  // Auto-select client based on role
  useEffect(() => {
    if (isClient && clientProfile?.id) {
      // Clients view their own progress - use client profile ID, not user ID
      setSelectedClient(clientProfile.id);
    } else if (isTrainer && clients && clients.length > 0 && !selectedClient) {
      // Trainers auto-select first client
      setSelectedClient(clients[0].id);
    }
  }, [isClient, isTrainer, clientProfile, clients, selectedClient]);

  // Fetch solo user progress data
  const { data: soloProgress, isLoading: loadingSoloProgress } = useQuery<{
    totalWorkouts: number;
    totalVolumeKg: number;
    totalDurationMinutes: number;
    totalSets: number;
    weeklyData: { week: string; volume: number; workouts: number }[];
    history: {
      id: string;
      name: string;
      date: string;
      duration: number;
      volume: number;
      sets: number;
      reps: number;
    }[];
  }>({
    queryKey: ['/api/solo/progress'],
    enabled: isSolo,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch selected client's progress - using development endpoint that doesn't require auth
  const { data: progressData = [], isLoading: loadingProgress } = useQuery<ProgressEntry[]>({
    queryKey: [`/api/progress/${selectedClient}`],
    enabled: !!selectedClient,
  });

  // Group progress data by type for charts - memoized for performance
  const groupedProgress = useMemo(() => {
    const grouped = (progressData || []).reduce((acc: any, entry: ProgressEntry) => {
      const type = entry.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push({
        date: new Date(entry.recordedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        value: parseFloat(entry.value),
        fullDate: entry.recordedAt,
        notes: entry.notes,
      });
      return acc;
    }, {});

    // Sort each group by date
    Object.keys(grouped).forEach((type) => {
      grouped[type].sort(
        (a: any, b: any) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
      );
    });

    return grouped;
  }, [progressData]);

  // Calculate progress trends
  const calculateTrend = (data: any[]) => {
    if (!data || data.length < 2) return null;
    const sorted = data.sort(
      (a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const change = last.value - first.value;
    const percentage = ((change / first.value) * 100).toFixed(1);
    return { change, percentage, isPositive: change > 0 };
  };

  const progressTypes = Object.keys(groupedProgress);
  // For clients, use their own profile; for trainers, find the selected client from the list
  const selectedClientData = isClient
    ? clientProfile
    : (clients || []).find((client: Client) => client.id === selectedClient);

  if (clientsError) {
    return <QueryErrorState error={clientsError} onRetry={() => window.location.reload()} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto space-y-6"
    >
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <h1 className="text-4xl md:text-6xl font-extralight tracking-tight">
            {isClient || isSolo ? 'My ' : 'Progress '}
            <span
              className={`font-light bg-gradient-to-r ${isClient || isSolo ? 'from-cyan-500 via-teal-500 to-cyan-400' : 'from-primary via-primary/80 to-primary/60'} bg-clip-text text-transparent`}
            >
              {isClient || isSolo ? 'Progress' : 'Tracking'}
            </span>
          </h1>
          <p className="text-base md:text-lg font-light text-muted-foreground/80 leading-relaxed">
            {isSolo
              ? 'Track your fitness progress and goals'
              : isClient
                ? 'View your fitness journey tracked by your trainer'
                : 'Monitor client progress and track fitness goals with precision'}
          </p>
        </motion.div>
        {/* Only trainers can add progress entries */}
        {isTrainer && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => setShowAddModal(true)}
              className="relative bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-premium-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto overflow-hidden group border-0"
              data-testid="button-add-progress"
              disabled={!selectedClient}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Plus className="w-4 h-4 mr-2 relative z-10" />
              <span className="text-sm relative z-10 font-light">Add Progress Entry</span>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Enhanced Client Selection - Trainers only */}
      {isTrainer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="relative overflow-hidden border border-border/30 bg-background/40 backdrop-blur-xl shadow-premium hover:shadow-premium-lg transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-transparent" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2 font-extralight text-2xl tracking-tight">
                <Users className="w-6 h-6 text-primary" />
                Client Selection
              </CardTitle>
              {selectedClientData && (
                <CardDescription className="font-light text-base mt-2">
                  Currently viewing progress for{' '}
                  <span className="text-primary font-medium">{selectedClientData.name}</span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="relative">
              <div className="flex gap-3 flex-wrap">
                {loadingClients ? (
                  <motion.div
                    className="text-muted-foreground/80 font-light"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: 1.5,
                      repeat: prefersReducedMotion ? 0 : Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    Loading clients...
                  </motion.div>
                ) : clients.length === 0 ? (
                  <div className="text-muted-foreground/80 font-light">
                    No clients found. Please add clients from the Clients page first.
                  </div>
                ) : (
                  (clients || []).map((client: Client, index: number) => (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant={selectedClient === client.id ? 'default' : 'outline'}
                        onClick={() => setSelectedClient(client.id)}
                        data-testid={`button-select-client-${client.id}`}
                        className={
                          selectedClient === client.id
                            ? 'bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/20 border-0 font-light'
                            : 'hover:bg-primary/5 hover:border-primary/40 border-border/50 transition-all duration-300 font-light'
                        }
                      >
                        {client.name}
                      </Button>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isTrainer && !selectedClient && clients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="glass-strong border-border/50 shadow-premium">
            <CardContent className="py-16 text-center">
              <div className="relative inline-block mb-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{
                    duration: 2,
                    repeat: prefersReducedMotion ? 0 : Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Target className="w-16 h-16 text-primary/60 mx-auto" />
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-xl"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{
                    duration: 2,
                    repeat: prefersReducedMotion ? 0 : Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-light">Select a Client to View Progress</h3>
                <p className="text-base font-light text-muted-foreground/80">
                  Choose a client from above to view their progress data and fitness metrics.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Solo users — show progress data or empty state */}
      {isSolo && loadingSoloProgress && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isSolo && !loadingSoloProgress && soloProgress && soloProgress.totalWorkouts > 0 && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-light">Total Workouts</p>
                <p className="text-2xl font-bold mt-1">{soloProgress.totalWorkouts}</p>
              </CardContent>
            </Card>
            <Card className="border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-light">Total Volume</p>
                <p className="text-2xl font-bold mt-1">
                  {soloProgress.totalVolumeKg.toLocaleString()}
                  <span className="text-sm font-light text-muted-foreground ml-1">kg</span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-light">Total Time</p>
                <p className="text-2xl font-bold mt-1">
                  {soloProgress.totalDurationMinutes}
                  <span className="text-sm font-light text-muted-foreground ml-1">min</span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-light">Total Sets</p>
                <p className="text-2xl font-bold mt-1">{soloProgress.totalSets.toLocaleString()}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Volume Chart */}
          {soloProgress.weeklyData.some((w) => w.volume > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-border/30 bg-background/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-light">Weekly Volume</CardTitle>
                  <CardDescription>Total volume lifted per week (kg)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={soloProgress.weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Workout History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/30 bg-background/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg font-light">Recent Workouts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {soloProgress.history.map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/20"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{workout.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(workout.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{workout.duration}min</span>
                      <span>{workout.sets} sets</span>
                      {workout.volume > 0 && <span>{workout.volume.toLocaleString()}kg</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {isSolo && !loadingSoloProgress && (!soloProgress || soloProgress.totalWorkouts === 0) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="relative overflow-hidden border border-border/30 bg-background/40 backdrop-blur-xl shadow-premium">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent" />
            <CardContent className="relative py-16 text-center">
              <div className="relative inline-block mb-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{
                    duration: 2,
                    repeat: prefersReducedMotion ? 0 : Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Dumbbell className="w-16 h-16 text-purple-500/60 mx-auto" />
                </motion.div>
              </div>
              <div className="space-y-3 max-w-md mx-auto">
                <h3 className="text-xl font-light">
                  Complete your first workout to start tracking progress!
                </h3>
                <p className="text-base font-light text-muted-foreground/80 leading-relaxed">
                  Your workout history, personal records, and body measurements will appear here as
                  you train.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={() => (window.location.href = '/solo/generate')}
                    className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 border-0"
                  >
                    <Dumbbell className="w-4 h-4 mr-2" />
                    Generate a Workout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {selectedClientData && loadingProgress && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[250px] w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedClientData && !loadingProgress && (
        <>
          {/* Enhanced Progress Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {progressTypes.map((type, index) => {
              const data = groupedProgress[type];
              const trend = calculateTrend(data);
              const latest = data[data.length - 1];
              const isClient = Boolean(selectedClient && !clients.length);

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                >
                  <Card
                    className={`group relative overflow-hidden border ${isClient ? 'border-cyan-500/20 hover:border-cyan-500/40' : 'border-border/30 hover:border-primary/40'} bg-background/40 backdrop-blur-xl hover:shadow-premium-lg transition-all duration-500 h-full`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${isClient ? 'from-cyan-500/5' : 'from-primary/5'} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />

                    <CardHeader className="relative pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg capitalize flex items-center gap-2 font-light">
                          {type === 'weight' && (
                            <Weight
                              className={`w-5 h-5 ${isClient ? 'text-cyan-500' : 'text-primary'}`}
                            />
                          )}
                          {type === 'workout_completion' && (
                            <Activity
                              className={`w-5 h-5 ${isClient ? 'text-cyan-500' : 'text-primary'}`}
                            />
                          )}
                          {type !== 'weight' && type !== 'workout_completion' && (
                            <TrendingUp
                              className={`w-5 h-5 ${isClient ? 'text-cyan-500' : 'text-primary'}`}
                            />
                          )}
                          {type.replace('_', ' ')}
                        </CardTitle>
                        {trend && (
                          <Badge
                            variant={trend.isPositive ? 'default' : 'secondary'}
                            className={`text-xs font-light shadow-sm ${trend.isPositive ? (isClient ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' : 'bg-primary/10 text-primary border-primary/20') : ''}`}
                          >
                            {trend.isPositive ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {trend.percentage}%
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="space-y-3">
                        <div
                          className={`text-4xl font-extralight tracking-tight ${isClient ? 'text-cyan-500' : 'text-primary'}`}
                          data-testid={`text-latest-${type}`}
                        >
                          {latest?.value}{' '}
                          <span className="text-lg text-muted-foreground">
                            {data[0]?.unit || ''}
                          </span>
                        </div>
                        <div className="text-sm font-light text-muted-foreground/70">
                          Last updated: {latest?.date}
                        </div>
                        {latest?.notes && (
                          <div className="text-sm font-light text-muted-foreground/70 italic p-3 rounded-lg bg-muted/30 border border-border/30">
                            "{latest.notes}"
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Progress Charts - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {progressTypes.map((type, index) => {
              const chartData = groupedProgress[type];
              const trend = calculateTrend(chartData);
              const chartColor = 'hsl(var(--primary))';
              const chartColorSecondary = 'hsl(var(--primary))';

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                >
                  <Card
                    className={`group relative overflow-hidden border ${isClient ? 'border-cyan-500/20' : 'border-border/30'} bg-background/40 backdrop-blur-xl shadow-premium-lg hover:shadow-premium-xl transition-all duration-500`}
                  >
                    {/* Premium gradient overlay */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${isClient ? 'from-cyan-500/5' : 'from-primary/5'} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div
                        className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent ${isClient ? 'via-cyan-400/30' : 'via-primary/30'} to-transparent`}
                      />
                    </div>

                    <CardHeader className="relative">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle
                            className={`capitalize font-extralight text-2xl tracking-tight bg-gradient-to-r ${isClient ? 'from-cyan-400 to-teal-400' : 'from-foreground to-foreground/70'} bg-clip-text text-transparent`}
                          >
                            {type.replace('_', ' ')} Progress
                          </CardTitle>
                          <CardDescription className="font-light text-base">
                            Track {type.replace('_', ' ').toLowerCase()} changes over time
                          </CardDescription>
                        </div>
                        {trend && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.3 }}
                          >
                            <Badge
                              variant={trend.isPositive ? 'default' : 'secondary'}
                              className={`text-sm font-light shadow-lg ${
                                trend.isPositive
                                  ? isClient
                                    ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-400 border-cyan-500/30'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                  : ''
                              }`}
                            >
                              {trend.isPositive ? (
                                <TrendingUp className="w-4 h-4 mr-1" />
                              ) : (
                                <TrendingDown className="w-4 h-4 mr-1" />
                              )}
                              {trend.percentage}%
                            </Badge>
                          </motion.div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {type === 'workout_completion' ? (
                            <BarChart
                              data={chartData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                            >
                              <defs>
                                <linearGradient
                                  id={`barGradient-${type}`}
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.8} />
                                  <stop
                                    offset="95%"
                                    stopColor={chartColorSecondary}
                                    stopOpacity={0.2}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--muted-foreground))"
                                strokeOpacity={0.1}
                                vertical={false}
                              />
                              <XAxis
                                dataKey="date"
                                stroke="hsl(var(--muted-foreground))"
                                strokeOpacity={0.3}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                tickLine={false}
                                axisLine={{ strokeOpacity: 0.3 }}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                strokeOpacity={0.3}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                tickLine={false}
                                axisLine={{ strokeOpacity: 0.3 }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--background))',
                                  border: `1px solid ${isClient ? 'rgba(6, 182, 212, 0.3)' : 'hsl(var(--border))'}`,
                                  borderRadius: '12px',
                                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                  backdropFilter: 'blur(12px)',
                                  padding: '12px',
                                }}
                                labelStyle={{
                                  color: 'hsl(var(--foreground))',
                                  fontWeight: '300',
                                  marginBottom: '8px',
                                }}
                                itemStyle={{
                                  color: chartColor,
                                  fontWeight: '400',
                                }}
                              />
                              <Bar
                                dataKey="value"
                                fill={`url(#barGradient-${type})`}
                                radius={[8, 8, 0, 0]}
                                animationDuration={1000}
                                animationBegin={0}
                              />
                            </BarChart>
                          ) : (
                            <AreaChart
                              data={chartData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                            >
                              <defs>
                                <linearGradient
                                  id={`areaGradient-${type}`}
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                                  <stop
                                    offset="95%"
                                    stopColor={chartColorSecondary}
                                    stopOpacity={0.05}
                                  />
                                </linearGradient>
                                <filter id={`glow-${type}`}>
                                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                  <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                  </feMerge>
                                </filter>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--muted-foreground))"
                                strokeOpacity={0.1}
                                vertical={false}
                              />
                              <XAxis
                                dataKey="date"
                                stroke="hsl(var(--muted-foreground))"
                                strokeOpacity={0.3}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                tickLine={false}
                                axisLine={{ strokeOpacity: 0.3 }}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                strokeOpacity={0.3}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                tickLine={false}
                                axisLine={{ strokeOpacity: 0.3 }}
                                domain={['dataMin - 5', 'dataMax + 5']}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--background))',
                                  border: `1px solid ${isClient ? 'rgba(6, 182, 212, 0.3)' : 'hsl(var(--border))'}`,
                                  borderRadius: '12px',
                                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                  backdropFilter: 'blur(12px)',
                                  padding: '12px',
                                }}
                                labelStyle={{
                                  color: 'hsl(var(--foreground))',
                                  fontWeight: '300',
                                  marginBottom: '8px',
                                }}
                                itemStyle={{
                                  color: chartColor,
                                  fontWeight: '400',
                                }}
                                formatter={(value: any) => [value, type.replace('_', ' ')]}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke={chartColor}
                                strokeWidth={3}
                                fill={`url(#areaGradient-${type})`}
                                dot={{
                                  fill: chartColor,
                                  strokeWidth: 2,
                                  r: 5,
                                  fillOpacity: 1,
                                }}
                                activeDot={{
                                  r: 8,
                                  strokeWidth: 2,
                                  fill: chartColor,
                                  filter: `url(#glow-${type})`,
                                }}
                                animationDuration={1500}
                                animationBegin={0}
                              />
                            </AreaChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Recent Progress Entries - Premium Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <Card
              className={`group relative overflow-hidden border ${isClient ? 'border-cyan-500/20' : 'border-border/30'} bg-background/40 backdrop-blur-xl shadow-premium-lg hover:shadow-premium-xl transition-all duration-500`}
            >
              {/* Premium gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${isClient ? 'from-cyan-500/5' : 'from-primary/5'} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              {/* Shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div
                  className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent ${isClient ? 'via-cyan-400/30' : 'via-primary/30'} to-transparent`}
                />
              </div>

              <CardHeader className="relative">
                <CardTitle
                  className={`font-extralight text-2xl tracking-tight bg-gradient-to-r ${isClient ? 'from-cyan-400 to-teal-400' : 'from-foreground to-foreground/70'} bg-clip-text text-transparent`}
                >
                  Recent Progress Entries
                </CardTitle>
                <CardDescription className="font-light text-base">
                  Latest progress updates for{' '}
                  <span className={`font-medium ${isClient ? 'text-cyan-400' : 'text-primary'}`}>
                    {selectedClientData?.name}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                {loadingProgress ? (
                  <motion.div
                    className="text-center py-12 text-muted-foreground/80 font-light"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: 1.5,
                      repeat: prefersReducedMotion ? 0 : Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    Loading progress data...
                  </motion.div>
                ) : (progressData || []).length > 0 ? (
                  <div className="relative space-y-4">
                    {/* Timeline line */}
                    <div
                      className={`absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b ${isClient ? 'from-cyan-500/20 via-cyan-500/10' : 'from-primary/20 via-primary/10'} to-transparent`}
                    />

                    {(progressData || [])
                      .slice(0, 10)
                      .map((entry: ProgressEntry, index: number) => {
                        const getIcon = (type: string) => {
                          if (type.includes('weight')) return Weight;
                          if (type.includes('body_fat')) return Activity;
                          return Target;
                        };
                        const Icon = getIcon(entry.type);

                        return (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            className="relative pl-16"
                          >
                            {/* Timeline dot */}
                            <motion.div
                              className={`absolute left-4 top-6 w-5 h-5 rounded-full border-2 ${isClient ? 'border-cyan-500 bg-cyan-500/20' : 'border-primary bg-primary/20'} flex items-center justify-center`}
                              whileHover={{ scale: 1.3 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            >
                              <div
                                className={`w-2 h-2 rounded-full ${isClient ? 'bg-cyan-500' : 'bg-primary'}`}
                              />
                            </motion.div>

                            <motion.div
                              whileHover={{ y: -2, x: 4 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                              className={`group/card relative overflow-hidden rounded-xl border ${isClient ? 'border-cyan-500/20 hover:border-cyan-500/40' : 'border-border/30 hover:border-primary/40'} bg-background/60 backdrop-blur-sm p-5 hover:shadow-lg transition-all duration-300`}
                            >
                              {/* Card gradient overlay */}
                              <div
                                className={`absolute inset-0 bg-gradient-to-br ${isClient ? 'from-cyan-500/5' : 'from-primary/5'} via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300`}
                              />

                              <div className="relative flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                  {/* Icon */}
                                  <motion.div
                                    className={`p-3 rounded-lg ${isClient ? 'bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/20' : 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20'}`}
                                    whileHover={{ rotate: 5, scale: 1.1 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                  >
                                    <Icon
                                      className={`w-5 h-5 ${isClient ? 'text-cyan-400' : 'text-primary'}`}
                                    />
                                  </motion.div>

                                  {/* Content */}
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge
                                        variant="outline"
                                        className={`capitalize font-light ${
                                          isClient
                                            ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                                            : 'border-primary/30 bg-primary/10 text-primary'
                                        }`}
                                      >
                                        {entry.type.replace('_', ' ')}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground/60">
                                        {new Date(entry.recordedAt).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>

                                    <div
                                      className={`text-2xl font-extralight tracking-tight ${isClient ? 'text-cyan-400' : 'text-primary'}`}
                                    >
                                      {entry.value}
                                      <span className="text-base text-muted-foreground/70 ml-1.5">
                                        {entry.unit}
                                      </span>
                                    </div>

                                    {entry.notes && (
                                      <p className="text-sm font-light text-muted-foreground/80 leading-relaxed italic">
                                        "{entry.notes}"
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Trend indicator - compare with previous entry */}
                                {index < (progressData || []).length - 1 &&
                                  (() => {
                                    const prevEntry = (progressData || []).find(
                                      (e, i) => i > index && e.type === entry.type
                                    );
                                    if (prevEntry) {
                                      const change =
                                        parseFloat(entry.value) - parseFloat(prevEntry.value);
                                      const isPositive = change > 0;
                                      return (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{
                                            type: 'spring',
                                            stiffness: 500,
                                            damping: 25,
                                            delay: 0.1,
                                          }}
                                          className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                                            isPositive
                                              ? isClient
                                                ? 'bg-cyan-500/10 text-cyan-400'
                                                : 'bg-green-500/10 text-green-500'
                                              : 'bg-red-500/10 text-red-500'
                                          }`}
                                        >
                                          {isPositive ? (
                                            <TrendingUp className="w-3 h-3" />
                                          ) : (
                                            <TrendingDown className="w-3 h-3" />
                                          )}
                                          <span className="text-xs font-medium">
                                            {Math.abs(change).toFixed(1)}
                                          </span>
                                        </motion.div>
                                      );
                                    }
                                    return null;
                                  })()}
                              </div>
                            </motion.div>
                          </motion.div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-16 space-y-6">
                    <div className="relative inline-block">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{
                          duration: 2,
                          repeat: prefersReducedMotion ? 0 : Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        <Activity
                          className={`w-16 h-16 ${isClient ? 'text-cyan-500/40' : 'text-primary/40'} mx-auto`}
                        />
                      </motion.div>
                      <motion.div
                        className={`absolute inset-0 rounded-full bg-gradient-to-br ${isClient ? 'from-cyan-500/10' : 'from-primary/10'} to-transparent blur-2xl`}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{
                          duration: 2,
                          repeat: prefersReducedMotion ? 0 : Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-light text-foreground/80">
                        No progress data available yet
                      </h3>
                      <p className="text-base font-light text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
                        {isClient
                          ? 'Your trainer will add progress entries as you train together'
                          : 'Start tracking by adding your first progress entry'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* Add Progress Modal */}
      <ProgressFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        clientId={selectedClient}
      />
    </motion.div>
  );
}
