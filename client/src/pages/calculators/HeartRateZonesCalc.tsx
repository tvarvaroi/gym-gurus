import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Activity, Zap, Info } from 'lucide-react';

type CalculationMethod = 'age' | 'karvonen' | 'manual';

interface HeartRateZone {
  name: string;
  minBpm: number;
  maxBpm: number;
  minPercent: number;
  maxPercent: number;
  color: string;
  bgColor: string;
  description: string;
  benefits: string[];
}

// Calculate max heart rate using different formulas
function calculateMaxHR(age: number, method: 'standard' | 'tanaka' = 'tanaka'): number {
  if (method === 'tanaka') {
    // Tanaka formula: 208 - (0.7 × age) - more accurate for older adults
    return Math.round(208 - 0.7 * age);
  }
  // Standard formula: 220 - age
  return 220 - age;
}

// Calculate zones using percentage of max HR or Karvonen formula
function calculateZones(
  maxHR: number,
  restingHR: number,
  useKarvonen: boolean
): HeartRateZone[] {
  const zones = [
    {
      name: 'Zone 1 - Recovery',
      minPercent: 50,
      maxPercent: 60,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      description: 'Very light effort, easy breathing',
      benefits: ['Active recovery', 'Warm-up/cool-down', 'Fat burning'],
    },
    {
      name: 'Zone 2 - Aerobic Base',
      minPercent: 60,
      maxPercent: 70,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Light effort, comfortable pace',
      benefits: ['Builds aerobic base', 'Improves endurance', 'Efficient fat burning'],
    },
    {
      name: 'Zone 3 - Tempo',
      minPercent: 70,
      maxPercent: 80,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Moderate effort, slightly breathless',
      benefits: ['Improves efficiency', 'Increases lactate threshold', 'Race pace training'],
    },
    {
      name: 'Zone 4 - Threshold',
      minPercent: 80,
      maxPercent: 90,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Hard effort, heavy breathing',
      benefits: ['Increases speed', 'Improves VO2 max', 'Mental toughness'],
    },
    {
      name: 'Zone 5 - Max Effort',
      minPercent: 90,
      maxPercent: 100,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Maximum effort, can\'t talk',
      benefits: ['Peak performance', 'Sprint training', 'Neuromuscular power'],
    },
  ];

  return zones.map((zone) => {
    let minBpm: number, maxBpm: number;

    if (useKarvonen) {
      // Karvonen formula: Target HR = ((max HR − resting HR) × %Intensity) + resting HR
      const hrReserve = maxHR - restingHR;
      minBpm = Math.round(hrReserve * (zone.minPercent / 100) + restingHR);
      maxBpm = Math.round(hrReserve * (zone.maxPercent / 100) + restingHR);
    } else {
      // Percentage of max HR
      minBpm = Math.round(maxHR * (zone.minPercent / 100));
      maxBpm = Math.round(maxHR * (zone.maxPercent / 100));
    }

    return {
      ...zone,
      minBpm,
      maxBpm,
    };
  });
}

