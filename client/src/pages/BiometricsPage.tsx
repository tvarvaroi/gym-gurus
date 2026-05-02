import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/premium/PageHeader';
import { ActionButton } from '@/components/ui/premium/ActionButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getUnits, setUnits, type UnitSystem } from '@/lib/units';
import { BodyMetricsList } from '@/components/biometrics/BodyMetricsList';
import { BodyMetricsEmptyState } from '@/components/biometrics/BodyMetricsEmptyState';
import { LogBodyMetricsSheet } from '@/components/biometrics/LogBodyMetricsSheet';
import type { BodyMetrics } from '@shared/schema';

export default function BiometricsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [units, setUnitsState] = useState<UnitSystem>(() => getUnits());
  const [logOpen, setLogOpen] = useState(false);
  const [editing, setEditing] = useState<BodyMetrics | null>(null);

  // Sync to localStorage whenever the user toggles
  useEffect(() => {
    setUnits(units);
  }, [units]);

  const entriesQuery = useQuery<BodyMetrics[]>({
    queryKey: ['/api/biometrics'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/biometrics/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/biometrics'] });
      toast({ title: 'Entry deleted' });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    },
  });

  const openLogSheet = () => {
    setEditing(null);
    setLogOpen(true);
  };

  const openEditSheet = (entry: BodyMetrics) => {
    setEditing(entry);
    setLogOpen(true);
  };

  const entries = entriesQuery.data ?? [];
  const hasEntries = entries.length > 0;
  const isLoading = entriesQuery.isLoading;

  return (
    <div className="container max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        icon={<Activity className="w-full h-full" />}
        title="Body"
        titleAccent="metrics"
        subtitle="Track your body composition over time"
        actions={<UnitsToggle units={units} onChange={setUnitsState} />}
      />

      <Tabs defaultValue="body" className="mt-6 md:mt-8">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
          <TabsTrigger value="body" className="cursor-pointer">
            Body
          </TabsTrigger>
          <TabsTrigger value="photos" className="cursor-pointer">
            Photos
          </TabsTrigger>
          <TabsTrigger value="trends" className="cursor-pointer">
            Trends
          </TabsTrigger>
        </TabsList>

        {/* ─── Body Metrics tab ───────────────────────────────────────────── */}
        <TabsContent value="body" className="mt-4 md:mt-6">
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          )}

          {!isLoading && !hasEntries && (
            <BodyMetricsEmptyState role={user?.role} onLog={openLogSheet} />
          )}

          {!isLoading && hasEntries && (
            <>
              <div className="hidden md:flex justify-end mb-3">
                <ActionButton
                  variant="primary"
                  size="md"
                  onClick={openLogSheet}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Log entry
                </ActionButton>
              </div>
              <BodyMetricsList
                entries={entries}
                units={units}
                onEdit={openEditSheet}
                onDelete={(id) => deleteMutation.mutateAsync(id)}
              />
              {/* Mobile sticky CTA */}
              <button
                onClick={openLogSheet}
                aria-label="Log entry"
                className="md:hidden fixed bottom-4 left-4 right-4 z-30 min-h-[52px] rounded-full bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Log entry
              </button>
            </>
          )}
        </TabsContent>

        {/* ─── Photos tab (BATCH 4) ───────────────────────────────────────── */}
        <TabsContent value="photos" className="mt-4 md:mt-6">
          <div className="text-center py-16 text-sm text-muted-foreground">
            Photos coming next batch.
          </div>
        </TabsContent>

        {/* ─── Trends tab (BATCH 5) ───────────────────────────────────────── */}
        <TabsContent value="trends" className="mt-4 md:mt-6">
          <div className="text-center py-16 text-sm text-muted-foreground">
            Trend charts coming in BATCH 5.
          </div>
        </TabsContent>
      </Tabs>

      <LogBodyMetricsSheet
        open={logOpen}
        onOpenChange={setLogOpen}
        units={units}
        editing={editing}
      />
    </div>
  );
}

// ─── Units toggle (in PageHeader actions slot) ─────────────────────────────
interface UnitsToggleProps {
  units: UnitSystem;
  onChange: (u: UnitSystem) => void;
}
function UnitsToggle({ units, onChange }: UnitsToggleProps) {
  return (
    <div
      role="group"
      aria-label="Unit system"
      className="inline-flex items-center rounded-full border border-border/50 bg-card p-0.5"
    >
      <button
        onClick={() => onChange('metric')}
        aria-pressed={units === 'metric'}
        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer min-h-[32px] ${
          units === 'metric'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        kg·cm
      </button>
      <button
        onClick={() => onChange('imperial')}
        aria-pressed={units === 'imperial'}
        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer min-h-[32px] ${
          units === 'imperial'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        lb·in
      </button>
    </div>
  );
}
