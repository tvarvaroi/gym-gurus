import { storage } from '../storage';

/**
 * Add deliveredAt tracking to messages for delivery status monitoring
 */
export interface MessageDeliveryStatus {
  messageId: string;
  platform: string;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount?: number;
}

// Simple in-memory tracking for demo purposes
// In production, this would be stored in the database
const deliveryTracker = new Map<string, MessageDeliveryStatus>();

/**
 * Mark a message as delivered for a specific platform
 */
export function markMessageDelivered(messageId: string, platform: string): void {
  const key = `${messageId}:${platform}`;
  deliveryTracker.set(key, {
    messageId,
    platform,
    deliveredAt: new Date()
  });
}

/**
 * Mark a message as failed delivery for a specific platform
 */
export function markMessageFailed(messageId: string, platform: string, reason: string, retryCount: number = 0): void {
  const key = `${messageId}:${platform}`;
  deliveryTracker.set(key, {
    messageId,
    platform,
    failureReason: reason,
    retryCount
  });
}

/**
 * Get delivery status for a message on a specific platform
 */
export function getMessageDeliveryStatus(messageId: string, platform: string): MessageDeliveryStatus | undefined {
  const key = `${messageId}:${platform}`;
  return deliveryTracker.get(key);
}

/**
 * Get all delivery statuses for a message across all platforms
 */
export function getMessageDeliveryStatuses(messageId: string): MessageDeliveryStatus[] {
  const statuses: MessageDeliveryStatus[] = [];
  for (const [key, status] of Array.from(deliveryTracker.entries())) {
    if (status.messageId === messageId) {
      statuses.push(status);
    }
  }
  return statuses;
}

/**
 * Simulate message delivery to external platforms
 * In production, this would integrate with actual messaging APIs
 */
export async function simulateMessageDelivery(messageId: string, platform: string, content: string): Promise<boolean> {
  try {
    console.log(`Simulating delivery of message ${messageId} to ${platform}: ${content}`);
    
    // Simulate random delivery success/failure for demo
    const deliverySuccess = Math.random() > 0.1; // 90% success rate
    
    if (deliverySuccess) {
      // Simulate delivery delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
      markMessageDelivered(messageId, platform);
      console.log(`Message ${messageId} delivered successfully to ${platform}`);
      return true;
    } else {
      markMessageFailed(messageId, platform, 'Simulated delivery failure');
      console.log(`Message ${messageId} failed to deliver to ${platform}`);
      return false;
    }
  } catch (error) {
    markMessageFailed(messageId, platform, `Delivery error: ${error}`);
    console.error(`Error delivering message ${messageId} to ${platform}:`, error);
    return false;
  }
}

/**
 * Get delivery statistics for a trainer's messages
 */
export function getDeliveryStatistics(trainerId: string): {
  totalMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  deliveryRate: number;
} {
  const allStatuses = Array.from(deliveryTracker.values());
  const delivered = allStatuses.filter(s => s.deliveredAt).length;
  const failed = allStatuses.filter(s => s.failureReason).length;
  const total = allStatuses.length;
  
  return {
    totalMessages: total,
    deliveredMessages: delivered,
    failedMessages: failed,
    deliveryRate: total > 0 ? (delivered / total) * 100 : 0
  };
}