import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  Video,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  UserCircle,
  ClipboardCheck,
  Monitor,
  Repeat,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { TruncatedText } from '@/components/TruncatedText';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import CalendarView from '@/components/CalendarView';
import { useUser } from '@/contexts/UserContext';

// Combined Appointment + Workout Assignment form schema
const appointmentFormSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.date({
    required_error: 'Date is required',
  }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  type: z.enum(['training', 'consultation', 'assessment', 'online']),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal('')),
  // Optional workout assignment fields
  workoutId: z.string().optional(),
  workoutDuration: z.number().optional(),
  workoutCustomTitle: z.string().optional(),
  workoutCustomNotes: z.string().optional(),
  // Recurring session fields
  recurrencePattern: z.enum(['none', 'weekly', 'biweekly', 'monthly']).default('none'),
  recurrenceEndDate: z.date().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

interface Appointment {
  id: string;
  trainerId: string;
  clientId: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'training' | 'consultation' | 'assessment' | 'online';
  location?: string;
  meetingUrl?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  recurrencePattern?: string;
  parentAppointmentId?: string;
  client?: {
    name: string;
    email: string;
  };
}

// ─── Solo Schedule View (F1) ──────────────────────────────────────────────────

function SoloScheduleView() {
  const [currentDate] = useState<Date>(new Date());
  const prefersReducedMotion = useReducedMotion();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startDate = format(new Date(year, month, 1), 'yyyy-MM-dd');
  const endDate = format(new Date(year, month + 1, 0), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery<{ events: any[] }>({
    queryKey: ['/api/solo/schedule', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/solo/schedule?startDate=${startDate}&endDate=${endDate}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch schedule');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const events = data?.events || [];

  // Map events to CalendarView format
  const calendarEvents = events.map((e: any) => ({
    id: e.id,
    title: e.title,
    client:
      e.type === 'completed'
        ? `${e.duration || 0}min${e.volume ? ` · ${e.volume}kg` : ''}`
        : 'Tap to start',
    time: e.time || '09:00',
    type: e.type as 'completed' | 'planned' | 'rest',
    status: e.status as 'completed' | 'pending' | 'confirmed',
    date: e.date,
  }));

  // Count stats for the month
  const completedCount = events.filter((e: any) => e.type === 'completed').length;
  const plannedCount = events.filter((e: any) => e.type === 'planned').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-6xl font-extralight tracking-tight">
          My{' '}
          <span className="font-light bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Schedule
          </span>
        </h1>
        <p className="text-base md:text-lg font-light text-muted-foreground/80 leading-relaxed">
          Track your completed workouts and planned training days
        </p>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4"
      >
        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed this month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{plannedCount}</p>
              <p className="text-xs text-muted-foreground">Planned remaining</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Calendar */}
      {isLoading ? (
        <Card className="h-96 flex items-center justify-center border-border/50">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: prefersReducedMotion ? 0 : Infinity }}
          >
            <CalendarIcon className="w-12 h-12 text-muted-foreground/40" />
          </motion.div>
        </Card>
      ) : (
        <CalendarView events={calendarEvents} />
      )}
    </div>
  );
}

// ─── Trainer/Client Schedule Page ─────────────────────────────────────────────

export default function SchedulePage() {
  const { isSolo } = useUser();
  if (isSolo) return <SoloScheduleView />;
  return <TrainerClientSchedule />;
}

