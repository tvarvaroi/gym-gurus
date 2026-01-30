import type {
  Client, ProgressEntry
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
      age: 28,
      gender: "male",
      height: "180",
      weight: "85",
      activityLevel: "active",
      neckCircumference: "38",
      waistCircumference: "85",
      hipCircumference: null,
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
      age: 32,
      gender: "female",
      height: "165",
      weight: "68",
      activityLevel: "moderately_active",
      neckCircumference: "32",
      waistCircumference: "75",
      hipCircumference: "95",
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
      age: 45,
      gender: "male",
      height: "175",
      weight: "92",
      activityLevel: "lightly_active",
      neckCircumference: "40",
      waistCircumference: "98",
      hipCircumference: null,
      createdAt: generateDate(90),
      lastSession: generateDate(10),
      nextSession: null
    }
  ];
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

