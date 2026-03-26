import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { PageHeader } from '@/components/ui/premium/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Users,
  Target,
  Calendar,
  Dumbbell,
  BookOpen,
  BarChart3,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
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

export default function GuruProgramDashboard() {
  const [, navigate] = useLocation();
  const { user } = useUser();

  const { data: programs = [], isLoading } = useQuery<Program[]>({
    queryKey: ['/api/programs'],
    queryFn: () => apiRequest('/api/programs'),
  });

  const myPrograms = programs.filter((p) => p.creatorId === user?.id && !p.isTemplate);
  const templates = programs.filter((p) => p.isTemplate);

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader title="Program Manager" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/programs/browse')}>
            <BookOpen className="w-4 h-4 mr-2" /> Browse All
          </Button>
          <Button onClick={() => navigate('/programs/builder')}>
            <Plus className="w-4 h-4 mr-2" /> New Program
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{myPrograms.length}</p>
                <p className="text-xs text-muted-foreground">My Programs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {myPrograms.filter((p) => p.source === 'ai').length}
                </p>
                <p className="text-xs text-muted-foreground">AI Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {myPrograms.filter((p) => p.isPublic).length}
                </p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <BarChart3 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{templates.length}</p>
                <p className="text-xs text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Programs */}
      <section>
        <h2
          className="text-lg font-medium mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          My Programs
        </h2>
        {myPrograms.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="text-lg mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Create your first program
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Design multi-week training programs for yourself or your clients.
              </p>
              <Button onClick={() => navigate('/programs/builder')}>
                <Plus className="w-4 h-4 mr-2" /> Build Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myPrograms.map((program) => (
              <Card
                key={program.id}
                className="cursor-pointer transition-all duration-200 hover:border-primary/30 hover:translate-y-[-2px] group"
                onClick={() => navigate(`/programs/${program.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-1">{program.title}</CardTitle>
                    {program.source === 'ai' && (
                      <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  {program.description && (
                    <CardDescription className="line-clamp-2 text-xs">
                      {program.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className="text-xs capitalize">
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
