import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, Paperclip, MoreHorizontal, MessageSquare, Smartphone, 
  MessageCircle, Instagram, Facebook, Phone, Plus, Settings, Zap, ArrowLeft
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest } from "@/lib/queryClient";
import { Message, Client, MessageTemplate } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { format } from 'date-fns';

// Trainer ID is now derived from authenticated session on server

interface PlatformInfo {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

const PLATFORMS: PlatformInfo[] = [
  { id: 'app', name: 'App', icon: MessageSquare, color: 'text-primary', bgColor: 'bg-primary/10' },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  { id: 'telegram', name: 'Telegram', icon: Send, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  { id: 'sms', name: 'SMS', icon: Smartphone, color: 'text-gray-600', bgColor: 'bg-gray-100' }
];

export default function MessagesPage() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("app");
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [messagesByClient, setMessagesByClient] = useState<Record<string, Message[]>>({});
  const queryClient = useQueryClient();

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    }
  });

  // Fetch messages for selected client
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/clients', selectedClientId, 'messages', selectedPlatform],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const url = selectedPlatform === 'all' 
        ? `/api/clients/${selectedClientId}/messages`
        : `/api/clients/${selectedClientId}/messages?platform=${selectedPlatform}`;
      const response = await fetch(url, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedClientId
  });

  // Fetch message templates
  const { data: templates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ['/api/message-templates'],
    queryFn: async () => {
      const response = await fetch('/api/message-templates', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(messageData)
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all message queries for this client across all platforms
      queryClient.invalidateQueries({ 
        queryKey: ['/api/clients', selectedClientId, 'messages'],
        exact: false 
      });
      setNewMessage("");
    }
  });

  // Multi-platform message mutation
  const sendMultiPlatformMutation = useMutation({
    mutationFn: async ({ clientId, content, platforms }: { clientId: string; content: string; platforms: string[] }) => {
      const response = await fetch('/api/messages/multi-platform', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ clientId, content, platforms })
      });
      if (!response.ok) throw new Error('Failed to send multi-platform message');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all message queries for this client across all platforms
      queryClient.invalidateQueries({ 
        queryKey: ['/api/clients', selectedClientId, 'messages'],
        exact: false 
      });
      setNewMessage("");
    }
  });

  // WebSocket for real-time messaging
  const { isConnected, joinRoom, sendTyping } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'new_message') {
        // Invalidate all message queries for this client across all platforms
        queryClient.invalidateQueries({ 
          queryKey: ['/api/clients', selectedClientId, 'messages'],
          exact: false 
        });
      } else if (message.type === 'typing') {
        setIsTyping(message.data.isTyping);
        setTimeout(() => setIsTyping(false), 3000);
      } else if (message.type === 'message_read') {
        // Invalidate message queries when read status changes
        queryClient.invalidateQueries({ 
          queryKey: ['/api/clients', selectedClientId, 'messages'],
          exact: false 
        });
      }
    }
  });

  // Join room when client is selected
  useEffect(() => {
    if (selectedClientId && isConnected) {
      joinRoom(selectedClientId);
    }
  }, [selectedClientId, isConnected, joinRoom]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleSendMessage = (content: string, platforms: string[] = [selectedPlatform]) => {
    if (!selectedClientId || !content.trim()) return;

    if (platforms.length === 1) {
      sendMessageMutation.mutate({
        clientId: selectedClientId,
        content: content.trim(),
        isFromTrainer: true,
        platform: platforms[0],
        messageType: "text"
      });
    } else {
      sendMultiPlatformMutation.mutate({
        clientId: selectedClientId,
        content: content.trim(),
        platforms
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(newMessage);
    }
  };

  const handleTyping = () => {
    if (selectedClientId && isConnected) {
      sendTyping(true, selectedClientId);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const getPlatformInfo = (platformId: string) => {
    return PLATFORMS.find(p => p.id === platformId) || PLATFORMS[0];
  };

  const getUnreadCount = (clientId: string) => {
    // Mock unread count - in real app this would come from backend
    return Math.floor(Math.random() * 3);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Client List - Hidden on mobile when a client is selected */}
      <div className={`${selectedClientId ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 flex-col`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Conversations</h2>
          <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
            {isConnected ? "Live" : "Offline"}
          </Badge>
        </div>
        
        <div className="space-y-2 flex-1 overflow-y-auto">
          {clients.map((client) => {
            const unreadCount = getUnreadCount(client.id);
            return (
              <motion.div
                key={client.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className={`cursor-pointer transition-all hover-elevate ${
                    selectedClientId === client.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedClientId(client.id)}
                  data-testid={`client-conversation-${client.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{client.name}</p>
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {client.goal}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!selectedClientId ? 'hidden lg:flex' : 'flex'} flex-1 flex-col`}>
        {selectedClient ? (
          <>
            {/* Chat Header */}
            <Card className="mb-4">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 pb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {/* Back button for mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSelectedClientId("")}
                    data-testid="button-back-to-conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {selectedClient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold" data-testid="text-selected-client-name">
                      {selectedClient.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                        <SelectTrigger className="w-32 h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Platforms</SelectItem>
                          {PLATFORMS.map(platform => {
                            const Icon = platform.icon;
                            return (
                              <SelectItem key={platform.id} value={platform.id}>
                                <div className="flex items-center space-x-2">
                                  <Icon className="h-3 w-3" />
                                  <span>{platform.name}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {isTyping && (
                        <Badge variant="outline" className="text-xs animate-pulse">
                          Typing...
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="button-templates">
                        <Zap className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Quick Templates</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {templates.map(template => (
                          <Button
                            key={template.id}
                            variant="ghost"
                            className="w-full justify-start text-left h-auto p-3"
                            onClick={() => {
                              setNewMessage(template.content);
                              setShowTemplates(false);
                            }}
                          >
                            <div>
                              <p className="font-medium">{template.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {template.content.substring(0, 50)}...
                              </p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Messages */}
            <Card className="flex-1 flex flex-col">
              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-container">
                  <AnimatePresence>
                    {messagesLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No messages yet. Start a conversation!
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        const platform = getPlatformInfo(message.platform);
                        const Icon = platform.icon;
                        
                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`flex ${message.isFromTrainer ? 'justify-end' : 'justify-start'}`}
                            data-testid={`message-${index}`}
                          >
                            <div className={`max-w-[70%] ${message.isFromTrainer ? 'order-2' : 'order-1'}`}>
                              <div
                                className={`rounded-lg px-3 py-2 ${
                                  message.isFromTrainer
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <div className="flex items-center space-x-1 mb-1">
                                  <Icon className="h-3 w-3 opacity-70" />
                                  <span className="text-xs opacity-70">{platform.name}</span>
                                </div>
                                <p className="text-sm">{message.content}</p>
                                <p className={`text-xs mt-1 ${
                                  message.isFromTrainer ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}>
                                  {formatMessageTime(message.sentAt.toString())}
                                  {message.readAt && message.isFromTrainer && (
                                    <span className="ml-1">✓✓</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <Textarea
                        placeholder={`Type a message for ${selectedClient.name}...`}
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        onKeyDown={handleKeyPress}
                        className="min-h-[2.5rem] max-h-24 resize-none"
                        data-testid="input-message"
                      />
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={() => handleSendMessage(newMessage)}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        data-testid="button-send-message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Multi-platform Send */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-muted-foreground">Send to:</span>
                      {PLATFORMS.slice(0, 3).map(platform => {
                        const Icon = platform.icon;
                        return (
                          <Button
                            key={platform.id}
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleSendMessage(newMessage, [platform.id])}
                            disabled={!newMessage.trim()}
                          >
                            <Icon className="h-3 w-3" />
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendMessage(newMessage, ['whatsapp', 'telegram', 'app'])}
                      disabled={!newMessage.trim()}
                      data-testid="button-send-all-platforms"
                    >
                      Send to All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a client from the list to start messaging
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}