import { useState, useMemo } from 'react';
import { Trophy, Scale, TrendingUp, Dumbbell } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import {
  getStrengthClassification,
  getStrengthStandardsForWeight,
  calculateStrengthScore,
  STRENGTH_CLASSIFICATIONS,
  CLASSIFICATION_COLORS,
} from '@/lib/calculations/strengthStandards';

type Gender = 'male' | 'female';

interface LiftInput {
  name: string;
  key: string;
  value: number;
  icon: string;
}

export default function PremiumStrengthStandardsCalc() {
  const [gender, setGender] = useState<Gender>('male');
  const [bodyweight, setBodyweight] = useState(75);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [lifts, setLifts] = useState<LiftInput[]>([
    { name: 'Squat', key: 'squat', value: 100, icon: '🦵' },
    { name: 'Bench Press', key: 'bench_press', value: 80, icon: '🏋️' },
    { name: 'Deadlift', key: 'deadlift', value: 120, icon: '💪' },
    { name: 'Overhead Press', key: 'overhead_press', value: 50, icon: '🙆' },
  ]);

  const bodyweightKg = unit === 'lbs' ? bodyweight * 0.453592 : bodyweight;

  const results = useMemo(() => {
    return lifts.map((lift) => {
      const liftKg = unit === 'lbs' ? lift.value * 0.453592 : lift.value;
      const classificationResult = getStrengthClassification(
        lift.key,
        gender,
        bodyweightKg,
        liftKg
      );
      const score = calculateStrengthScore(lift.key, liftKg, bodyweightKg, gender);
      const standards = getStrengthStandardsForWeight(lift.key, bodyweightKg, gender);

      return {
        ...lift,
        classification: classificationResult.classification.toLowerCase(),
        score,
        standards,
        ratio: liftKg / bodyweightKg,
      };
    });
  }, [lifts, bodyweightKg, gender, unit]);

  const overallScore = useMemo(() => {
    const scores = results.map((r) => r.score);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [results]);

  const getOverallClassification = (score: number): string => {
    if (score >= 90) return 'elite';
    if (score >= 75) return 'advanced';
    if (score >= 55) return 'intermediate';
    if (score >= 35) return 'novice';
    return 'beginner';
  };

  const overallClassification = getOverallClassification(overallScore);

  const handleLiftChange = (index: number, value: number) => {
    setLifts((prev) => prev.map((lift, i) => (i === index ? { ...lift, value } : lift)));
  };

  const inputs = {
    gender,
    bodyweight,
    unit,
    lifts: lifts.map((l) => ({ name: l.name, value: l.value })),
  };
  const hasResults = bodyweight > 0 && lifts.every((l) => l.value > 0);

  return (
    <PremiumCalculatorWrapper
      calculatorType="strength-standards"
      title="Strength Standards Calculator"
      description="See how your lifts stack up against the competition"
      icon={<Trophy className="w-8 h-8" />}
      inputs={inputs}
      results={{ overallScore, overallClassification, results }}
      hasResults={hasResults}
    >
      <div className="space-y-8">
        {/* Gender Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Gender</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setGender('male')}
              className={`py-3 rounded-xl font-medium transition-all hover:scale-[1.02] ${
                gender === 'male' ? 'premium-button' : 'bg-card border border-border'
              }`}
            >
              Male
            </button>
            <button
              onClick={() => setGender('female')}
              className={`py-3 rounded-xl font-medium transition-all hover:scale-[1.02] ${
                gender === 'female' ? 'premium-button' : 'bg-card border border-border'
              }`}
            >
              Female
            </button>
          </div>
        </div>

        {/* Bodyweight */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Scale className="w-4 h-4" />
            Bodyweight ({unit})
          </label>
          <input
            type="range"
            min={unit === 'kg' ? 40 : 90}
            max={unit === 'kg' ? 150 : 330}
            step={unit === 'kg' ? 1 : 2}
            value={bodyweight}
            onChange={(e) => setBodyweight(Number(e.target.value))}
            className="premium-slider w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{unit === 'kg' ? 40 : 90}</span>
            <span className="font-bold text-primary">
              {bodyweight} {unit}
            </span>
            <span>{unit === 'kg' ? 150 : 330}</span>
          </div>
        </div>

        {/* Unit Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setUnit('kg')}
            className={`py-3 rounded-xl font-medium transition-all hover:scale-[1.02] ${
              unit === 'kg' ? 'premium-button' : 'bg-card border border-border'
            }`}
          >
            Kilograms (kg)
          </button>
          <button
            onClick={() => setUnit('lbs')}
            className={`py-3 rounded-xl font-medium transition-all hover:scale-[1.02] ${
              unit === 'lbs' ? 'premium-button' : 'bg-card border border-border'
            }`}
          >
            Pounds (lbs)
          </button>
        </div>

        {/* Lift Inputs */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Dumbbell className="w-5 h-5" />
            Your Lifts (1RM)
          </h3>
          {lifts.map((lift, index) => (
            <div key={lift.key} className="space-y-2">
              <label className="text-sm font-medium">
                {lift.icon} {lift.name}
              </label>
              <input
                type="range"
                min={unit === 'kg' ? 10 : 20}
                max={unit === 'kg' ? 300 : 660}
                step={unit === 'kg' ? 2.5 : 5}
                value={lift.value}
                onChange={(e) => handleLiftChange(index, Number(e.target.value))}
                className="premium-slider w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{unit === 'kg' ? 10 : 20}</span>
                <span className="font-bold text-primary">
                  {lift.value} {unit}
                </span>
                <span>{unit === 'kg' ? 300 : 660}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Score */}
        <div
          className={`rounded-xl p-6 hover:-translate-y-1 transition-transform ${CLASSIFICATION_COLORS[overallClassification].bg}`}
        >
          <div className="text-center">
            <p className="text-sm opacity-80 mb-1">Overall Strength Level</p>
            <p
              className={`text-4xl font-bold ${CLASSIFICATION_COLORS[overallClassification].text}`}
            >
              {STRENGTH_CLASSIFICATIONS[overallClassification].label}
            </p>
            <p className="text-sm opacity-70 mt-2">
              {STRENGTH_CLASSIFICATIONS[overallClassification].description}
            </p>
            <div className="mt-4 flex justify-center">
              <div className="bg-white/30 rounded-full px-4 py-2">
                <span className="font-bold text-2xl">{overallScore}</span>
                <span className="text-sm ml-1">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Lift Results */}
        <div className="premium-card">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Lift Analysis
          </h3>
          <div className="space-y-4">
            {results.map((result) => (
              <div key={result.key} className="p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {result.icon} {result.name}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      CLASSIFICATION_COLORS[result.classification].bg
                    } ${CLASSIFICATION_COLORS[result.classification].text}`}
                  >
                    {STRENGTH_CLASSIFICATIONS[result.classification].label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, result.score)}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {result.value} {unit} ({result.ratio.toFixed(2)}x BW)
                  </span>
                  <span>Score: {result.score}/100</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Classification Legend */}
        <div className="premium-card">
          <h3 className="font-bold text-lg mb-4">Classification Legend</h3>
          <div className="space-y-2">
            {Object.entries(STRENGTH_CLASSIFICATIONS).map(([key, info]) => (
              <div
                key={key}
                className={`p-3 rounded-lg ${CLASSIFICATION_COLORS[key]?.bg || 'bg-gray-100'}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-medium ${CLASSIFICATION_COLORS[key]?.text || 'text-gray-600'}`}
                  >
                    {info.label}
                  </span>
                  <span className="text-sm opacity-80">{info.percentile}</span>
                </div>
                <p className="text-sm opacity-70">{info.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PremiumCalculatorWrapper>
  );
}