export function HeartRateZonesCalculator() {
  const [method, setMethod] = useState<CalculationMethod>('age');
  const [age, setAge] = useState(30);
  const [restingHR, setRestingHR] = useState(60);
  const [manualMaxHR, setManualMaxHR] = useState(190);
  const [formula, setFormula] = useState<'standard' | 'tanaka'>('tanaka');

  const maxHR = useMemo(() => {
    if (method === 'manual') {
      return manualMaxHR;
    }
    return calculateMaxHR(age, formula);
  }, [method, age, formula, manualMaxHR]);

  const useKarvonen = method === 'karvonen';

  const zones = useMemo(() => {
    return calculateZones(maxHR, restingHR, useKarvonen);
  }, [maxHR, restingHR, useKarvonen]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Heart className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Heart Rate Zones</h1>
          <p className="text-muted-foreground">Calculate your training zones</p>
        </div>
      </div>

      {/* Method Selection */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold mb-4">Calculation Method</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setMethod('age')}
            className={`p-3 rounded-lg font-medium transition-colors ${
              method === 'age' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            Age-Based
          </button>
          <button
            onClick={() => setMethod('karvonen')}
            className={`p-3 rounded-lg font-medium transition-colors ${
              method === 'karvonen' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            Karvonen
          </button>
          <button
            onClick={() => setMethod('manual')}
            className={`p-3 rounded-lg font-medium transition-colors ${
              method === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            Manual
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {method === 'age' && 'Uses your age to estimate max HR and calculate zones'}
          {method === 'karvonen' && 'More accurate method using your resting heart rate'}
          {method === 'manual' && 'Enter your known max HR from testing'}
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold mb-4">Your Details</h3>

        {method !== 'manual' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background"
            />
          </div>
        )}

        {method === 'karvonen' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Resting Heart Rate (bpm)
            </label>
            <input
              type="number"
              value={restingHR}
              onChange={(e) => setRestingHR(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Measure first thing in the morning before getting out of bed
            </p>
          </div>
        )}

        {method === 'manual' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Maximum Heart Rate (bpm)
            </label>
            <input
              type="number"
              value={manualMaxHR}
              onChange={(e) => setManualMaxHR(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Best determined through a maximal exercise test
            </p>
          </div>
        )}

        {method === 'age' && (
          <div>
            <label className="block text-sm font-medium mb-2">Formula</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormula('tanaka')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  formula === 'tanaka' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}
              >
                Tanaka (Recommended)
              </button>
              <button
                onClick={() => setFormula('standard')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  formula === 'standard' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}
              >
                220 - Age
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Max HR Display */}
      <motion.div
        className="bg-gradient-to-r from-red-500 to-pink-500 rounded-xl p-6 mb-6 text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={maxHR}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Estimated Maximum Heart Rate</p>
            <p className="text-5xl font-bold">{maxHR} <span className="text-2xl font-normal">bpm</span></p>
          </div>
          <Heart className="w-16 h-16 text-white/30" />
        </div>
        {method === 'karvonen' && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Heart Rate Reserve</span>
              <span className="font-bold">{maxHR - restingHR} bpm</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Heart Rate Zones */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4">Your Training Zones</h3>
        <div className="space-y-3">
          {zones.map((zone, index) => (
            <motion.div
              key={zone.name}
              className={`rounded-xl overflow-hidden ${zone.bgColor}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-bold ${zone.color}`}>{zone.name}</h4>
                  <span className={`text-2xl font-bold ${zone.color}`}>
                    {zone.minBpm} - {zone.maxBpm} bpm
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{zone.description}</p>
                <div className="flex flex-wrap gap-1">
                  {zone.benefits.map((benefit) => (
                    <span
                      key={benefit}
                      className="px-2 py-0.5 bg-background/50 rounded-full text-xs"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
              {/* Visual bar */}
              <div className="h-2 bg-background/30">
                <motion.div
                  className={`h-full ${zone.bgColor.replace('100', '500')}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${zone.maxPercent}%` }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Zone Distribution Chart */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold mb-4">Zone Distribution</h3>
        <div className="h-8 rounded-full overflow-hidden flex">
          {zones.map((zone, index) => (
            <motion.div
              key={zone.name}
              className={`h-full flex items-center justify-center text-white text-xs font-medium ${
                index === 0 ? 'bg-gray-400' :
                index === 1 ? 'bg-blue-500' :
                index === 2 ? 'bg-green-500' :
                index === 3 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: '20%' }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              Z{index + 1}
            </motion.div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>50%</span>
          <span>60%</span>
          <span>70%</span>
          <span>80%</span>
          <span>90%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Training Tips */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Training Distribution Tips
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-secondary/30 rounded-lg">
            <p className="font-medium text-blue-600 dark:text-blue-400">80/20 Rule</p>
            <p className="text-sm text-muted-foreground">
              Spend 80% of training time in Zones 1-2 and 20% in Zones 4-5 for optimal endurance gains
            </p>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg">
            <p className="font-medium text-green-600 dark:text-green-400">Avoid Zone 3</p>
            <p className="text-sm text-muted-foreground">
              Zone 3 is "no man's land" - too hard to recover from, not hard enough for big gains. Use sparingly.
            </p>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg">
            <p className="font-medium text-orange-600 dark:text-orange-400">Build Your Base First</p>
            <p className="text-sm text-muted-foreground">
              Master Zones 1-2 before adding high-intensity work in Zones 4-5
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div className="text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> These zones are estimates. For most accurate results, consider a
            professional exercise test. Individual variation in max HR can be 10-15 bpm from formulas.
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeartRateZonesCalculator;
