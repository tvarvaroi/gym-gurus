import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Dumbbell,
  Apple,
  Moon,
  Target,
  Zap,
  RefreshCw,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Crown,
  Lock,
} from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Quick suggestion prompts
const quickPrompts = [
  {
    icon: Dumbbell,
    label: 'Workout Tips',
    prompt: 'Give me tips to improve my workout performance',
  },
  { icon: Apple, label: 'Nutrition', prompt: 'What should I eat before and after my workout?' },
  { icon: Moon, label: 'Recovery', prompt: 'How can I optimize my recovery between workouts?' },
  {
    icon: Target,
    label: 'Goals',
    prompt: 'Help me set realistic fitness goals for the next month',
  },
];

export default function AICoach() {
  const prefersReducedMotion = useReducedMotion();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hey! I'm your AI Coach. I'm here to help you crush your fitness goals. Whether you need workout advice, nutrition tips, or motivation, I've got you covered. What can I help you with today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [localRemaining, setLocalRemaining] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Fetch today's AI usage (remaining requests)
  const { data: usageData } = useQuery<{
    remaining: number;
    limit: number;
    requestCount: number;
    resetAt: string;
  }>({
    queryKey: ['/api/ai/usage'],
    retry: false,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Derive displayed remaining — prefer localRemaining (updated after each message) over query
  const remaining = localRemaining ?? usageData?.remaining ?? null;
  const limit = usageData?.limit ?? null;

  // Fetch fitness profile for AI context personalization
  const { data: fitnessProfile } = useQuery<any>({
    queryKey: ['/api/solo/fitness-profile'],
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (message?: string) => {
    const content = message || input;
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Block if limit already reached client-side
    if (remaining === 0) {
      setLimitReached(true);
      setIsTyping(false);
      return;
    }

    // Call real AI API endpoint
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          conversationId: messages.length > 1 ? 'solo-chat' : undefined,
          context: {
            goals: fitnessProfile?.primaryGoal || 'general fitness',
            experience: fitnessProfile?.experienceLevel || 'intermediate',
            environment: fitnessProfile?.workoutEnvironment || undefined,
            equipment: fitnessProfile?.availableEquipment || undefined,
            frequency: fitnessProfile?.workoutFrequencyPerWeek || undefined,
          },
        }),
      });

      const data = await response.json();

      if (response.status === 402) {
        // Usage limit reached
        setLimitReached(true);
        setLocalRemaining(0);
        return;
      }

      if (!response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            data.error === 'AI service not configured.'
              ? 'The AI service is currently unavailable. Please try again later.'
              : 'Sorry, I had trouble generating a response. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      // Update remaining from server response
      if (data.usage?.remaining !== undefined) {
        setLocalRemaining(data.usage.remaining);
        if (data.usage.remaining === 0) setLimitReached(true);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Sorry, I had trouble generating a response. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extralight tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20">
              <Sparkles className="h-8 w-8 text-purple-400" />
            </div>
            AI{' '}
            <span className="font-light bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Coach
            </span>
          </h1>
          <p className="text-muted-foreground font-light">
            Your personal fitness assistant, available 24/7
          </p>
        </div>
        <div className="flex items-center gap-2">
          {remaining !== null && limit !== null && limit > 0 && (
            <Badge
              variant="outline"
              className={
                remaining === 0
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : remaining <= 2
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-muted/50 border-border/50 text-muted-foreground'
              }
            >
              {remaining === 0 ? (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  Limit reached
                </>
              ) : (
                <>
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {remaining}/{limit} today
                </>
              )}
            </Badge>
          )}
          <Badge
            variant="outline"
            className="bg-purple-500/10 border-purple-500/30 text-purple-400"
          >
            <Zap className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </motion.div>

      {/* Quick Prompts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {quickPrompts.map((prompt, index) => (
          <motion.button
            key={prompt.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            onClick={() => handleSend(prompt.prompt)}
            className="group p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-2">
              <prompt.icon className="h-4 w-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
              <span className="text-sm font-light group-hover:text-purple-400 transition-colors">
                {prompt.label}
              </span>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Chat Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Messages Area */}
            <div className="h-[500px] overflow-y-auto p-4 space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'assistant'
                          ? 'bg-gradient-to-br from-purple-500 to-indigo-500'
                          : 'bg-gradient-to-br from-cyan-500 to-teal-500'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <Bot className="h-4 w-4 text-white" />
                      ) : (
                        <User className="h-4 w-4 text-white" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'assistant'
                          ? 'bg-muted/50 rounded-tl-none'
                          : 'bg-purple-500/20 rounded-tr-none'
                      }`}
                    >
                      <p className="text-sm font-light whitespace-pre-wrap leading-relaxed">
                        {message.content.split('\n').map((line, i) => {
                          // Handle bold text
                          const parts = line.split(/(\*\*[^*]+\*\*)/g);
                          return (
                            <span key={i}>
                              {parts.map((part, j) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return (
                                    <strong key={j} className="font-medium">
                                      {part.slice(2, -2)}
                                    </strong>
                                  );
                                }
                                return part;
                              })}
                              {i < message.content.split('\n').length - 1 && <br />}
                            </span>
                          );
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted/50 rounded-2xl rounded-tl-none px-4 py-3">
                      <div className="flex gap-1">
                        <motion.div
                          className="w-2 h-2 rounded-full bg-purple-400"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{
                            duration: 0.6,
                            repeat: prefersReducedMotion ? 0 : Infinity,
                            delay: 0,
                          }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-purple-400"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{
                            duration: 0.6,
                            repeat: prefersReducedMotion ? 0 : Infinity,
                            delay: 0.2,
                          }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-purple-400"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{
                            duration: 0.6,
                            repeat: prefersReducedMotion ? 0 : Infinity,
                            delay: 0.4,
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border/50 p-4 bg-muted/20">
              {limitReached ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Daily AI limit reached</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    You've used all your AI requests for today. Upgrade for more daily requests, or
                    your limit resets at midnight UTC.
                  </p>
                  <a
                    href="/pricing"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium hover:from-purple-600 hover:to-indigo-600 transition-all"
                  >
                    <Crown className="h-4 w-4" />
                    Upgrade Plan
                  </a>
                </div>
              ) : (
                <>
                  <div className="flex gap-3">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about fitness..."
                      className="flex-1 bg-background/50 border-border/50 focus:border-purple-500/50"
                      disabled={isTyping}
                    />
                    <Button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isTyping}
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    AI Coach provides general fitness guidance. For medical advice, consult a
                    professional.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
