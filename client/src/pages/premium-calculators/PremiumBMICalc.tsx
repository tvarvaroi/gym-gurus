import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import { fadeInUp } from '@/lib/premiumAnimations';

function calculateBMI(weight: number, height: number) {
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);

  let category: string, healthRisk: string;
  if (bmi < 18.5) {
    category = 'Underweight';
    healthRisk = 'Increased risk of nutritional deficiency';
  } else if (bmi < 25) {
    category = 'Normal Weight';
    healthRisk = 'Low risk - maintain healthy lifestyle';
  } else if (bmi < 30) {
    category = 'Overweight';
    healthRisk = 'Increased risk of health issues';
  } else if (bmi < 35) {
    category = 'Obese Class I';
    healthRisk = 'Moderate health risk';
  } else if (bmi < 40) {
    category = 'Obese Class II';
    healthRisk = 'High health risk';
  } else {
    category = 'Obese Class III';
    healthRisk = 'Very high health risk';
  }

  return { bmi, category, healthRisk };
}

export default function PremiumBMICalc() {
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);

  const results = useMemo(() => calculateBMI(weight, height), [weight, height]);
  const inputs = { weight, height };
  const hasResults = weight > 0 && height > 0;

  return (
    <PremiumCalculatorWrapper
      calculatorType="bmi"
      title="BMI Calculator"
      description="Calculate your Body Mass Index with premium insights"
      icon={<Scale className="w-8 h-8" />}
      inputs={inputs}
      results={results}
      hasResults={hasResults}
    >
      <motion.div variants={fadeInUp} className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Weight (kg)</label>
            <input
              type="range"
              min="40"
              max="200"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="premium-slider w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>40</span>
              <span className="font-bold text-primary">{weight} kg</span>
              <span>200</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Height (cm)</label>
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
        </div>

        <div className="space-y-6">
          <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
            <p className="text-sm text-muted-foreground mb-2">Body Mass Index</p>
            <p
              className="text-6xl font-light gradient-text"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {results.bmi.toFixed(1)}
            </p>
            <p className="text-xl font-medium mt-4">{results.category}</p>
            <p className="text-sm text-muted-foreground mt-2">{results.healthRisk}</p>
          </motion.div>
        </div>
      </motion.div>
    </PremiumCalculatorWrapper>
  );
}
