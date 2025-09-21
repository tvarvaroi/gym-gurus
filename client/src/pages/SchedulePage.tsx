import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Calendar as CalendarIcon, Clock, User, MapPin, Video, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import CalendarView from "@/components/CalendarView";

// Appointment form schema
const appointmentFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.date({
    required_error: "Date is required",
  }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  type: z.enum(["training", "consultation", "assessment", "online"]),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal("")),
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
  type: "training" | "consultation" | "assessment" | "online";
  location?: string;
  meetingUrl?: string;
  status: "scheduled" | "completed" | "cancelled";
  client?: {
    name: string;
    email: string;
  };
}

// Temporary trainer ID for development
const TEMP_TRAINER_ID = "demo-trainer-123";

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<"week" | "day" | "calendar">("week");
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  // Fetch appointments
  const { data: appointments = [], isLoading, error } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments', TEMP_TRAINER_ID],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${TEMP_TRAINER_ID}`);
      if (!response.ok) {
        // Return empty array if appointments endpoint doesn't exist yet
        if (response.status === 404) return [];
        throw new Error('Failed to fetch appointments');
      }
      return response.json();
    }
  });

  // Fetch clients for appointment creation
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients', TEMP_TRAINER_ID],
    queryFn: () => fetch(`/api/clients/${TEMP_TRAINER_ID}`).then(res => res.json())
  });

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      clientId: "",
      title: "",
      description: "",
      date: new Date(),
      startTime: "",
      endTime: "",
      type: "training",
      location: "",
      meetingUrl: "",
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const formattedData = {
        ...data,
        trainerId: TEMP_TRAINER_ID,
        date: format(data.date, 'yyyy-MM-dd'),
        status: "scheduled",
      };
      return apiRequest('POST', '/api/appointments', formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setShowAddModal(false);
      form.reset();
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule appointment",
        variant: "destructive",
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
        title: "Success",
        description: "Appointment updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment",
        variant: "destructive",
      });
    },
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Success",
        description: "Appointment cancelled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
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
      description: appointment.description || "",
      date: parseISO(appointment.date),
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      type: appointment.type,
      location: appointment.location || "",
      meetingUrl: appointment.meetingUrl || "",
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    deleteAppointmentMutation.mutate(id);
  };

  // Get appointments for selected date/week
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => isSameDay(parseISO(apt.date), date));
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const typeColors = {
    training: "bg-blue-500",
    consultation: "bg-green-500",
    assessment: "bg-purple-500",
    online: "bg-orange-500",
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tight">Schedule</h1>
            <p className="text-lg font-light text-muted-foreground">Loading appointments...</p>
          </div>
        </div>
        <div className="h-96 bg-card/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <CalendarIcon className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Unable to load schedule</h2>
        <p className="text-muted-foreground">Please try again later</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/appointments'] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Schedule
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your appointments and training sessions
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="calendar">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={showAddModal} onOpenChange={(open) => {
            setShowAddModal(open);
            if (!open) {
              setEditingAppointment(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90" data-testid="button-add-appointment">
                <Plus className="mr-2 h-4 w-4" />
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingAppointment ? "Edit" : "Schedule"} Appointment</DialogTitle>
                <DialogDescription>
                  {editingAppointment ? "Update appointment details" : "Create a new appointment with a client"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
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
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Personal Training Session" {...field} data-testid="input-title" />
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-select-date"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
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
                          <FormLabel>Type</FormLabel>
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
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
                          <FormLabel>End Time</FormLabel>
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

                  <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => {
                      setShowAddModal(false);
                      setEditingAppointment(null);
                      form.reset();
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createAppointmentMutation.isPending || updateAppointmentMutation.isPending}
                      data-testid="button-submit-appointment"
                    >
                      {createAppointmentMutation.isPending || updateAppointmentMutation.isPending 
                        ? "Saving..." 
                        : editingAppointment ? "Update" : "Schedule"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Navigation */}
      {viewMode !== "calendar" && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  const newDate = viewMode === "week" 
                    ? addDays(selectedDate, -7)
                    : addDays(selectedDate, -1);
                  setSelectedDate(newDate);
                }}
                data-testid="button-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-medium">
                {viewMode === "week"
                  ? `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
                  : format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  const newDate = viewMode === "week" 
                    ? addDays(selectedDate, 7)
                    : addDays(selectedDate, 1);
                  setSelectedDate(newDate);
                }}
                data-testid="button-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" ? (
        <CalendarView />
      ) : viewMode === "week" ? (
        <div className="grid grid-cols-7 gap-4">
          {getWeekDays().map(day => {
            const dayAppointments = getAppointmentsForDate(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <Card key={day.toISOString()} className={cn("min-h-[200px]", isToday && "ring-2 ring-primary")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {format(day, 'EEE')}
                  </CardTitle>
                  <CardDescription className="text-lg">
                    {format(day, 'd')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayAppointments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No appointments
                    </p>
                  ) : (
                    dayAppointments.map(apt => (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "p-2 rounded-md text-white text-xs cursor-pointer hover:opacity-90",
                          typeColors[apt.type]
                        )}
                        onClick={() => handleEdit(apt)}
                        data-testid={`appointment-${apt.id}`}
                      >
                        <div className="font-medium">{apt.startTime}</div>
                        <div className="truncate">{apt.client?.name}</div>
                        <div className="truncate opacity-90">{apt.title}</div>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Day View
        <Card>
          <CardContent className="p-6">
            {getAppointmentsForDate(selectedDate).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <CalendarIcon className="h-12 w-12 text-muted-foreground" />
                <h3 className="font-medium text-lg">No appointments scheduled</h3>
                <p className="text-sm text-muted-foreground">
                  Click "New Appointment" to schedule a session
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {getAppointmentsForDate(selectedDate).map(appointment => (
                  <Card key={appointment.id} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-2 h-full rounded-full",
                            typeColors[appointment.type]
                          )} />
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{appointment.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {appointment.type}
                              </Badge>
                              {appointment.status === "cancelled" && (
                                <Badge variant="destructive" className="text-xs">
                                  Cancelled
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {appointment.startTime} - {appointment.endTime}
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {appointment.client?.name}
                              </div>
                              {appointment.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {appointment.location}
                                </div>
                              )}
                              {appointment.meetingUrl && (
                                <div className="flex items-center gap-1">
                                  <Video className="h-3 w-3" />
                                  <a href={appointment.meetingUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    Join Online
                                  </a>
                                </div>
                              )}
                            </div>
                            {appointment.description && (
                              <p className="text-sm text-muted-foreground">
                                {appointment.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(appointment)}
                            data-testid={`button-edit-${appointment.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-delete-${appointment.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will cancel the appointment with {appointment.client?.name}. This action cannot be undone.
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}