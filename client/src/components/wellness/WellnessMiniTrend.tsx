/**
 * WellnessMiniTrend — Sprint 3 BATCH 5
 *
 * Inline 7-day readiness trend below the summary hero. Enrichment, not a
 * feature in itself — if the user has fewer than 2 entries, this renders
 * NOTHING. Don't draw attention to absent data.
 *
 * Behavior (locked, see design doc BATCH 5 contract):
 *   - Fetches GET /api/wellness/history?days=7
 *   - Filters to entries with a non-null readinessScore
 *   - If < 2 entries qualify, renders null (no empty state, no skeleton)
 *   - Otherwise renders a recharts LineChart, role-colored stroke, dot
 *     markers, ~60px tall, no axis labels, no grid
 *
 * No tooltip — the chart is a glance, not an interaction. Hover-state would
 * imply "explore me" which would compete with the readiness hero above.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import type { DailyWellnessLog } from '@shared/schema';

export function WellnessMiniTrend() {
  // Fetched once per summary mount; reused as enrichment. No skeleton —
  // a missing trend on a freshly loaded summary is indistinguishable from
  // a no-data trend, both of which render null.
  const historyQuery = useQuery<DailyWellnessLog[]>({
    queryKey: ['/api/wellness/history', 7],
    queryFn: async () => {
      const res = await fetch('/api/wellness/history?days=7', { credentials: 'include' });
      if (!res.ok) throw new Error('history fetch failed');
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Memoise the chart data array. Without this, every parent re-render
  // (e.g. the post-submit count-up animation in ReadinessHero re-rendering
  // its sibling tree) rebuilds `data`, triggering recharts re-layout. With
  // useMemo, recharts skips work when query data is unchanged. Sprint 3
  // BATCH 8 audit finding.
  const data = useMemo(() => {
    const all = historyQuery.data ?? [];
    // Server returns DESC; chart wants ASC for time-axis sanity.
    return [...all]
      .filter((e) => e.readinessScore !== null && e.readinessScore !== undefined)
      .reverse()
      .map((e) => ({ date: e.date, score: e.readinessScore as number }));
  }, [historyQuery.data]);

  if (historyQuery.isLoading) return null;
  if (data.length < 2) return null;

  return (
    <div
      className="w-full h-[60px] mt-1"
      aria-label={`7-day readiness trend, ${data.length} entries`}
      data-testid="wellness-mini-trend"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 4, bottom: 4, left: 4 }}>
          {/* YAxis hidden but used to set domain — avoids the line clipping. */}
          <YAxis hide domain={[0, 100]} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
