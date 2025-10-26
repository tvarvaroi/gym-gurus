import type {
  Client, Message, ProgressEntry, MessageTemplate
} from "@shared/schema";

// Generate random ID for mock data
const generateId = () => Math.random().toString(36).substr(2, 9);

// Generate random date within range
const generateDate = (daysAgo: number = 30) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
};

// Mock Clients
export const getMockClients = (trainerId: string): Client[] => {
  return [
    {
      id: "mock-client-1",
      trainerId,
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "+1234567890",
      goal: "Build muscle and increase strength",
      status: "active",
      createdAt: generateDate(60),
      lastSession: generateDate(2),
      nextSession: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: "mock-client-2",
      trainerId,
      name: "Sarah Johnson",
      email: "sarah.j@example.com", 
      phone: "+1234567891",
      goal: "Weight loss and improved cardio fitness",
      status: "active",
      createdAt: generateDate(45),
      lastSession: generateDate(3),
      nextSession: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    {
      id: "mock-client-3",
      trainerId,
      name: "Mike Davis",
      email: "mike.d@example.com",
      phone: "+1234567892",
      goal: "Improve flexibility and core strength",
      status: "paused",
      createdAt: generateDate(90),
      lastSession: generateDate(10),
      nextSession: null
    }
  ];
};

// Mock Messages
export const getMockMessages = (trainerId: string, clientId?: string): Message[] => {
  const messages: Message[] = [
    {
      id: "mock-msg-1",
      trainerId,
      clientId: clientId || "mock-client-1",
      content: "Great workout today! Keep up the excellent work.",
      isFromTrainer: true,
      platform: "app",
      externalMessageId: null,
      messageType: "text",
      attachmentUrl: null,
      sentAt: generateDate(1),
      readAt: generateDate(0),
      deliveredAt: generateDate(1),
      deliveryStatus: "delivered",
      errorMessage: null
    },
    {
      id: "mock-msg-2",
      trainerId,
      clientId: clientId || "mock-client-1",
      content: "Thanks! I'm feeling stronger already. When is our next session?",
      isFromTrainer: false,
      platform: "app",
      externalMessageId: null,
      messageType: "text",
      attachmentUrl: null,
      sentAt: generateDate(0),
      readAt: generateDate(0),
      deliveredAt: generateDate(0),
      deliveryStatus: "delivered",
      errorMessage: null
    },
    {
      id: "mock-msg-3",
      trainerId,
      clientId: clientId || "mock-client-2",
      content: "Remember to complete your cardio routine today!",
      isFromTrainer: true,
      platform: "whatsapp",
      externalMessageId: "wa-123456",
      messageType: "text",
      attachmentUrl: null,
      sentAt: generateDate(2),
      readAt: null,
      deliveredAt: generateDate(2),
      deliveryStatus: "delivered",
      errorMessage: null
    },
    {
      id: "mock-msg-4",
      trainerId,
      clientId: clientId || "mock-client-2",
      content: "Will do! Already halfway through.",
      isFromTrainer: false,
      platform: "whatsapp",
      externalMessageId: "wa-123457",
      messageType: "text",
      attachmentUrl: null,
      sentAt: generateDate(2),
      readAt: generateDate(1),
      deliveredAt: generateDate(2),
      deliveryStatus: "delivered",
      errorMessage: null
    }
  ];

  // Filter by clientId if provided
  if (clientId) {
    return messages.filter(msg => msg.clientId === clientId);
  }
  
  return messages;
};

// Mock Progress Entries
export const getMockProgress = (clientId: string): ProgressEntry[] => {
  const progressTypes = [
    { type: "weight", unit: "lbs", baseValue: 180 },
    { type: "body_fat", unit: "%", baseValue: 22 },
    { type: "chest", unit: "inches", baseValue: 42 },
    { type: "waist", unit: "inches", baseValue: 34 },
    { type: "arms", unit: "inches", baseValue: 15 }
  ];

  const entries: ProgressEntry[] = [];
  
  // Generate 10-15 progress entries over the last 60 days
  const numEntries = 10 + Math.floor(Math.random() * 6);
  
  for (let i = 0; i < numEntries; i++) {
    const typeIndex = Math.floor(Math.random() * progressTypes.length);
    const progressType = progressTypes[typeIndex];
    
    // Create realistic progress values with slight variations
    const variation = (Math.random() - 0.5) * 10;
    const value = progressType.baseValue + variation;
    
    entries.push({
      id: `mock-progress-${i}`,
      clientId,
      type: progressType.type,
      value: value.toFixed(2),
      unit: progressType.unit,
      notes: i % 3 === 0 ? "Good progress this week!" : null,
      recordedAt: generateDate(60 - (i * 4))
    });
  }
  
  // Sort by date descending (most recent first)
  return entries.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
};

// Mock Settings
export const getMockSettings = () => {
  return {
    general: {
      appName: "Gym Gurus",
      timezone: "America/New_York",
      language: "en",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      currency: "USD"
    },
    notifications: {
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      reminderHours: 24,
      dailyDigest: true,
      weeklyReport: true
    },
    appearance: {
      theme: "light",
      primaryColor: "#8B5CF6",
      accentColor: "#10B981",
      fontSize: "medium",
      compactMode: false
    },
    communication: {
      defaultPlatform: "app",
      availablePlatforms: ["app", "whatsapp", "telegram", "sms"],
      autoResponseEnabled: false,
      businessHours: {
        start: "09:00",
        end: "18:00",
        timezone: "America/New_York",
        weekends: false
      }
    },
    billing: {
      defaultRate: 75,
      currency: "USD",
      billingCycle: "monthly",
      paymentMethods: ["credit_card", "bank_transfer", "cash"],
      invoicePrefix: "INV",
      taxRate: 0
    },
    privacy: {
      dataRetentionDays: 365,
      clientDataSharing: false,
      analyticsEnabled: true,
      marketingEmails: false
    }
  };
};

// Mock Analytics Data
export const getMockAnalytics = (trainerId?: string) => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
  
  return {
    overview: {
      totalClients: 24,
      activeClients: 18,
      inactiveClients: 6,
      totalSessions: 156,
      upcomingSessions: 12,
      completedThisMonth: 42,
      revenue: {
        thisMonth: 3150,
        lastMonth: 2850,
        percentChange: 10.5
      }
    },
    clientMetrics: {
      newClientsThisMonth: 3,
      clientRetentionRate: 85,
      averageSessionsPerClient: 6.5,
      topPerformers: [
        { name: "John Smith", sessionsCompleted: 12, progress: 95 },
        { name: "Sarah Johnson", sessionsCompleted: 10, progress: 88 },
        { name: "Mike Davis", sessionsCompleted: 9, progress: 82 }
      ]
    },
    workoutMetrics: {
      totalWorkoutPlans: 45,
      mostUsedWorkouts: [
        { name: "Full Body Strength", uses: 28 },
        { name: "HIIT Cardio Blast", uses: 24 },
        { name: "Core & Flexibility", uses: 18 }
      ],
      averageWorkoutDuration: 55,
      completionRate: 78
    },
    progressTracking: {
      averageWeightLoss: 8.5,
      averageMusclGain: 3.2,
      clientsMetGoals: 14,
      clientsOnTrack: 16,
      clientsNeedingAttention: 2
    },
    communicationStats: {
      totalMessages: 342,
      messagesThisWeek: 48,
      averageResponseTime: "2.5 hours",
      platformBreakdown: {
        app: 65,
        whatsapp: 20,
        telegram: 10,
        sms: 5
      }
    },
    revenueAnalytics: {
      monthlyRevenue: [
        { month: "Jan", revenue: 2450 },
        { month: "Feb", revenue: 2650 },
        { month: "Mar", revenue: 2850 },
        { month: "Apr", revenue: 3150 }
      ],
      revenueByService: {
        personalTraining: 70,
        groupClasses: 20,
        nutritionPlans: 10
      },
      outstandingPayments: 450,
      averageClientValue: 175
    },
    timeAnalytics: {
      busiestDays: ["Monday", "Wednesday", "Friday"],
      busiestHours: ["6:00 AM", "5:00 PM", "6:00 PM"],
      averageSessionLength: 60,
      totalHoursThisMonth: 70
    }
  };
};

