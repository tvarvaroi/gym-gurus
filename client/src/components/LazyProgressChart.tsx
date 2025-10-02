import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load the ProgressChart component
const ProgressChart = lazy(() => import('./ProgressChart'))

interface LazyProgressChartProps {
  title: string
  description: string
  data: Array<{
    date: string
    value: number
    label?: string
  }>
  type: "line" | "bar"
  metric: string
  trend?: {
    value: number
    direction: "up" | "down"
    period: string
  }
}

// Loading skeleton for chart
const ChartSkeleton = () => (
  <div className="space-y-4 p-6">
    <div className="space-y-2">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
)

// Wrapper component that handles lazy loading
export default function LazyProgressChart(props: LazyProgressChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <ProgressChart {...props} />
    </Suspense>
  )
}