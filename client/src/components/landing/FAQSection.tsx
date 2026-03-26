import { memo } from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQItem {
  q: string;
  a: string;
  variant: 'guru' | 'disciple';
}

interface FAQGroup {
  label: string;
  items: FAQItem[];
}

const FAQ_GROUPS: FAQGroup[] = [
  {
    label: 'Getting Started',
    items: [
      {
        q: 'What is GymGurus and who is it for?',
        a: 'GymGurus is an AI-powered fitness platform with three distinct paths. Gurus are personal trainers who manage clients, build custom programs, and grow their business. Ronin are solo athletes who train independently using AI coaching and workout generation. Disciples are clients assigned to a Guru trainer — they receive programs and track their progress through the app.',
        variant: 'guru',
      },
      {
        q: 'How do I sign up? Is there a free trial?',
        a: 'Every plan starts with a 30-day free trial — no credit card required. Create your account, choose your role (Guru, Ronin, or Disciple), and start immediately. Disciples use a unique access code provided by their trainer to join.',
        variant: 'disciple',
      },
      {
        q: 'What does "Disciple" mean and how do they access the app?',
        a: "Disciples are clients assigned to a Guru trainer. They don't register normally — their trainer creates their profile and generates a unique access code. Disciples use that code at the Disciple Login page to access their personalised workout plans, progress data, and messaging.",
        variant: 'guru',
      },
      {
        q: 'Can I switch between the Guru and Ronin roles?',
        a: "Yes — contact support and we'll migrate your account. Your workout history, personal records, and progress data are preserved across the switch.",
        variant: 'disciple',
      },
    ],
  },
  {
    label: 'Guru — For Personal Trainers',
    items: [
      {
        q: 'How many clients can I manage on GymGurus?',
        a: 'The Guru plan supports up to 10 active clients. The Pro Guru plan is unlimited. Both plans include full client management: progress tracking, workout assignment, scheduling, payment plans, and Disciple app access for every client.',
        variant: 'guru',
      },
      {
        q: 'Can my clients see their own progress and workouts?',
        a: 'Yes. Every client gets a Disciple account — a dedicated mobile-first interface where they can view assigned workouts, log sessions set-by-set, track their personal records, see their progress charts, and message you directly.',
        variant: 'disciple',
      },
      {
        q: 'Does GymGurus handle payments and invoicing?',
        a: 'Yes. Guru and Pro Guru plans include Stripe-powered payment processing. Create custom payment plans (monthly, weekly, or one-time), send invoices, and track payment history — all within the platform. No separate billing software needed.',
        variant: 'guru',
      },
      {
        q: 'Can I build multi-week training programs for clients?',
        a: 'Yes. The Program Builder lets you create structured multi-week programs with specific workouts assigned to each day. Assign any program to any client and track their compliance in real time.',
        variant: 'disciple',
      },
      {
        q: 'What happens when a client misses a session?',
        a: 'You set the missed-session policy per program — either "skip" (move on) or "push forward" (reschedule the missed session). GymGurus tracks compliance automatically and flags clients who are falling behind on your dashboard.',
        variant: 'guru',
      },
    ],
  },
  {
    label: 'Ronin — For Solo Athletes',
    items: [
      {
        q: 'How does the AI workout generator work?',
        a: 'Describe your goal in plain English — "30-minute upper body hypertrophy, only dumbbells, intermediate level" — and the AI generates a complete workout in under 30 seconds. Sets, reps, rest periods, exercise order, coaching notes. You can save it, execute it immediately, or adjust any detail.',
        variant: 'disciple',
      },
      {
        q: 'What is the AI Coach and how is it different from the workout generator?',
        a: 'The AI Coach is a full conversational coach powered by Claude AI. Ask it anything — form tips, progressive overload advice, nutrition questions, recovery guidance, program recommendations. It has full context of your training history and personal records. The workout generator is for single-session creation; the coach is for ongoing guidance.',
        variant: 'guru',
      },
      {
        q: 'What are Programs and how do they differ from individual workouts?',
        a: 'Individual workouts are single sessions. Programs are multi-week structured plans — for example, a 4-week PPL (Push/Pull/Legs) program with 6 sessions per week, each session mapped to a specific workout. Browse expert-built starter templates or generate a custom program with AI.',
        variant: 'disciple',
      },
      {
        q: 'What is the gamification system?',
        a: 'Every completed workout, personal record, and consistency streak earns XP (experience points). XP levels you up through ranks. There are 45+ achievements to unlock across categories: consistency, strength milestones, volume totals, and special challenges.',
        variant: 'guru',
      },
      {
        q: 'How does recovery tracking work?',
        a: 'GymGurus tracks your Training Readiness using ACWR (Acute:Chronic Workload Ratio) — a 28-day rolling window that measures training load to predict injury risk and optimal performance. The Muscle Recovery view shows per-muscle fatigue levels as a colour-coded anatomy diagram, so you always know which muscles need rest.',
        variant: 'disciple',
      },
      {
        q: 'What calculators are included?',
        a: '13 premium calculators: BMI, TDEE (Total Daily Energy Expenditure), Body Fat (US Navy method), Macros, 1RM (6 formulas including Epley and Brzycki), Plates Calculator, Strength Standards, VO2 Max, Heart Rate Zones, Calories Burned, Ideal Weight, Water Intake, and One Rep Max. The basic versions are free for everyone — no account needed.',
        variant: 'guru',
      },
    ],
  },
  {
    label: 'Platform & Technical',
    items: [
      {
        q: 'Is GymGurus available on mobile?',
        a: 'Yes. GymGurus is a Progressive Web App (PWA) — install it directly from your browser on iOS or Android for a native app experience. No app store download required. The workout execution interface, rest timer, and set logging are all optimised for one-handed mobile use.',
        variant: 'disciple',
      },
      {
        q: 'Is my data secure?',
        a: 'All data is encrypted in transit (HTTPS/TLS) and at rest. Authentication uses secure sessions with CSRF protection. We never share or sell your personal data. Payment processing is handled entirely by Stripe — GymGurus never stores card numbers.',
        variant: 'guru',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Cancel in one click from Settings → Billing. No retention calls, no cancellation fees, no questions. Your data remains accessible for 30 days after cancellation.',
        variant: 'disciple',
      },
      {
        q: 'What AI model powers the coaching features?',
        a: "GymGurus uses Anthropic's Claude — one of the most capable AI models available. Claude is specifically chosen for its accuracy in health and fitness domains, its ability to reason about training data, and its safety-first design.",
        variant: 'guru',
      },
      {
        q: 'Do the free public calculators require an account?',
        a: 'No. All 13 calculators at the Calculators page are completely free and require no registration. Premium calculator features (saved history, auto-fill from your profile, personalised recommendations) are available to logged-in users on any paid plan.',
        variant: 'disciple',
      },
    ],
  },
];

