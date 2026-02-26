import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Scale, Ruler, User } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import { fadeInUp } from '@/lib/premiumAnimations';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';

type Gender = 'male' | 'female';

const FORMULAS = {
  devine: {
    name: 'Devine (1974)',
    description: 'Most commonly used in clinical settings',
    male: (heightCm: number) => 50 + 2.3 * (heightCm / 2.54 - 60),
    female: (heightCm: number) => 45.5 + 2.3 * (heightCm / 2.54 - 60),
  },
  robinson: {
    name: 'Robinson (1983)',
    description: 'Modified Devine formula',
    male: (heightCm: number) => 52 + 1.9 * (heightCm / 2.54 - 60),
    female: (heightCm: number) => 49 + 1.7 * (heightCm / 2.54 - 60),
  },
  miller: {
    name: 'Miller (1983)',
    description: 'Tends to give lower estimates',
    male: (heightCm: number) => 56.2 + 1.41 * (heightCm / 2.54 - 60),
    female: (heightCm: number) => 53.1 + 1.36 * (heightCm / 2.54 - 60),
  },
  hamwi: {
    name: 'Hamwi (1964)',
    description: 'One of the original IBW formulas',
    male: (heightCm: number) => 48 + 2.7 * (heightCm / 2.54 - 60),
    female: (heightCm: number) => 45.5 + 2.2 * (heightCm / 2.54 - 60),
  },
  broca: {
    name: 'Broca Index',
    description: 'Simple formula: height - 100',
    male: (heightCm: number) => (heightCm - 100) * 0.9,
    female: (heightCm: number) => (heightCm - 100) * 0.85,
  },
};

function getBMIWeightRange(heightCm: number): { min: number; max: number } {
  const heightM = heightCm / 100;
  return {
    min: 18.5 * heightM * heightM,
    max: 24.9 * heightM * heightM,
  };
}

export default function PremiumIdealWeightCalc() {
  const profile = useFitnessProfile();
  const [gender, setGender] = useState<Gender>('male');
  const [height, setHeight] = useState(170);

  useEffect(() => {
    if (!profile.isLoaded) return;
    if (profile.heightCm) setHeight(Math.round(profile.heightCm));
    if (profile.gender) setGender(profile.gender);
  }, [profile.isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    if (height < 137) return null;

    const formulaResults = Object.entries(FORMULAS).map(([key, formula]) => {
      const idealKg = formula[gender](height);
      return {
        key,
        name: formula.name,
        description: formula.description,
        idealKg: Math.max(0, idealKg),
        idealLbs: Math.max(0, idealKg * 2.20462),
      };
    });

    const bmiRange = getBMIWeightRange(height);
    const averageIdeal =
      formulaResults.reduce((sum, r) => sum + r.idealKg, 0) / formulaResults.length;

    return {
      formulas: formulaResults,
      bmiRange: {
        minKg: bmiRange.min,
        maxKg: bmiRange.max,
        minLbs: bmiRange.min * 2.20462,
        maxLbs: bmiRange.max * 2.20462,
      },
      averageIdeal: {
        kg: averageIdeal,
        lbs: averageIdeal * 2.20462,
      },
    };
  }, [height, gender]);

  const inputs = { gender, height };
  const hasResults = !!results;

  return (
    <PremiumCalculatorWrapper
      calculatorType="ideal-weight"
      title="Ideal Weight Calculator"
      description="Find your ideal body weight using multiple scientific formulas"
      icon={<Target className="w-8 h-8" />}
      inputs={inputs}
      results={results}
      hasResults={hasResults}
    >
      <motion.div variants={fadeInUp} className="space-y-8">
        {/* Gender Selection */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <User className="w-4 h-4" />
            Gender
          </label>
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
        </div>

        {/* Height Input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Ruler className="w-4 h-4" />
            Height (cm)
          </label>
          <input
            type="range"
            min="140"
            max="220"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="premium-slider w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>140</span>
            <span className="font-bold text-primary">{height} cm</span>
            <span>220</span>
          </div>
        </div>

        {results && (
          <>
            {/* Average Result */}
            <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
              <p className="text-sm text-muted-foreground mb-2">Average Ideal Weight</p>
              <p
                className="text-6xl font-light gradient-text"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {results.averageIdeal.kg.toFixed(1)}
                <span className="text-2xl ml-1">kg</span>
              </p>
              <p className="text-lg text-muted-foreground mt-2">
                {results.averageIdeal.lbs.toFixed(1)} lbs
              </p>
            </motion.div>

            {/* Healthy BMI Range */}
            <div className="premium-card">
              <h3 className="font-bold text-lg mb-4">Healthy Weight Range (BMI 18.5-24.9)</h3>
              <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Minimum</p>
                  <p className="text-xl font-bold text-green-600">
                    {results.bmiRange.minKg.toFixed(1)} kg
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {results.bmiRange.minLbs.toFixed(1)} lbs
                  </p>
                </div>
                <div className="flex-1 mx-4 h-2 bg-gradient-to-r from-green-300 via-green-500 to-green-300 rounded-full" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Maximum</p>
                  <p className="text-xl font-bold text-green-600">
                    {results.bmiRange.maxKg.toFixed(1)} kg
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {results.bmiRange.maxLbs.toFixed(1)} lbs
                  </p>
                </div>
              </div>
            </div>

            {/* Formula Comparison */}
            <div className="premium-card">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Formula Comparison
              </h3>
              <div className="space-y-3">
                {results.formulas.map((formula) => {
                  const inRange =
                    formula.idealKg >= results.bmiRange.minKg &&
                    formula.idealKg <= results.bmiRange.maxKg;
                  return (
                    <motion.div
                      key={formula.key}
                      className="p-4 bg-secondary/50 rounded-lg"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{formula.name}</p>
                          <p className="text-xs text-muted-foreground">{formula.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formula.idealKg.toFixed(1)} kg</p>
                          <p className="text-sm text-muted-foreground">
                            {formula.idealLbs.toFixed(1)} lbs
                          </p>
                          {inRange && (
                            <span className="text-xs text-green-500">Within healthy BMI</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </PremiumCalculatorWrapper>
  );
}
