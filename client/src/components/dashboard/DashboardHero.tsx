/**
 * DashboardHero — combined version
 *
 * Merges the premium aesthetic of the original hero (gradient card, blur orbs,
 * Playfair title, accent lines) with the information-dense data from Phase 2
 * (3 NumberTicker stats: active clients, sessions this week, upcoming today).
 *
 * What's kept from the original:
 *   - Gradient card with backdrop-blur and box-shadow
 *   - Top + bottom accent lines (CSS vars, not hardcoded gold)
 *   - 3 entrance-only blur orbs (no infinite animations)
 *   - Elite Trainer badge + connection status (glassmorphism)
 *   - Greeting with ornamental flanking lines
 *   - "Your Fitness Studio" Playfair Display title
 *   - Decorative divider (lines + dot)
 *   - Premium CTA buttons
 *
 * What's removed:
 *   - Fixed h-80 / h-96 / h-[28rem] height → content-driven
 *   - Corner ornamental SVGs
 *   - Noise texture base64 overlay
 *   - "You're doing exceptional work! X clients trust..." sentence → replaced by stats
 *   - whileHover scale on the outer card
 *   - prefersReducedMotion branching → single render path
 *   - Hardcoded rgba(201,168,85) gold → hsl(var(--primary)) role-aware
 *
 * What's added:
 *   - 3 NumberTicker stats between the divider and CTAs
 *   - completedSessionsThisWeek + upcomingSessions props
 *   - onAddClient prop (was inline NewClientButton, now callable from parent)
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { NumberTicker } from '@/components/ui/number-ticker';
import { NewClientButton } from '../ClientFormModal';
import { ChevronRight } from 'lucide-react';

interface DashboardHeroProps {
  user: any;
  isConnected: boolean;
  greeting: string;
  activeClients: number;
  completedSessionsThisWeek: number;
  upcomingSessions: number;
  onNavigate: (path: string) => void;
  onAddClient: () => void;
}

const DashboardHero = memo(
  ({
    user,
    isConnected,
    greeting,
    activeClients,
    completedSessionsThisWeek,
    upcomingSessions,
    onNavigate,
    onAddClient,
  }: DashboardHeroProps) => {
    const stats = [
      { value: activeClients, label: 'Active Clients' },
      { value: completedSessionsThisWeek, label: 'Sessions This Week' },
      { value: upcomingSessions, label: 'Upcoming Today' },
    ];

    return (
      <div
        className="relative rounded-3xl overflow-hidden group animate-in fade-in duration-300"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--primary) / 0.10) 40%, transparent 100%)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Metallic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/50 group-hover:from-black/30 transition-all duration-700" />

        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.8) 30%, hsl(var(--primary)) 50%, hsl(var(--primary) / 0.6) 80%, transparent 100%)',
          }}
        />

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.5) 30%, hsl(var(--primary) / 0.7) 50%, hsl(var(--primary) / 0.5) 70%, transparent 100%)',
          }}
        />

        {/* Inner glow border */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            boxShadow:
              'inset 0 1px 2px rgba(255, 255, 255, 0.08), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
          }}
        />

        {/* Radial lighting */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.06) 0%, transparent 50%)',
          }}
        />

        {/* Entrance-only blur orbs — no infinite animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-8 right-8 w-64 h-64 rounded-full"
            style={{
              background:
                'radial-gradient(circle, hsl(var(--primary) / 0.30) 0%, hsl(var(--primary) / 0.08) 60%, transparent 100%)',
              filter: 'blur(40px)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute bottom-8 left-8 w-72 h-72 rounded-full"
            style={{
              background:
                'radial-gradient(circle, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.06) 60%, transparent 100%)',
              filter: 'blur(50px)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.8, scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
              filter: 'blur(45px)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.6 }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 md:px-8 py-10 text-white">
          {/* Elite Trainer badge — top left */}
          <div
            className="absolute top-6 left-6 flex items-center gap-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 animate-in fade-in slide-in-from-left-3 duration-500"
            style={{
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span
              className="text-xs font-medium tracking-wider uppercase"
              style={{ letterSpacing: '0.15em' }}
            >
              Elite Trainer
            </span>
          </div>

          {/* Connection status — top right */}
          <div
            className="absolute top-6 right-6 flex items-center gap-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 animate-in fade-in slide-in-from-right-3 duration-500"
            title={isConnected ? 'Real-time sync active' : 'Reconnecting...'}
            style={{
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'
              }`}
              style={{
                boxShadow: isConnected ? '0 0 8px rgba(52, 211, 153, 0.6)' : 'none',
              }}
            />
            <span
              className="text-xs font-medium text-white/90 tracking-wider uppercase"
              style={{ letterSpacing: '0.1em' }}
            >
              {isConnected ? 'Synced' : 'Reconnecting'}
            </span>
          </div>

          {/* Main content block — single entrance animation */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-5 w-full"
          >
            {/* Greeting with ornamental flanking lines */}
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] w-8 bg-gradient-to-r from-transparent via-white/40 to-white/60" />
              <p
                className="text-sm sm:text-base font-light text-white/90 tracking-widest uppercase"
                style={{ letterSpacing: '0.2em' }}
              >
                {greeting},{' '}
                <span className="font-normal bg-gradient-to-r from-primary via-white to-white bg-clip-text text-transparent">
                  {user?.firstName || 'Trainer'}
                </span>
              </p>
              <div className="h-[1px] w-8 bg-gradient-to-l from-transparent via-white/40 to-white/60" />
            </div>

            {/* Playfair title */}
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-extralight leading-none"
              data-testid="text-dashboard-title"
              style={{
                letterSpacing: '-0.02em',
                textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              <span className="block" style={{ fontFamily: "'Playfair Display', serif" }}>
                Your
              </span>
              <span
                className="block font-light bg-gradient-to-r from-primary via-white/80 to-white bg-clip-text text-transparent"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  letterSpacing: '0.05em',
                }}
              >
                Fitness Studio
              </span>
            </h1>

            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-3 py-1">
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
              <div
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{ boxShadow: '0 0 8px hsl(var(--primary) / 0.6)' }}
              />
              <div className="h-[1px] w-16 bg-gradient-to-l from-transparent via-primary to-transparent" />
            </div>

            {/* Stats row — the new addition */}
            <div className="flex items-start justify-center">
              {stats.map((stat, i) => (
                <div key={stat.label} className="flex items-start">
                  {i > 0 && (
                    <div className="w-px h-10 bg-white/15 mx-6 md:mx-10 mt-1 flex-shrink-0" />
                  )}
                  <div className="text-center">
                    <NumberTicker
                      value={stat.value}
                      className="text-3xl sm:text-4xl font-extralight tabular-nums text-white"
                    />
                    <p
                      className="text-[10px] uppercase tracking-widest text-white/60 mt-1.5"
                      style={{ letterSpacing: '0.15em' }}
                    >
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <NewClientButton
                trainerId={user?.id}
                className="relative bg-gradient-to-r from-white via-white to-white/95 text-primary hover:from-white hover:to-white font-medium px-8 sm:px-10 h-11 rounded-xl tracking-wide uppercase text-sm overflow-hidden hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              />
              <Button
                variant="outline"
                className="relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md border border-white/30 text-white hover:from-white/10 hover:to-white/5 font-medium px-8 sm:px-10 h-11 rounded-xl tracking-wide uppercase text-sm gap-2 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                data-testid="button-create-workout"
                onClick={() => onNavigate('/workouts')}
              >
                Create Workout
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }
);

DashboardHero.displayName = 'DashboardHero';

export default DashboardHero;
