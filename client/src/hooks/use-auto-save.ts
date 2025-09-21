import { useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';

interface UseAutoSaveOptions {
  onSave: (data: any) => Promise<void>;
  data: any;
  delay?: number;
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAutoSave({
  onSave,
  data,
  delay = 2000, // Default 2 seconds
  enabled = true,
  onSuccess,
  onError
}: UseAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const { toast } = useToast();

  const save = useCallback(async () => {
    if (isSavingRef.current) return;
    
    const currentData = JSON.stringify(data);
    
    // Skip if data hasn't changed
    if (currentData === lastSavedDataRef.current) return;
    
    isSavingRef.current = true;
    
    try {
      await onSave(data);
      lastSavedDataRef.current = currentData;
      onSuccess?.();
      
      // Show subtle success indicator
      toast({
        title: "Auto-saved",
        description: "Your changes have been saved automatically",
        duration: 1500,
      });
    } catch (error) {
      onError?.(error as Error);
      toast({
        title: "Auto-save failed",
        description: "Your changes could not be saved automatically",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave, onSuccess, onError, toast]);

  // Debounced auto-save
  useEffect(() => {
    if (!enabled) return;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(save, delay);
    
    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  // Force save immediately
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return save();
  }, [save]);

  return {
    saveNow,
    isSaving: isSavingRef.current
  };
}