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
import { Loader2, Plus, Edit, Trash2 } from "lucide-react"
import { z } from "zod"

// Form schema - extend insertClientSchema with frontend validation
const clientFormSchema = insertClientSchema.extend({
  goal: z.string().min(1, "Goal is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional().refine((phone) => {
    if (!phone) return true;
    return phone.length >= 10;
  }, "Phone number should be at least 10 digits")
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
      phone: client?.phone || "",
      goal: client?.goal || "",
      status: client?.status || "active",
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
      if (data.phone !== client?.phone) changedData.phone = data.phone
      if (data.goal !== client?.goal) changedData.goal = data.goal
      if (data.status !== client?.status) changedData.status = data.status
      
      updateClientMutation.mutate(changedData)
    }
  }, [mode, createClientMutation, updateClientMutation, client])

  const isPending = createClientMutation.isPending || updateClientMutation.isPending

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]" data-testid="client-form-modal">
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(555) 123-4567" 
                        data-testid="input-client-phone"
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
        <Button className={className} data-testid="button-new-client">
          <Plus className="mr-2 h-4 w-4" />
          New Client
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