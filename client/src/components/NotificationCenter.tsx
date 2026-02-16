import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Bell, Check, CheckCheck, Trophy, Flame, Zap, Dumbbell, UserPlus, CreditCard, MessageCircle, AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any> | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'workout_assigned':
    case 'workout_completed':
      return Dumbbell;
    case 'achievement_unlocked':
      return Trophy;
    case 'streak_milestone':
      return Flame;
    case 'level_up':
      return Zap;
    case 'personal_record':
      return Trophy;
    case 'client_joined':
      return UserPlus;
    case 'payment_received':
      return CreditCard;
    case 'streak_danger':
      return AlertTriangle;
    case 'session_reminder':
      return Clock;
    case 'message':
      return MessageCircle;
    default:
      return Bell;
  }
}

function getNotificationColor(type: string) {
  switch (type) {
    case 'workout_assigned':
      return 'text-blue-400';
    case 'workout_completed':
      return 'text-green-400';
    case 'achievement_unlocked':
      return 'text-yellow-400';
    case 'streak_milestone':
      return 'text-orange-400';
    case 'level_up':
      return 'text-purple-400';
    case 'personal_record':
      return 'text-amber-400';
    case 'client_joined':
      return 'text-cyan-400';
    case 'payment_received':
      return 'text-emerald-400';
    case 'streak_danger':
      return 'text-red-400';
    case 'session_reminder':
      return 'text-blue-400';
    default:
      return 'text-gray-400';
  }
}

function getNotificationRoute(notif: Notification): string | null {
  switch (notif.type) {
    case 'workout_assigned':
      return '/schedule';
    case 'workout_completed':
      return '/progress';
    case 'achievement_unlocked':
      return '/solo/achievements';
    case 'level_up':
    case 'streak_milestone':
      return '/solo';
    case 'personal_record':
      return '/progress';
    case 'client_joined':
      return notif.data?.clientId ? `/clients/${notif.data.clientId}` : '/clients';
    case 'payment_received':
      return '/payments';
    case 'session_reminder':
      return '/schedule';
    default:
      return null;
  }
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: () => fetch('/api/notifications?limit=20').then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: () => fetch('/api/notifications/unread-count').then(r => r.json()),
    refetchInterval: 15000,
  });

  const unreadCount = unreadData?.count || 0;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/notifications/${id}/read`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => fetch('/api/notifications/read-all', { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl transition-all duration-200 hover:bg-white/10"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5 text-white/80" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] overflow-hidden rounded-xl border shadow-2xl z-50"
            style={{
              background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(15, 15, 25, 0.98))',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto max-h-[calc(70vh-48px)]">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = getNotificationIcon(notif.type);
                  const iconColor = getNotificationColor(notif.type);

                  return (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 transition-colors cursor-pointer ${
                        notif.read ? 'opacity-60' : 'bg-white/[0.03]'
                      } hover:bg-white/[0.06]`}
                      onClick={() => {
                        if (!notif.read) {
                          markReadMutation.mutate(notif.id);
                        }
                        const route = getNotificationRoute(notif);
                        if (route) {
                          setLocation(route);
                          setIsOpen(false);
                        }
                      }}
                    >
                      <div className={`mt-0.5 p-1.5 rounded-lg bg-white/5 ${iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white/90 truncate">{notif.title}</p>
                          {!notif.read && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-white/30 mt-1">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
