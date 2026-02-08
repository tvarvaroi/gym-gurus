import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Info, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import {
  calculateAll1RM,
  generateRepMaxTable,
  FORMULA_INFO,
  PERCENTAGE_CHART,
  type OneRMFormula,
} from '@/lib/calculations/oneRepMax';

export function OneRepMaxCalculator() {
  const [weight, setWeight] = useState<number>(100);
  const [reps, setReps] = useState<number>(5);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [selectedFormula, setSelectedFormula] = useState<OneRMFormula>('average');
  const [showDetails, setShowDetails] = useState(false);
  const [showPercentageChart, setShowPercentageChart] = useState(false);

  const results = calculateAll1RM(weight, reps);
  const repMaxTable = generateRepMaxTable(results[selectedFormula], selectedFormula);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setWeight(value);
    }
  };

  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 30) {
      setReps(value);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Calculator className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">1RM Calculator</h1>
          <p className="text-muted-foreground">
            Estimate your one-rep max from any weight and rep count
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Weight Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Weight</label>
            <div className="flex">
              <input
                type="number"
                value={weight}
                onChange={handleWeightChange}
                className="flex-1 p-3 text-xl font-bold border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary"
                min={0}
                step={unit === 'kg' ? 2.5 : 5}
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'kg' | 'lbs')}
                className="p-3 border-y border-r rounded-r-lg bg-secondary"
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
          </div>

          {/* Reps Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Reps</label>
            <input
              type="number"
              value={reps}
              onChange={handleRepsChange}
              className="w-full p-3 text-xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              min={1}
              max={30}
            />
          </div>
        </div>

        {/* Quick Rep Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[1, 3, 5, 8, 10, 12, 15].map((r) => (
            <button
              key={r}
              onClick={() => setReps(r)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                reps === r ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {r} rep{r !== 1 ? 's' : ''}
            </button>
          ))}
        </div>

        {/* Formula Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Formula</label>
          <select
            value={selectedFormula}
            onChange={(e) => setSelectedFormula(e.target.value as OneRMFormula)}
            className="w-full p-3 border rounded-lg bg-background"
          >
            {Object.entries(FORMULA_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name} - {info.bestFor}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Section */}
      <motion.div
        className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={`${weight}-${reps}-${selectedFormula}`}
      >
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground mb-1">Estimated 1RM</p>
          <p className="text-6xl font-bold text-primary">
            {results[selectedFormula]}
            <span className="text-2xl ml-1">{unit}</span>
          </p>
        </div>

        <div className="flex justify-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-muted-foreground">Min Estimate</p>
            <p className="font-bold text-lg">{results.min} {unit}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Max Estimate</p>
            <p className="font-bold text-lg">{results.max} {unit}</p>
          </div>
        </div>
      </motion.div>

      {/* Rep Max Table */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          Rep Max Table
        </h3>
        <div className="space-y-2">
          {repMaxTable.map((row) => (
            <div
              key={row.reps}
              className={`flex items-center justify-between p-3 rounded-lg ${
                row.reps === reps ? 'bg-primary/10 border border-primary' : 'bg-secondary/50'
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

      {/* Formula Details */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full p-4 flex items-center justify-between hover:bg-secondary/50"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            <span className="font-medium">All Formula Results</span>
          </div>
          {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showDetails && (
          <div className="p-4 pt-0 space-y-3">
            {Object.entries(FORMULA_INFO).map(([key, info]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium">{info.name}</p>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </div>
                <span className="font-bold text-lg">
                  {results[key as OneRMFormula]} {unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Percentage Chart */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowPercentageChart(!showPercentageChart)}
          className="w-full p-4 flex items-center justify-between hover:bg-secondary/50"
        >
          <span className="font-medium">Training Zones by % 1RM</span>
          {showPercentageChart ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showPercentageChart && (
          <div className="p-4 pt-0">
            <div className="space-y-2">
              {PERCENTAGE_CHART.map((zone) => {
                const zoneWeight = Math.round((results[selectedFormula] * zone.percentage) / 100);
                return (
                  <div
                    key={zone.percentage}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                  >
                    <div>
                      <span className="font-bold">{zone.percentage}%</span>
                      <span className="text-muted-foreground ml-2">{zone.reps} reps</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {zoneWeight} {unit}
                      </p>
                      <p className="text-xs text-muted-foreground">{zone.use}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
        <p className="text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> These are estimates based on mathematical formulas. Actual 1RM may
          vary based on factors like fatigue, technique, and training experience. Always use a
          spotter when attempting heavy lifts.
        </p>
      </div>
    </div>
  );
}

export default OneRepMaxCalculator;
