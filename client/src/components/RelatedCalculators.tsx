import { Link } from 'wouter';
import { ArrowRight, BookmarkPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface RelatedCalc {
  title: string;
  path: string;
  description: string;
}

const ALL_CALCULATORS: RelatedCalc[] = [
  { title: '1RM Calculator', path: '/calculators/1rm', description: 'Estimate your one-rep max' },
  {
    title: 'Plates Calculator',
    path: '/calculators/plates',
    description: 'Load your barbell correctly',
  },
  { title: 'TDEE Calculator', path: '/calculators/tdee', description: 'Daily calorie needs' },
  {
    title: 'Strength Standards',
    path: '/calculators/strength-standards',
    description: 'Compare your lifts',
  },
  { title: 'BMI Calculator', path: '/calculators/bmi', description: 'Body Mass Index' },
  {
    title: 'Body Fat Calculator',
    path: '/calculators/body-fat',
    description: 'Estimate body fat %',
  },
  {
    title: 'Macro Calculator',
    path: '/calculators/macros',
    description: 'Protein, carbs & fat targets',
  },
  { title: 'VO2 Max', path: '/calculators/vo2max', description: 'Aerobic fitness level' },
  {
    title: 'Heart Rate Zones',
    path: '/calculators/heart-rate-zones',
    description: 'Training zone guide',
  },
  {
    title: 'Calories Burned',
    path: '/calculators/calories-burned',
    description: 'Exercise calorie counter',
  },
  { title: 'Ideal Weight', path: '/calculators/ideal-weight', description: 'Healthy weight range' },
  {
    title: 'Water Intake',
    path: '/calculators/water-intake',
    description: 'Daily hydration guide',
  },
];

interface Props {
  currentPath: string;
  count?: number;
}

export default function RelatedCalculators({ currentPath, count = 3 }: Props) {
  const related = ALL_CALCULATORS.filter((c) => c.path !== currentPath).slice(0, count);
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="mt-8 pt-6 border-t border-border">
      {/* Save Results CTA — only for unauthenticated visitors */}
      {!user && (
        <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <BookmarkPlus className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">Save &amp; Track Your Results</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a free account to save your calculator results, track progress over time, and get personalized workout plans.
              </p>
              <a
                href="/api/login?role=solo"
                className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-primary hover:underline"
              >
                Sign up free
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Related Calculators</h3>
        <Link href="/calculators" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {related.map((calc) => (
          <Link
            key={calc.path}
            href={calc.path}
            className="group block p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
          >
            <div className="font-medium text-sm group-hover:text-primary transition-colors">
              {calc.title}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{calc.description}</div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary mt-2 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
