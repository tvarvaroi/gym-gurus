import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/premium/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  Calendar,
  Target,
  Dumbbell,
  Clock,
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';

interface ProgramExercise {
  name: string;
  sets: number;
  reps: string;
  rpe?: number;
  rest: string;
  notes?: string;
}

interface ProgramDay {
  dayNumber: number;
  label: string;
  exercises: ProgramExercise[];
}

interface ProgramWeek {
  id: string;
  weekNumber: number;
  label: string;
  notes?: string;
  days: ProgramDay[];
}

interface ProgramEnrollment {
  id: string;
  currentWeek: number;
  currentDay: number;
  status: string;
  startedAt: string;
  completedAt?: string;
}

interface ProgramDayCompletion {
  weekNumber: number;
  dayNumber: number;
  completedAt: string;
}

interface ProgramData {
  id: string;
  title: string;
  description: string;
  goal: string;
  experienceLevel: string;
  durationWeeks: number;
  daysPerWeek: number;
  isPublic: boolean;
  isTemplate: boolean;
  source: string;
  tags: string[];
  creatorId: string;
  weeks: ProgramWeek[];
  enrollment: ProgramEnrollment | null;
  completions: ProgramDayCompletion[];
}

export default function ProgramPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const { data: program, isLoading } = useQuery<ProgramData>({
    queryKey: ['/api/programs', id],
    queryFn: () => apiRequest(`/api/programs/${id}`),
    enabled: !!id,
  });

  // Auto-expand current week
  useEffect(() => {
    if (program?.enrollment) {
      setExpandedWeek(program.enrollment.currentWeek);
    } else if (program?.weeks?.length) {
      setExpandedWeek(1);
    }
  }, [program]);

  const enrollMutation = useMutation({
    mutationFn: () => apiRequest(`/api/programs/${id}/enroll`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', id] });
      toast({ title: 'Enrolled!', description: "Program started. Let's go!" });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to enroll', variant: 'destructive' });
    },
  });

  const completeDayMutation = useMutation({
    mutationFn: (params: { weekNumber: number; dayNumber: number }) =>
      apiRequest(`/api/programs/enrollments/${program?.enrollment?.id}/complete-day`, {
        method: 'POST',
        body: JSON.stringify(params),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', id] });
      toast({ title: 'Day complete!', description: 'Great work. Keep it going.' });
    },
  });

  const isDayCompleted = (weekNumber: number, dayNumber: number) => {
    return program?.completions?.some(
      (c) => c.weekNumber === weekNumber && c.dayNumber === dayNumber
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Program not found.</p>
      </div>
    );
  }

  const isOwner = user?.id === program.creatorId;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <PageHeader title={program.title} />
          {program.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl">{program.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className="capitalize">
              <Target className="w-3 h-3 mr-1" />
              {program.goal.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {program.experienceLevel}
            </Badge>
            <Badge variant="outline">
              <Calendar className="w-3 h-3 mr-1" />
              {program.durationWeeks} weeks
            </Badge>
            <Badge variant="outline">
              <Dumbbell className="w-3 h-3 mr-1" />
              {program.daysPerWeek} days/week
            </Badge>
            {program.source === 'ai' && (
              <Badge className="bg-primary/10 text-primary border-primary/20">AI Generated</Badge>
            )}
            {program.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {isOwner && (
            <Button variant="outline" onClick={() => navigate(`/programs/builder/${program.id}`)}>
              Edit
            </Button>
          )}
          {!program.enrollment && (
            <Button onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending}>
              <Play className="w-4 h-4 mr-2" />
              {enrollMutation.isPending ? 'Starting...' : 'Start Program'}
            </Button>
          )}
          {program.enrollment?.status === 'active' && (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-sm px-3 py-1.5">
              Active — Week {program.enrollment.currentWeek}, Day {program.enrollment.currentDay}
            </Badge>
          )}
          {program.enrollment?.status === 'completed' && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-3 py-1.5">
              <CheckCircle className="w-4 h-4 mr-1" /> Completed
            </Badge>
          )}
        </div>
      </div>

      {/* Weeks accordion */}
      <div className="space-y-3">
        {program.weeks.map((week) => {
          const isExpanded = expandedWeek === week.weekNumber;
          const isCurrent = program.enrollment?.currentWeek === week.weekNumber;
          const weekDaysCompleted =
            program.completions?.filter((c) => c.weekNumber === week.weekNumber).length ?? 0;
          const totalDays = week.days?.length || program.daysPerWeek;

          return (
            <Card
              key={week.weekNumber}
              className={`transition-all duration-200 ${
                isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border/50'
              }`}
            >
              <button
                className="w-full text-left"
                onClick={() => setExpandedWeek(isExpanded ? null : week.weekNumber)}
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-base font-medium">
                        Week {week.weekNumber}
                        {week.label && (
                          <span className="text-muted-foreground font-normal ml-2">
                            — {week.label}
                          </span>
                        )}
                      </CardTitle>
                      {isCurrent && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                          Current
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {weekDaysCompleted}/{totalDays} days
                    </span>
                  </div>
                </CardHeader>
              </button>

              {isExpanded && (
                <CardContent className="pt-0 px-4 pb-4">
                  {week.notes && (
                    <p className="text-sm text-muted-foreground mb-4 italic">{week.notes}</p>
                  )}

                  {!week.days || week.days.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      Follow the same structure as Week 1 with the progression notes above.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {week.days.map((day) => {
                        const completed = isDayCompleted(week.weekNumber, day.dayNumber);
                        const isCurrentDay =
                          isCurrent && program.enrollment?.currentDay === day.dayNumber;

                        return (
                          <Card
                            key={day.dayNumber}
                            className={`transition-all duration-200 ${
                              completed
                                ? 'bg-green-500/5 border-green-500/20'
                                : isCurrentDay
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'bg-card/50'
                            }`}
                          >
                            <CardHeader className="py-2 px-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {completed ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                                  )}
                                  <span className="font-medium text-sm">
                                    Day {day.dayNumber}: {day.label}
                                  </span>
                                </div>
                                {isCurrentDay && !completed && program.enrollment && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      completeDayMutation.mutate({
                                        weekNumber: week.weekNumber,
                                        dayNumber: day.dayNumber,
                                      });
                                    }}
                                    disabled={completeDayMutation.isPending}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Done
                                  </Button>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="py-0 px-3 pb-3">
                              <div className="space-y-1.5">
                                {day.exercises.map((ex, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between text-xs text-muted-foreground"
                                  >
                                    <span className="truncate flex-1 mr-2">{ex.name}</span>
                                    <span className="flex-shrink-0 tabular-nums">
                                      {ex.sets}×{ex.reps}
                                      {ex.rpe ? ` @${ex.rpe}` : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