const FAQSection = memo(() => {
  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Ambient glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, hsl(var(--color-guru) / 0.06) 0%, transparent 70%)',
          top: '5%',
          right: '10%',
          filter: 'blur(80px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1.5 }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle, hsl(var(--color-disciple) / 0.05) 0%, transparent 70%)',
          bottom: '10%',
          left: '5%',
          filter: 'blur(80px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 2, delay: 0.3 }}
      />

      <div className="relative z-10 px-6 md:px-12 lg:px-20 py-20">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-12 space-y-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
              style={{
                background:
                  'linear-gradient(135deg, hsl(var(--color-guru) / 0.08), hsl(var(--color-disciple) / 0.08))',
                border: '1px solid hsl(var(--color-guru) / 0.2)',
                backdropFilter: 'blur(24px)',
              }}
            >
              <Crown className="w-4 h-4" style={{ color: 'hsl(var(--color-guru))' }} />
              <span className="text-sm font-light tracking-wider" style={{ color: '#d4d4d4' }}>
                FAQ
              </span>
            </motion.div>

            <h2
              className="text-4xl md:text-5xl font-light"
              style={{
                fontFamily: "'Playfair Display', serif",
                background:
                  'linear-gradient(90deg, hsl(var(--color-guru)) 0%, #e5e4e2 50%, hsl(var(--color-disciple)) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Frequently Asked Questions
            </h2>
            <p
              className="text-lg"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: '#999',
              }}
            >
              Everything you need to know about GymGurus
            </p>
          </motion.div>

          {/* FAQ groups */}
          <div className="space-y-10">
            {FAQ_GROUPS.map((group) => (
              <div key={group.label}>
                {/* Group label */}
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="flex-shrink-0"
                    style={{
                      fontSize: '10px',
                      fontFamily: 'Inter, sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      color: 'hsl(var(--color-guru))',
                    }}
                  >
                    {group.label}
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: 'hsl(var(--color-guru) / 0.15)' }}
                  />
                </div>

                <Accordion type="single" collapsible className="space-y-2">
                  {group.items.map((item, i) => {
                    const borderColor =
                      item.variant === 'guru'
                        ? 'hsl(var(--color-guru))'
                        : 'hsl(var(--color-disciple))';
                    return (
                      <AccordionItem
                        key={`${group.label}-${i}`}
                        value={`${group.label}-${i}`}
                        className="rounded-xl overflow-hidden border-0"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(15,15,15,0.7), rgba(10,10,10,0.8))',
                        }}
                      >
                        <AccordionTrigger
                          className="px-5 py-4 hover:no-underline cursor-pointer [&[data-state=open]]:border-l-2 border-l-2 border-l-transparent transition-all"
                          style={{
                            borderLeftColor: 'transparent',
                          }}
                        >
                          <span
                            className="text-left font-light"
                            style={{
                              fontFamily: "'Playfair Display', serif",
                              fontSize: '17px',
                              color: '#e5e4e2',
                            }}
                          >
                            {item.q}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent
                          className="px-5 pb-4"
                          style={{
                            borderLeft: `2px solid ${borderColor}`,
                          }}
                        >
                          <p
                            className="font-light"
                            style={{
                              fontFamily: "'Cormorant Garamond', serif",
                              fontSize: '15px',
                              lineHeight: '1.8',
                              color: '#b3b3b3',
                            }}
                          >
                            {item.a}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

FAQSection.displayName = 'FAQSection';

export default FAQSection;