// Mock Dashboard Stats
export const getMockDashboardStats = (trainerId: string) => {
  return {
    activeClients: 18,
    totalWorkouts: 45,
    upcomingSessions: 12,
    recentActivity: [
      {
        type: "session_completed",
        clientName: "John Smith",
        details: "Completed Full Body Strength workout",
        timestamp: generateDate(0)
      },
      {
        type: "progress_updated",
        clientName: "Sarah Johnson",
        details: "Updated weight: 145 lbs (-2 lbs)",
        timestamp: generateDate(1)
      },
      {
        type: "message_received",
        clientName: "Mike Davis",
        details: "New message on WhatsApp",
        timestamp: generateDate(1)
      },
      {
        type: "workout_assigned",
        clientName: "John Smith",
        details: "Assigned HIIT Cardio Blast",
        timestamp: generateDate(2)
      }
    ]
  };
};

// Mock Message Templates
export const getMockMessageTemplates = (trainerId: string): MessageTemplate[] => {
  return [
    {
      id: "template-1",
      trainerId,
      title: "Workout Reminder",
      content: "Hi {name}! Just a friendly reminder about your {workout} session tomorrow at {time}. See you then!",
      category: "workout_reminder",
      platform: "all",
      createdAt: generateDate(30)
    },
    {
      id: "template-2",
      trainerId,
      title: "Daily Motivation",
      content: "Remember, every workout brings you closer to your goals! You've got this! 💪",
      category: "motivation",
      platform: "all",
      createdAt: generateDate(20)
    },
    {
      id: "template-3",
      trainerId,
      title: "Check-in Message",
      content: "Hey {name}, how are you feeling after yesterday's workout? Any soreness or concerns?",
      category: "check_in",
      platform: "all",
      createdAt: generateDate(15)
    }
  ];
};