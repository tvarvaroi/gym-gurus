/**
 * Luxury Card Component
 * Premium glassmorphism card with role-specific styling
 */

import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ReactNode } from 'react';

interface LuxuryCardProps {
  children?: ReactNode;
  title?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  gradient?: boolean;
}

export function LuxuryCard({
  children,
  title,
  description,
  icon,
  className = '',
  hover = true,
  glow = false,
  gradient = false,
}: LuxuryCardProps) {
  const { isClient } = useUser();

  // Role-specific colors using CSS variables
  const roleColors = {
    primary: 'hsl(var(--primary))',
    gradient: 'linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0.08))',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      className={`relative ${hover ? 'hover-lift-luxury' : ''} ${className}`}
    >
      <Card
        className={`
          ${isClient ? 'glass-luxury-client' : 'glass-luxury-trainer'}
          ${glow ? (isClient ? 'animate-glow-client' : 'animate-glow-trainer') : ''}
          relative overflow-hidden
          transition-all duration-500
        `}
        style={gradient ? { background: roleColors.gradient } : undefined}
      >
        {/* Metallic shine overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
          }}
        />

        {title && (
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle
                  className="text-xl font-light tracking-tight"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: 'hsl(var(--foreground))',
                  }}
                >
                  {title}
                </CardTitle>
                {description && (
                  <CardDescription
                    className="text-sm font-light"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      color: 'hsl(var(--muted-foreground))',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {description}
                  </CardDescription>
                )}
              </div>
              {icon && (
                <motion.div
                  className="p-3 rounded-xl"
                  style={{
                    background: roleColors.gradient,
                    boxShadow: `0 8px 20px hsl(var(--primary) / 0.30)`,
                  }}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  {icon}
                </motion.div>
              )}
            </div>
          </CardHeader>
        )}

        <CardContent className={title ? '' : 'pt-6'}>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Luxury Stat Card - For displaying metrics
 */
interface LuxuryStatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
  className?: string;
}

export function LuxuryStatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  className = '',
}: LuxuryStatCardProps) {
  const { isClient } = useUser();

  // Role-specific colors using CSS variables
  const roleColors = {
    primary: 'hsl(var(--primary))',
  };

  const changeColors = {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#999',
  };

  return (
    <LuxuryCard hover className={className}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p
            className="text-sm font-light tracking-wide"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: 'hsl(var(--muted-foreground))',
              letterSpacing: '0.05em',
            }}
          >
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3
              className="text-4xl font-light"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: roleColors.primary,
                textShadow: `0 0 20px hsl(var(--primary) / 0.30)`,
              }}
            >
              {value}
            </h3>
            {change && (
              <span
                className="text-sm font-light"
                style={{
                  color: changeColors[changeType],
                }}
              >
                {change}
              </span>
            )}
          </div>
        </div>
        <motion.div
          className="p-4 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, hsl(var(--primary) / 0.20), hsl(var(--primary) / 0.10))`,
            border: `1px solid hsl(var(--primary) / 0.30)`,
            boxShadow: `0 8px 20px hsl(var(--primary) / 0.20)`,
          }}
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ duration: 0.3 }}
        >
          <div
            style={{
              color: roleColors.primary,
              filter: `drop-shadow(0 0 8px hsl(var(--primary) / 0.60))`,
            }}
          >
            {icon}
          </div>
        </motion.div>
      </div>
    </LuxuryCard>
  );
}
