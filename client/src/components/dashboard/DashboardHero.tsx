import { memo } from 'react';
import { motion } from 'framer-motion';
import AnimatedButton from '../AnimatedButton';
import { NewClientButton } from '../ClientFormModal';

interface DashboardHeroProps {
  isTrainer: boolean;
  prefersReducedMotion: boolean;
  user: any;
  isConnected: boolean;
  greeting: string;
  activeClients: number;
  onNavigate: (path: string) => void;
}

const DashboardHero = memo(({
  isTrainer,
  prefersReducedMotion,
  user,
  isConnected,
  greeting,
  activeClients,
  onNavigate,
}: DashboardHeroProps) => (
  <motion.div
    className={`relative h-80 sm:h-96 md:h-[28rem] rounded-3xl overflow-hidden group ${isTrainer ? 'trainer-border' : 'client-border'}`}
    style={{
      background: 'linear-gradient(135deg, rgba(201, 168, 85, 0.25) 0%, rgba(207, 176, 95, 0.28) 25%, rgba(13, 148, 136, 0.28) 75%, rgba(13, 148, 136, 0.25) 100%)',
      willChange: 'transform',
      backdropFilter: 'blur(24px)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    }}
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
    whileHover={{ scale: 1.005 }}
  >
    {/* Premium metallic gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/50 group-hover:from-black/30 transition-all duration-700" />

    {/* Elegant top accent line */}
    <div
      className="absolute top-0 left-0 right-0 h-[2px]"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(201, 168, 85, 0.8) 20%, rgba(201, 168, 85, 1) 50%, rgba(13, 148, 136, 1) 50%, rgba(13, 148, 136, 0.8) 80%, transparent 100%)',
      }}
    />

    {/* Corner ornamental accents */}
    <div className="absolute top-0 left-0 w-32 h-32 opacity-20">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M0,0 L100,0 L100,20 Q50,20 20,50 Q20,50 20,100 L0,100 Z" fill="url(#cornerGradient)" />
        <defs>
          <linearGradient id="cornerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(201, 168, 85, 0.6)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20 rotate-180">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M0,0 L100,0 L100,20 Q50,20 20,50 Q20,50 20,100 L0,100 Z" fill="url(#cornerGradient2)" />
        <defs>
          <linearGradient id="cornerGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(13, 148, 136, 0.6)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    {/* Luxury noise texture overlay */}
    <div
      className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none"
      style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
      }}
    />

    {/* Premium radial gradient lighting */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: 'radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.08) 0%, transparent 50%)',
      }}
    />

    {/* Bottom elegant accent line */}
    <div
      className="absolute bottom-0 left-0 right-0 h-[2px]"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(201, 168, 85, 0.6) 30%, rgba(201, 168, 85, 0.8) 50%, rgba(13, 148, 136, 0.8) 50%, rgba(13, 148, 136, 0.6) 70%, transparent 100%)',
      }}
    />

    {/* Premium inner glow border */}
    <div
      className="absolute inset-0 rounded-3xl pointer-events-none"
      style={{
        boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.08), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
      }}
    />

    {/* Static gradient orbs (entrance-only, no infinite animations) */}
    <div className="absolute inset-0 overflow-hidden">
      {/* Primary gold/teal orb - top right */}
      <motion.div
        className="absolute top-10 right-10 w-64 h-64 rounded-full blur-3xl"
        style={{
          background: isTrainer
            ? 'radial-gradient(circle, rgba(201, 168, 85, 0.35) 0%, rgba(212, 184, 106, 0.15) 50%, transparent 100%)'
            : 'radial-gradient(circle, rgba(13, 148, 136, 0.35) 0%, rgba(20, 184, 166, 0.15) 50%, transparent 100%)',
          filter: 'blur(40px)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      {/* Secondary orb - bottom left */}
      <motion.div
        className="absolute bottom-10 left-10 w-80 h-80 rounded-full blur-3xl"
        style={{
          background: isTrainer
            ? 'radial-gradient(circle, rgba(212, 184, 106, 0.3) 0%, rgba(201, 168, 85, 0.1) 50%, transparent 100%)'
            : 'radial-gradient(circle, rgba(20, 184, 166, 0.3) 0%, rgba(13, 148, 136, 0.1) 50%, transparent 100%)',
          filter: 'blur(50px)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
      />

      {/* Center accent orb */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl"
        style={{
          background: isTrainer
            ? 'radial-gradient(circle, rgba(201, 168, 85, 0.25) 0%, rgba(201, 168, 85, 0.08) 50%, transparent 100%)'
            : 'radial-gradient(circle, rgba(13, 148, 136, 0.25) 0%, rgba(13, 148, 136, 0.08) 50%, transparent 100%)',
          filter: 'blur(45px)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.6 }}
      />
    </div>

    <div className="relative h-full flex flex-col justify-center items-center text-center px-4 sm:px-6 md:px-8 text-white z-10">
      {/* Premium badge - Elite Status */}
      <motion.div
        className="absolute top-6 left-6 flex items-center gap-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
        style={{
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent" />
        <span className="text-xs font-medium tracking-wider uppercase" style={{ letterSpacing: '0.15em' }}>
          Elite Trainer
        </span>
      </motion.div>

      {/* Real-time connection status */}
      <motion.div
        className="absolute top-6 right-6 flex items-center gap-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
        style={{
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
        title={isConnected ? 'Real-time sync active' : 'Reconnecting to server...'}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} style={{
          boxShadow: isConnected ? '0 0 8px rgba(52, 211, 153, 0.6)' : 'none',
        }} />
        <span className="text-xs font-medium text-white/90 tracking-wider uppercase" style={{ letterSpacing: '0.1em' }}>
          {isConnected ? 'Synced' : 'Reconnecting'}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        className="space-y-6"
      >
        {/* Luxury greeting with ornamental line */}
        <div className="flex flex-col items-center gap-3">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent via-white/40 to-white/60" />
            <motion.p
              className="text-sm sm:text-base font-light text-white/90 tracking-widest uppercase"
              style={{ letterSpacing: '0.2em' }}
            >
              {greeting}, <span className="font-normal bg-gradient-to-r from-primary via-white to-accent bg-clip-text text-transparent">{user?.firstName || 'Trainer'}</span>
            </motion.p>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent via-white/40 to-white/60" />
          </motion.div>
        </div>

        {/* Premium title with metallic effect */}
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extralight leading-none"
          data-testid="text-dashboard-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          style={{
            letterSpacing: '-0.02em',
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          <span className="block" style={{ fontFamily: "'Playfair Display', serif" }}>Your</span>
          <span
            className="block font-light bg-gradient-to-r from-primary via-muted to-accent bg-clip-text text-transparent"
            style={{
              fontFamily: "'Playfair Display', serif",
              letterSpacing: '0.05em',
            }}
          >
            Fitness Studio
          </span>
        </motion.h1>

        {/* Decorative divider */}
        <motion.div
          className="flex items-center justify-center gap-3 py-2"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-accent" style={{
            boxShadow: '0 0 8px hsl(var(--primary) / 0.6)',
          }} />
          <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-accent to-transparent" />
        </motion.div>

        <motion.p
          className="text-base sm:text-lg md:text-xl font-light text-white/95 max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          style={{
            letterSpacing: '0.02em',
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
          }}
        >
          You're doing <span className="font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">exceptional</span> work! {activeClients} clients trust your expertise this week.
        </motion.p>
      </motion.div>
      {prefersReducedMotion ? (
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <NewClientButton
            trainerId={user?.id}
            className="relative bg-gradient-to-r from-white via-white to-white/95 text-primary hover:from-white hover:to-white font-medium px-8 sm:px-10 h-12 rounded-xl tracking-wide uppercase text-sm overflow-hidden group"
          />
          <AnimatedButton
            variant="outline"
            size="lg"
            className="relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md border border-white/30 text-white hover:from-white/10 hover:to-white/5 font-medium px-8 sm:px-10 h-12 rounded-xl tracking-wide uppercase text-sm"
            data-testid="button-create-workout"
            onClick={() => onNavigate('/workouts')}
          >
            Create Workout
          </AnimatedButton>
        </div>
      ) : (
        <motion.div
          className="flex flex-col sm:flex-row gap-4 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
            <NewClientButton
              trainerId={user?.id}
              className="relative bg-gradient-to-r from-white via-white to-white/95 text-primary hover:from-white hover:to-white font-medium px-8 sm:px-10 h-12 rounded-xl tracking-wide uppercase text-sm overflow-hidden group"
            />
          </motion.div>
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
            <AnimatedButton
              variant="outline"
              size="lg"
              className="relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md border border-white/30 text-white hover:from-white/10 hover:to-white/5 font-medium px-8 sm:px-10 h-12 rounded-xl tracking-wide uppercase text-sm"
              data-testid="button-create-workout"
              onClick={() => onNavigate('/workouts')}
            >
              Create Workout
            </AnimatedButton>
          </motion.div>
        </motion.div>
      )}
    </div>
  </motion.div>
));

DashboardHero.displayName = 'DashboardHero';

export default DashboardHero;
