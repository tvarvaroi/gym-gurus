import { useState, useCallback, memo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { insertClientSchema, type InsertClient, type Client } from "@shared/schema"
import { apiRequest } from "@/lib/queryClient"
import { Loader2, Plus, Edit, Trash2, Info, Activity } from "lucide-react"
import { z } from "zod"

// Form schema - extend insertClientSchema with validation
const clientFormSchema = insertClientSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  goal: z.string().min(1, "Goal is required"),
  email: z.string().email("Please enter a valid email address"),
})

type ClientFormData = z.infer<typeof clientFormSchema>

interface ClientFormModalProps {
  mode: "create" | "edit"
  client?: Client
  trainerId: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ClientFormModal({ mode, client, trainerId, trigger, open, onOpenChange }: ClientFormModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Use external state if provided, otherwise use internal state
  const dialogOpen = open !== undefined ? open : isOpen
  const setDialogOpen = onOpenChange || setIsOpen

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      trainerId: trainerId,
      name: client?.name || "",
      email: client?.email || "",
      goal: client?.goal || "",
      status: client?.status || "active",
      // Biometric data
      age: client?.age || undefined,
      gender: client?.gender || undefined,
      height: client?.height || undefined,
      weight: client?.weight || undefined,
      activityLevel: client?.activityLevel || undefined,
      neckCircumference: client?.neckCircumference || undefined,
      waistCircumference: client?.waistCircumference || undefined,
      hipCircumference: client?.hipCircumference || undefined,
    },
  })

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: (data: InsertClient) => apiRequest('POST', '/api/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', trainerId] })
      setDialogOpen(false)
      form.reset()
      toast({
        title: "Success",
        description: "Client created successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
        variant: "destructive",
      })
    },
  })

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: (data: Partial<InsertClient>) => apiRequest('PUT', `/api/clients/${client?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', trainerId] })
      setDialogOpen(false)
      toast({
        title: "Success", 
        description: "Client updated successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update client",
        variant: "destructive",
      })
    },
  })

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/clients/${client?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', trainerId] })
      setDialogOpen(false) // Close the modal after successful deletion
      toast({
        title: "Success",
        description: "Client deleted successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      })
    },
  })

  const onSubmit = useCallback((data: ClientFormData) => {
    if (mode === "create") {
      createClientMutation.mutate(data)
    } else {
      // Only send changed fields for update
      const changedData: Partial<InsertClient> = {}
      if (data.name !== client?.name) changedData.name = data.name
      if (data.email !== client?.email) changedData.email = data.email
      if (data.goal !== client?.goal) changedData.goal = data.goal
      if (data.status !== client?.status) changedData.status = data.status
      // Biometric data
      if (data.age !== client?.age) changedData.age = data.age
      if (data.gender !== client?.gender) changedData.gender = data.gender
      if (data.height !== client?.height) changedData.height = data.height as any
      if (data.weight !== client?.weight) changedData.weight = data.weight as any
      if (data.activityLevel !== client?.activityLevel) changedData.activityLevel = data.activityLevel
      if (data.neckCircumference !== client?.neckCircumference) changedData.neckCircumference = data.neckCircumference as any
      if (data.waistCircumference !== client?.waistCircumference) changedData.waistCircumference = data.waistCircumference as any
      if (data.hipCircumference !== client?.hipCircumference) changedData.hipCircumference = data.hipCircumference as any

      updateClientMutation.mutate(changedData)
    }
  }, [mode, createClientMutation, updateClientMutation, client])

  const isPending = createClientMutation.isPending || updateClientMutation.isPending

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="client-form-modal">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">
            {mode === "create" ? "Add New Client" : "Edit Client"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Add a new client to your roster. Fill out their basic information to get started." 
              : "Update client information and training details."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter client's full name" 
                        data-testid="input-client-name"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="client@example.com" 
                        data-testid="input-client-email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fitness Goal</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the client's fitness goals and objectives"
                        className="resize-none"
                        data-testid="input-client-goal"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-client-status">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Biometric Data Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Activity className="h-4 w-4" />
                <span>Biometric Data</span>
                <span className="text-xs text-muted-foreground font-normal">(Optional - for body fat % & calorie calculations)</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Age */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 30"
                          min="1"
                          max="120"
                          {...field}
                          value={field.value || ''}
                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Gender */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Height */}
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 175"
                          min="50"
                          max="250"
                          step="0.1"
                          {...field}
                          value={field.value || ''}
                          onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Weight */}
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 75"
                          min="20"
                          max="300"
                          step="0.1"
                          {...field}
                          value={field.value || ''}
                          onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Activity Level */}
              <FormField
                control={form.control}
                name="activityLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentary (little/no exercise)</SelectItem>
                        <SelectItem value="lightly_active">Lightly Active (1-3 days/week)</SelectItem>
                        <SelectItem value="moderately_active">Moderately Active (3-5 days/week)</SelectItem>
                        <SelectItem value="active">Active (6-7 days/week)</SelectItem>
                        <SelectItem value="very_active">Very Active (2x per day)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Body Circumferences for Body Fat Calculation */}
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  <Info className="inline h-3 w-3 mr-1" />
                  Body circumferences are used for calculating body fat percentage using the US Navy Method
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Neck Circumference */}
                  <FormField
                    control={form.control}
                    name="neckCircumference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Neck (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 38"
                            min="10"
                            max="100"
                            step="0.1"
                            {...field}
                            value={field.value || ''}
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Waist Circumference */}
                  <FormField
                    control={form.control}
                    name="waistCircumference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waist (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 85"
                            min="10"
                            max="200"
                            step="0.1"
                            {...field}
                            value={field.value || ''}
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hip Circumference (for women) */}
                  <FormField
                    control={form.control}
                    name="hipCircumference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hip (cm) - For Women</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 95"
                            min="10"
                            max="200"
                            step="0.1"
                            {...field}
                            value={field.value || ''}
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-3">
              {mode === "edit" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm"
                      data-testid="button-delete-client"
                      disabled={isPending || deleteClientMutation.isPending}
                    >
                      {deleteClientMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent data-testid="dialog-delete-confirmation">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Client</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {client?.name}? This action cannot be undone.
                        All associated workout plans, progress data, and messages will be permanently removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <DialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteClientMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-delete"
                      >
                        Delete Client
                      </AlertDialogAction>
                    </DialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <div className="flex gap-3 ml-auto">
                <DialogClose asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  data-testid="button-submit"
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : mode === "create" ? (
                    <Plus className="mr-2 h-4 w-4" />
                  ) : (
                    <Edit className="mr-2 h-4 w-4" />
                  )}
                  {mode === "create" ? "Add Client" : "Update Client"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// Convenience components for specific use cases
export function NewClientButton({ trainerId, className }: { trainerId: string; className?: string }) {
  return (
    <ClientFormModal
      mode="create"
      trainerId={trainerId}
      trigger={
        <Button className={className} data-testid="button-add-client">
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      }
    />
  )
}

export function EditClientButton({ client, trainerId }: { client: Client; trainerId: string }) {
  return (
    <ClientFormModal
      mode="edit"
      client={client}
      trainerId={trainerId}
      trigger={
        <Button variant="outline" size="sm" data-testid={`button-edit-client-${client.id}`}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      }
    />
  )
}