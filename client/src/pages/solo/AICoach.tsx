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
  MessageSquare
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Quick suggestion prompts
const quickPrompts = [
  { icon: Dumbbell, label: 'Workout Tips', prompt: 'Give me tips to improve my workout performance' },
  { icon: Apple, label: 'Nutrition', prompt: 'What should I eat before and after my workout?' },
  { icon: Moon, label: 'Recovery', prompt: 'How can I optimize my recovery between workouts?' },
  { icon: Target, label: 'Goals', prompt: 'Help me set realistic fitness goals for the next month' },
];

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey! I'm your AI Coach. I'm here to help you crush your fitness goals. Whether you need workout advice, nutrition tips, or motivation, I've got you covered. What can I help you with today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
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

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response (replace with actual API call when Anthropic integration is ready)
    setTimeout(() => {
      const responses = getAIResponse(content);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responses,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes('workout') || input.includes('exercise') || input.includes('training')) {
      return "Great question about workouts! Here are some key tips:\n\n• **Progressive Overload**: Gradually increase weight, reps, or sets over time\n• **Proper Form**: Quality over quantity - focus on technique first\n• **Rest Between Sets**: 60-90 seconds for hypertrophy, 2-3 minutes for strength\n• **Compound Movements**: Prioritize exercises like squats, deadlifts, and bench press\n\nWould you like me to create a personalized workout plan for you?";
    }

    if (input.includes('nutrition') || input.includes('eat') || input.includes('diet') || input.includes('food')) {
      return "Nutrition is crucial for your fitness goals! Here's what I recommend:\n\n• **Pre-workout** (1-2 hours before): Complex carbs + moderate protein (oatmeal with banana, toast with eggs)\n• **Post-workout** (within 30-60 mins): Protein + simple carbs (protein shake with fruit, chicken with rice)\n• **Daily Protein**: Aim for 0.7-1g per pound of bodyweight\n• **Stay Hydrated**: At least 8 glasses of water daily, more on training days\n\nWhat are your specific nutrition goals?";
    }

    if (input.includes('recovery') || input.includes('rest') || input.includes('sleep') || input.includes('sore')) {
      return "Recovery is when the magic happens! Here's how to optimize it:\n\n• **Sleep**: Aim for 7-9 hours of quality sleep per night\n• **Active Recovery**: Light walks, stretching, or yoga on rest days\n• **Nutrition**: Protein intake is crucial for muscle repair\n• **Hydration**: Dehydration slows recovery significantly\n• **Manage Stress**: High cortisol levels impair recovery\n\nRemember: Muscles grow during rest, not during the workout itself!";
    }

    if (input.includes('goal') || input.includes('plan') || input.includes('target')) {
      return "Let's set some SMART goals for you! Here's a framework:\n\n• **Specific**: 'Increase bench press by 20 lbs' rather than 'get stronger'\n• **Measurable**: Track progress weekly\n• **Achievable**: Challenging but realistic\n• **Relevant**: Aligned with your overall fitness vision\n• **Time-bound**: Set a deadline (e.g., 8-12 weeks)\n\nBased on your profile, I'd suggest focusing on consistency first. What's your main priority right now - strength, muscle gain, or fat loss?";
    }

    if (input.includes('motivation') || input.includes('stuck') || input.includes('plateau')) {
      return "We all hit walls sometimes - that's totally normal! Here's how to push through:\n\n• **Remember Your Why**: What got you started in the first place?\n• **Track Progress**: Sometimes gains are happening even when you don't notice\n• **Switch It Up**: Try new exercises or training styles\n• **Find Your Community**: Training partners or online communities help\n• **Celebrate Small Wins**: Every rep, every day counts\n\nYou've got this! What specific challenge are you facing right now?";
    }

    return "That's a great question! I'm here to help with:\n\n• **Workout programming** - Custom routines for your goals\n• **Nutrition guidance** - What to eat and when\n• **Recovery optimization** - Maximize your rest days\n• **Goal setting** - Create achievable milestones\n• **Form tips** - Improve your exercise technique\n\nWhat would you like to focus on today?";
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
            AI <span className="font-light bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Coach</span>
          </h1>
          <p className="text-muted-foreground font-light">Your personal fitness assistant, available 24/7</p>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400">
          <Zap className="h-3 w-3 mr-1" />
          AI Powered
        </Badge>
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
              <span className="text-sm font-light group-hover:text-purple-400 transition-colors">{prompt.label}</span>
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
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'assistant'
                        ? 'bg-gradient-to-br from-purple-500 to-indigo-500'
                        : 'bg-gradient-to-br from-cyan-500 to-teal-500'
                    }`}>
                      {message.role === 'assistant' ? (
                        <Bot className="h-4 w-4 text-white" />
                      ) : (
                        <User className="h-4 w-4 text-white" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'assistant'
                        ? 'bg-muted/50 rounded-tl-none'
                        : 'bg-purple-500/20 rounded-tr-none'
                    }`}>
                      <p className="text-sm font-light whitespace-pre-wrap leading-relaxed">
                        {message.content.split('\n').map((line, i) => {
                          // Handle bold text
                          const parts = line.split(/(\*\*[^*]+\*\*)/g);
                          return (
                            <span key={i}>
                              {parts.map((part, j) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return <strong key={j} className="font-medium">{part.slice(2, -2)}</strong>;
                                }
                                return part;
                              })}
                              {i < message.content.split('\n').length - 1 && <br />}
                            </span>
                          );
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-purple-400"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-purple-400"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
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
                AI Coach provides general fitness guidance. For medical advice, consult a professional.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
