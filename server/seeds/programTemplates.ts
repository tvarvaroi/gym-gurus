// Seed data: curated program templates for the Program Browser
// These are inserted with isTemplate=true, isPublic=true

export interface ProgramTemplateSeed {
  title: string;
  description: string;
  goal: string;
  experienceLevel: string;
  durationWeeks: number;
  daysPerWeek: number;
  tags: string[];
  weeks: {
    weekNumber: number;
    label: string;
    notes?: string;
    days: {
      dayNumber: number;
      label: string;
      exercises: {
        name: string;
        sets: number;
        reps: string;
        rpe?: number;
        rest: string;
        notes?: string;
      }[];
    }[];
  }[];
}

export const programTemplates: ProgramTemplateSeed[] = [
  {
    title: 'Beginner Strength Foundation',
    description:
      'A 4-week full-body program designed for beginners. Learn the big compound lifts with progressive overload built in. 3 days per week with full recovery days between sessions.',
    goal: 'strength',
    experienceLevel: 'beginner',
    durationWeeks: 4,
    daysPerWeek: 3,
    tags: ['beginner', 'full-body', 'strength', 'compound'],
    weeks: [
      {
        weekNumber: 1,
        label: 'Foundation',
        notes: 'Focus on learning movement patterns. Use light weight.',
        days: [
          {
            dayNumber: 1,
            label: 'Full Body A',
            exercises: [
              {
                name: 'Barbell Back Squat',
                sets: 3,
                reps: '8',
                rest: '120s',
                notes: 'Light — learn the pattern',
              },
              { name: 'Bench Press', sets: 3, reps: '8', rest: '120s' },
              { name: 'Barbell Row', sets: 3, reps: '8', rest: '90s' },
              { name: 'Dumbbell Shoulder Press', sets: 2, reps: '10', rest: '60s' },
              { name: 'Plank', sets: 3, reps: '30s', rest: '45s' },
            ],
          },
          {
            dayNumber: 2,
            label: 'Full Body B',
            exercises: [
              { name: 'Romanian Deadlift', sets: 3, reps: '8', rest: '120s' },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10', rest: '90s' },
              { name: 'Lat Pulldown', sets: 3, reps: '10', rest: '90s' },
              { name: 'Leg Press', sets: 3, reps: '10', rest: '90s' },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: '45s' },
            ],
          },
          {
            dayNumber: 3,
            label: 'Full Body C',
            exercises: [
              { name: 'Goblet Squat', sets: 3, reps: '10', rest: '90s' },
              { name: 'Dumbbell Bench Press', sets: 3, reps: '10', rest: '90s' },
              { name: 'Cable Row', sets: 3, reps: '10', rest: '90s' },
              { name: 'Lateral Raises', sets: 3, reps: '12', rest: '45s' },
              { name: 'Dumbbell Curl', sets: 2, reps: '12', rest: '45s' },
            ],
          },
        ],
      },
      {
        weekNumber: 2,
        label: 'Build',
        notes: 'Add 2.5-5kg to compound lifts from Week 1.',
        days: [
          {
            dayNumber: 1,
            label: 'Full Body A',
            exercises: [
              { name: 'Barbell Back Squat', sets: 3, reps: '8', rest: '120s', rpe: 7 },
              { name: 'Bench Press', sets: 3, reps: '8', rest: '120s', rpe: 7 },
              { name: 'Barbell Row', sets: 3, reps: '8', rest: '90s', rpe: 7 },
              { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10', rest: '60s' },
              { name: 'Plank', sets: 3, reps: '40s', rest: '45s' },
            ],
          },
          {
            dayNumber: 2,
            label: 'Full Body B',
            exercises: [
              { name: 'Romanian Deadlift', sets: 3, reps: '8', rest: '120s', rpe: 7 },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10', rest: '90s' },
              { name: 'Lat Pulldown', sets: 3, reps: '10', rest: '90s' },
              { name: 'Leg Press', sets: 3, reps: '10', rest: '90s' },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: '45s' },
            ],
          },
          {
            dayNumber: 3,
            label: 'Full Body C',
            exercises: [
              { name: 'Goblet Squat', sets: 3, reps: '10', rest: '90s' },
              { name: 'Dumbbell Bench Press', sets: 3, reps: '10', rest: '90s' },
              { name: 'Cable Row', sets: 3, reps: '10', rest: '90s' },
              { name: 'Lateral Raises', sets: 3, reps: '12', rest: '45s' },
              { name: 'Dumbbell Curl', sets: 2, reps: '12', rest: '45s' },
            ],
          },
        ],
      },
      {
        weekNumber: 3,
        label: 'Push',
        notes: 'Add another 2.5-5kg. Increase one set on compounds.',
        days: [
          {
            dayNumber: 1,
            label: 'Full Body A',
            exercises: [
              { name: 'Barbell Back Squat', sets: 4, reps: '6-8', rest: '150s', rpe: 8 },
              { name: 'Bench Press', sets: 4, reps: '6-8', rest: '150s', rpe: 8 },
              { name: 'Barbell Row', sets: 4, reps: '6-8', rest: '120s', rpe: 8 },
              { name: 'Dumbbell Shoulder Press', sets: 3, reps: '8-10', rest: '60s' },
              { name: 'Plank', sets: 3, reps: '45s', rest: '45s' },
            ],
          },
          {
            dayNumber: 2,
            label: 'Full Body B',
            exercises: [
              { name: 'Romanian Deadlift', sets: 4, reps: '6-8', rest: '150s', rpe: 8 },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Lat Pulldown', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Leg Press', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: '45s' },
            ],
          },
          {
            dayNumber: 3,
            label: 'Full Body C',
            exercises: [
              { name: 'Goblet Squat', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Dumbbell Bench Press', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Cable Row', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Dumbbell Curl', sets: 3, reps: '10-12', rest: '45s' },
            ],
          },
        ],
      },
      {
        weekNumber: 4,
        label: 'Deload',
        notes: 'Reduce weight by 40%, reduce sets. Active recovery.',
        days: [
          {
            dayNumber: 1,
            label: 'Full Body A (Deload)',
            exercises: [
              { name: 'Barbell Back Squat', sets: 2, reps: '8', rest: '90s', rpe: 5 },
              { name: 'Bench Press', sets: 2, reps: '8', rest: '90s', rpe: 5 },
              { name: 'Barbell Row', sets: 2, reps: '8', rest: '60s', rpe: 5 },
              { name: 'Plank', sets: 2, reps: '30s', rest: '45s' },
            ],
          },
          {
            dayNumber: 2,
            label: 'Full Body B (Deload)',
            exercises: [
              { name: 'Romanian Deadlift', sets: 2, reps: '8', rest: '90s', rpe: 5 },
              { name: 'Incline Dumbbell Press', sets: 2, reps: '10', rest: '60s', rpe: 5 },
              { name: 'Lat Pulldown', sets: 2, reps: '10', rest: '60s', rpe: 5 },
              { name: 'Face Pulls', sets: 2, reps: '15', rest: '45s' },
            ],
          },
          {
            dayNumber: 3,
            label: 'Full Body C (Deload)',
            exercises: [
              { name: 'Goblet Squat', sets: 2, reps: '10', rest: '60s', rpe: 5 },
              { name: 'Dumbbell Bench Press', sets: 2, reps: '10', rest: '60s', rpe: 5 },
              { name: 'Cable Row', sets: 2, reps: '10', rest: '60s', rpe: 5 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Hypertrophy PPL 6-Day',
    description:
      'A 6-week Push/Pull/Legs split optimized for muscle growth. High volume with progressive overload across mesocycles. Includes a deload week.',
    goal: 'hypertrophy',
    experienceLevel: 'intermediate',
    durationWeeks: 6,
    daysPerWeek: 6,
    tags: ['intermediate', 'ppl', 'hypertrophy', 'high-volume', '6-day'],
    weeks: [
      {
        weekNumber: 1,
        label: 'Accumulation 1',
        days: [
          {
            dayNumber: 1,
            label: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '8-10', rest: '120s', rpe: 7 },
              { name: 'Overhead Press', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Cable Flyes', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Lateral Raises', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Tricep Pushdowns', sets: 3, reps: '10-12', rest: '45s' },
            ],
          },
          {
            dayNumber: 2,
            label: 'Pull',
            exercises: [
              { name: 'Barbell Row', sets: 4, reps: '8-10', rest: '120s', rpe: 7 },
              { name: 'Pull-ups', sets: 3, reps: '6-10', rest: '90s' },
              { name: 'Cable Row', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Face Pulls', sets: 3, reps: '15-20', rest: '45s' },
              { name: 'Barbell Curl', sets: 3, reps: '10-12', rest: '45s' },
              { name: 'Hammer Curl', sets: 2, reps: '10-12', rest: '45s' },
            ],
          },
          {
            dayNumber: 3,
            label: 'Legs',
            exercises: [
              { name: 'Barbell Back Squat', sets: 4, reps: '8-10', rest: '150s', rpe: 7 },
              { name: 'Romanian Deadlift', sets: 3, reps: '8-10', rest: '120s' },
              { name: 'Leg Press', sets: 3, reps: '10-12', rest: '90s' },
              { name: 'Leg Curl', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Leg Extension', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Calf Raises', sets: 4, reps: '12-15', rest: '45s' },
            ],
          },
          {
            dayNumber: 4,
            label: 'Push',
            exercises: [
              { name: 'Dumbbell Bench Press', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Arnold Press', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Dips', sets: 3, reps: '8-12', rest: '90s' },
              { name: 'Pec Deck', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Lateral Raises', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Overhead Tricep Extension', sets: 3, reps: '10-12', rest: '45s' },
            ],
          },
          {
            dayNumber: 5,
            label: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 3, reps: '5', rest: '180s', rpe: 7 },
              { name: 'Lat Pulldown', sets: 4, reps: '10-12', rest: '60s' },
              { name: 'Chest-Supported Row', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Rear Delt Flyes', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Preacher Curl', sets: 3, reps: '10-12', rest: '45s' },
              { name: 'Wrist Curls', sets: 2, reps: '15-20', rest: '30s' },
            ],
          },
          {
            dayNumber: 6,
            label: 'Legs',
            exercises: [
              { name: 'Front Squat', sets: 4, reps: '8-10', rest: '150s' },
              { name: 'Hip Thrust', sets: 3, reps: '10-12', rest: '90s' },
              { name: 'Bulgarian Split Squat', sets: 3, reps: '10 each', rest: '60s' },
              { name: 'Leg Curl', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Leg Extension', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Seated Calf Raises', sets: 4, reps: '15-20', rest: '45s' },
            ],
          },
        ],
      },
      // Weeks 2-5 repeat with progressive overload (add weight or reps)
      // Week 6 is deload
      {
        weekNumber: 2,
        label: 'Accumulation 2',
        notes: 'Add 2.5kg to barbell compounds, add 1 rep to isolations.',
        days: [], // Same structure, coach adapts weights in session
      },
      {
        weekNumber: 3,
        label: 'Intensification 1',
        notes: 'Add another 2.5kg. Push RPE to 8 on compounds.',
        days: [],
      },
      {
        weekNumber: 4,
        label: 'Intensification 2',
        notes: 'Hold weight, add 1 set to weak points.',
        days: [],
      },
      {
        weekNumber: 5,
        label: 'Peak',
        notes: 'Heaviest week. RPE 8-9 on all compounds.',
        days: [],
      },
      {
        weekNumber: 6,
        label: 'Deload',
        notes: 'Reduce weight 40%, reduce volume 50%. Active recovery.',
        days: [],
      },
    ],
  },
  {
    title: '12-Week Fat Loss Program',
    description:
      'A structured 12-week fat loss program combining resistance training with strategic cardio. Preserves muscle while maximizing calorie burn. 4 days per week.',
    goal: 'fat_loss',
    experienceLevel: 'intermediate',
    durationWeeks: 12,
    daysPerWeek: 4,
    tags: ['fat-loss', 'upper-lower', 'cardio', '12-week', 'cutting'],
    weeks: [
      {
        weekNumber: 1,
        label: 'Phase 1 — Adaptation',
        notes: 'Establish caloric deficit. 300-500 cal below TDEE. Focus on form.',
        days: [
          {
            dayNumber: 1,
            label: 'Upper Body',
            exercises: [
              { name: 'Bench Press', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Barbell Row', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Overhead Press', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Tricep Pushdowns', sets: 2, reps: '12-15', rest: '45s' },
            ],
          },
          {
            dayNumber: 2,
            label: 'Lower Body',
            exercises: [
              { name: 'Barbell Back Squat', sets: 4, reps: '8-10', rest: '120s' },
              { name: 'Romanian Deadlift', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Leg Press', sets: 3, reps: '10-12', rest: '90s' },
              { name: 'Leg Curl', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Calf Raises', sets: 3, reps: '15', rest: '45s' },
            ],
          },
          {
            dayNumber: 3,
            label: 'Upper Body',
            exercises: [
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Cable Row', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Dips', sets: 3, reps: '8-12', rest: '60s' },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: '45s' },
              { name: 'Dumbbell Curl', sets: 2, reps: '12', rest: '45s' },
            ],
          },
          {
            dayNumber: 4,
            label: 'Lower Body + Conditioning',
            exercises: [
              { name: 'Goblet Squat', sets: 3, reps: '12', rest: '60s' },
              { name: 'Hip Thrust', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: '60s' },
              { name: 'Leg Extension', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Farmer Walk', sets: 3, reps: '40m', rest: '60s', notes: 'Finisher' },
            ],
          },
        ],
      },
      // Remaining weeks follow periodized progression
      { weekNumber: 2, label: 'Phase 1 — Adaptation', days: [] },
      { weekNumber: 3, label: 'Phase 1 — Adaptation', days: [] },
      { weekNumber: 4, label: 'Phase 1 — Adaptation', days: [] },
      {
        weekNumber: 5,
        label: 'Phase 2 — Acceleration',
        notes: 'Add 1 HIIT session. Increase deficit if stalled.',
        days: [],
      },
      { weekNumber: 6, label: 'Phase 2 — Acceleration', days: [] },
      { weekNumber: 7, label: 'Phase 2 — Acceleration', days: [] },
      { weekNumber: 8, label: 'Phase 2 — Acceleration', days: [] },
      {
        weekNumber: 9,
        label: 'Phase 3 — Peak',
        notes: 'Highest deficit. Maintain training intensity. Prioritize protein.',
        days: [],
      },
      { weekNumber: 10, label: 'Phase 3 — Peak', days: [] },
      { weekNumber: 11, label: 'Phase 3 — Peak', days: [] },
      {
        weekNumber: 12,
        label: 'Reverse Diet',
        notes: 'Gradually increase calories back to maintenance over 2-4 weeks after this.',
        days: [],
      },
    ],
  },
];
