import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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
      gradient: isClient ? 'from-cyan-500/15 via-cyan-400/8 to-transparent' : 'from-[#c9a855]/15 via-[#c9a855]/8 to-transparent',
      border: isClient ? 'border-cyan-600/25' : 'border-[#c9a855]/25',
      text: isClient ? 'text-cyan-700 dark:text-cyan-400' : 'text-[#c9a855] dark:text-[#d4b76a]',
      dot: isClient ? 'bg-gradient-to-br from-cyan-500 to-cyan-600' : 'bg-gradient-to-br from-[#c9a855] to-teal-600',
      glow: isClient ? 'shadow-md shadow-cyan-500/15' : 'shadow-md shadow-[#c9a855]/15'
    },
    consultation: {
      gradient: 'from-teal-600/15 via-teal-500/8 to-transparent',
      border: 'border-teal-600/25',
      text: 'text-teal-700 dark:text-teal-400',
      dot: 'bg-gradient-to-br from-teal-600 to-teal-700',
      glow: 'shadow-md shadow-teal-600/15'
    },
    "check-in": {
      gradient: isClient ? 'from-sky-500/15 via-sky-400/8 to-transparent' : 'from-teal-500/15 via-teal-400/8 to-transparent',
      border: isClient ? 'border-sky-600/25' : 'border-teal-600/25',
      text: isClient ? 'text-sky-700 dark:text-sky-400' : 'text-teal-700 dark:text-teal-400',
      dot: isClient ? 'bg-gradient-to-br from-sky-500 to-sky-600' : 'bg-gradient-to-br from-[#c9a855] to-teal-600',
      glow: isClient ? 'shadow-md shadow-sky-500/15' : 'shadow-md shadow-teal-500/15'
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
        <Card className={cn(
          "relative overflow-hidden shadow-xl dark:from-background dark:via-background dark:to-background",
          isClient
            ? "border-cyan-900/10 dark:border-cyan-200/10 shadow-cyan-900/5 bg-gradient-to-br from-cyan-50/50 via-white to-teal-50/30"
            : "border-[#8a7439]/10 dark:border-[#f4dea8]/10 shadow-[#8a7439]/5 bg-gradient-to-br from-[#fdf9f2]/50 via-white to-teal-50/30"
        )}>
          {/* Elegant subtle overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br via-transparent pointer-events-none",
            isClient ? "from-cyan-500/3 to-teal-600/3" : "from-[#d4b76a]/3 to-teal-600/3"
          )} />
          <div className={cn(
            "absolute inset-0 pointer-events-none",
            isClient
              ? "bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.05),transparent_50%)]"
              : "bg-[radial-gradient(circle_at_30%_20%,rgba(201,168,85,0.05),transparent_50%)]"
          )} />

          <CardHeader className={cn(
            "relative pb-8 border-b",
            isClient ? "border-cyan-900/5 dark:border-cyan-200/5" : "border-[#8a7439]/5 dark:border-[#f4dea8]/5"
          )}>
            <div className="flex items-center justify-between">
              <CardTitle
                className={cn(
                  "text-4xl font-extralight tracking-wider flex items-baseline gap-3",
                  isClient ? "text-cyan-900/90 dark:text-cyan-100/90" : "text-[#8a7439]/90 dark:text-[#f9ecce]/90"
                )}
                data-testid="text-calendar-title"
              >
                {monthNames[currentMonth]}
                <span className={cn(
                  "font-thin text-2xl",
                  isClient ? "text-cyan-900/60 dark:text-cyan-100/60" : "text-[#8a7439]/60 dark:text-[#f9ecce]/60"
                )}>{currentYear}</span>
              </CardTitle>
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "border transition-all duration-500 rounded-xl",
                      isClient
                        ? "border-cyan-900/10 dark:border-cyan-200/10 hover:bg-cyan-500/5 hover:border-cyan-600/20"
                        : "border-[#8a7439]/10 dark:border-[#f4dea8]/10 hover:bg-[#d4b76a]/5 hover:border-[#c9a855]/20"
                    )}
                    onClick={previousMonth}
                    data-testid="button-previous-month"
                  >
                    <ChevronLeft className={cn(
                      "h-4 w-4",
                      isClient ? "text-cyan-800 dark:text-cyan-300" : "text-[#a08948] dark:text-[#e9d193]"
                    )} />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "border transition-all duration-500 rounded-xl",
                      isClient
                        ? "border-cyan-900/10 dark:border-cyan-200/10 hover:bg-cyan-500/5 hover:border-cyan-600/20"
                        : "border-[#8a7439]/10 dark:border-[#f4dea8]/10 hover:bg-[#d4b76a]/5 hover:border-[#c9a855]/20"
                    )}
                    onClick={nextMonth}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className={cn(
                      "h-4 w-4",
                      isClient ? "text-cyan-800 dark:text-cyan-300" : "text-[#a08948] dark:text-[#e9d193]"
                    )} />
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
                  className={cn(
                    "p-2 text-center text-xs font-light tracking-widest uppercase",
                    isClient ? "text-cyan-900/50 dark:text-cyan-100/50" : "text-[#8a7439]/50 dark:text-[#f9ecce]/50"
                  )}
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
                        isSelected && (isClient
                          ? "ring-1 ring-cyan-600/30 ring-offset-2 ring-offset-background shadow-lg shadow-cyan-500/20 bg-gradient-to-br from-cyan-50 to-teal-50/30 dark:from-cyan-950/20 dark:to-teal-950/10"
                          : "ring-1 ring-[#c9a855]/30 ring-offset-2 ring-offset-background shadow-lg shadow-[#d4b76a]/20 bg-gradient-to-br from-[#fdf9f2] to-teal-50/30 dark:from-[#6d5c2e]/20 dark:to-teal-950/10"),
                        isToday && !isSelected && (isClient
                          ? "bg-gradient-to-br from-cyan-100/40 via-cyan-50/30 to-white dark:from-cyan-900/10 dark:via-cyan-950/5 dark:to-background border-cyan-600/20 shadow-md shadow-cyan-500/10"
                          : "bg-gradient-to-br from-[#f9ecce]/40 via-[#fdf9f2]/30 to-white dark:from-[#8a7439]/10 dark:via-[#6d5c2e]/5 dark:to-background border-[#c9a855]/20 shadow-md shadow-[#d4b76a]/10"),
                        !isToday && !isSelected && (isClient
                          ? "bg-white/40 dark:bg-background/40 border-cyan-900/8 dark:border-cyan-200/5 hover:border-cyan-600/15 hover:shadow-lg hover:shadow-cyan-500/8 hover:bg-gradient-to-br hover:from-cyan-50/30 hover:to-transparent"
                          : "bg-white/40 dark:bg-background/40 border-[#8a7439]/8 dark:border-[#f4dea8]/5 hover:border-[#c9a855]/15 hover:shadow-lg hover:shadow-[#d4b76a]/8 hover:bg-gradient-to-br hover:from-[#fdf9f2]/30 hover:to-transparent")
                      )}
                      data-testid={`calendar-day-${day}`}
                    >
                      {/* Elegant subtle shimmer on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-3xl overflow-hidden">
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-r from-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1500",
                          isClient ? "via-cyan-400/8" : "via-[#dfc47f]/8"
                        )} />
                      </div>

                      {/* Day header */}
                      <div className="relative flex items-center justify-between mb-4">
                        <span className={cn(
                          "text-lg font-light tracking-wide",
                          isToday ? (isClient
                            ? "text-cyan-800 dark:text-cyan-300 font-normal"
                            : "text-[#a08948] dark:text-[#e9d193] font-normal")
                            : (isClient
                              ? "text-cyan-900/70 dark:text-cyan-100/70"
                              : "text-[#8a7439]/70 dark:text-[#f9ecce]/70"),
                          isSelected && (isClient
                            ? "text-cyan-800 dark:text-cyan-300"
                            : "text-[#a08948] dark:text-[#e9d193]")
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
                              isToday || isSelected
                                ? (isClient
                                  ? "bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-600/30"
                                  : "bg-[#d4b76a]/20 text-[#a08948] dark:text-[#e9d193] border-[#c9a855]/30")
                                : (isClient
                                  ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-600/20"
                                  : "bg-[#d4b76a]/10 text-[#b69a4f] dark:text-[#dfc47f] border-[#c9a855]/20")
                            )}
                          >
                            {dayEvents.length}
                          </motion.div>
                        )}
                      </div>

                      {/* Events list - scrollable if content overflows */}
                      <div className={cn(
                        "relative flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-3",
                        "[&::-webkit-scrollbar]:w-[1.5px] [&::-webkit-scrollbar-track]:bg-transparent",
                        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-transparent",
                        "[&::-webkit-scrollbar-thumb]:transition-all [&::-webkit-scrollbar-thumb]:duration-500",
                        isClient
                          ? "[&::-webkit-scrollbar-thumb]:bg-cyan-600/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-600/30"
                          : "[&::-webkit-scrollbar-thumb]:bg-[#c9a855]/20 hover:[&::-webkit-scrollbar-thumb]:bg-[#c9a855]/30"
                      )}>
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
                                  <div className={cn(
                                    "text-[11px] font-normal truncate flex-1 min-w-0 tracking-wide",
                                    config.text,
                                    "opacity-90"
                                  )}>
                                    {event.title}
                                  </div>
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
            <Card className={cn(
              "relative overflow-hidden shadow-xl dark:from-background dark:via-background dark:to-background",
              isClient
                ? "border-cyan-900/10 dark:border-cyan-200/10 shadow-cyan-900/5 bg-gradient-to-br from-cyan-50/50 via-white to-teal-50/30"
                : "border-[#8a7439]/10 dark:border-[#f4dea8]/10 shadow-[#8a7439]/5 bg-gradient-to-br from-[#fdf9f2]/50 via-white to-teal-50/30"
            )}>
              {/* Elegant subtle overlay */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br via-transparent pointer-events-none",
                isClient ? "from-cyan-500/3 to-teal-600/3" : "from-[#d4b76a]/3 to-teal-600/3"
              )} />
              <div className={cn(
                "absolute inset-0 pointer-events-none",
                isClient
                  ? "bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.05),transparent_50%)]"
                  : "bg-[radial-gradient(circle_at_30%_20%,rgba(201,168,85,0.05),transparent_50%)]"
              )} />

              <CardHeader className={cn(
                "relative pb-6 border-b",
                isClient ? "border-cyan-900/5 dark:border-cyan-200/5" : "border-[#8a7439]/5 dark:border-[#f4dea8]/5"
              )}>
                <div className="flex items-center justify-between">
                  <CardTitle className={cn(
                    "text-2xl font-extralight tracking-wider",
                    isClient ? "text-cyan-900/90 dark:text-cyan-100/90" : "text-[#8a7439]/90 dark:text-[#f9ecce]/90"
                  )}>
                    Schedule for {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </CardTitle>
                  <Badge variant="outline" className={cn(
                    "font-light px-3 py-1 tracking-wide",
                    isClient
                      ? "border-cyan-600/20 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300"
                      : "border-[#c9a855]/20 bg-[#d4b76a]/10 text-[#a08948] dark:text-[#e9d193]"
                  )}>
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
                            <h4 className={cn("font-medium text-base truncate tracking-wide", config.text)}>
                              {event.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-3.5 h-3.5" />
                            <span className="truncate font-light">{event.client}</span>
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
