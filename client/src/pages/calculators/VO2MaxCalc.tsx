import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Timer, TrendingUp, Info } from 'lucide-react';

type TestMethod = 'cooper' | 'rockport' | 'beep' | 'manual';

interface VO2MaxResult {
  vo2max: number;
  category: string;
  percentile: string;
  color: string;
  bgColor: string;
}

// Cooper 12-minute run test
function calculateCooper(distanceMeters: number): number {
  // Formula: VO2max = (distance - 504.9) / 44.73
  return (distanceMeters - 504.9) / 44.73;
}

// Rockport 1-mile walk test
function calculateRockport(
  weightKg: number,
  ageYears: number,
  gender: 'male' | 'female',
  timeMinutes: number,
  heartRate: number
): number {
  // Formula: VO2max = 132.853 - (0.0769 × weight) - (0.3877 × age) + (6.315 × gender) - (3.2649 × time) - (0.1565 × HR)
  // gender: male = 1, female = 0
  const genderVal = gender === 'male' ? 1 : 0;
  const weightLbs = weightKg * 2.20462;
  return 132.853 - (0.0769 * weightLbs) - (0.3877 * ageYears) + (6.315 * genderVal) - (3.2649 * timeMinutes) - (0.1565 * heartRate);
}

// Beep test (20m shuttle run) - using level and shuttle
function calculateBeepTest(level: number, shuttles: number): number {
  // Simplified formula based on level reached
  // More accurate formulas exist, but this is a reasonable approximation
  const totalDistance = (level - 1) * 140 + shuttles * 20; // Approximate total distance
  return 18.043461 + (0.3689295 * totalDistance / 20) - (0.000349 * Math.pow(totalDistance / 20, 2));
}

