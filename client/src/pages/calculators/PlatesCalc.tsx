import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Minus, Plus, RotateCcw } from 'lucide-react';
import {
  calculatePlates,
  getWarmupPyramid,
  PLATE_COLORS_KG,
  PLATE_COLORS_LBS,
  getPlateHeight,
  formatPlatesString,
  type WeightUnit,
  type BarbellType,
} from '@/lib/calculations/plates';
import { useSEO } from '@/lib/seo';
import RelatedCalculators from '@/components/RelatedCalculators';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export function PlatesCalculator() {
  useSEO({
    title: 'Barbell Plate Calculator - Load Your Bar',
    description:
      'Free barbell plate loading calculator. Enter your target weight to see which plates to load on each side of the bar.',
    canonical: 'https://gymgurus.com/calculators/plates',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Barbell Plate Calculator - Load Your Bar',
      url: 'https://gymgurus.com/calculators/plates',
      description:
        'Free barbell plate loading calculator. Enter your target weight to see which plates to load on each side of the bar.',
      applicationCategory: 'HealthApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  });

  const [targetWeight, setTargetWeight] = useState<number>(100);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [barbellType, setBarbellType] = useState<BarbellType>('olympic');
  const [showWarmup, setShowWarmup] = useState(false);

  const result = useMemo(
    () => calculatePlates(targetWeight, unit, barbellType),
    [targetWeight, unit, barbellType]
  );

  const warmupPyramid = useMemo(() => getWarmupPyramid(targetWeight, unit), [targetWeight, unit]);

  const plateColors = unit === 'kg' ? PLATE_COLORS_KG : PLATE_COLORS_LBS;
  const increment = unit === 'kg' ? 2.5 : 5;

  const handleWeightChange = (delta: number) => {
    setTargetWeight((prev) => Math.max(result.barbellWeight, prev + delta));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Breadcrumbs
        showHome={false}
        items={[
          { label: 'All Calculators', href: '/calculators' },
          { label: 'Plate Calculator' },
        ]}
      />
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Calculator className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Plates Calculator</h1>
          <p className="text-muted-foreground">See exactly what plates to load on the bar</p>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as WeightUnit)}
              className="w-full p-3 border rounded-lg bg-background"
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="lbs">Pounds (lbs)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Barbell Type</label>
            <select
              value={barbellType}
              onChange={(e) => setBarbellType(e.target.value as BarbellType)}
              className="w-full p-3 border rounded-lg bg-background"
            >
              <option value="olympic">Olympic ({unit === 'kg' ? '20kg' : '45lbs'})</option>
              <option value="womens">Women's ({unit === 'kg' ? '15kg' : '35lbs'})</option>
              <option value="training">Training ({unit === 'kg' ? '15kg' : '35lbs'})</option>
              <option value="ez_bar">EZ Bar ({unit === 'kg' ? '10kg' : '25lbs'})</option>
            </select>
          </div>
        </div>

        {/* Weight Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Target Weight</label>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleWeightChange(-increment * 2)}
              className="p-3 rounded-full bg-secondary hover:bg-secondary/80"
            >
              <Minus className="w-6 h-6" />
            </button>
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Math.max(0, Number(e.target.value)))}
              className="text-5xl font-bold text-center w-40 bg-transparent border-b-2 border-primary focus:outline-none"
              step={increment}
              min={result.barbellWeight}
            />
            <span className="text-2xl text-muted-foreground">{unit}</span>
            <button
              onClick={() => handleWeightChange(increment * 2)}
              className="p-3 rounded-full bg-secondary hover:bg-secondary/80"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Quick Weight Buttons */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {(unit === 'kg'
            ? [60, 80, 100, 120, 140, 160, 180, 200]
            : [135, 185, 225, 275, 315, 365, 405, 495]
          ).map((w) => (
            <button
              key={w}
              onClick={() => setTargetWeight(w)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                targetWeight === w
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {w}
              {unit}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Barbell */}
      <div className="bg-card rounded-xl p-8 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4 text-center">Barbell Visualization</h3>

        <div className="flex items-center justify-center py-8">
          {/* Left Plates */}
          <div className="flex items-center flex-row-reverse">
            {result.platesPerSide.map((p, idx) =>
              Array(p.count)
                .fill(null)
                .map((_, i) => (
                  <motion.div
                    key={`left-${idx}-${i}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: (idx * p.count + i) * 0.05 }}
                    className={`rounded-sm mx-0.5 ${plateColors[p.plate]?.bg || 'bg-gray-400'}`}
                    style={{
                      width: '14px',
                      height: `${getPlateHeight(p.plate, unit)}px`,
                    }}
                    title={`${p.plate}${unit}`}
                  />
                ))
            )}
          </div>

          {/* Left Collar */}
          <div className="w-3 h-8 bg-gray-600 rounded-sm" />

          {/* Barbell */}
          <div className="h-4 bg-gray-500 rounded-full" style={{ width: '200px' }}>
            <div className="h-full flex items-center justify-center text-xs text-white font-medium">
              {result.barbellWeight}
              {unit}
            </div>
          </div>

          {/* Right Collar */}
          <div className="w-3 h-8 bg-gray-600 rounded-sm" />

          {/* Right Plates */}
          <div className="flex items-center">
            {result.platesPerSide.map((p, idx) =>
              Array(p.count)
                .fill(null)
                .map((_, i) => (
                  <motion.div
                    key={`right-${idx}-${i}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: (idx * p.count + i) * 0.05 }}
                    className={`rounded-sm mx-0.5 ${plateColors[p.plate]?.bg || 'bg-gray-400'}`}
                    style={{
                      width: '14px',
                      height: `${getPlateHeight(p.plate, unit)}px`,
                    }}
                    title={`${p.plate}${unit}`}
                  />
                ))
            )}
          </div>
        </div>

        {/* Plate Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {result.platesPerSide.map((p) => (
            <div key={p.plate} className="flex items-center gap-1 text-sm">
              <div className={`w-4 h-4 rounded-sm ${plateColors[p.plate]?.bg || 'bg-gray-400'}`} />
              <span>
                {p.plate}
                {unit} × {p.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4">Plate Breakdown</h3>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
            <span>Barbell</span>
            <span className="font-bold">
              {result.barbellWeight} {unit}
            </span>
          </div>

          {result.platesPerSide.map((p) => (
            <div
              key={p.plate}
              className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-sm ${plateColors[p.plate]?.bg || 'bg-gray-400'}`}
                />
                <span>
                  {p.plate}
                  {unit} plates
                </span>
              </div>
              <span className="font-bold">
                × {p.count} (each side) = {p.plate * p.count * 2} {unit}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-lg">
            <span className="font-bold">Total Weight</span>
            <span className="font-bold text-primary">
              {result.actualWeight} {unit}
            </span>
          </div>

          {!result.isExact && (
            <p className="text-sm text-yellow-600 mt-2">
              ⚠️ Cannot make exactly {targetWeight}
              {unit}. Closest possible: {result.actualWeight}
              {unit} ({result.difference > 0 ? '-' : '+'}
              {Math.abs(result.difference)}
              {unit})
            </p>
          )}
        </div>
      </div>

      {/* Per Side Summary */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-6">
        <p className="text-center text-lg mb-2">Load on each side:</p>
        <p className="text-center text-2xl font-bold text-primary">
          {formatPlatesString(result.platesPerSide, unit)}
        </p>
      </div>

      {/* Warmup Pyramid */}
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <button
          onClick={() => setShowWarmup(!showWarmup)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="font-bold text-lg">Suggested Warmup Pyramid</h3>
          <RotateCcw className={`w-5 h-5 transition-transform ${showWarmup ? 'rotate-180' : ''}`} />
        </button>

        {showWarmup && (
          <div className="mt-4 space-y-2">
            {warmupPyramid.map((set, idx) => {
              const setPlates = calculatePlates(set.weight, unit, barbellType);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div>
                    <span className="font-bold">Set {idx + 1}</span>
                    <span className="text-muted-foreground ml-2">{set.reps} reps</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {set.weight} {unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPlatesString(setPlates.platesPerSide, unit)}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">{set.percentage}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <RelatedCalculators currentPath="/calculators/plates" />
    </div>
  );
}

export default PlatesCalculator;
