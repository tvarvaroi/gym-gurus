import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Target, ListOrdered, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  muscleGroups: string[];
  equipment: string[];
  instructions: string[];
  youtubeUrl?: string;
  imageUrl?: string;
  defaultSets?: number;
  defaultReps?: number;
}

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  onClose: () => void;
}

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [/[?&]v=([^&#]+)/, /youtu\.be\/([^?&#]+)/, /youtube\.com\/embed\/([^?&#]+)/];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function ExerciseDetailModal({ exercise, onClose }: ExerciseDetailModalProps) {
  if (!exercise) return null;

  const videoId = exercise.youtubeUrl ? extractYouTubeVideoId(exercise.youtubeUrl) : null;

  return (
    <Dialog
      open={!!exercise}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl leading-snug">{exercise.name}</DialogTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {exercise.category}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs ${DIFFICULTY_COLORS[exercise.difficulty]}`}
                >
                  {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                </Badge>
                {exercise.defaultSets && exercise.defaultReps && (
                  <Badge variant="secondary" className="text-xs">
                    {exercise.defaultSets} × {exercise.defaultReps} reps
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{exercise.description}</p>

          {/* YouTube Embed */}
          {videoId ? (
            <div className="rounded-lg overflow-hidden aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                title={`${exercise.name} demonstration`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : exercise.imageUrl ? (
            <div className="rounded-lg overflow-hidden bg-muted">
              <img
                src={exercise.imageUrl}
                alt={exercise.name}
                className="w-full object-cover max-h-48"
              />
            </div>
          ) : null}

          {/* Muscle Groups */}
          {exercise.muscleGroups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="w-4 h-4 text-primary" />
                <span>Muscles Worked</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {exercise.muscleGroups.map((mg) => (
                  <Badge key={mg} variant="secondary" className="text-xs">
                    {mg}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Equipment */}
          {exercise.equipment.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Dumbbell className="w-4 h-4 text-primary" />
                <span>Equipment Required</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {exercise.equipment.map((eq) => (
                  <Badge key={eq} variant="outline" className="text-xs">
                    {eq}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {exercise.instructions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ListOrdered className="w-4 h-4 text-primary" />
                <span>Instructions</span>
              </div>
              <ol className="space-y-2.5">
                {exercise.instructions.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* External link to YouTube */}
          {exercise.youtubeUrl && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => window.open(exercise.youtubeUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              Watch on YouTube
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
