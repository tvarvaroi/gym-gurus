import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type:
    | 'new_message'
    | 'message_read'
    | 'typing'
    | 'join_room'
    | 'room_joined'
    | 'error'
    | 'client_updated'
    | 'client_created'
    | 'client_deleted'
    | 'workout_updated'
    | 'workout_created'
    | 'workout_deleted'
    | 'session_updated'
    | 'session_created'
    | 'session_completed';
  data: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const currentReconnectIntervalRef = useRef(1000);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  const {
    onMessage,
    onConnect,
    onDisconnect,
    autoReconnect = true,
    maxReconnectAttempts = 3, // Reduced from 10 to 3 to avoid excessive retries
    reconnectInterval = 1000,
    maxReconnectInterval = 10000, // Reduced from 30s to 10s
  } = options;

  const flushMessageQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      messageQueueRef.current.forEach((msg) => {
        wsRef.current?.send(JSON.stringify(msg));
      });
      messageQueueRef.current = [];
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Stop if max reconnect attempts reached
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionState('disconnected');
      return;
    }

    setConnectionState('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In development, Vite proxy will forward /ws to backend on port 5000
    // In production, use the same host as the web server
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        currentReconnectIntervalRef.current = reconnectInterval;

        // Flush queued messages
        flushMessageQueue();

        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setConnectionState('disconnected');
        wsRef.current = null;
        onDisconnect?.();

        // Check for authentication failures (code 1008 = Policy Violation, typically auth issues)
        const isAuthFailure = event.code === 1008 || event.code === 1002;

        // Auto-reconnect with exponential backoff (but not for auth failures)
        if (autoReconnect && !event.wasClean && !isAuthFailure) {
          reconnectAttemptsRef.current++;

          // Calculate next reconnect interval with exponential backoff
          const nextInterval = Math.min(
            currentReconnectIntervalRef.current * 2,
            maxReconnectInterval
          );
          currentReconnectIntervalRef.current = nextInterval;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, currentReconnectIntervalRef.current);
        } else if (isAuthFailure) {
          // Stop reconnecting on authentication failures
          console.warn('WebSocket authentication failed. Stopping reconnection attempts.');
          reconnectAttemptsRef.current = maxReconnectAttempts;
        }
      };

      wsRef.current.onerror = (error) => {
        // Silently handle connection errors to avoid console spam
        // Only log if in development
        if (process.env.NODE_ENV === 'development') {
          console.debug('WebSocket connection attempt failed');
        }
        setConnectionState('disconnected');
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionState('disconnected');

      // Retry connection with exponential backoff
      if (autoReconnect) {
        reconnectAttemptsRef.current++;
        const nextInterval = Math.min(
          currentReconnectIntervalRef.current * 2,
          maxReconnectInterval
        );
        currentReconnectIntervalRef.current = nextInterval;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, currentReconnectIntervalRef.current);
      }
    }
  }, [
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    maxReconnectInterval,
    onConnect,
    onDisconnect,
    onMessage,
    flushMessageQueue,
  ]);

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionState('disconnected');
  };

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      } else {
        // Queue message for sending when connection is restored
        messageQueueRef.current.push(message);

        // Attempt to reconnect if disconnected
        if (connectionState === 'disconnected' && autoReconnect) {
          connect();
        }
      }
    },
    [connectionState, autoReconnect, connect]
  );

  const joinRoom = (clientId: string) => {
    sendMessage({
      type: 'join_room',
      data: { clientId },
    });
  };

  const sendTyping = (isTyping: boolean, clientId: string) => {
    sendMessage({
      type: 'typing',
      data: { isTyping, clientId },
    });
  };

  useEffect(() => {
    // Only connect once on mount
    connect();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && autoReconnect) {
        reconnectAttemptsRef.current = 0;
        currentReconnectIntervalRef.current = reconnectInterval;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // Only run on mount - empty dependency array to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected,
    connectionState,
    connect,
    disconnect,
    sendMessage,
    joinRoom,
    sendTyping,
    reconnectAttempts: reconnectAttemptsRef.current,
    queuedMessages: messageQueueRef.current.length,
  };
}
