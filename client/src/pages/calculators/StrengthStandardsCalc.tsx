import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Scale, TrendingUp, Dumbbell } from 'lucide-react';
import {
  getStrengthClassification,
  getStrengthStandardsForWeight,
  calculateStrengthScore,
  STRENGTH_CLASSIFICATIONS,
  CLASSIFICATION_COLORS,
} from '@/lib/calculations/strengthStandards';
import { useSEO } from '@/lib/seo';
import RelatedCalculators from '@/components/RelatedCalculators';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadCapturePopup } from '@/components/LeadCapturePopup';

type Gender = 'male' | 'female';

interface LiftInput {
  name: string;
  key: string;
  value: number;
  icon: string;
}

export function StrengthStandardsCalculator() {
  useSEO({
    title: 'Strength Standards Calculator - How Strong Are You?',
    description:
      "Free strength standards calculator. Compare your lifts to population averages. See if you're a beginner, intermediate, advanced, or elite lifter.",
    canonical: 'https://gymgurus.com/calculators/strength-standards',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Strength Standards Calculator - How Strong Are You?',
      url: 'https://gymgurus.com/calculators/strength-standards',
      description:
        "Free strength standards calculator. Compare your lifts to population averages. See if you're a beginner, intermediate, advanced, or elite lifter.",
      applicationCategory: 'HealthApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  });

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

  // Calculate overall score
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Breadcrumbs
        showHome={false}
        items={[
          { label: 'All Calculators', href: '/calculators' },
          { label: 'Strength Standards Calculator' },
        ]}
      />
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Strength Standards</h1>
          <p className="text-muted-foreground">See how your lifts compare</p>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Gender */}
          <div>
            <label className="block text-sm font-medium mb-2">Gender</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGender('male')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  gender === 'male' ? 'bg-blue-500 text-white' : 'bg-secondary'
                }`}
              >
                Male
              </button>
              <button
                onClick={() => setGender('female')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  gender === 'female' ? 'bg-pink-500 text-white' : 'bg-secondary'
                }`}
              >
                Female
              </button>
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium mb-2">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'kg' | 'lbs')}
              className="w-full p-2 border rounded-lg bg-background"
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="lbs">Pounds (lbs)</option>
            </select>
          </div>
        </div>

        {/* Bodyweight */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Scale className="w-4 h-4" />
            Bodyweight ({unit})
          </label>
          <input
            type="number"
            value={bodyweight}
            onChange={(e) => setBodyweight(Number(e.target.value))}
            className="w-full p-3 border rounded-lg bg-background text-xl font-bold text-center"
            min={30}
            max={200}
          />
        </div>
      </div>

      {/* Lift Inputs */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          Your Lifts (1RM)
        </h3>
        <div className="space-y-4">
          {lifts.map((lift, index) => (
            <div key={lift.key}>
              <label className="block text-sm font-medium mb-1">
                {lift.icon} {lift.name}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={lift.value}
                  onChange={(e) => handleLiftChange(index, Number(e.target.value))}
                  className="flex-1 p-3 border rounded-lg bg-background"
                  min={0}
                  step={unit === 'kg' ? 2.5 : 5}
                />
                <span className="text-muted-foreground w-10">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Score */}
      <motion.div
        className={`rounded-xl p-6 mb-6 ${CLASSIFICATION_COLORS[overallClassification].bg}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        key={overallScore}
      >
        <div className="text-center">
          <p className="text-sm opacity-80 mb-1">Overall Strength Level</p>
          <p className={`text-4xl font-bold ${CLASSIFICATION_COLORS[overallClassification].text}`}>
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
      </motion.div>

      {/* Individual Lift Results */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Lift Analysis
        </h3>
        <div className="space-y-4">
          {results.map((result) => (
            <motion.div
              key={result.key}
              className="p-4 bg-secondary/50 rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
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
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, result.score)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {result.value} {unit} ({result.ratio.toFixed(2)}x BW)
                </span>
                <span>Score: {result.score}/100</span>
              </div>

              {/* Standards reference */}
              {result.standards && Object.keys(result.standards).length > 0 && (
                <div className="mt-2 pt-2 border-t grid grid-cols-5 gap-1 text-xs text-center">
                  {Object.entries(result.standards).map(([level, weight]) => {
                    const isCurrentLevel = level === result.classification;
                    const weightNum = typeof weight === 'number' ? weight : 0;
                    return (
                      <div
                        key={level}
                        className={`p-1 rounded ${isCurrentLevel ? 'bg-primary text-primary-foreground' : ''}`}
                      >
                        <div className="font-medium capitalize">{level.slice(0, 3)}</div>
                        <div>{Math.round(unit === 'lbs' ? weightNum / 0.453592 : weightNum)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Classification Legend */}
      <div className="bg-card rounded-xl p-6 shadow-sm">
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
      <RelatedCalculators currentPath="/calculators/strength-standards" />
      <LeadCapturePopup trigger="calculator-result" calculationComplete={results.length > 0} />
    </div>
  );
}

export default StrengthStandardsCalculator;
