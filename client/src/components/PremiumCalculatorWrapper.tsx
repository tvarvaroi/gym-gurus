import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Star, History, TrendingUp, ChevronLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { LuxuryCard } from '@/components/LuxuryCard';
import { useToast } from '@/hooks/use-toast';
import { fadeInUp, fadeInDown, staggerContainer } from '@/lib/premiumAnimations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export type CalculatorType =
  | 'bmi'
  | 'tdee'
  | 'body_fat'
  | 'macros'
  | '1rm'
  | 'plates'
  | 'strength_standards'
  | 'vo2max'
  | 'heart_rate_zones'
  | 'calories_burned'
  | 'ideal_weight'
  | 'water_intake';

interface PremiumCalculatorWrapperProps {
  calculatorType: CalculatorType;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  inputs: Record<string, any>;
  results: Record<string, any>;
  hasResults?: boolean;
}

export function PremiumCalculatorWrapper({
  calculatorType,
  title,
  description,
  icon,
  children,
  inputs,
  results,
  hasResults = false,
}: PremiumCalculatorWrapperProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(false);
  const [notes, setNotes] = useState('');

  // Fetch recent results for this calculator type
  const { data: recentResults = [] } = useQuery({
    queryKey: [`/api/calculator-results/${calculatorType}`],
    enabled: !!user,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/calculator-results', {
        calculatorType,
        inputs,
        results,
        notes: notes || null,
        isFavorite,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/calculator-results/${calculatorType}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/calculator-results'] });
      toast({
        title: 'Result saved!',
        description: 'Your calculation has been saved to your history.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message || 'Failed to save result. Please try again.',
      });
    },
  });

  const handleSave = () => {
    if (!hasResults) {
      toast({
        variant: 'destructive',
        title: 'No results to save',
        description: 'Please complete a calculation first.',
      });
      return;
    }
    saveMutation.mutate();
  };

  // Role-specific gradient backgrounds
  const roleGradients = {
    trainer: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.10))',
    client: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.10))',
    solo: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.10))',
  };

  return (
    <motion.div
      className="max-w-4xl mx-auto p-6 space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Breadcrumb Navigation */}
      <Link href="/dashboard/calculators">
        <motion.div
          variants={fadeInDown}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">All Calculators</span>
        </motion.div>
      </Link>

      {/* Premium Header with Role-Specific Styling */}
      <motion.div
        variants={fadeInDown}
        className="relative overflow-hidden rounded-2xl p-8 premium-shine"
        style={{
          background: roleGradients[user?.role || 'solo'],
          backdropFilter: 'blur(30px)',
          border: '1px solid hsl(var(--primary) / 0.20)',
          boxShadow: '0 25px 50px -12px hsl(var(--primary) / 0.25)',
        }}
      >
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
              className="p-4 rounded-xl"
              style={{
                background:
                  'linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.15))',
                boxShadow: '0 8px 20px hsl(var(--primary) / 0.30)',
              }}
            >
              <div style={{ color: 'hsl(var(--primary))' }} className="w-8 h-8">
                {icon}
              </div>
            </motion.div>

            <div>
              <h1
                className="text-3xl md:text-4xl font-light mb-1"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: 'hsl(var(--foreground))',
                }}
              >
                {title}
              </h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFavorite(!isFavorite)}
              className="hover:bg-primary/10 transition-colors"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasResults || saveMutation.isPending}
              className="gap-2"
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
              }}
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save Result'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Calculator Content */}
      <motion.div variants={fadeInUp}>
        <LuxuryCard hover={false} glow={true}>
          {children}
        </LuxuryCard>
      </motion.div>

      {/* Recent Results Section */}
      {recentResults.length > 0 && (
        <motion.div variants={fadeInUp} transition={{ delay: 0.2 }}>
          <LuxuryCard
            title="Recent Results"
            description="Your saved calculations"
            icon={<History className="w-5 h-5" />}
          >
            <div className="space-y-3 mt-4">
              {recentResults.slice(0, 5).map((result: any, index: number) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {result.isFavorite && (
                          <Star className="w-3 h-3 fill-primary text-primary" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(result.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {result.notes && <p className="text-sm text-foreground">{result.notes}</p>}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {Object.entries(result.results)
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <span key={key}>
                              <span className="font-medium">{key}:</span>{' '}
                              <span className="text-primary">{String(value)}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
            </div>

            {recentResults.length > 5 && (
              <Link href="/dashboard/calculators">
                <Button variant="ghost" className="w-full mt-4">
                  View All Results
                </Button>
              </Link>
            )}
          </LuxuryCard>
        </motion.div>
      )}

      {/* Empty State for No Results */}
      {recentResults.length === 0 && (
        <motion.div variants={fadeInUp} transition={{ delay: 0.2 }}>
          <LuxuryCard hover={false}>
            <div className="text-center py-12">
              <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No saved results yet. Click "Save Result" to track your progress.
              </p>
            </div>
          </LuxuryCard>
        </motion.div>
      )}
    </motion.div>
  );
}
