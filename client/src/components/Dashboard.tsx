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
      {/* Hero Section */}
      <div 
        className="relative h-64 rounded-lg bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
        <div className="relative h-full flex flex-col justify-center px-8 text-white">
          <h1 className="text-3xl font-bold font-sans mb-2" data-testid="text-dashboard-title">
            Welcome Back, Trainer!
          </h1>
          <p className="text-lg mb-4 text-white/90">
            Ready to help your clients achieve their fitness goals today?
          </p>
          <div className="flex gap-4">
            <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20" data-testid="button-add-client">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
            <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20" data-testid="button-create-workout">
              Create Workout
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover-elevate" data-testid={`card-stat-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-value-${index}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-recent-activity-title">Recent Activity</CardTitle>
          <CardDescription>
            Latest updates from your clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate" data-testid={`activity-${index}`}>
                <div>
                  <p className="font-medium" data-testid={`text-client-${index}`}>
                    {activity.client}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.action}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
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