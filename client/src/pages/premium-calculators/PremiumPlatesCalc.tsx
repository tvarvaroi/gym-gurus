import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Minus, Plus, Dumbbell } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import { fadeInUp } from '@/lib/premiumAnimations';
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

export default function PremiumPlatesCalc() {
  const [targetWeight, setTargetWeight] = useState<number>(100);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [barbellType, setBarbellType] = useState<BarbellType>('olympic');

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

  const inputs = { targetWeight, unit, barbellType };
  const results = { ...result, warmupPyramid };
  const hasResults = targetWeight > 0;

  return (
    <PremiumCalculatorWrapper
      calculatorType="plates"
      title="Barbell Plate Calculator"
      description="Never second-guess your plate loading again"
      icon={<Calculator className="w-8 h-8" />}
      inputs={inputs}
      results={results}
      hasResults={hasResults}
    >
      <motion.div variants={fadeInUp} className="space-y-8">
        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as WeightUnit)}
              className="w-full p-3 rounded-xl border border-border bg-card"
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="lbs">Pounds (lbs)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Barbell Type</label>
            <select
              value={barbellType}
              onChange={(e) => setBarbellType(e.target.value as BarbellType)}
              className="w-full p-3 rounded-xl border border-border bg-card"
            >
              <option value="olympic">Olympic ({unit === 'kg' ? '20kg' : '45lbs'})</option>
              <option value="womens">Women's ({unit === 'kg' ? '15kg' : '35lbs'})</option>
              <option value="training">Training ({unit === 'kg' ? '15kg' : '35lbs'})</option>
              <option value="ez_bar">EZ Bar ({unit === 'kg' ? '10kg' : '25lbs'})</option>
            </select>
          </div>
        </div>

        {/* Weight Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Target Weight</label>
          <div className="flex items-center justify-center gap-4">
            <motion.button
              onClick={() => handleWeightChange(-increment * 2)}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-full bg-card border border-border"
            >
              <Minus className="w-6 h-6" />
            </motion.button>
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Math.max(0, Number(e.target.value)))}
              className="text-5xl font-bold text-center w-40 bg-transparent border-b-2 border-primary focus:outline-none"
              step={increment}
              min={result.barbellWeight}
            />
            <span className="text-2xl text-muted-foreground">{unit}</span>
            <motion.button
              onClick={() => handleWeightChange(increment * 2)}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-full bg-card border border-border"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          </div>
        </div>

        {/* Quick Weight Buttons */}
        <div className="flex flex-wrap justify-center gap-2">
          {(unit === 'kg'
            ? [60, 80, 100, 120, 140, 160, 180, 200]
            : [135, 185, 225, 275, 315, 365, 405, 495]
          ).map((w) => (
            <motion.button
              key={w}
              onClick={() => setTargetWeight(w)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                targetWeight === w ? 'premium-button' : 'bg-card border border-border'
              }`}
            >
              {w}
              {unit}
            </motion.button>
          ))}
        </div>

        {/* Visual Barbell */}
        <div className="premium-card">
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
                <div
                  className={`w-4 h-4 rounded-sm ${plateColors[p.plate]?.bg || 'bg-gray-400'}`}
                />
                <span>
                  {p.plate}
                  {unit} × {p.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
          <p className="text-sm text-muted-foreground mb-2">Load on each side</p>
          <p
            className="text-3xl font-light gradient-text"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {formatPlatesString(result.platesPerSide, unit)}
          </p>
          <div className="mt-4 pt-4 border-t">
            <p className="text-lg font-bold text-primary">
              Total Weight: {result.actualWeight} {unit}
            </p>
            {!result.isExact && (
              <p className="text-sm text-yellow-600 mt-2">
                Closest possible: {result.actualWeight}
                {unit} ({result.difference > 0 ? '-' : '+'}
                {Math.abs(result.difference)}
                {unit})
              </p>
            )}
          </div>
        </motion.div>

        {/* Warmup Pyramid */}
        <div className="premium-card">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Dumbbell className="w-5 h-5" />
            Suggested Warmup Pyramid
          </h3>
          <div className="space-y-2">
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
        </div>
      </motion.div>
    </PremiumCalculatorWrapper>
  );
}
