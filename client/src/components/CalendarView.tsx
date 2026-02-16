import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TruncatedText } from "./TruncatedText";
import { useUser } from "@/contexts/UserContext";

interface CalendarEvent {
  id: string;
  title: string;
  client: string;
  time: string; // 24-hour format HH:MM
  type: "session" | "consultation" | "check-in";
  status: "confirmed" | "pending" | "completed";
  date?: string; // Date in YYYY-MM-DD format
}

interface CalendarViewProps {
  events?: CalendarEvent[];
}

const CalendarView = memo(({ events = [] }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { isClient } = useUser();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Helper function to get events for a specific date - sorted chronologically
  const getEventsForDate = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events
      .filter(event => event.date === dateStr)
      .sort((a, b) => {
        // Parse 24-hour time format (HH:MM)
        const parseTime = (timeStr: string) => {
          const parts = timeStr.split(':');
          if (parts.length !== 2) return 0;
          const hours = parseInt(parts[0]) || 0;
          const minutes = parseInt(parts[1]) || 0;
          return hours * 60 + minutes; // Return total minutes for comparison
        };

        return parseTime(a.time) - parseTime(b.time);
      });
  };

  // Get selected day's appointments
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    const [year, month, day] = selectedDate.split('-').map(Number);
    return getEventsForDate(day);
  }, [selectedDate, events]);

  // Convert 24-hour to 12-hour format for display
  const formatTime = (time24: string) => {
    const parts = time24.split(':');
    if (parts.length !== 2) return time24;
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date().getDate();
  const isCurrentMonth =
    new Date().getMonth() === currentMonth &&
    new Date().getFullYear() === currentYear;

  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1));
    setSelectedDate(null);
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr === selectedDate ? null : dateStr);
  };

  const typeConfig = {
    session: {
      gradient: 'from-primary/15 via-primary/8 to-transparent',
      border: 'border-primary/25',
      text: 'text-primary',
      dot: 'bg-gradient-to-br from-primary to-accent',
      glow: 'shadow-md shadow-primary/15'
    },
    consultation: {
      gradient: 'from-teal-600/15 via-teal-500/8 to-transparent',
      border: 'border-teal-600/25',
      text: 'text-teal-700 dark:text-teal-400',
      dot: 'bg-gradient-to-br from-teal-600 to-teal-700',
      glow: 'shadow-md shadow-teal-600/15'
    },
    "check-in": {
      gradient: 'from-accent/15 via-accent/8 to-transparent',
      border: 'border-accent/25',
      text: 'text-accent-foreground',
      dot: 'bg-gradient-to-br from-accent to-primary',
      glow: 'shadow-md shadow-accent/15'
    },
  };

  return (
    <div className="space-y-6">
      {/* Calendar Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Card className="relative overflow-hidden shadow-xl dark:from-background dark:via-background dark:to-background border-primary/10 shadow-primary/5 bg-gradient-to-br from-accent/30 via-white to-background/30">
          {/* Elegant subtle overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/3 pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)_/_0.05),transparent_50%)]" />

          <CardHeader className="relative pb-8 border-b border-primary/5">
            <div className="flex items-center justify-between">
              <CardTitle
                className="text-4xl font-extralight tracking-wider flex items-baseline gap-3 text-primary/90"
                data-testid="text-calendar-title"
              >
                {monthNames[currentMonth]}
                <span className="font-thin text-2xl text-primary/60">{currentYear}</span>
              </CardTitle>
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="border border-primary/10 hover:bg-primary/5 hover:border-primary/20 transition-all duration-500 rounded-xl"
                    onClick={previousMonth}
                    data-testid="button-previous-month"
                  >
                    <ChevronLeft className="h-4 w-4 text-primary" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="border border-primary/10 hover:bg-primary/5 hover:border-primary/20 transition-all duration-500 rounded-xl"
                    onClick={nextMonth}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative pt-8">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-4 mb-6">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-xs font-light tracking-widest uppercase text-primary/50"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-4">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`empty-${index}`} className="h-[160px]"></div>
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const isToday = isCurrentMonth && day === today;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                const dayEvents = getEventsForDate(day);
                const hasEvents = dayEvents.length > 0;

                return (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.008, duration: 0.5 }}
                    whileHover={{ y: -2 }}
                    onClick={() => handleDayClick(day)}
                  >
                    <div
                      className={cn(
                        "relative group cursor-pointer h-[160px] p-4",
                        "border rounded-3xl transition-all duration-500",
                        "flex flex-col",
                        isSelected && "ring-1 ring-primary/30 ring-offset-2 ring-offset-background shadow-lg shadow-primary/20 bg-gradient-to-br from-accent/40 to-background/30 dark:from-primary/10 dark:to-background/10",
                        isToday && !isSelected && "bg-gradient-to-br from-accent/50 via-accent/30 to-white dark:from-primary/10 dark:via-primary/5 dark:to-background border-primary/20 shadow-md shadow-primary/10",
                        !isToday && !isSelected && "bg-white/40 dark:bg-background/40 border-primary/8 hover:border-primary/15 hover:shadow-lg hover:shadow-primary/8 hover:bg-gradient-to-br hover:from-accent/30 hover:to-transparent"
                      )}
                      data-testid={`calendar-day-${day}`}
                    >
                      {/* Elegant subtle shimmer on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-3xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/8 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1500" />
                      </div>

                      {/* Day header */}
                      <div className="relative flex items-center justify-between mb-4">
                        <span className={cn(
                          "text-lg font-light tracking-wide",
                          isToday && "text-primary font-normal",
                          !isToday && "text-primary/70",
                          isSelected && "text-primary"
                        )}>
                          {day}
                        </span>
                        {hasEvents && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                            className={cn(
                              "text-[9px] font-medium px-2 py-0.5 rounded-full",
                              "border backdrop-blur-sm",
                              (isToday || isSelected) && "bg-primary/20 text-primary border-primary/30",
                              !isToday && !isSelected && "bg-primary/10 text-primary/80 border-primary/20"
                            )}
                          >
                            {dayEvents.length}
                          </motion.div>
                        )}
                      </div>

                      {/* Events list - scrollable if content overflows */}
                      <div className="relative flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-3 [&::-webkit-scrollbar]:w-[1.5px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:transition-all [&::-webkit-scrollbar-thumb]:duration-500 [&::-webkit-scrollbar-thumb]:bg-primary/20 hover:[&::-webkit-scrollbar-thumb]:bg-primary/30">
                        <AnimatePresence mode="popLayout">
                          {dayEvents.map((event, idx) => {
                            const config = typeConfig[event.type];
                            return (
                              <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ delay: idx * 0.08, duration: 0.4 }}
                                className={cn(
                                  "relative group/event p-2 rounded-2xl",
                                  "bg-gradient-to-r backdrop-blur-sm",
                                  "border transition-all duration-500",
                                  "hover:shadow-md cursor-pointer",
                                  config.gradient,
                                  config.border,
                                  config.glow
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {/* Status dot */}
                                  <div className="relative flex-shrink-0">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
                                  </div>

                                  {/* Time - 24-hour format displayed directly */}
                                  <div className={cn("text-[11px] font-medium flex-shrink-0 tracking-wide", config.text)}>
                                    {event.time}
                                  </div>

                                  {/* Event title with ellipsis */}
                                  <TruncatedText
                                    as="div"
                                    text={event.title}
                                    className={cn(
                                      "text-[11px] font-normal flex-1 min-w-0 tracking-wide",
                                      config.text,
                                      "opacity-90"
                                    )}
                                  />
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Selected Day's Schedule */}
      <AnimatePresence mode="wait">
        {selectedDate && selectedDayAppointments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Card className="relative overflow-hidden shadow-xl dark:from-background dark:via-background dark:to-background border-primary/10 shadow-primary/5 bg-gradient-to-br from-accent/30 via-white to-background/30">
              {/* Elegant subtle overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/3 pointer-events-none" />
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)_/_0.05),transparent_50%)]" />

              <CardHeader className="relative pb-6 border-b border-primary/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-extralight tracking-wider text-primary/90">
                    Schedule for {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </CardTitle>
                  <Badge variant="outline" className="font-light px-3 py-1 tracking-wide border-primary/20 bg-primary/10 text-primary">
                    {selectedDayAppointments.length} {selectedDayAppointments.length === 1 ? 'appointment' : 'appointments'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative pt-6 space-y-5">
                {selectedDayAppointments.map((event, idx) => {
                  const config = typeConfig[event.type];
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.12, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                      whileHover={{ y: -2 }}
                      className={cn(
                        "relative group p-5 rounded-3xl",
                        "bg-gradient-to-r backdrop-blur-sm",
                        "border shadow-md hover:shadow-lg",
                        "transition-all duration-500 cursor-pointer",
                        config.gradient,
                        config.border,
                        config.glow
                      )}
                    >
                      {/* Elegant subtle shimmer */}
                      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1500" />
                      </div>

                      <div className="relative flex items-center gap-6">
                        {/* Time badge */}
                        <div className={cn(
                          "flex-shrink-0 px-4 py-2.5 rounded-2xl",
                          "border backdrop-blur-sm shadow-sm",
                          "flex items-center gap-2.5",
                          config.border,
                          "bg-white/40 dark:bg-background/40"
                        )}>
                          <Clock className={cn("w-4 h-4", config.text)} />
                          <span className={cn("text-sm font-medium tracking-wide", config.text)}>
                            {formatTime(event.time)}
                          </span>
                        </div>

                        {/* Event details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={cn("w-2 h-2 rounded-full", config.dot)} />
                            <TruncatedText
                              as="h3"
                              text={event.title}
                              className={cn("font-medium text-base tracking-wide", config.text)}
                            />
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-3.5 h-3.5" />
                            <TruncatedText text={event.client} className="font-light" />
                          </div>
                        </div>

                        {/* Status badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex-shrink-0 px-3 py-1 font-light tracking-wide border shadow-sm",
                            event.status === 'confirmed' && "border-teal-600/25 bg-teal-500/10 text-teal-700 dark:text-teal-400",
                            event.status === 'pending' && "border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                            event.status === 'completed' && "border-gray-600/25 bg-gray-500/10 text-gray-700 dark:text-gray-400"
                          )}
                        >
                          {event.status}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CalendarView.displayName = "CalendarView";

export default CalendarView;
