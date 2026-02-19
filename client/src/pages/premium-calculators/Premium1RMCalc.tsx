import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import { fadeInUp } from '@/lib/premiumAnimations';
import {
  calculateAll1RM,
  generateRepMaxTable,
  FORMULA_INFO,
  type OneRMFormula,
} from '@/lib/calculations/oneRepMax';

export default function Premium1RMCalc() {
  const [weight, setWeight] = useState<number>(100);
  const [reps, setReps] = useState<number>(5);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [selectedFormula, setSelectedFormula] = useState<OneRMFormula>('average');

  const calculationResults = calculateAll1RM(weight, reps);
  const repMaxTable = generateRepMaxTable(calculationResults[selectedFormula], selectedFormula);

  const results = {
    oneRM: calculationResults[selectedFormula],
    min: calculationResults.min,
    max: calculationResults.max,
    formula: selectedFormula,
    allFormulas: calculationResults,
  };

  const inputs = { weight, reps, unit, selectedFormula };
  const hasResults = weight > 0 && reps > 0;

  return (
    <PremiumCalculatorWrapper
      calculatorType="1rm"
      title="One Rep Max Calculator"
      description="Estimate your one-rep max from any weight and rep count"
      icon={<Dumbbell className="w-8 h-8" />}
      inputs={inputs}
      results={results}
      hasResults={hasResults}
    >
      <motion.div variants={fadeInUp} className="space-y-8">
        {/* Input Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Weight ({unit})</label>
            <input
              type="range"
              min={unit === 'kg' ? 10 : 20}
              max={unit === 'kg' ? 300 : 600}
              step={unit === 'kg' ? 2.5 : 5}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="premium-slider w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{unit === 'kg' ? 10 : 20}</span>
              <span className="font-bold text-primary">
                {weight} {unit}
              </span>
              <span>{unit === 'kg' ? 300 : 600}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reps</label>
            <input
              type="range"
              min="1"
              max="30"
              value={reps}
              onChange={(e) => setReps(Number(e.target.value))}
              className="premium-slider w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1</span>
              <span className="font-bold text-primary">{reps}</span>
              <span>30</span>
            </div>
          </div>
        </div>

        {/* Quick Rep Buttons */}
        <div className="flex flex-wrap gap-2">
          {[1, 3, 5, 8, 10, 12, 15].map((r) => (
            <motion.button
              key={r}
              onClick={() => setReps(r)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                reps === r ? 'premium-button' : 'bg-card border border-border'
              }`}
            >
              {r} rep{r !== 1 ? 's' : ''}
            </motion.button>
          ))}
        </div>

        {/* Unit Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={() => setUnit('kg')}
            whileHover={{ scale: 1.02 }}
            className={`py-3 rounded-xl font-medium transition-all ${
              unit === 'kg' ? 'premium-button' : 'bg-card border border-border'
            }`}
          >
            Kilograms (kg)
          </motion.button>
          <motion.button
            onClick={() => setUnit('lbs')}
            whileHover={{ scale: 1.02 }}
            className={`py-3 rounded-xl font-medium transition-all ${
              unit === 'lbs' ? 'premium-button' : 'bg-card border border-border'
            }`}
          >
            Pounds (lbs)
          </motion.button>
        </div>

        {/* Formula Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Formula</label>
          <select
            value={selectedFormula}
            onChange={(e) => setSelectedFormula(e.target.value as OneRMFormula)}
            className="w-full p-3 rounded-xl border border-border bg-card"
          >
            {Object.entries(FORMULA_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name} - {info.bestFor}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
          <p className="text-sm text-muted-foreground mb-2">Estimated 1RM</p>
          <p
            className="text-6xl font-light gradient-text"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {results.oneRM}
            <span className="text-2xl ml-1">{unit}</span>
          </p>
          <div className="flex justify-center gap-6 text-sm mt-4">
            <div>
              <p className="text-muted-foreground">Min</p>
              <p className="font-bold text-lg">
                {results.min} {unit}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Max</p>
              <p className="font-bold text-lg">
                {results.max} {unit}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Rep Max Table */}
        <div className="premium-card">
          <h4 className="font-semibold mb-4">Rep Max Table</h4>
          <div className="space-y-2">
            {repMaxTable.slice(0, 10).map((row) => (
              <div
                key={row.reps}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  row.reps === reps ? 'bg-primary/10 border border-primary' : 'bg-secondary/30'
                }`}
              >
                <span className="font-medium">{row.reps} RM</span>
                <span className="font-bold">
                  {row.weight} {unit}
                </span>
                <span className="text-sm text-muted-foreground">{row.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* All Formulas */}
        <div className="premium-card">
          <h4 className="font-semibold mb-4">All Formula Results</h4>
          <div className="space-y-3">
            {Object.entries(FORMULA_INFO).map(([key, info]) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
              >
                <div>
                  <p className="font-medium">{info.name}</p>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </div>
                <span className="font-bold text-lg">
                  {calculationResults[key as OneRMFormula]} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </PremiumCalculatorWrapper>
  );
}
