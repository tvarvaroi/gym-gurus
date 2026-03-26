import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/premium/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'wouter';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rpe?: number;
  rest: string;
  notes?: string;
}

interface Day {
  dayNumber: number;
  label: string;
  exercises: Exercise[];
}

interface Week {
  weekNumber: number;
  label: string;
  notes?: string;
  days: Day[];
}

export default function ProgramBuilderPage() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('hypertrophy');
  const [experienceLevel, setExperienceLevel] = useState('intermediate');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [generating, setGenerating] = useState(false);

  // Load existing program if editing
  useQuery({
    queryKey: ['/api/programs', id],
    queryFn: async () => {
      const data = await apiRequest(`/api/programs/${id}`);
      setTitle(data.title);
      setDescription(data.description || '');
      setGoal(data.goal);
      setExperienceLevel(data.experienceLevel);
      setDurationWeeks(data.durationWeeks);
      setDaysPerWeek(data.daysPerWeek);
      setWeeks(
        data.weeks?.map((w: any) => ({
          weekNumber: w.weekNumber,
          label: w.label || '',
          notes: w.notes || '',
          days: w.days || [],
        })) || []
      );
      return data;
    },
    enabled: isEditing,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description,
        goal,
        experienceLevel,
        durationWeeks,
        daysPerWeek,
        weeks,
      };

      if (isEditing) {
        return apiRequest(`/api/programs/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return apiRequest('/api/programs', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      toast({ title: 'Saved!', description: 'Program saved successfully.' });
      if (!isEditing && data?.id) {
        navigate(`/programs/${data.id}`);
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save program.', variant: 'destructive' });
    },
  });

  const handleAIGenerate = async () => {
    setGenerating(true);
    try {
      const data = await apiRequest('/api/ai/generate-program', {
        method: 'POST',
        body: JSON.stringify({
          goal,
          experienceLevel,
          durationWeeks,
          daysPerWeek,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (data.program) {
        setTitle(data.program.title || title);
        setDescription(data.program.description || description);
        setWeeks(data.program.weeks || []);
        toast({ title: 'Generated!', description: 'AI program created. Review and save.' });
      }
    } catch {
      toast({
        title: 'Generation failed',
        description: 'AI service unavailable. Try again later.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const addWeek = () => {
    const nextNum = weeks.length + 1;
    setWeeks([
      ...weeks,
      {
        weekNumber: nextNum,
        label: nextNum === durationWeeks ? 'Deload' : `Week ${nextNum}`,
        days: Array.from({ length: daysPerWeek }, (_, i) => ({
          dayNumber: i + 1,
          label: `Day ${i + 1}`,
          exercises: [],
        })),
      },
    ]);
  };

  const removeWeek = (weekNumber: number) => {
    setWeeks(
      weeks.filter((w) => w.weekNumber !== weekNumber).map((w, i) => ({ ...w, weekNumber: i + 1 }))
    );
  };

  const addExercise = (weekIdx: number, dayIdx: number) => {
    const updated = [...weeks];
    updated[weekIdx].days[dayIdx].exercises.push({
      name: '',
      sets: 3,
      reps: '8-12',
      rest: '90s',
    });
    setWeeks(updated);
  };

  const updateExercise = (
    weekIdx: number,
    dayIdx: number,
    exIdx: number,
    field: keyof Exercise,
    value: string | number
  ) => {
    const updated = [...weeks];
    (updated[weekIdx].days[dayIdx].exercises[exIdx] as any)[field] = value;
    setWeeks(updated);
  };

  const removeExercise = (weekIdx: number, dayIdx: number, exIdx: number) => {
    const updated = [...weeks];
    updated[weekIdx].days[dayIdx].exercises.splice(exIdx, 1);
    setWeeks(updated);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl">
      <PageHeader title={isEditing ? 'Edit Program' : 'Build Program'} />

      {/* Program metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Program Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Beginner Strength Foundation"
              />
            </div>
            <div className="space-y-2">
              <Label>Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="hypertrophy">Hypertrophy</SelectItem>
                  <SelectItem value="fat_loss">Fat Loss</SelectItem>
                  <SelectItem value="endurance">Endurance</SelectItem>
                  <SelectItem value="general">General Fitness</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Experience Level</Label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weeks</Label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Days/Week</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the program goals and approach..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleAIGenerate}
              disabled={generating}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Generating...' : 'AI Generate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Week editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
            Weekly Plan
          </h2>
          <Button variant="outline" size="sm" onClick={addWeek}>
            <Plus className="w-4 h-4 mr-1" /> Add Week
          </Button>
        </div>

        {weeks.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No weeks yet. Add manually or use AI Generate above.
              </p>
              <Button variant="outline" onClick={addWeek}>
                <Plus className="w-4 h-4 mr-1" /> Add Week 1
              </Button>
            </CardContent>
          </Card>
        )}

        {weeks.map((week, weekIdx) => (
          <Card key={week.weekNumber}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">Week {week.weekNumber}</CardTitle>
                  <Input
                    value={week.label}
                    onChange={(e) => {
                      const updated = [...weeks];
                      updated[weekIdx].label = e.target.value;
                      setWeeks(updated);
                    }}
                    placeholder="Phase label"
                    className="h-7 w-40 text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeWeek(week.weekNumber)}
                  className="text-destructive/70 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Input
                value={week.notes || ''}
                onChange={(e) => {
                  const updated = [...weeks];
                  updated[weekIdx].notes = e.target.value;
                  setWeeks(updated);
                }}
                placeholder="Week notes (e.g. progression instructions)"
                className="mb-4 text-sm"
              />

              <div className="space-y-4">
                {week.days.map((day, dayIdx) => (
                  <div key={day.dayNumber} className="border rounded-lg p-3 bg-card/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">
                        Day {day.dayNumber}
                      </Badge>
                      <Input
                        value={day.label}
                        onChange={(e) => {
                          const updated = [...weeks];
                          updated[weekIdx].days[dayIdx].label = e.target.value;
                          setWeeks(updated);
                        }}
                        placeholder="Day label (e.g. Push, Pull, Legs)"
                        className="h-7 text-sm flex-1"
                      />
                    </div>

                    {/* Exercise list */}
                    <div className="space-y-2">
                      {day.exercises.map((ex, exIdx) => (
                        <div key={exIdx} className="flex items-center gap-2 text-sm">
                          <GripVertical className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
                          <Input
                            value={ex.name}
                            onChange={(e) =>
                              updateExercise(weekIdx, dayIdx, exIdx, 'name', e.target.value)
                            }
                            placeholder="Exercise name"
                            className="h-7 text-sm flex-1"
                          />
                          <Input
                            type="number"
                            value={ex.sets}
                            onChange={(e) =>
                              updateExercise(weekIdx, dayIdx, exIdx, 'sets', Number(e.target.value))
                            }
                            className="h-7 text-sm w-14 text-center"
                            title="Sets"
                          />
                          <span className="text-muted-foreground">×</span>
                          <Input
                            value={ex.reps}
                            onChange={(e) =>
                              updateExercise(weekIdx, dayIdx, exIdx, 'reps', e.target.value)
                            }
                            placeholder="Reps"
                            className="h-7 text-sm w-20"
                          />
                          <Input
                            value={ex.rest}
                            onChange={(e) =>
                              updateExercise(weekIdx, dayIdx, exIdx, 'rest', e.target.value)
                            }
                            placeholder="Rest"
                            className="h-7 text-sm w-16"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive/50 hover:text-destructive"
                            onClick={() => removeExercise(weekIdx, dayIdx, exIdx)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs h-7"
                      onClick={() => addExercise(weekIdx, dayIdx)}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Exercise
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate('/programs')}>
          Cancel
        </Button>
        <Button onClick={() => saveMutation.mutate()} disabled={!title || saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Program'}
        </Button>
      </div>
    </div>
  );
}
