import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { PageHeader } from '@/components/ui/premium/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NumberTicker } from '@/components/ui/number-ticker';
import {
  ZoneBandChart,
  PeriodToggle,
  type Period,
} from '@/components/redesign/charts/ZoneBandChart';
import { ArrowLeft, Trophy, TrendingUp, Dumbbell, Calendar, Weight, Activity } from 'lucide-react';
import { useState } from 'react';

interface ExerciseHistory {
  exercise: {
    id: number;
    name: string;
    muscleGroups: string[] | null;
    equipment: string[] | null;
  };
  history: {
    date: string;
    weight: number;
    reps: number;
    rpe: number | null;
    estimatedOneRepMax: number;
  }[];
  personalRecord: {
    weight: number;
    reps: number;
    date: string;
    estimatedOneRepMax: number;
  } | null;
  oneRepMaxTrend: { date: string; value: number }[];
}

export default function ExerciseDetailPage() {
  const [, params] = useRoute('/solo/exercises/:exerciseId/history');
  const exerciseId = params?.exerciseId;
  const [trendPeriod, setTrendPeriod] = useState<Period>('6M');

  const { data, isLoading, error } = useQuery<ExerciseHistory>({
    queryKey: [`/api/solo/exercises/${exerciseId}/history`],
    enabled: !!exerciseId,
    staleTime: 2 * 60 * 1000,
  });

  const filteredTrend = useMemo(() => {
    if (!data?.oneRepMaxTrend) return [];
    const periodDays: Record<Period, number> = { '7D': 7, '4W': 28, '6M': 182, '1Y': 365 };
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays[trendPeriod]);
    return data.oneRepMaxTrend
      .filter((p) => new Date(p.date) >= cutoff)
      .map((p) => ({
        label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: p.value,
      }));
  }, [data?.oneRepMaxTrend, trendPeriod]);

  const trendZones = useMemo(() => {
    if (filteredTrend.length < 2) return undefined;
    const vals = filteredTrend.map((d) => d.value);
    const max = Math.max(...vals);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return [
      { label: 'Below Average', min: 0, max: avg * 0.85, color: 'rgba(239, 68, 68, 0.04)' },
      { label: 'Average', min: avg * 0.85, max: avg * 1.15, color: 'rgba(245, 158, 11, 0.04)' },
      { label: 'PR Zone', min: avg * 1.15, max: max * 1.2, color: 'rgba(34, 197, 94, 0.04)' },
    ];
  }, [filteredTrend]);

  // Last vs Best comparison
  const comparison = useMemo(() => {
    if (!data?.history || data.history.length < 2) return null;
    const last = data.history[0]; // most recent
    const best = data.personalRecord;
    if (!best) return null;
    return { last, best };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Exercises
        </Link>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Failed to load exercise data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { exercise, history, personalRecord } = data;

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Back link */}
      <Link
        href="/exercises"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Exercises
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <PageHeader
            icon={<Dumbbell className="h-full w-full" />}
            title={exercise.name}
            titleAccent="History"
            subtitle={
              exercise.muscleGroups?.length
                ? exercise.muscleGroups.map((g) => g.replace(/_/g, ' ')).join(', ')
                : 'Exercise performance tracking'
            }
          />
        </div>

        {/* PR Badge */}
        {personalRecord && (
          <div className="flex-shrink-0 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative rounded-xl border border-[#c9a84c]/30 bg-gradient-to-br from-[#c9a84c]/10 to-transparent p-4 min-w-[160px]">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-[#c9a84c]" />
                <span className="text-xs font-medium text-[#c9a84c] uppercase tracking-wider">
                  Personal Record
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {personalRecord.weight}
                <span className="text-sm font-light text-muted-foreground ml-0.5">kg</span>
                <span className="text-muted-foreground mx-1">×</span>
                {personalRecord.reps}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Est. 1RM:{' '}
                <span className="text-foreground font-medium">
                  {personalRecord.estimatedOneRepMax} kg
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {new Date(personalRecord.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Last Time vs Best Time */}
      {comparison && (
        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Card className="border-border/30 bg-background/40 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Last Session
                </p>
              </div>
              <p className="text-xl font-bold">
                {comparison.last.weight}
                <span className="text-sm font-light text-muted-foreground ml-0.5">kg</span>
                <span className="text-muted-foreground mx-1 text-sm">×</span>
                <span className="text-lg">{comparison.last.reps}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                1RM: {comparison.last.estimatedOneRepMax} kg
              </p>
              {comparison.last.rpe && (
                <Badge variant="secondary" className="mt-2 text-[10px]">
                  RPE {comparison.last.rpe}
                </Badge>
              )}
            </CardContent>
          </Card>
          <Card className="border-[#c9a84c]/20 bg-gradient-to-br from-[#c9a84c]/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-[#c9a84c]" />
                <p className="text-[10px] uppercase tracking-wider text-[#c9a84c]/70">Best Ever</p>
              </div>
              <p className="text-xl font-bold">
                {comparison.best.weight}
                <span className="text-sm font-light text-muted-foreground ml-0.5">kg</span>
                <span className="text-muted-foreground mx-1 text-sm">×</span>
                <span className="text-lg">{comparison.best.reps}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                1RM: {comparison.best.estimatedOneRepMax} kg
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estimated 1RM Trend Chart */}
      {filteredTrend.length >= 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Card className="border-border/30 bg-background/40 backdrop-blur-xl overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-light flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Estimated 1RM Trend
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Epley formula: weight × (1 + reps/30)
                  </CardDescription>
                </div>
                <PeriodToggle value={trendPeriod} onChange={setTrendPeriod} />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold text-foreground">
                  <NumberTicker
                    value={filteredTrend[filteredTrend.length - 1]?.value || 0}
                    className="text-3xl font-bold"
                    decimalPlaces={1}
                  />
                </span>
                <span className="text-sm font-light text-muted-foreground ml-1">
                  kg estimated 1RM
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ZoneBandChart
                data={filteredTrend}
                zones={trendZones}
                height={220}
                unit="kg"
                showAverage
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Session History List */}
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
        <Card className="border-border/30 bg-background/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg font-light flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Session History
            </CardTitle>
            <CardDescription>{history.length} sessions recorded</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No history yet. Complete a workout with this exercise to see your data.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((entry, i) => {
                  const isPR =
                    personalRecord &&
                    entry.weight === personalRecord.weight &&
                    entry.reps === personalRecord.reps &&
                    entry.date === personalRecord.date;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isPR
                          ? 'bg-[#c9a84c]/10 border border-[#c9a84c]/20'
                          : 'bg-white/[0.02] border border-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground w-16 flex-shrink-0">
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div>
                          <span className="text-sm font-medium">
                            {entry.weight} kg × {entry.reps}
                          </span>
                          {isPR && <Trophy className="w-3.5 h-3.5 text-[#c9a84c] inline ml-1.5" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {entry.rpe && (
                          <Badge variant="secondary" className="text-[10px]">
                            RPE {entry.rpe}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          1RM: {entry.estimatedOneRepMax} kg
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
