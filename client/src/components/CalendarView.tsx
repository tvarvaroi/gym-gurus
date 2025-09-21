import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useState } from "react"

interface CalendarEvent {
  id: string
  title: string
  client: string
  time: string
  type: "session" | "consultation" | "check-in"
  status: "confirmed" | "pending" | "completed"
}

interface CalendarViewProps {
  events?: CalendarEvent[]
}

export default function CalendarView({ events = [] }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const mockEvents: CalendarEvent[] = [
    {
      id: "1",
      title: "Personal Training Session",
      client: "Sarah Johnson",
      time: "9:00 AM",
      type: "session",
      status: "confirmed"
    },
    {
      id: "2", 
      title: "Initial Consultation",
      client: "Mike Chen",
      time: "2:00 PM",
      type: "consultation", 
      status: "pending"
    },
    {
      id: "3",
      title: "Progress Check-in",
      client: "Emma Davis", 
      time: "4:30 PM",
      type: "check-in",
      status: "completed"
    }
  ]

  const allEvents = events.length > 0 ? events : mockEvents

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const today = new Date().getDate()
  const isCurrentMonth = new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear

  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1))
  }

  const typeColors = {
    session: "bg-primary text-primary-foreground",
    consultation: "bg-blue-500 text-white",
    "check-in": "bg-green-500 text-white"
  }

  const statusColors = {
    confirmed: "border-green-500",
    pending: "border-yellow-500",
    completed: "border-gray-400"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl" data-testid="text-calendar-title">
              {monthNames[currentMonth]} {currentYear}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth} data-testid="button-previous-month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button data-testid="button-add-appointment">
                <Plus className="h-4 w-4 mr-2" />
                Book Session
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {daysOfWeek.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} className="p-2 h-24"></div>
            ))}
            
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1
              const isToday = isCurrentMonth && day === today
              
              return (
                <div
                  key={day}
                  className={`p-2 h-24 border border-border rounded-lg hover-elevate ${
                    isToday ? 'bg-primary/10 border-primary' : ''
                  }`}
                  data-testid={`calendar-day-${day}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                    {day}
                  </div>
                  {/* Show events for specific days (simplified for demo) */}
                  {day === 15 && (
                    <div className="space-y-1">
                      <div className="text-xs bg-primary text-primary-foreground px-1 py-0.5 rounded truncate">
                        Sarah 9AM
                      </div>
                    </div>
                  )}
                  {day === 20 && (
                    <div className="space-y-1">
                      <div className="text-xs bg-blue-500 text-white px-1 py-0.5 rounded truncate">
                        Mike 2PM
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-today-schedule-title">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allEvents.map((event, index) => (
              <div 
                key={event.id} 
                className={`flex items-center justify-between p-3 rounded-lg border-l-4 bg-muted/50 hover-elevate ${statusColors[event.status]}`}
                data-testid={`event-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-muted-foreground" data-testid={`text-event-time-${index}`}>
                    {event.time}
                  </div>
                  <div>
                    <p className="font-medium" data-testid={`text-event-title-${index}`}>
                      {event.title}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-event-client-${index}`}>
                      {event.client}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={typeColors[event.type]}>
                    {event.type}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {event.status}
                  </Badge>
                </div>
              </div>
            ))}
            {allEvents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No appointments scheduled for today</p>
                <Button variant="outline" className="mt-4" data-testid="button-schedule-first-session">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule First Session
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}