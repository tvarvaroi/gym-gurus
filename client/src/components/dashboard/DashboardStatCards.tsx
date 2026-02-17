import { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StaggerContainer, StaggerItem } from '@/components/AnimationComponents';

export interface StatItem {
  label: string;
  value: string;
  icon: any;
  trend: string;
  change: string;
  changeType: string;
  color: string;
  bgGlow: string;
}

interface DashboardStatCardsProps {
  stats: StatItem[];
  prefersReducedMotion: boolean;
  onNavigate: (path: string) => void;
}

const DashboardStatCards = memo(({ stats, prefersReducedMotion, onNavigate }: DashboardStatCardsProps) => (
  <StaggerContainer delay={0.1}>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {stats.map((stat, index) => (
        <StaggerItem key={stat.label} index={index}>
          <motion.div
            whileHover={{ y: -6, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
            whileTap={{ scale: 0.97 }}
          >
            <Card
              className={`
                relative overflow-hidden cursor-pointer
                bg-gradient-to-br ${stat.bgGlow}
                glass border-border/40
                hover:shadow-premium-lg hover:border-primary/30
                transition-all duration-500 group
              `}
              onClick={() => {
                if (stat.label === 'Active Clients') onNavigate('/clients');
                if (stat.label === 'Workout Plans') onNavigate('/workouts');
                if (stat.label === 'Sessions This Week') onNavigate('/schedule');
              }}
              data-testid={`card-stat-${index}`}
            >
              {/* Enhanced glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Animated border glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {stat.label}
                </CardTitle>
                <div className="relative">
                  <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-all duration-300">
                    <stat.icon className={`h-5 w-5 ${stat.color} transition-all duration-500 group-hover:scale-125 group-hover:rotate-12`} />
                  </div>
                  {stat.changeType === 'increase' && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.6, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: prefersReducedMotion ? 0 : Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <motion.div
                    className="text-4xl font-extralight tracking-tight"
                    data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.5, type: 'spring' }}
                  >
                    {stat.value}
                  </motion.div>
                  {stat.change && (
                    <Badge variant="secondary" className="text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25 transition-colors duration-300">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {stat.change}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3 font-light group-hover:text-foreground/70 transition-colors duration-300">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </StaggerItem>
      ))}
    </div>
  </StaggerContainer>
));

DashboardStatCards.displayName = 'DashboardStatCards';

export default DashboardStatCards;
