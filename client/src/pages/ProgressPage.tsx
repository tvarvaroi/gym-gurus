import { useState, useMemo, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Plus, TrendingUp, TrendingDown, Activity, Weight, Target } from "lucide-react";
import { motion } from "framer-motion";
import ProgressFormModal from "../components/ProgressFormModal";
import { Skeleton } from "@/components/ui/skeleton";
// Import Bar directly to avoid type issues
import { Bar } from 'recharts';

// Lazy load other chart components to reduce initial bundle size
const LineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const Line = lazy(() => import('recharts').then(module => ({ default: module.Line })));
const XAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const YAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));
const BarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));

// Temporary trainer/client IDs for development
const TEMP_TRAINER_ID = "demo-trainer-123";
const TEMP_CLIENT_ID = "6ebb94f5-fe56-4902-96d8-3b35a268ad46"; // Valid client ID from database

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
  const [selectedClient, setSelectedClient] = useState<string>(TEMP_CLIENT_ID);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch clients for trainer
  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ['/api/clients', TEMP_TRAINER_ID],
    enabled: !!TEMP_TRAINER_ID
  });

  // Fetch selected client's progress
  const { data: progressData = [], isLoading: loadingProgress } = useQuery<ProgressEntry[]>({
    queryKey: ['/api/clients', selectedClient, 'progress'],
    enabled: !!selectedClient
  });

  // Group progress data by type for charts - memoized for performance
  const groupedProgress = useMemo(() => {
    return (progressData || []).reduce((acc: any, entry: ProgressEntry) => {
      const type = entry.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push({
        date: new Date(entry.recordedAt).toLocaleDateString(),
        value: parseFloat(entry.value),
        fullDate: entry.recordedAt,
        notes: entry.notes
      });
      return acc;
    }, {});
  }, [progressData]);

  // Calculate progress trends
  const calculateTrend = (data: any[]) => {
    if (!data || data.length < 2) return null;
    const sorted = data.sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const change = last.value - first.value;
    const percentage = ((change / first.value) * 100).toFixed(1);
    return { change, percentage, isPositive: change > 0 };
  };

  const progressTypes = Object.keys(groupedProgress);
  const selectedClientData = (clients || []).find((client: Client) => client.id === selectedClient);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
            Progress Tracking
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Monitor client progress and track fitness goals
          </p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
          data-testid="button-add-progress"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="text-sm">Add Progress Entry</span>
        </Button>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Client Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {loadingClients ? (
              <div className="text-muted-foreground">Loading clients...</div>
            ) : (
              (clients || []).map((client: Client) => (
                <Button
                  key={client.id}
                  variant={selectedClient === client.id ? "default" : "outline"}
                  onClick={() => setSelectedClient(client.id)}
                  data-testid={`button-select-client-${client.id}`}
                  className={selectedClient === client.id ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  {client.name}
                </Button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClientData && (
        <>
          {/* Progress Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {progressTypes.map((type) => {
              const data = groupedProgress[type];
              const trend = calculateTrend(data);
              const latest = data[data.length - 1];
              
              return (
                <Card key={type} className="hover-elevate">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg capitalize flex items-center gap-2">
                        {type === 'weight' && <Weight className="w-5 h-5 text-emerald-600" />}
                        {type === 'workout_completion' && <Activity className="w-5 h-5 text-emerald-600" />}
                        {type !== 'weight' && type !== 'workout_completion' && <TrendingUp className="w-5 h-5 text-emerald-600" />}
                        {type.replace('_', ' ')}
                      </CardTitle>
                      {trend && (
                        <Badge variant={trend.isPositive ? "default" : "secondary"} className="text-xs">
                          {trend.isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {trend.percentage}%
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-emerald-600" data-testid={`text-latest-${type}`}>
                        {latest?.value} {data[0]?.unit || ''}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Last updated: {latest?.date}
                      </div>
                      {latest?.notes && (
                        <div className="text-sm text-muted-foreground italic">
                          "{latest.notes}"
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Progress Charts */}
          <Tabs defaultValue={progressTypes[0] || "weight"} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
              {progressTypes.slice(0, 3).map((type) => (
                <TabsTrigger key={type} value={type} className="capitalize">
                  {type.replace('_', ' ')}
                </TabsTrigger>
              ))}
            </TabsList>

            {progressTypes.map((type) => (
              <TabsContent key={type} value={type} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="capitalize">{type.replace('_', ' ')} Progress</CardTitle>
                    <CardDescription>
                      Track {type.replace('_', ' ').toLowerCase()} changes over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] w-full">
                      <Suspense fallback={<Skeleton className="h-full w-full" />}>
                        <ResponsiveContainer width="100%" height="100%">
                          {type === 'workout_completion' ? (
                            <BarChart data={groupedProgress[type]}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis 
                                dataKey="date" 
                                className="text-xs fill-muted-foreground"
                              />
                              <YAxis className="text-xs fill-muted-foreground" />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '6px'
                                }}
                              />
                              <Bar 
                                dataKey="value" 
                                fill="hsl(var(--primary))"
                              />
                            </BarChart>
                          ) : (
                            <LineChart data={groupedProgress[type]}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis 
                                dataKey="date" 
                                className="text-xs fill-muted-foreground"
                              />
                              <YAxis className="text-xs fill-muted-foreground" />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '6px'
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="hsl(var(--primary))"
                                strokeWidth={3}
                                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                                className="stroke-emerald-600"
                              />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </Suspense>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Recent Progress Entries */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Progress Entries</CardTitle>
              <CardDescription>Latest progress updates for {selectedClientData.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProgress ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading progress data...
                </div>
              ) : (progressData || []).length > 0 ? (
                <div className="space-y-3">
                  {(progressData || []).slice(0, 10).map((entry: ProgressEntry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">
                          {entry.type.replace('_', ' ')}
                        </Badge>
                        <div>
                          <div className="font-medium">
                            {entry.value} {entry.unit}
                          </div>
                          {entry.notes && (
                            <div className="text-sm text-muted-foreground">
                              {entry.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(entry.recordedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No progress data available yet. Start tracking by adding your first entry!
                </div>
              )}
            </CardContent>
          </Card>
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