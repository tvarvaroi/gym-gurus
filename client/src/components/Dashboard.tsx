import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, TrendingUp, MessageSquare, Plus } from "lucide-react"
import heroImage from '@assets/generated_images/Diverse_fitness_gym_hero_4eec9aff.png'

export default function Dashboard() {
  // todo: remove mock functionality
  const stats = [
    { label: "Active Clients", value: "24", icon: Users, trend: "+3 this week" },
    { label: "Sessions This Week", value: "18", icon: Calendar, trend: "2 today" },
    { label: "Avg Progress Score", value: "87%", icon: TrendingUp, trend: "+5% vs last month" },
    { label: "Unread Messages", value: "6", icon: MessageSquare, trend: "3 urgent" },
  ]

  const recentActivities = [
    { client: "Sarah Johnson", action: "Completed leg day workout", time: "2 hours ago" },
    { client: "Mike Chen", action: "Updated body weight: 180 lbs (-2 lbs)", time: "4 hours ago" },
    { client: "Emma Davis", action: "Sent progress photos", time: "6 hours ago" },
    { client: "Alex Rodriguez", action: "Scheduled session for tomorrow", time: "1 day ago" },
  ]

  return (
    <div className="space-y-6">
      {/* Hero Section - Apple-inspired minimalist design */}
      <div 
        className="relative h-80 rounded-xl bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="relative h-full flex flex-col justify-center items-center text-center px-8 text-white">
          <h1 className="text-5xl font-light tracking-tight mb-4" data-testid="text-dashboard-title">
            Your Fitness Studio
          </h1>
          <p className="text-xl font-light mb-8 text-white/80 max-w-2xl">
            Elevate your training practice with intelligent client management and progress tracking.
          </p>
          <div className="flex gap-4">
            <Button size="lg" className="bg-white text-black hover:bg-white/90 font-medium px-8" data-testid="button-add-client">
              <Plus className="w-4 h-4 mr-2" />
              New Client
            </Button>
            <Button variant="outline" size="lg" className="bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/10 font-medium px-8" data-testid="button-create-workout">
              Create Workout
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid - Apple-inspired clean cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, index) => (
          <Card key={index} className="hover-elevate bg-card/50 backdrop-blur-sm border-border/50" data-testid={`card-stat-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-light text-muted-foreground tracking-wide">
                {stat.label.toUpperCase()}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-primary opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-light mb-1" data-testid={`text-stat-value-${index}`}>
                {stat.value}
              </div>
              <p className="text-sm text-muted-foreground font-light">
                {stat.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity - Apple-inspired clean list */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-light" data-testid="text-recent-activity-title">
            Recent Activity
          </CardTitle>
          <CardDescription className="text-base font-light">
            Latest updates from your clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-xl hover-elevate transition-all duration-200" data-testid={`activity-${index}`}>
                <div className="space-y-1">
                  <p className="font-medium" data-testid={`text-client-${index}`}>
                    {activity.client}
                  </p>
                  <p className="text-sm text-muted-foreground font-light">
                    {activity.action}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs font-light bg-muted/50">
                  {activity.time}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}