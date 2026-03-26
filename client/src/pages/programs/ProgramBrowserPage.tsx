import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { PageHeader } from '@/components/ui/premium/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import SearchInput from '@/components/SearchInput';
import { Plus, Target, Calendar, Dumbbell, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/contexts/UserContext';

interface Program {
  id: string;
  title: string;
  description: string;
  goal: string;
  experienceLevel: string;
  durationWeeks: number;
  daysPerWeek: number;
  isTemplate: boolean;
  isPublic: boolean;
  source: string;
  tags: string[];
  creatorId: string;
  createdAt: string;
}

const goalColors: Record<string, string> = {
  strength: 'bg-red-500/10 text-red-400 border-red-500/20',
  hypertrophy: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  fat_loss: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  endurance: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  general: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default function ProgramBrowserPage() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState<string | null>(null);

  const { data: programs = [], isLoading } = useQuery<Program[]>({
    queryKey: ['/api/programs'],
    queryFn: () => apiRequest('/api/programs'),
  });

  const filtered = programs.filter((p) => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesGoal = !goalFilter || p.goal === goalFilter;
    return matchesSearch && matchesGoal;
  });

  const myPrograms = filtered.filter((p) => p.creatorId === user?.id && !p.isTemplate);
  const templates = filtered.filter((p) => p.isTemplate);

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader title="Programs" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/programs/builder')}>
            <Plus className="w-4 h-4 mr-2" /> Build Program
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search programs..."
          className="md:w-64"
        />
        <div className="flex gap-2 flex-wrap">
          {['strength', 'hypertrophy', 'fat_loss', 'endurance', 'general'].map((g) => (
            <Button
              key={g}
              variant={goalFilter === g ? 'default' : 'outline'}
              size="sm"
              className="capitalize text-xs h-7"
              onClick={() => setGoalFilter(goalFilter === g ? null : g)}
            >
              {g.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* My Programs */}
      {myPrograms.length > 0 && (
        <section>
          <h2
            className="text-lg font-medium mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            My Programs
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onClick={() => navigate(`/programs/${program.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state for my programs */}
      {myPrograms.length === 0 && !search && !goalFilter && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              No programs yet
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Build a multi-week program manually or let AI create one for you. Browse templates
              below for inspiration.
            </p>
            <Button onClick={() => navigate('/programs/builder')}>
              <Plus className="w-4 h-4 mr-2" /> Build Your First Program
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Library */}
      {templates.length > 0 && (
        <section>
          <h2
            className="text-lg font-medium mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Template Library
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onClick={() => navigate(`/programs/${program.id}`)}
                isTemplate
              />
            ))}
          </div>
        </section>
      )}

      {/* No results */}
      {filtered.length === 0 && (search || goalFilter) && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No programs match your filters.</p>
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => {
              setSearch('');
              setGoalFilter(null);
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

function ProgramCard({
  program,
  onClick,
  isTemplate,
}: {
  program: Program;
  onClick: () => void;
  isTemplate?: boolean;
}) {
  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:border-primary/30 hover:translate-y-[-2px] group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base line-clamp-1">{program.title}</CardTitle>
          {program.source === 'ai' && <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />}
        </div>
        {program.description && (
          <CardDescription className="line-clamp-2 text-xs">{program.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge className={`text-xs ${goalColors[program.goal] || goalColors.general}`}>
            <Target className="w-3 h-3 mr-1" />
            {program.goal.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {program.experienceLevel}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {program.durationWeeks}w
            </span>
            <span className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              {program.daysPerWeek}d/w
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}
