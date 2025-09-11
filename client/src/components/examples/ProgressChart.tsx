import ProgressChart from '../ProgressChart'

export default function ProgressChartExample() {
  // todo: remove mock functionality
  const weightData = [
    { date: 'Jan 1', value: 180 },
    { date: 'Jan 8', value: 178 },
    { date: 'Jan 15', value: 176 },
    { date: 'Jan 22', value: 175 },
    { date: 'Jan 29', value: 173 },
    { date: 'Feb 5', value: 171 },
    { date: 'Feb 12', value: 169 }
  ]

  const workoutData = [
    { date: 'Week 1', value: 3 },
    { date: 'Week 2', value: 4 },
    { date: 'Week 3', value: 3 },
    { date: 'Week 4', value: 5 },
    { date: 'Week 5', value: 4 },
    { date: 'Week 6', value: 6 }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      <ProgressChart
        title="Weight Progress"
        description="Client weight tracking over time"
        data={weightData}
        type="line"
        metric="Weight (lbs)"
        trend={{ value: 6.1, direction: "down", period: "vs last month" }}
      />
      <ProgressChart
        title="Weekly Workouts"
        description="Number of completed workouts per week"
        data={workoutData}
        type="bar"
        metric="Workouts completed"
        trend={{ value: 25, direction: "up", period: "vs last month" }}
      />
    </div>
  )
}