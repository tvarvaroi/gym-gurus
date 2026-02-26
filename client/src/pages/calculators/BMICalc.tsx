import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scale, Ruler, Info } from 'lucide-react';
import { useSEO } from '@/lib/seo';
import RelatedCalculators from '@/components/RelatedCalculators';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadCapturePopup } from '@/components/LeadCapturePopup';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';

type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese_1' | 'obese_2' | 'obese_3';

interface BMIResult {
  bmi: number;
  category: BMICategory;
  healthRisk: string;
  idealWeightRange: { min: number; max: number };
}

const BMI_CATEGORIES: Record<
  BMICategory,
  { label: string; color: string; bgColor: string; range: string }
> = {
  underweight: {
    label: 'Underweight',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    range: '< 18.5',
  },
  normal: {
    label: 'Normal',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    range: '18.5 - 24.9',
  },
  overweight: {
    label: 'Overweight',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    range: '25 - 29.9',
  },
  obese_1: {
    label: 'Obese Class I',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    range: '30 - 34.9',
  },
  obese_2: {
    label: 'Obese Class II',
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    range: '35 - 39.9',
  },
  obese_3: { label: 'Obese Class III', color: 'text-red-700', bgColor: 'bg-red-200', range: '40+' },
};

function calculateBMI(weightKg: number, heightCm: number): BMIResult {
  const heightM = heightCm / 100;
  const bmi = heightM > 0 && weightKg > 0 ? weightKg / (heightM * heightM) : 0;

  let category: BMICategory;
  let healthRisk: string;

  if (bmi < 18.5) {
    category = 'underweight';
    healthRisk = 'Increased risk of nutritional deficiency and osteoporosis';
  } else if (bmi < 25) {
    category = 'normal';
    healthRisk = 'Low risk - maintain healthy lifestyle';
  } else if (bmi < 30) {
    category = 'overweight';
    healthRisk = 'Increased risk of heart disease and type 2 diabetes';
  } else if (bmi < 35) {
    category = 'obese_1';
    healthRisk = 'High risk of cardiovascular disease and metabolic disorders';
  } else if (bmi < 40) {
    category = 'obese_2';
    healthRisk = 'Very high risk - medical consultation recommended';
  } else {
    category = 'obese_3';
    healthRisk = 'Extremely high risk - immediate medical attention advised';
  }

  // Calculate ideal weight range (BMI 18.5-24.9)
  const idealWeightRange = {
    min: Math.round(18.5 * heightM * heightM),
    max: Math.round(24.9 * heightM * heightM),
  };

  return { bmi, category, healthRisk, idealWeightRange };
}