function TrainerClientSchedule() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'calendar'>('week');
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  // Get current user and role from context
  const { user, isLoading: userLoading, isClient, isTrainer } = useUser();

  // Fetch appointments - use different endpoint based on role
  const {
    data: appointments = [],
    isLoading,
    error,
  } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments', isClient],
    queryFn: async () => {
      // Use client-specific endpoint for clients, trainer endpoint for trainers
      // TrainerId is derived from session on the server — no ID in URL
      const endpoint = isClient ? `/api/appointments/client/${user?.id}` : '/api/appointments';

      const response = await fetch(endpoint);
      if (!response.ok) {
        // Return empty array if appointments endpoint doesn't exist yet
        if (response.status === 404) return [];
        throw new Error('Failed to fetch appointments');
      }
      const data = await response.json();
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id, // Only fetch when user is available
    retry: false, // Don't retry on error
  });

  // Fetch clients for appointment creation - FIXED ENDPOINT
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  // Fetch workouts for assignment
  const { data: workouts = [] } = useQuery({
    queryKey: ['/api/workouts'],
    queryFn: async () => {
      const response = await fetch('/api/workouts', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch workouts');
      return response.json();
    },
    enabled: isTrainer,
  });

  // Fetch workout assignments for trainer (to show on calendar)
  const { data: workoutAssignments = [] } = useQuery({
    queryKey: ['/api/workout-assignments/trainer'],
    queryFn: async () => {
      const response = await fetch('/api/workout-assignments/trainer', {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch workout assignments');
      }
      return response.json();
    },
    enabled: isTrainer && !!user?.id,
  });

  // Merge appointments and workout assignments for calendar display
  const allCalendarEvents = useMemo(() => {
    if (isClient) {
      // Clients only see appointments
      return appointments;
    }

    // Trainers see both appointments AND workout assignments
    const appointmentEvents = appointments.map((apt) => ({
      ...apt,
      type: 'appointment' as const,
    }));

    const workoutEvents = workoutAssignments.map((wa: any) => ({
      id: wa.id,
      title: `${wa.clientName}: ${wa.title}`,
      date: wa.scheduledDate,
      startTime: wa.scheduledTime || '00:00',
      endTime: '', // Workout assignments don't have end time
      type: 'workout' as const,
      status: wa.status || 'scheduled',
      clientId: wa.clientId,
      clientName: wa.clientName,
      workoutId: wa.workoutId,
      duration: wa.duration,
    }));

    return [...appointmentEvents, ...workoutEvents];
  }, [appointments, workoutAssignments, isClient]);

  const form = useForm<AppointmentFormData>({
    mode: 'onTouched',
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      clientId: '',
      title: '',
      description: '',
      date: new Date(),
      startTime: '',
      endTime: '',
      type: 'training',
      location: '',
      meetingUrl: '',
      // Workout assignment fields (optional)
      workoutId: '',
      workoutDuration: 60,
      workoutCustomTitle: '',
      workoutCustomNotes: '',
      recurrencePattern: 'none' as const,
      recurrenceEndDate: undefined,
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      console.log('🔍 [SchedulePage] Creating appointment with data:', data);
      console.log('🔍 [SchedulePage] workoutId:', data.workoutId, 'typeof:', typeof data.workoutId);

      // Create appointment (backend will automatically create workout assignment if workoutId is provided)
      const appointmentData = {
        clientId: data.clientId,
        title: data.title,
        description: data.description,
        date: format(data.date, 'yyyy-MM-dd'),
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type,
        location: data.location,
        meetingUrl: data.meetingUrl,
        trainerId: user?.id,
        status: 'scheduled',
        // Include workout assignment fields (backend will handle creating the workout assignment)
        workoutId: data.workoutId || undefined,
        workoutDuration: data.workoutDuration || undefined,
        workoutCustomTitle: data.workoutCustomTitle || undefined,
        workoutCustomNotes: data.workoutCustomNotes || undefined,
        // Recurring session fields
        recurrencePattern: data.recurrencePattern || 'none',
        recurrenceEndDate: data.recurrenceEndDate
          ? format(data.recurrenceEndDate, 'yyyy-MM-dd')
          : undefined,
      };
      console.log('📤 [SchedulePage] Sending appointment (with workout fields):', appointmentData);
      const appointment = await apiRequest('POST', '/api/appointments', appointmentData);
      console.log(
        '✅ [SchedulePage] Appointment created (backend handled workout assignment):',
        appointment
      );

      return appointment;
    },
    onSuccess: (result: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workout-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workout-assignments/trainer'] }); // Refresh trainer's calendar
      queryClient.invalidateQueries({ queryKey: ['/api/client/workouts/weekly'] }); // Refresh client's My Workouts page
      setShowAddModal(false);
      form.reset();
      const hasWorkout = variables.workoutId && variables.workoutId.trim() !== '';
      const recurringCount = result?.recurringCount;
      toast({
        title: 'Success',
        description: recurringCount
          ? `${recurringCount} recurring appointments scheduled${hasWorkout ? ' with workouts' : ''}`
          : hasWorkout
            ? 'Appointment scheduled and workout assigned successfully'
            : 'Appointment scheduled successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule appointment',
        variant: 'destructive',
      });
    },
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AppointmentFormData }) => {
      const formattedData = {
        ...data,
        date: format(data.date, 'yyyy-MM-dd'),
      };
      return apiRequest('PATCH', `/api/appointments/${id}`, formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setEditingAppointment(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'Appointment updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update appointment',
        variant: 'destructive',
      });
    },
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: 'Success',
        description: 'Appointment cancelled successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel appointment',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: AppointmentFormData) => {
    if (editingAppointment) {
      updateAppointmentMutation.mutate({ id: editingAppointment.id, data });
    } else {
      createAppointmentMutation.mutate(data);
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    form.reset({
      clientId: appointment.clientId,
      title: appointment.title,
      description: appointment.description || '',
      date: parseISO(appointment.date),
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      type: appointment.type,
      location: appointment.location || '',
      meetingUrl: appointment.meetingUrl || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    deleteAppointmentMutation.mutate(id);
  };

  // Get appointments and workout assignments for selected date/week - sorted chronologically by time
  const getAppointmentsForDate = (date: Date) => {
    return allCalendarEvents
      .filter((apt) => isSameDay(parseISO(apt.date), date))
      .sort((a, b) => {
        // Sort by start time in chronological order
        const timeA = a.startTime.split(':').map(Number);
        const timeB = b.startTime.split(':').map(Number);

        // Compare hours first, then minutes
        if (timeA[0] !== timeB[0]) {
          return timeA[0] - timeB[0]; // Sort by hour
        }
        return timeA[1] - timeB[1]; // Sort by minute if hours are equal
      });
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  // Premium color scheme for appointment types
  const typeConfig = {
    training: {
      color: 'from-blue-500 to-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-600',
      icon: Dumbbell,
      label: 'Training',
    },
    consultation: {
      color: 'from-emerald-500 to-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-600',
      icon: UserCircle,
      label: 'Consultation',
    },
    assessment: {
      color: 'from-purple-500 to-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-600',
      icon: ClipboardCheck,
      label: 'Assessment',
    },
    online: {
      color: 'from-orange-500 to-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      text: 'text-orange-600',
      icon: Monitor,
      label: 'Online',
    },
    workout: {
      color: 'from-cyan-500 to-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      text: 'text-cyan-600',
      icon: Dumbbell,
      label: 'Workout',
    },
    appointment: {
      color: 'from-blue-500 to-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-600',
      icon: CalendarIcon,
      label: 'Appointment',
    },
  };

  if (isLoading || userLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-extralight tracking-tight">
              Your{' '}
              <span className="font-light bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Schedule
              </span>
            </h1>
            <p className="text-base font-light text-muted-foreground/80 flex items-center gap-2">
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1.5,
                  repeat: prefersReducedMotion ? 0 : Infinity,
                  ease: 'easeInOut',
                }}
              >
                Loading your appointments...
              </motion.span>
            </p>
          </motion.div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              className="h-64 glass-strong rounded-2xl overflow-hidden relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{
                  duration: 1.5,
                  repeat: prefersReducedMotion ? 0 : Infinity,
                  ease: 'linear',
                  delay: i * 0.1,
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="relative inline-block">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <CalendarIcon className="h-20 w-20 text-muted-foreground/50" />
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-muted-foreground/10 to-transparent blur-xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
              duration: 2,
              repeat: prefersReducedMotion ? 0 : Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-light">Unable to load schedule</h2>
          <p className="text-base font-light text-muted-foreground/80">Please try again later</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/appointments'] })}
            className="shadow-premium hover:shadow-premium-lg transition-all duration-300"
          >
            Retry
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <h1 className="text-4xl md:text-6xl font-extralight tracking-tight">
            {isClient ? 'My ' : 'Your '}
            <span
              className={`font-light bg-gradient-to-r ${isClient ? 'from-cyan-500 via-teal-500 to-cyan-400' : 'from-primary via-primary/80 to-primary/60'} bg-clip-text text-transparent`}
            >
              Schedule
            </span>
          </h1>
          <p className="text-base md:text-lg font-light text-muted-foreground/80 leading-relaxed">
            {isClient
              ? 'View your upcoming training sessions and appointments'
              : 'Manage appointments and training sessions with precision'}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <TabsList className="backdrop-blur-xl bg-background/80 border border-border/30 shadow-premium">
              <TabsTrigger
                value="day"
                className={`transition-all duration-300 font-light ${
                  isClient
                    ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/10 data-[state=active]:to-teal-500/5 data-[state=active]:text-cyan-600'
                    : 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary'
                }`}
              >
                Day
              </TabsTrigger>
              <TabsTrigger
                value="week"
                className={`transition-all duration-300 font-light ${
                  isClient
                    ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/10 data-[state=active]:to-teal-500/5 data-[state=active]:text-cyan-600'
                    : 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary'
                }`}
              >
                Week
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className={`transition-all duration-300 font-light ${
                  isClient
                    ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/10 data-[state=active]:to-teal-500/5 data-[state=active]:text-cyan-600'
                    : 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary'
                }`}
              >
                Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {isTrainer && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Dialog
                open={showAddModal}
                onOpenChange={(open) => {
                  setShowAddModal(open);
                  if (!open) {
                    setEditingAppointment(null);
                    form.reset();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      className="relative bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 w-full sm:w-auto overflow-hidden group border-0"
                      data-testid="button-add-appointment"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <CalendarIcon className="mr-2 h-4 w-4 relative z-10" />
                      <span className="relative z-10 font-light">New Appointment</span>
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAppointment ? 'Edit' : 'Schedule'} Appointment
                    </DialogTitle>
                    <DialogDescription>
                      {editingAppointment
                        ? 'Update appointment details'
                        : 'Create a new appointment with a client'}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Client<span className="text-destructive ml-0.5">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-client">
                                  <SelectValue placeholder="Select a client" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients.map((client: any) => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Title<span className="text-destructive ml-0.5">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Personal Training Session"
                                {...field}
                                data-testid="input-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Additional notes or session plan"
                                {...field}
                                data-testid="input-description"
                                className="resize-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>
                                Date<span className="text-destructive ml-0.5">*</span>
                              </FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        'w-full pl-3 text-left font-normal',
                                        !field.value && 'text-muted-foreground'
                                      )}
                                      data-testid="button-select-date"
                                    >
                                      {field.value ? (
                                        format(field.value, 'PPP')
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date < new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Type<span className="text-destructive ml-0.5">*</span>
                              </FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-type">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="training">Training Session</SelectItem>
                                  <SelectItem value="consultation">Consultation</SelectItem>
                                  <SelectItem value="assessment">Assessment</SelectItem>
                                  <SelectItem value="online">Online Session</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Start Time<span className="text-destructive ml-0.5">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-start-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                End Time<span className="text-destructive ml-0.5">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-end-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Gym Floor, Studio A, Client's Home"
                                {...field}
                                data-testid="input-location"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="meetingUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meeting URL (For Online Sessions)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://zoom.us/j/..."
                                {...field}
                                data-testid="input-meeting-url"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Recurring Session Section */}
                      <div className="border-t pt-4 mt-6">
                        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Repeat className="h-4 w-4" />
                          Recurring Session (Optional)
                        </h3>

                        <FormField
                          control={form.control}
                          name="recurrencePattern"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Repeat</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="No repeat" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">Does not repeat</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch('recurrencePattern') !== 'none' && (
                          <FormField
                            control={form.control}
                            name="recurrenceEndDate"
                            render={({ field }) => (
                              <FormItem className="mt-3">
                                <FormLabel>Repeat Until</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          'w-full pl-3 text-left font-normal',
                                          !field.value && 'text-muted-foreground'
                                        )}
                                      >
                                        {field.value
                                          ? format(field.value, 'PPP')
                                          : 'Select end date (max 12 weeks)'}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) =>
                                        date < new Date() || date > addDays(new Date(), 84)
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      {/* Optional Workout Assignment Section */}
                      <div className="border-t pt-4 mt-6">
                        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Dumbbell className="h-4 w-4" />
                          Assign Workout (Optional)
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          Optionally assign a workout to this appointment
                        </p>

                        <FormField
                          control={form.control}
                          name="workoutId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Workout Template</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a workout (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {workouts.map((workout: any) => (
                                    <SelectItem key={workout.id} value={workout.id}>
                                      {workout.title} ({workout.duration} min)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="workoutDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Workout Duration (minutes)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="workoutCustomTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Custom Workout Title (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Upper Body Focus" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="workoutCustomNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Workout Notes (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Special instructions for this workout..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-4 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowAddModal(false);
                            setEditingAppointment(null);
                            form.reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            createAppointmentMutation.isPending ||
                            updateAppointmentMutation.isPending
                          }
                          data-testid="button-submit-appointment"
                        >
                          {createAppointmentMutation.isPending ||
                          updateAppointmentMutation.isPending
                            ? 'Saving...'
                            : editingAppointment
                              ? 'Update'
                              : 'Schedule'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </motion.div>
      </div>

      {/* Calendar Navigation */}
      {viewMode !== 'calendar' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="glass-strong border-border/50 shadow-premium">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 transition-all duration-300"
                    onClick={() => {
                      const newDate =
                        viewMode === 'week' ? addDays(selectedDate, -7) : addDays(selectedDate, -1);
                      setSelectedDate(newDate);
                    }}
                    data-testid="button-prev"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </motion.div>
                <h2 className="text-lg font-light tracking-wide">
                  {viewMode === 'week'
                    ? `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
                    : format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h2>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 transition-all duration-300"
                    onClick={() => {
                      const newDate =
                        viewMode === 'week' ? addDays(selectedDate, 7) : addDays(selectedDate, 1);
                      setSelectedDate(newDate);
                    }}
                    data-testid="button-next"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' ? (
        <CalendarView
          events={appointments.map((apt) => ({
            id: apt.id,
            title: apt.title,
            client: apt.client?.name || 'Unknown Client',
            time: apt.startTime,
            type:
              apt.type === 'training'
                ? 'session'
                : apt.type === 'consultation'
                  ? 'consultation'
                  : 'check-in',
            status:
              apt.status === 'scheduled'
                ? 'confirmed'
                : apt.status === 'completed'
                  ? 'completed'
                  : 'pending',
            date: apt.date, // Pass the date so CalendarView can filter by date
          }))}
        />
      ) : viewMode === 'week' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4"
        >
          {getWeekDays().map((day, dayIndex) => {
            const dayAppointments = getAppointmentsForDate(day);
            const isToday = isSameDay(day, new Date());

            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: dayIndex * 0.05 }}
              >
                <Card
                  className={cn(
                    'min-h-[280px] glass-strong border-border/50 transition-all duration-300 hover:shadow-premium-lg hover:-translate-y-1 group',
                    isToday && 'ring-2 ring-primary/50 shadow-premium'
                  )}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {format(day, 'EEE')}
                    </CardTitle>
                    <CardDescription
                      className={cn('text-2xl font-bold', isToday && 'text-primary')}
                    >
                      {format(day, 'd')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <AnimatePresence>
                      {dayAppointments.length === 0 ? (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-xs text-muted-foreground text-center py-8"
                        >
                          No appointments
                        </motion.p>
                      ) : (
                        dayAppointments.map((apt, index) => {
                          const config = typeConfig[apt.type];
                          const Icon = config.icon;

                          return (
                            <motion.div
                              key={apt.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ scale: 1.02, y: -2 }}
                              className={cn(
                                'p-3 rounded-lg backdrop-blur-sm transition-all border',
                                config.bg,
                                config.border,
                                'hover:shadow-md',
                                isTrainer && 'cursor-pointer'
                              )}
                              onClick={isTrainer ? () => handleEdit(apt) : undefined}
                              data-testid={`appointment-${apt.id}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className={cn('h-3 w-3', config.text)} />
                                <div className={cn('text-xs font-semibold', config.text)}>
                                  {apt.startTime}
                                </div>
                              </div>
                              <TruncatedText
                                as="div"
                                text={apt.client?.name || ''}
                                className="text-xs font-medium"
                              />
                              <TruncatedText
                                as="div"
                                text={apt.title}
                                className="text-xs text-muted-foreground"
                              />
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        // Day View
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="glass-strong border-border/50 shadow-premium">
            <CardContent className="p-6">
              {getAppointmentsForDate(selectedDate).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-6">
                  <div className="relative inline-block">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    >
                      <CalendarIcon className="h-20 w-20 text-muted-foreground/40" />
                    </motion.div>
                    <motion.div
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-muted-foreground/10 to-transparent blur-xl"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{
                        duration: 2,
                        repeat: prefersReducedMotion ? 0 : Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  </div>
                  <div className="space-y-2 text-center">
                    <h3 className="font-light text-xl">No appointments scheduled</h3>
                    <p className="text-sm font-light text-muted-foreground/80">
                      Click "New Appointment" to schedule a session
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {getAppointmentsForDate(selectedDate).map((appointment, index) => {
                      const config = typeConfig[appointment.type];
                      const Icon = config.icon;

                      return (
                        <motion.div
                          key={appointment.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="glass-strong border-border/50 hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-1 group">
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                  <div
                                    className={cn(
                                      'w-1 h-full rounded-full bg-gradient-to-b',
                                      config.color
                                    )}
                                  />
                                  <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <div
                                        className={cn(
                                          'flex items-center gap-2 px-3 py-1.5 rounded-full',
                                          config.bg,
                                          config.border,
                                          'border'
                                        )}
                                      >
                                        <Icon className={cn('h-4 w-4', config.text)} />
                                        <span className={cn('text-sm font-medium', config.text)}>
                                          {config.label}
                                        </span>
                                      </div>
                                      <h4 className="font-semibold text-lg">{appointment.title}</h4>
                                      {appointment.status === 'cancelled' && (
                                        <Badge variant="destructive" className="text-xs">
                                          Cancelled
                                        </Badge>
                                      )}
                                      {appointment.recurrencePattern &&
                                        appointment.recurrencePattern !== 'none' && (
                                          <Badge variant="outline" className="text-xs gap-1">
                                            <Repeat className="h-3 w-3" />
                                            {appointment.recurrencePattern === 'weekly'
                                              ? 'Weekly'
                                              : appointment.recurrencePattern === 'biweekly'
                                                ? 'Biweekly'
                                                : 'Monthly'}
                                          </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span className="font-medium">
                                          {appointment.startTime} - {appointment.endTime}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span>{appointment.client?.name}</span>
                                      </div>
                                      {appointment.location && (
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4" />
                                          <span>{appointment.location}</span>
                                        </div>
                                      )}
                                      {appointment.meetingUrl && (
                                        <div className="flex items-center gap-2">
                                          <Video className="h-4 w-4" />
                                          <a
                                            href={appointment.meetingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline text-primary hover:text-primary/80"
                                          >
                                            Join Online
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                    {appointment.description && (
                                      <p className="text-sm text-muted-foreground leading-relaxed">
                                        {appointment.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {isTrainer && (
                                  <div className="flex gap-2">
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="hover:bg-primary/10"
                                        onClick={() => handleEdit(appointment)}
                                        data-testid={`button-edit-${appointment.id}`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </motion.div>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <motion.div
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="hover:bg-destructive/10"
                                            data-testid={`button-delete-${appointment.id}`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </motion.div>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will cancel the appointment with{' '}
                                            {appointment.client?.name}. This action cannot be
                                            undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="flex justify-end gap-4">
                                          <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDelete(appointment.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Cancel Appointment
                                          </AlertDialogAction>
                                        </div>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
