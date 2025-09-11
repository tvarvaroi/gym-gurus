import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Calendar, TrendingUp, MoreHorizontal } from "lucide-react"

interface ClientCardProps {
  name: string
  email: string
  avatarUrl?: string
  goal: string
  progress: number
  lastSession: string
  status: "active" | "inactive" | "paused"
  nextSession?: string
}

export default function ClientCard({ 
  name, 
  email, 
  avatarUrl, 
  goal, 
  progress, 
  lastSession, 
  status,
  nextSession 
}: ClientCardProps) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()
  
  const statusColors = {
    active: "bg-green-500",
    inactive: "bg-gray-500", 
    paused: "bg-yellow-500"
  }

  return (
    <Card className="hover-elevate" data-testid={`card-client-${name.toLowerCase().replace(' ', '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${statusColors[status]}`} />
          </div>
          <div>
            <CardTitle className="text-lg" data-testid={`text-client-name-${name.toLowerCase().replace(' ', '-')}`}>
              {name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" data-testid="button-client-menu">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Goal</p>
          <p className="text-sm" data-testid="text-client-goal">{goal}</p>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-muted-foreground">Progress</p>
            <span className="text-sm font-medium" data-testid="text-progress-percentage">{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Last Session</p>
            <p className="font-medium" data-testid="text-last-session">{lastSession}</p>
          </div>
          {nextSession && (
            <div>
              <p className="text-muted-foreground">Next Session</p>
              <p className="font-medium" data-testid="text-next-session">{nextSession}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" data-testid="button-message-client">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message
          </Button>
          <Button variant="outline" size="sm" className="flex-1" data-testid="button-schedule-session">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
          <Button variant="outline" size="sm" className="flex-1" data-testid="button-view-progress">
            <TrendingUp className="w-4 h-4 mr-2" />
            Progress
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}