export function BMICalculator() {
  useSEO({
    title: 'BMI Calculator - Calculate Your Body Mass Index',
    description:
      'Free BMI calculator. Enter your height and weight to instantly calculate your Body Mass Index, see your BMI category, and get health recommendations.',
    canonical: 'https://gymgurus.com/calculators/bmi',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'BMI Calculator - Calculate Your Body Mass Index',
      url: 'https://gymgurus.com/calculators/bmi',
      description:
        'Free BMI calculator. Enter your height and weight to instantly calculate your Body Mass Index, see your BMI category, and get health recommendations.',
      applicationCategory: 'HealthApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  });

  const profile = useFitnessProfile();
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');

  useEffect(() => {
    if (!profile.isLoaded) return;
    if (profile.weightKg) setWeight(Math.round(profile.weightKg));
    if (profile.heightCm) setHeight(Math.round(profile.heightCm));
  }, [profile.isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Convert units for calculation
  const weightKg = unit === 'imperial' ? weight * 0.453592 : weight;
  const heightCm = unit === 'imperial' ? height * 2.54 : height;

  const result = useMemo(() => calculateBMI(weightKg, heightCm), [weightKg, heightCm]);
  const categoryInfo = BMI_CATEGORIES[result.category];

  // Calculate position on the BMI scale (0-100%)
  const scalePosition = Math.min(100, Math.max(0, ((result.bmi - 15) / 30) * 100));

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Breadcrumbs
        showHome={false}
        items={[{ label: 'All Calculators', href: '/calculators' }, { label: 'BMI Calculator' }]}
      />
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Scale className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">BMI Calculator</h1>
          <p className="text-muted-foreground">Calculate your Body Mass Index</p>
        </div>
      </div>

      {/* Unit Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setUnit('metric')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            unit === 'metric' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          }`}
        >
          Metric (kg/cm)
        </button>
        <button
          onClick={() => setUnit('imperial')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            unit === 'imperial' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          }`}
        >
          Imperial (lbs/in)
        </button>
      </div>

      {/* Input Form */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        {/* Weight */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Scale className="w-4 h-4" />
            Weight ({unit === 'metric' ? 'kg' : 'lbs'})
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={unit === 'metric' ? 30 : 66}
              max={unit === 'metric' ? 200 : 440}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-20 p-2 text-center border rounded-lg bg-background font-bold"
              min={unit === 'metric' ? 30 : 66}
            />
          </div>
        </div>

        {/* Height */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Ruler className="w-4 h-4" />
            Height ({unit === 'metric' ? 'cm' : 'inches'})
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={unit === 'metric' ? 100 : 40}
              max={unit === 'metric' ? 250 : 100}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-20 p-2 text-center border rounded-lg bg-background font-bold"
              min={unit === 'metric' ? 100 : 40}
            />
          </div>
        </div>
      </div>

      {/* BMI Result */}
      <motion.div
        className={`rounded-xl p-6 mb-6 ${categoryInfo.bgColor}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        key={result.bmi.toFixed(1)}
      >
        <div className="text-center mb-4">
          <p className="text-sm opacity-70 mb-1">Your BMI</p>
          <p className={`text-6xl font-bold ${categoryInfo.color}`}>{result.bmi.toFixed(1)}</p>
          <p className={`text-xl font-medium ${categoryInfo.color} mt-2`}>{categoryInfo.label}</p>
        </div>

        {/* BMI Scale */}
        <div className="relative h-4 bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 via-orange-400 to-red-500 rounded-full mb-2">
          <motion.div
            className="absolute top-0 w-3 h-3 bg-white border-2 border-gray-800 rounded-full -translate-x-1/2"
            style={{ left: `${scalePosition}%`, top: '2px' }}
            animate={{ left: `${scalePosition}%` }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>15</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>35</span>
          <span>40+</span>
        </div>
      </motion.div>

      {/* Health Risk & Ideal Weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Health Risk
          </h3>
          <p className="text-sm text-muted-foreground">{result.healthRisk}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <h3 className="font-medium mb-2">Ideal Weight Range</h3>
          <p className="text-2xl font-bold text-primary">
            {result.idealWeightRange.min} - {result.idealWeightRange.max} kg
          </p>
          <p className="text-sm text-muted-foreground">For normal BMI (18.5-24.9)</p>
        </div>
      </div>

      {/* BMI Categories Legend */}
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-4">BMI Categories</h3>
        <div className="space-y-2">
          {Object.entries(BMI_CATEGORIES).map(([key, info]) => (
            <div
              key={key}
              className={`flex justify-between items-center p-3 rounded-lg ${
                result.category === key ? info.bgColor : 'bg-secondary/30'
              }`}
            >
              <span className={result.category === key ? info.color + ' font-medium' : ''}>
                {info.label}
              </span>
              <span className="text-sm text-muted-foreground">{info.range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-sm">
        <p className="text-yellow-700 dark:text-yellow-300">
          <strong>Note:</strong> BMI is a general indicator and doesn't account for muscle mass,
          bone density, or body composition. Athletes and muscular individuals may have a high BMI
          but low body fat.
        </p>
      </div>
      <RelatedCalculators currentPath="/calculators/bmi" />
      <LeadCapturePopup trigger="calculator-result" calculationComplete={!!result} />
    </div>
  );
}

export default BMICalculator;
