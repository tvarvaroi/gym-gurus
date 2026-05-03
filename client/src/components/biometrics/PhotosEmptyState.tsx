import { Camera } from 'lucide-react';
import { ActionButton } from '@/components/ui/premium/ActionButton';

interface PhotosEmptyStateProps {
  onAddPhoto: () => void;
}

export function PhotosEmptyState({ onAddPhoto }: PhotosEmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 md:py-20 px-6">
      <div className="mb-6 p-5 rounded-full bg-primary/10">
        <Camera className="w-12 h-12 md:w-14 md:h-14 text-primary" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl md:text-2xl font-['Playfair_Display'] font-light tracking-tight text-foreground">
        Capture your starting point.
      </h2>
      <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-[420px] leading-relaxed">
        Photos are private to you. Use them to see what numbers can&apos;t show.
      </p>
      <ActionButton
        variant="primary"
        size="md"
        className="mt-8"
        onClick={onAddPhoto}
        icon={<Camera className="w-4 h-4" />}
      >
        Add first photo
      </ActionButton>
    </div>
  );
}
