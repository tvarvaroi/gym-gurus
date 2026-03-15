import { useState, useMemo, useEffect } from 'react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { RoninIcon } from '@/components/icons/RoninIcon';
import { PageHeader } from '@/components/ui/premium/PageHeader';
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
  Trophy,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProgressFormModal from '../components/ProgressFormModal';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/contexts/UserContext';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { QueryErrorState } from '@/components/query-states/QueryErrorState';
import {
  ZoneBandChart,
  PeriodToggle,
  type Period,
} from '@/components/redesign/charts/ZoneBandChart';
// Import recharts for trainer/client progress charts
import {
  Bar,
  BarChart,
  AreaChart,
  Area,
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
  const [volumePeriod, setVolumePeriod] = useState<Period>('4W');
  const [trendPeriod, setTrendPeriod] = useState<Period>('6M');
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

  // Fetch personal records for solo users
  const { data: personalRecords = [] } = useQuery<
    {
      pr: { weightKg: string; reps: number; estimated1rm: string; achievedAt: string };
      exercise: { name: string };
    }[]
  >({
    queryKey: ['/api/strength/personal-records'],
    enabled: isSolo,
    staleTime: 5 * 60 * 1000,
  });

  // Period-filtered data for zone-band charts
  const filterByPeriod = useMemo(() => {
    const periodDays: Record<Period, number> = { '7D': 7, '4W': 28, '6M': 182, '1Y': 365 };
    return (history: { date: string; volume: number; [k: string]: any }[], period: Period) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - periodDays[period]);
      return history
        .filter((w) => new Date(w.date) >= cutoff)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };
  }, []);

  const volumeChartData = useMemo(() => {
    if (!soloProgress?.weeklyData) return [];
    // weeklyData has { week, volume, workouts } — use as-is for volume chart
    const periodDays: Record<Period, number> = { '7D': 7, '4W': 28, '6M': 182, '1Y': 365 };
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays[volumePeriod]);
    // weeklyData 'week' labels like "Mar 3", so we use all for now (API gives limited weeks)
    return soloProgress.weeklyData
      .filter((w) => w.volume > 0)
      .map((w) => ({ label: w.week, value: w.volume }));
  }, [soloProgress?.weeklyData, volumePeriod]);

  const trendChartData = useMemo(() => {
    if (!soloProgress?.history) return [];
    const filtered = filterByPeriod(soloProgress.history, trendPeriod);
    return filtered.map((w) => ({
      label: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: w.volume,
    }));
  }, [soloProgress?.history, trendPeriod, filterByPeriod]);

  // Compute volume zones based on data range
  const volumeZones = useMemo(() => {
    if (volumeChartData.length < 2) return undefined;
    const vals = volumeChartData.map((d) => d.value);
    const max = Math.max(...vals);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return [
      { label: 'Detraining', min: 0, max: avg * 0.5, color: 'rgba(239, 68, 68, 0.04)' },
      { label: 'Moderate', min: avg * 0.5, max: avg * 0.85, color: 'rgba(245, 158, 11, 0.04)' },
      { label: 'Optimal', min: avg * 0.85, max: max * 1.2, color: 'rgba(34, 197, 94, 0.04)' },
    ];
  }, [volumeChartData]);

  const trendZones = useMemo(() => {
    if (trendChartData.length < 2) return undefined;
    const vals = trendChartData.map((d) => d.value);
    const max = Math.max(...vals);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return [
      { label: 'Detraining', min: 0, max: avg * 0.5, color: 'rgba(239, 68, 68, 0.04)' },
      { label: 'Moderate', min: avg * 0.5, max: avg * 0.85, color: 'rgba(245, 158, 11, 0.04)' },
      { label: 'Optimal', min: avg * 0.85, max: max * 1.2, color: 'rgba(34, 197, 94, 0.04)' },
    ];
  }, [trendChartData]);

  // Training load ratio (current week vs 4-week avg)
  const trainingLoadRatio = useMemo(() => {
    if (!soloProgress?.weeklyData || soloProgress.weeklyData.length < 2) return null;
    const data = soloProgress.weeklyData;
    const currentWeek = data[data.length - 1]?.volume || 0;
    const prev4 = data.slice(Math.max(0, data.length - 5), data.length - 1);
    if (prev4.length === 0) return null;
    const avg4 = prev4.reduce((s, w) => s + w.volume, 0) / prev4.length;
    if (avg4 === 0) return null;
    const ratio = currentWeek / avg4;
    return {
      ratio: Math.round(ratio * 100) / 100,
      currentWeek,
      avg4Week: Math.round(avg4),
      status: ratio > 1.3 ? 'high' : ratio < 0.8 ? 'low' : 'optimal',
      statusLabel: ratio > 1.3 ? 'High Load' : ratio < 0.8 ? 'Detraining Risk' : 'Sweet Spot',
      statusColor: ratio > 1.3 ? 'text-amber-400' : ratio < 0.8 ? 'text-red-400' : 'text-green-400',
      barColor: ratio > 1.3 ? 'bg-amber-400' : ratio < 0.8 ? 'bg-red-400' : 'bg-green-400',
    };
  }, [soloProgress?.weeklyData]);

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
      className="container mx-auto space-y-4 md:space-y-6"
    >
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-6">
        <PageHeader
          icon={<TrendingUp className="h-full w-full" />}
          title={isClient || isSolo ? 'My' : 'Progress'}
          titleAccent={isClient || isSolo ? 'Progress' : 'Tracking'}
          subtitle={
            isSolo
              ? 'Track your fitness progress and goals'
              : isClient
                ? 'View your fitness journey tracked by your trainer'
                : 'Monitor client progress and track fitness goals with precision'
          }
        />
        {/* Only trainers can add progress entries */}
        {isTrainer && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
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
                      whileHover={{ y: -2 }}
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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

      {isSolo && !loadingSoloProgress && (!soloProgress || soloProgress.totalWorkouts === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 space-y-6 text-center"
        >
          <RoninIcon size={128} variant="default" />
          <div className="space-y-3">
            <h2
              className="text-3xl font-medium text-foreground"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Your story starts here.
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Complete your first workout and your progress will begin to take shape.
            </p>
          </div>
          <Button onClick={() => (window.location.href = '/solo/generate')}>
            Generate a Workout
          </Button>
        </motion.div>
      )}

      {isSolo && !loadingSoloProgress && soloProgress && soloProgress.totalWorkouts > 0 && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
          >
            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-light">Total Workouts</p>
                <p className="text-2xl font-bold mt-1">
                  <NumberTicker value={soloProgress.totalWorkouts} className="text-2xl font-bold" />
                </p>
              </CardContent>
            </Card>
            <Card className="border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-light">Total Volume</p>
                <p className="text-2xl font-bold mt-1">
                  <NumberTicker value={soloProgress.totalVolumeKg} className="text-2xl font-bold" />
                  <span className="text-sm font-light text-muted-foreground ml-1">kg</span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-light">Avg Duration</p>
                {(() => {
                  const avg =
                    soloProgress.totalWorkouts > 1
                      ? Math.round(soloProgress.totalDurationMinutes / soloProgress.totalWorkouts)
                      : soloProgress.totalDurationMinutes;
                  const isValid = avg >= 5;
                  return (
                    <p className="text-2xl font-bold mt-1">
                      {isValid ? avg : '\u2014'}
                      {isValid && (
                        <span className="text-sm font-light text-muted-foreground ml-1">min</span>
                      )}
                    </p>
                  );
                })()}
              </CardContent>
            </Card>
            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-light">Total Sets</p>
                <p className="text-2xl font-bold mt-1">
                  <NumberTicker value={soloProgress.totalSets} className="text-2xl font-bold" />
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Volume — Zone Band Chart */}
          {soloProgress.weeklyData.some((w) => w.volume > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-border/30 bg-background/40 backdrop-blur-xl overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-light flex items-center gap-2">
                        <Weight className="w-5 h-5 text-primary" />
                        Weekly Volume
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Total volume lifted per week
                      </CardDescription>
                    </div>
                    <PeriodToggle value={volumePeriod} onChange={setVolumePeriod} />
                  </div>
                  {/* Hero number */}
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-foreground">
                      <NumberTicker
                        value={volumeChartData[volumeChartData.length - 1]?.value || 0}
                        className="text-3xl font-bold"
                      />
                    </span>
                    <span className="text-sm font-light text-muted-foreground ml-1">
                      kg this week
                    </span>
                    {volumeChartData.length >= 2 &&
                      (() => {
                        const curr = volumeChartData[volumeChartData.length - 1]?.value || 0;
                        const prev = volumeChartData[volumeChartData.length - 2]?.value || 0;
                        if (prev === 0) return null;
                        const pct = ((curr - prev) / prev) * 100;
                        const isUp = pct > 0;
                        return (
                          <span
                            className={`ml-2 text-xs font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {isUp ? (
                              <TrendingUp className="w-3 h-3 inline mr-0.5" />
                            ) : (
                              <TrendingDown className="w-3 h-3 inline mr-0.5" />
                            )}
                            {Math.abs(pct).toFixed(0)}%
                          </span>
                        );
                      })()}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ZoneBandChart
                    data={volumeChartData}
                    zones={volumeZones}
                    height={200}
                    unit="kg"
                    showAverage
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Volume Trend — Zone Band Chart */}
          {soloProgress.history.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="border-border/30 bg-background/40 backdrop-blur-xl overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-light flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Volume Trend
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Per-session volume over time
                      </CardDescription>
                    </div>
                    <PeriodToggle value={trendPeriod} onChange={setTrendPeriod} />
                  </div>
                  {/* Hero number */}
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-foreground">
                      <NumberTicker
                        value={trendChartData[trendChartData.length - 1]?.value || 0}
                        className="text-3xl font-bold"
                      />
                    </span>
                    <span className="text-sm font-light text-muted-foreground ml-1">
                      kg last session
                    </span>
                    {trendChartData.length >= 2 &&
                      (() => {
                        const curr = trendChartData[trendChartData.length - 1]?.value || 0;
                        const prev = trendChartData[trendChartData.length - 2]?.value || 0;
                        if (prev === 0) return null;
                        const pct = ((curr - prev) / prev) * 100;
                        const isUp = pct > 0;
                        return (
                          <span
                            className={`ml-2 text-xs font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {isUp ? (
                              <TrendingUp className="w-3 h-3 inline mr-0.5" />
                            ) : (
                              <TrendingDown className="w-3 h-3 inline mr-0.5" />
                            )}
                            {Math.abs(pct).toFixed(0)}%
                          </span>
                        );
                      })()}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ZoneBandChart
                    data={trendChartData}
                    zones={trendZones}
                    height={200}
                    unit="kg"
                    showAverage
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Training Load Ratio */}
          {trainingLoadRatio && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.17 }}
            >
              <Card className="border-border/30 bg-background/40 backdrop-blur-xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-light flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Training Load Ratio
                  </CardTitle>
                  <CardDescription>This week vs 4-week average (ACWR)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-6 mb-4">
                    <div>
                      <span className="text-4xl font-bold text-foreground">
                        {trainingLoadRatio.ratio.toFixed(2)}
                      </span>
                      <span className={`ml-2 text-sm font-medium ${trainingLoadRatio.statusColor}`}>
                        {trainingLoadRatio.statusLabel}
                      </span>
                    </div>
                  </div>
                  {/* Visual ratio bar */}
                  <div className="space-y-3">
                    <div className="relative h-3 bg-white/[0.04] rounded-full overflow-hidden">
                      {/* Zone markers */}
                      <div className="absolute left-[38%] top-0 h-full w-px bg-white/10" />
                      <div className="absolute left-[62%] top-0 h-full w-px bg-white/10" />
                      {/* Current position */}
                      <div
                        className={`absolute top-0 h-full rounded-full transition-all duration-700 ${trainingLoadRatio.barColor}`}
                        style={{
                          width: `${Math.min(100, trainingLoadRatio.ratio * 50)}%`,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Detraining</span>
                      <span>Sweet Spot (0.8–1.3)</span>
                      <span>Overreaching</span>
                    </div>
                    <div className="flex gap-6 text-xs text-muted-foreground mt-2">
                      <span>
                        This week:{' '}
                        <strong className="text-foreground">
                          {trainingLoadRatio.currentWeek.toLocaleString()} kg
                        </strong>
                      </span>
                      <span>
                        4-wk avg:{' '}
                        <strong className="text-foreground">
                          {trainingLoadRatio.avg4Week.toLocaleString()} kg
                        </strong>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Workout Frequency Heatmap — only show when enough data */}
          {soloProgress.history.length >= 7 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-border/30 bg-background/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-light flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Workout Frequency
                  </CardTitle>
                  <CardDescription>
                    {soloProgress.history.length} workouts in the last 12 weeks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Build 12-week heatmap grid
                    const today = new Date();
                    const weeks = 12;
                    const dayMs = 86400000;
                    const startDate = new Date(today.getTime() - weeks * 7 * dayMs);

                    // Count workouts per day
                    const dayCounts: Record<string, number> = {};
                    for (const w of soloProgress.history) {
                      const key = new Date(w.date).toISOString().slice(0, 10);
                      dayCounts[key] = (dayCounts[key] || 0) + 1;
                    }

                    // Build grid data: rows = days of week (0=Sun..6=Sat), cols = weeks
                    const grid: { date: string; count: number }[][] = Array.from(
                      { length: 7 },
                      () => []
                    );
                    const cursor = new Date(startDate);
                    // Align to start of week (Sunday)
                    cursor.setDate(cursor.getDate() - cursor.getDay());

                    while (cursor <= today) {
                      const dayOfWeek = cursor.getDay();
                      const key = cursor.toISOString().slice(0, 10);
                      grid[dayOfWeek].push({ date: key, count: dayCounts[key] || 0 });
                      cursor.setDate(cursor.getDate() + 1);
                    }

                    const maxCount = Math.max(1, ...Object.values(dayCounts));
                    const dayLabels = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];

                    return (
                      <>
                        <div className="flex gap-1">
                          <div className="flex flex-col gap-1 mr-1 text-[10px] text-muted-foreground">
                            {dayLabels.map((label, i) => (
                              <div key={i} className="h-3 flex items-center">
                                {label}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1 overflow-x-auto">
                            {Array.from({ length: grid[0]?.length || 0 }, (_, weekIdx) => (
                              <div key={weekIdx} className="flex flex-col gap-1">
                                {grid.map((row, dayIdx) => {
                                  const cell = row[weekIdx];
                                  if (!cell) return <div key={dayIdx} className="w-3 h-3" />;
                                  const intensity = cell.count / maxCount;
                                  return (
                                    <div
                                      key={dayIdx}
                                      className="w-3 h-3 rounded-sm"
                                      style={{
                                        backgroundColor:
                                          cell.count === 0
                                            ? 'hsl(var(--muted) / 0.3)'
                                            : `hsl(var(--primary) / ${0.3 + intensity * 0.7})`,
                                      }}
                                      title={`${cell.date}: ${cell.count} workout${cell.count !== 1 ? 's' : ''}`}
                                    />
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Color legend */}
                        <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                          <span>Less</span>
                          <div className="flex gap-0.5">
                            <div
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: 'hsl(var(--muted) / 0.3)' }}
                            />
                            <div
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: 'hsl(var(--primary) / 0.3)' }}
                            />
                            <div
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: 'hsl(var(--primary) / 0.55)' }}
                            />
                            <div
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: 'hsl(var(--primary) / 0.8)' }}
                            />
                            <div
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: 'hsl(var(--primary) / 1)' }}
                            />
                          </div>
                          <span>More</span>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Personal Records Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-border/30 bg-background/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg font-light flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Personal Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {personalRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Complete workouts to set your first PR!
                  </p>
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-2 text-muted-foreground font-medium min-w-[140px] pr-4">
                            Exercise
                          </th>
                          <th className="text-right py-2 text-muted-foreground font-medium whitespace-nowrap">
                            Weight
                          </th>
                          <th className="text-right py-2 text-muted-foreground font-medium whitespace-nowrap">
                            Reps
                          </th>
                          <th className="text-right py-2 text-muted-foreground font-medium whitespace-nowrap">
                            Est. 1RM
                          </th>
                          <th className="text-right py-2 text-muted-foreground font-medium whitespace-nowrap">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {personalRecords.slice(0, 10).map((record, i) => (
                          <tr key={i} className="border-b border-border/10">
                            <td className="py-2 font-medium max-w-[200px] truncate">
                              {record.exercise.name}
                            </td>
                            <td className="py-2 text-right">
                              {parseFloat(record.pr.weightKg).toFixed(1)} kg
                            </td>
                            <td className="py-2 text-right">{record.pr.reps}</td>
                            <td className="py-2 text-right text-primary font-medium">
                              {parseFloat(record.pr.estimated1rm).toFixed(1)} kg
                            </td>
                            <td className="py-2 text-right text-muted-foreground">
                              {new Date(record.pr.achievedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Workout History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border/30 bg-background/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg font-light">Recent Workouts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {soloProgress.history.map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border-l-4 border-primary border border-border/20 overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-medium truncate">{workout.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(workout.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0 ml-2">
                      <span>{workout.duration}min</span>
                      {workout.volume > 0 && (
                        <span className="hidden sm:inline">
                          {workout.volume.toLocaleString()}kg
                        </span>
                      )}
                      <span>
                        {workout.sets} {workout.sets === 1 ? 'set' : 'sets'}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
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

      {selectedClientData && !loadingProgress && progressTypes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 space-y-4 text-center"
        >
          <TrendingUp className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Progress gets tracked here as you and your trainer work together.
          </p>
        </motion.div>
      )}

      {selectedClientData && !loadingProgress && progressTypes.length > 0 && (
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
                  whileHover={{ y: -4 }}
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
                    <CardContent className="relative -mx-2 md:mx-0">
                      <div className="h-[250px] md:h-[400px] w-full">
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
                              whileHover={{ opacity: 0.8 }}
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
                                    whileHover={{ rotate: 5 }}
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
