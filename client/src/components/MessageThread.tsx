import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Paperclip, MoreHorizontal } from "lucide-react"
import { useState } from "react"

interface Message {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: string
  isTrainer: boolean
}

interface MessageThreadProps {
  clientName: string
  clientAvatar?: string
  messages: Message[]
  unreadCount?: number
}

export default function MessageThread({ 
  clientName, 
  clientAvatar, 
  messages, 
  unreadCount = 0 
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState("")
  
  const clientInitials = clientName.split(' ').map(n => n[0]).join('').toUpperCase()

  const handleSend = () => {
    if (newMessage.trim()) {
      // Send message logic
      setNewMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="flex flex-col h-96" data-testid={`thread-${clientName.toLowerCase().replace(' ', '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            {clientAvatar && <AvatarImage src={clientAvatar} alt={clientName} />}
            <AvatarFallback className="bg-primary text-primary-foreground">
              {clientInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base" data-testid="text-thread-client-name">
              {clientName}
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" data-testid="button-thread-menu">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.isTrainer ? 'justify-end' : 'justify-start'}`}
              data-testid={`message-${index}`}
            >
              <div className={`max-w-[70%] ${message.isTrainer ? 'order-2' : 'order-1'}`}>
                <div
                  className={`px-3 py-2 rounded-lg ${
                    message.isTrainer 
                      ? 'bg-primary text-primary-foreground ml-2' 
                      : 'bg-muted mr-2'
                  }`}
                >
                  <p className="text-sm" data-testid={`text-message-content-${index}`}>
                    {message.content}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  {message.timestamp}
                </p>
              </div>
              {!message.isTrainer && (
                <Avatar className="h-6 w-6 order-1">
                  {message.senderAvatar && <AvatarImage src={message.senderAvatar} alt={message.senderName} />}
                  <AvatarFallback className="text-xs">
                    {message.senderName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              data-testid="input-message"
            />
            <Button variant="outline" size="icon" data-testid="button-attach-file">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleSend}
              disabled={!newMessage.trim()}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}