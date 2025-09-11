import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const progressFormSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  type: z.string().min(1, "Progress type is required"),
  value: z.string().min(1, "Value is required"),
  unit: z.string().min(1, "Unit is required"),
  notes: z.string().optional(),
});

type ProgressFormData = z.infer<typeof progressFormSchema>;

interface ProgressFormModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
}

const progressTypes = [
  { value: "weight", label: "Weight" },
  { value: "body_fat", label: "Body Fat %" },
  { value: "muscle_mass", label: "Muscle Mass" },
  { value: "measurements", label: "Body Measurements" },
  { value: "workout_completion", label: "Workout Completion" },
];

const units = {
  weight: ["lbs", "kg"],
  body_fat: ["%"],
  muscle_mass: ["lbs", "kg"],
  measurements: ["inches", "cm"],
  workout_completion: ["workouts", "sessions"],
};

export default function ProgressFormModal({ open, onClose, clientId }: ProgressFormModalProps) {
  const [selectedType, setSelectedType] = useState<string>("");
  const { toast } = useToast();

  const form = useForm<ProgressFormData>({
    resolver: zodResolver(progressFormSchema),
    defaultValues: {
      clientId,
      type: "",
      value: "",
      unit: "",
      notes: "",
    },
  });

  const addProgressMutation = useMutation({
    mutationFn: async (data: ProgressFormData) => {
      const response = await fetch('/api/progress-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to add progress entry');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/clients', clientId, 'progress'] 
      });
      toast({
        title: "Progress Added",
        description: "Progress entry added successfully",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add progress entry",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ProgressFormData) => {
    addProgressMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setSelectedType("");
    onClose();
  };

  const watchedType = form.watch("type");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Add Progress Entry
          </DialogTitle>
          <DialogDescription>
            Track your client's fitness progress with measurements and notes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedType(value);
                      form.setValue("unit", ""); // Reset unit when type changes
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-progress-type">
                        <SelectValue placeholder="Select progress type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {progressTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter value"
                        {...field}
                        data-testid="input-progress-value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-progress-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {watchedType && (units as any)[watchedType]?.map((unit: string) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes..."
                      className="resize-none"
                      {...field}
                      data-testid="textarea-progress-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                data-testid="button-cancel-progress"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addProgressMutation.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-save-progress"
              >
                {addProgressMutation.isPending ? "Adding..." : "Add Progress"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}