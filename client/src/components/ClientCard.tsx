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
    <Card className="hover-elevate bg-card/50 backdrop-blur-sm border-border/50 transition-all duration-300" data-testid={`card-client-${name.toLowerCase().replace(' ', '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="h-14 w-14 border-2 border-border/20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback className="bg-primary/10 text-foreground font-light text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${statusColors[status]}`} />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-light" data-testid={`text-client-name-${name.toLowerCase().replace(' ', '-')}`}>
              {name}
            </CardTitle>
            <p className="text-sm text-muted-foreground font-light">{email}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="opacity-60 hover:opacity-100" data-testid="button-client-menu">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-light text-muted-foreground tracking-wide">GOAL</p>
          <p className="text-base font-light" data-testid="text-client-goal">{goal}</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-light text-muted-foreground tracking-wide">PROGRESS</p>
            <span className="text-lg font-light" data-testid="text-progress-percentage">{progress}%</span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground font-light">Last Session</p>
            <p className="font-light" data-testid="text-last-session">{lastSession}</p>
          </div>
          {nextSession && (
            <div className="space-y-1">
              <p className="text-muted-foreground font-light">Next Session</p>
              <p className="font-light" data-testid="text-next-session">{nextSession}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" size="sm" className="flex-1 font-light border-border/50 bg-background/50" data-testid="button-message-client">
            <MessageSquare className="w-4 h-4 mr-2 opacity-80" />
            Message
          </Button>
          <Button variant="outline" size="sm" className="flex-1 font-light border-border/50 bg-background/50" data-testid="button-schedule-session">
            <Calendar className="w-4 h-4 mr-2 opacity-80" />
            Schedule
          </Button>
          <Button variant="outline" size="sm" className="flex-1 font-light border-border/50 bg-background/50" data-testid="button-view-progress">
            <TrendingUp className="w-4 h-4 mr-2 opacity-80" />
            Progress
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}