import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Timer, TrendingUp } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import { fadeInUp } from '@/lib/premiumAnimations';

type TestMethod = 'cooper' | 'rockport' | 'beep' | 'manual';

interface VO2MaxResult {
  vo2max: number;
  category: string;
  percentile: string;
  color: string;
  bgColor: string;
}

function calculateCooper(distanceMeters: number): number {
  return (distanceMeters - 504.9) / 44.73;
}

function calculateRockport(
  weightKg: number,
  ageYears: number,
  gender: 'male' | 'female',
  timeMinutes: number,
  heartRate: number
): number {
  const genderVal = gender === 'male' ? 1 : 0;
  const weightLbs = weightKg * 2.20462;
  return (
    132.853 -
    0.0769 * weightLbs -
    0.3877 * ageYears +
    6.315 * genderVal -
    3.2649 * timeMinutes -
    0.1565 * heartRate
  );
}

function calculateBeepTest(level: number, shuttles: number): number {
  const totalDistance = (level - 1) * 140 + shuttles * 20;
  return 18.043461 + (0.3689295 * totalDistance) / 20 - 0.000349 * Math.pow(totalDistance / 20, 2);
}

function getVO2Category(
  age: number,
  gender: 'male' | 'female',
  vo2max: number
): { category: string; percentile: string; color: string; bgColor: string } {
  let excellent: number, good: number, average: number, fair: number;

  if (gender === 'male') {
    if (age < 30) {
      excellent = 55;
      good = 49;
      average = 43;
      fair = 37;
    } else if (age < 40) {
      excellent = 52;
      good = 46;
      average = 40;
      fair = 34;
    } else if (age < 50) {
      excellent = 49;
      good = 43;
      average = 37;
      fair = 31;
    } else if (age < 60) {
      excellent = 45;
      good = 39;
      average = 33;
      fair = 27;
    } else {
      excellent = 42;
      good = 36;
      average = 30;
      fair = 24;
    }
  } else {
    if (age < 30) {
      excellent = 49;
      good = 43;
      average = 37;
      fair = 31;
    } else if (age < 40) {
      excellent = 45;
      good = 39;
      average = 33;
      fair = 27;
    } else if (age < 50) {
      excellent = 42;
      good = 36;
      average = 30;
      fair = 24;
    } else if (age < 60) {
      excellent = 38;
      good = 32;
      average = 26;
      fair = 21;
    } else {
      excellent = 35;
      good = 29;
      average = 23;
      fair = 18;
    }
  }

  if (vo2max >= excellent) {
    return {
      category: 'Excellent',
      percentile: 'Top 10%',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    };
  }
  if (vo2max >= good) {
    return {
      category: 'Good',
      percentile: 'Top 25%',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    };
  }
  if (vo2max >= average) {
    return {
      category: 'Average',
      percentile: 'Top 50%',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  }
  if (vo2max >= fair) {
    return {
      category: 'Fair',
      percentile: 'Top 75%',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    };
  }
  return {
    category: 'Poor',
    percentile: 'Bottom 25%',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  };
}

export default function PremiumVO2MaxCalc() {
  const [method, setMethod] = useState<TestMethod>('cooper');
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [weight, setWeight] = useState(75);
  const [cooperDistance, setCooperDistance] = useState(2400);
  const [rockportTime, setRockportTime] = useState(14);
  const [rockportHR, setRockportHR] = useState(140);
  const [beepLevel, setBeepLevel] = useState(8);
  const [beepShuttles, setBeepShuttles] = useState(4);
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

    vo2max = Math.max(10, Math.min(90, vo2max));
    const { category, percentile, color, bgColor } = getVO2Category(age, gender, vo2max);

    return { vo2max, category, percentile, color, bgColor };
  }, [
    method,
    cooperDistance,
    weight,
    age,
    gender,
    rockportTime,
    rockportHR,
    beepLevel,
    beepShuttles,
    manualVO2,
  ]);

  const inputs = {
    method,
    age,
    gender,
    weight,
    cooperDistance,
    rockportTime,
    rockportHR,
    beepLevel,
    beepShuttles,
    manualVO2,
  };
  const hasResults = result.vo2max > 0;

  return (
    <PremiumCalculatorWrapper
      calculatorType="vo2max"
      title="VO2 Max Calculator"
      description="Measure your cardiovascular fitness and aerobic capacity"
      icon={<Activity className="w-8 h-8" />}
      inputs={inputs}
      results={result}
      hasResults={hasResults}
    >
      <motion.div variants={fadeInUp} className="space-y-8">
        {/* Test Method Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Test Method</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'cooper', label: 'Cooper Test' },
              { value: 'rockport', label: 'Rockport Walk' },
              { value: 'beep', label: 'Beep Test' },
              { value: 'manual', label: 'Manual Entry' },
            ].map((m) => (
              <motion.button
                key={m.value}
                onClick={() => setMethod(m.value as TestMethod)}
                whileHover={{ scale: 1.02 }}
                className={`py-3 rounded-xl font-medium transition-all ${
                  method === m.value ? 'premium-button' : 'bg-card border border-border'
                }`}
              >
                {m.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Demographics (not for manual) */}
        {method !== 'manual' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Age</label>
              <input
                type="range"
                min="15"
                max="80"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="premium-slider w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>15</span>
                <span className="font-bold text-primary">{age}</span>
                <span>80</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <motion.button
                onClick={() => setGender('male')}
                whileHover={{ scale: 1.02 }}
                className={`py-3 rounded-xl font-medium transition-all ${
                  gender === 'male' ? 'premium-button' : 'bg-card border border-border'
                }`}
              >
                Male
              </motion.button>
              <motion.button
                onClick={() => setGender('female')}
                whileHover={{ scale: 1.02 }}
                className={`py-3 rounded-xl font-medium transition-all ${
                  gender === 'female' ? 'premium-button' : 'bg-card border border-border'
                }`}
              >
                Female
              </motion.button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Weight (kg)</label>
              <input
                type="range"
                min="40"
                max="150"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="premium-slider w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>40</span>
                <span className="font-bold text-primary">{weight} kg</span>
                <span>150</span>
              </div>
            </div>
          </>
        )}

        {/* Test-specific inputs */}
        {method === 'cooper' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Distance covered in 12 minutes (meters)</label>
            <input
              type="range"
              min="1000"
              max="4000"
              step="50"
              value={cooperDistance}
              onChange={(e) => setCooperDistance(Number(e.target.value))}
              className="premium-slider w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1000</span>
              <span className="font-bold text-primary">{cooperDistance} m</span>
              <span>4000</span>
            </div>
          </div>
        )}

        {method === 'rockport' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time to walk 1 mile (minutes)</label>
              <input
                type="range"
                min="8"
                max="25"
                step="0.5"
                value={rockportTime}
                onChange={(e) => setRockportTime(Number(e.target.value))}
                className="premium-slider w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>8</span>
                <span className="font-bold text-primary">{rockportTime} min</span>
                <span>25</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Heart rate after (bpm)</label>
              <input
                type="range"
                min="80"
                max="200"
                value={rockportHR}
                onChange={(e) => setRockportHR(Number(e.target.value))}
                className="premium-slider w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>80</span>
                <span className="font-bold text-primary">{rockportHR} bpm</span>
                <span>200</span>
              </div>
            </div>
          </>
        )}

        {method === 'beep' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Level reached</label>
              <input
                type="range"
                min="1"
                max="21"
                value={beepLevel}
                onChange={(e) => setBeepLevel(Number(e.target.value))}
                className="premium-slider w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>1</span>
                <span className="font-bold text-primary">{beepLevel}</span>
                <span>21</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Shuttles</label>
              <input
                type="range"
                min="1"
                max="16"
                value={beepShuttles}
                onChange={(e) => setBeepShuttles(Number(e.target.value))}
                className="premium-slider w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>1</span>
                <span className="font-bold text-primary">{beepShuttles}</span>
                <span>16</span>
              </div>
            </div>
          </div>
        )}

        {method === 'manual' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">VO2 Max (ml/kg/min)</label>
            <input
              type="range"
              min="20"
              max="85"
              step="0.5"
              value={manualVO2}
              onChange={(e) => setManualVO2(Number(e.target.value))}
              className="premium-slider w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>20</span>
              <span className="font-bold text-primary">{manualVO2}</span>
              <span>85</span>
            </div>
          </div>
        )}

        {/* Results */}
        <motion.div className={`rounded-xl p-6 ${result.bgColor}`} whileHover={{ y: -4 }}>
          <div className="text-center mb-6">
            <p className="text-sm opacity-70 mb-1">Estimated VO2 Max</p>
            <p className={`text-6xl font-bold ${result.color}`}>{result.vo2max.toFixed(1)}</p>
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
        <div className="premium-card">
          <h3 className="font-bold text-lg mb-4">Reference VO2 Max Values</h3>
          <div className="space-y-2">
            {[
              { athlete: 'Elite Marathon Runner', vo2max: '70-85 ml/kg/min' },
              { athlete: 'Elite Cyclist', vo2max: '70-80 ml/kg/min' },
              { athlete: 'Recreational Athlete', vo2max: '40-55 ml/kg/min' },
              { athlete: 'Sedentary Adult', vo2max: '25-35 ml/kg/min' },
            ].map((example) => (
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
      </motion.div>
    </PremiumCalculatorWrapper>
  );
}
