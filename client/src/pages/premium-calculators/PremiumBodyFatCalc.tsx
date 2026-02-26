import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import { fadeInUp } from '@/lib/premiumAnimations';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';

type Gender = 'male' | 'female';

function calculateBodyFat(
  gender: Gender,
  height: number,
  waist: number,
  neck: number,
  hips?: number
) {
  if (gender === 'male') {
    const bodyFat =
      495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    return Math.max(0, bodyFat);
  } else {
    const bodyFat =
      495 /
        (1.29579 - 0.35004 * Math.log10(waist + (hips || 0) - neck) + 0.221 * Math.log10(height)) -
      450;
    return Math.max(0, bodyFat);
  }
}

export default function PremiumBodyFatCalc() {
  const profile = useFitnessProfile();
  const [gender, setGender] = useState<Gender>('male');
  const [height, setHeight] = useState(175);
  const [waist, setWaist] = useState(85);
  const [neck, setNeck] = useState(38);
  const [hips, setHips] = useState(95);

  useEffect(() => {
    if (!profile.isLoaded) return;
    if (profile.heightCm) setHeight(Math.round(profile.heightCm));
    if (profile.gender) setGender(profile.gender);
  }, [profile.isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const bodyFat = calculateBodyFat(
      gender,
      height,
      waist,
      neck,
      gender === 'female' ? hips : undefined
    );
    let category: string;
    if (gender === 'male') {
      if (bodyFat < 6) category = 'Essential Fat';
      else if (bodyFat < 14) category = 'Athletic';
      else if (bodyFat < 18) category = 'Fitness';
      else if (bodyFat < 25) category = 'Average';
      else category = 'Obese';
    } else {
      if (bodyFat < 14) category = 'Essential Fat';
      else if (bodyFat < 21) category = 'Athletic';
      else if (bodyFat < 25) category = 'Fitness';
      else if (bodyFat < 32) category = 'Average';
      else category = 'Obese';
    }
    return { bodyFat, category };
  }, [gender, height, waist, neck, hips]);

  const inputs = { gender, height, waist, neck, hips: gender === 'female' ? hips : undefined };
  const hasResults = height > 0 && waist > 0 && neck > 0;

  return (
    <PremiumCalculatorWrapper
      calculatorType="body_fat"
      title="Body Fat Calculator"
      description="Calculate your body fat percentage using the Navy Method"
      icon={<Activity className="w-8 h-8" />}
      inputs={inputs}
      results={results}
      hasResults={hasResults}
    >
      <motion.div variants={fadeInUp} className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Gender</label>
            <div className="grid grid-cols-2 gap-3">
              {(['male', 'female'] as Gender[]).map((g) => (
                <motion.button
                  key={g}
                  onClick={() => setGender(g)}
                  whileHover={{ scale: 1.02 }}
                  className={`py-3 rounded-xl font-medium transition-all ${
                    gender === g ? 'premium-button' : 'bg-card border border-border'
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
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
                <span className="font-bold text-primary">{height}</span>
                <span>220</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Waist (cm)</label>
              <input
                type="range"
                min="50"
                max="150"
                value={waist}
                onChange={(e) => setWaist(Number(e.target.value))}
                className="premium-slider w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>50</span>
                <span className="font-bold text-primary">{waist}</span>
                <span>150</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Neck (cm)</label>
              <input
                type="range"
                min="25"
                max="50"
                value={neck}
                onChange={(e) => setNeck(Number(e.target.value))}
                className="premium-slider w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>25</span>
                <span className="font-bold text-primary">{neck}</span>
                <span>50</span>
              </div>
            </div>

            {gender === 'female' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Hips (cm)</label>
                <input
                  type="range"
                  min="60"
                  max="150"
                  value={hips}
                  onChange={(e) => setHips(Number(e.target.value))}
                  className="premium-slider w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>60</span>
                  <span className="font-bold text-primary">{hips}</span>
                  <span>150</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
          <p className="text-sm text-muted-foreground mb-2">Body Fat Percentage</p>
          <p
            className="text-6xl font-light gradient-text"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {results.bodyFat.toFixed(1)}%
          </p>
          <p className="text-xl font-medium mt-4">{results.category}</p>
        </motion.div>
      </motion.div>
    </PremiumCalculatorWrapper>
  );
}