function getVO2Category(age: number, gender: 'male' | 'female', vo2max: number): { category: string; percentile: string; color: string; bgColor: string } {
  // Simplified categories based on age and gender
  // Reference: ACSM guidelines

  let excellent: number, good: number, average: number, fair: number;

  if (gender === 'male') {
    if (age < 30) {
      excellent = 55; good = 49; average = 43; fair = 37;
    } else if (age < 40) {
      excellent = 52; good = 46; average = 40; fair = 34;
    } else if (age < 50) {
      excellent = 49; good = 43; average = 37; fair = 31;
    } else if (age < 60) {
      excellent = 45; good = 39; average = 33; fair = 27;
    } else {
      excellent = 42; good = 36; average = 30; fair = 24;
    }
  } else {
    if (age < 30) {
      excellent = 49; good = 43; average = 37; fair = 31;
    } else if (age < 40) {
      excellent = 45; good = 39; average = 33; fair = 27;
    } else if (age < 50) {
      excellent = 42; good = 36; average = 30; fair = 24;
    } else if (age < 60) {
      excellent = 38; good = 32; average = 26; fair = 21;
    } else {
      excellent = 35; good = 29; average = 23; fair = 18;
    }
  }

  if (vo2max >= excellent) {
    return { category: 'Excellent', percentile: 'Top 10%', color: 'text-purple-600', bgColor: 'bg-purple-100' };
  }
  if (vo2max >= good) {
    return { category: 'Good', percentile: 'Top 25%', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  }
  if (vo2max >= average) {
    return { category: 'Average', percentile: 'Top 50%', color: 'text-green-600', bgColor: 'bg-green-100' };
  }
  if (vo2max >= fair) {
    return { category: 'Fair', percentile: 'Top 75%', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  }
  return { category: 'Poor', percentile: 'Bottom 25%', color: 'text-red-600', bgColor: 'bg-red-100' };
}

const VO2_EXAMPLES = [
  { athlete: 'Elite Marathon Runner', vo2max: '70-85 ml/kg/min' },
  { athlete: 'Elite Cyclist', vo2max: '70-80 ml/kg/min' },
  { athlete: 'Recreational Athlete', vo2max: '40-55 ml/kg/min' },
  { athlete: 'Sedentary Adult', vo2max: '25-35 ml/kg/min' },
];

export function VO2MaxCalculator() {
  const [method, setMethod] = useState<TestMethod>('cooper');
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [weight, setWeight] = useState(75);

  // Cooper test inputs
  const [cooperDistance, setCooperDistance] = useState(2400);

  // Rockport test inputs
  const [rockportTime, setRockportTime] = useState(14);
  const [rockportHR, setRockportHR] = useState(140);

  // Beep test inputs
  const [beepLevel, setBeepLevel] = useState(8);
  const [beepShuttles, setBeepShuttles] = useState(4);

  // Manual input
  const [manualVO2, setManualVO2] = useState(45);

  const result = useMemo((): VO2MaxResult => {
    let vo2max: number;

    switch (method) {
      case 'cooper':
        vo2max = calculateCooper(cooperDistance);
        break;
      case 'rockport':
        vo2max = calculateRockport(weight, age, gender, rockportTime, rockportHR);
        break;
      case 'beep':
        vo2max = calculateBeepTest(beepLevel, beepShuttles);
        break;
      case 'manual':
        vo2max = manualVO2;
        break;
      default:
        vo2max = 0;
    }

    vo2max = Math.max(10, Math.min(90, vo2max)); // Clamp to reasonable range

    const { category, percentile, color, bgColor } = getVO2Category(age, gender, vo2max);

    return { vo2max, category, percentile, color, bgColor };
  }, [method, cooperDistance, weight, age, gender, rockportTime, rockportHR, beepLevel, beepShuttles, manualVO2]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Activity className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">VO2 Max Calculator</h1>
          <p className="text-muted-foreground">Estimate your cardiovascular fitness</p>
        </div>
      </div>

      {/* Test Method Selection */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold mb-4">Select Test Method</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMethod('cooper')}
            className={`p-3 rounded-lg font-medium transition-colors ${
              method === 'cooper' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            Cooper Test
          </button>
          <button
            onClick={() => setMethod('rockport')}
            className={`p-3 rounded-lg font-medium transition-colors ${
              method === 'rockport' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            Rockport Walk
          </button>
          <button
            onClick={() => setMethod('beep')}
            className={`p-3 rounded-lg font-medium transition-colors ${
              method === 'beep' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            Beep Test
          </button>
          <button
            onClick={() => setMethod('manual')}
            className={`p-3 rounded-lg font-medium transition-colors ${
              method === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            Enter Manually
          </button>
        </div>
      </div>

      {/* Demographics (always shown except manual) */}
      {method !== 'manual' && (
        <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
          <h3 className="font-bold mb-4">Demographics</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full p-3 border rounded-lg bg-background"
                min={1}
                max={120}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Weight (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full p-3 border rounded-lg bg-background"
                min={1}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gender</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGender('male')}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  gender === 'male' ? 'bg-blue-500 text-white' : 'bg-secondary'
                }`}
              >
                Male
              </button>
              <button
                onClick={() => setGender('female')}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  gender === 'female' ? 'bg-pink-500 text-white' : 'bg-secondary'
                }`}
              >
                Female
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test-specific inputs */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold mb-4">
          {method === 'cooper' && 'Cooper 12-Minute Run Test'}
          {method === 'rockport' && 'Rockport 1-Mile Walk Test'}
          {method === 'beep' && '20m Shuttle Run (Beep Test)'}
          {method === 'manual' && 'Enter Your VO2 Max'}
        </h3>

        {method === 'cooper' && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Distance covered in 12 minutes (meters)
            </label>
            <input
              type="number"
              value={cooperDistance}
              onChange={(e) => setCooperDistance(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background"
              step={10}
              min={1}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Run/jog as far as you can in 12 minutes on a flat track
            </p>
          </div>
        )}

        {method === 'rockport' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Time to walk 1 mile (minutes)
              </label>
              <input
                type="number"
                value={rockportTime}
                onChange={(e) => setRockportTime(Number(e.target.value))}
                className="w-full p-3 border rounded-lg bg-background"
                step={0.5}
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Heart rate immediately after (bpm)
              </label>
              <input
                type="number"
                value={rockportHR}
                onChange={(e) => setRockportHR(Number(e.target.value))}
                className="w-full p-3 border rounded-lg bg-background"
                min={30}
                max={220}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Walk 1 mile as fast as possible, then check your heart rate immediately
            </p>
          </div>
        )}

        {method === 'beep' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Level reached</label>
                <input
                  type="number"
                  value={beepLevel}
                  onChange={(e) => setBeepLevel(Number(e.target.value))}
                  className="w-full p-3 border rounded-lg bg-background"
                  min={1}
                  max={21}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Shuttles at that level</label>
                <input
                  type="number"
                  value={beepShuttles}
                  onChange={(e) => setBeepShuttles(Number(e.target.value))}
                  className="w-full p-3 border rounded-lg bg-background"
                  min={1}
                  max={16}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Run back and forth on a 20m course, keeping pace with the beeps
            </p>
          </div>
        )}

        {method === 'manual' && (
          <div>
            <label className="block text-sm font-medium mb-2">
              VO2 Max (ml/kg/min)
            </label>
            <input
              type="number"
              value={manualVO2}
              onChange={(e) => setManualVO2(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background"
              step={0.1}
              min={1}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter your VO2 max if you've had a lab test
            </p>
          </div>
        )}
      </div>

      {/* Results */}
      <motion.div
        className={`rounded-xl p-6 mb-6 ${result.bgColor}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        key={result.vo2max.toFixed(1)}
      >
        <div className="text-center mb-6">
          <p className="text-sm opacity-70 mb-1">Estimated VO2 Max</p>
          <p className={`text-6xl font-bold ${result.color}`}>
            {result.vo2max.toFixed(1)}
          </p>
          <p className="text-sm text-muted-foreground">ml/kg/min</p>
          <p className={`text-xl font-medium ${result.color} mt-2`}>{result.category}</p>
          <p className="text-sm text-muted-foreground">{result.percentile}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Fitness Level</p>
            <p className="text-lg font-bold">{result.category}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <Timer className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Percentile</p>
            <p className="text-lg font-bold">{result.percentile}</p>
          </div>
        </div>
      </motion.div>

      {/* Reference Values */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4">Reference VO2 Max Values</h3>
        <div className="space-y-2">
          {VO2_EXAMPLES.map((example) => (
            <div
              key={example.athlete}
              className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg"
            >
              <span>{example.athlete}</span>
              <span className="text-sm font-medium text-primary">{example.vo2max}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div className="text-blue-700 dark:text-blue-300">
            <strong>What is VO2 Max?</strong>
            <p className="mt-1">
              VO2 max is the maximum rate of oxygen consumption during exercise. It's considered
              the gold standard for measuring cardiovascular fitness and aerobic endurance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VO2MaxCalculator;
