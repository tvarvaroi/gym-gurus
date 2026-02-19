import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Activity, Zap } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import { fadeInUp } from '@/lib/premiumAnimations';

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
}

function calculateMaxHR(age: number, method: 'standard' | 'tanaka' = 'tanaka'): number {
  if (method === 'tanaka') {
    return Math.round(208 - 0.7 * age);
  }
  return 220 - age;
}

function calculateZones(maxHR: number, restingHR: number, useKarvonen: boolean): HeartRateZone[] {
  const zones = [
    {
      name: 'Zone 1 - Recovery',
      minPercent: 50,
      maxPercent: 60,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      description: 'Very light effort',
    },
    {
      name: 'Zone 2 - Aerobic Base',
      minPercent: 60,
      maxPercent: 70,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Light effort',
    },
    {
      name: 'Zone 3 - Tempo',
      minPercent: 70,
      maxPercent: 80,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Moderate effort',
    },
    {
      name: 'Zone 4 - Threshold',
      minPercent: 80,
      maxPercent: 90,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Hard effort',
    },
    {
      name: 'Zone 5 - Max Effort',
      minPercent: 90,
      maxPercent: 100,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Maximum effort',
    },
  ];

  return zones.map((zone) => {
    let minBpm: number, maxBpm: number;

    if (useKarvonen) {
      const hrReserve = maxHR - restingHR;
      minBpm = Math.round(hrReserve * (zone.minPercent / 100) + restingHR);
      maxBpm = Math.round(hrReserve * (zone.maxPercent / 100) + restingHR);
    } else {
      minBpm = Math.round(maxHR * (zone.minPercent / 100));
      maxBpm = Math.round(maxHR * (zone.maxPercent / 100));
    }

    return { ...zone, minBpm, maxBpm };
  });
}

export default function PremiumHeartRateZonesCalc() {
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

  const inputs = { method, age, restingHR, manualMaxHR, formula };
  const results = { maxHR, zones, hrReserve: maxHR - restingHR };
  const hasResults = maxHR > 0;

  return (
    <PremiumCalculatorWrapper
      calculatorType="heart-rate-zones"
      title="Heart Rate Zones Calculator"
      description="Optimize your training with personalized heart rate zones"
      icon={<Heart className="w-8 h-8" />}
      inputs={inputs}
      results={results}
      hasResults={hasResults}
    >
      <motion.div variants={fadeInUp} className="space-y-8">
        {/* Method Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Calculation Method</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'age', label: 'Age-Based' },
              { value: 'karvonen', label: 'Karvonen' },
              { value: 'manual', label: 'Manual' },
            ].map((m) => (
              <motion.button
                key={m.value}
                onClick={() => setMethod(m.value as CalculationMethod)}
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

        {/* Age Input (for age and karvonen methods) */}
        {method !== 'manual' && (
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
        )}

        {/* Resting HR (for karvonen method) */}
        {method === 'karvonen' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Resting Heart Rate (bpm)</label>
            <input
              type="range"
              min="40"
              max="100"
              value={restingHR}
              onChange={(e) => setRestingHR(Number(e.target.value))}
              className="premium-slider w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>40</span>
              <span className="font-bold text-primary">{restingHR}</span>
              <span>100</span>
            </div>
          </div>
        )}

        {/* Manual Max HR */}
        {method === 'manual' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Maximum Heart Rate (bpm)</label>
            <input
              type="range"
              min="120"
              max="220"
              value={manualMaxHR}
              onChange={(e) => setManualMaxHR(Number(e.target.value))}
              className="premium-slider w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>120</span>
              <span className="font-bold text-primary">{manualMaxHR}</span>
              <span>220</span>
            </div>
          </div>
        )}

        {/* Formula Selection (for age method) */}
        {method === 'age' && (
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={() => setFormula('tanaka')}
              whileHover={{ scale: 1.02 }}
              className={`py-3 rounded-xl font-medium transition-all ${
                formula === 'tanaka' ? 'premium-button' : 'bg-card border border-border'
              }`}
            >
              Tanaka (Recommended)
            </motion.button>
            <motion.button
              onClick={() => setFormula('standard')}
              whileHover={{ scale: 1.02 }}
              className={`py-3 rounded-xl font-medium transition-all ${
                formula === 'standard' ? 'premium-button' : 'bg-card border border-border'
              }`}
            >
              220 - Age
            </motion.button>
          </div>
        )}

        {/* Max HR Display */}
        <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
          <p className="text-sm text-muted-foreground mb-2">Estimated Maximum Heart Rate</p>
          <p
            className="text-6xl font-light gradient-text"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {maxHR}
            <span className="text-2xl ml-1">bpm</span>
          </p>
          {method === 'karvonen' && (
            <p className="text-sm text-muted-foreground mt-2">
              Heart Rate Reserve: {maxHR - restingHR} bpm
            </p>
          )}
        </motion.div>

        {/* Heart Rate Zones */}
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
                <p className="text-sm text-muted-foreground">{zone.description}</p>
              </div>
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

        {/* Training Tips */}
        <div className="premium-card">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Training Distribution Tips
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="font-medium text-blue-600 dark:text-blue-400">80/20 Rule</p>
              <p className="text-sm text-muted-foreground">
                Spend 80% of training time in Zones 1-2 and 20% in Zones 4-5 for optimal endurance
                gains
              </p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="font-medium text-green-600 dark:text-green-400">Avoid Zone 3</p>
              <p className="text-sm text-muted-foreground">
                Zone 3 is "no man's land" - too hard to recover from, not hard enough for big gains
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </PremiumCalculatorWrapper>
  );
}
