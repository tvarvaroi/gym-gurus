import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ClipboardCheck,
  AlertTriangle,
  Heart,
  Shield,
  Dumbbell,
  Target,
  Phone,
  Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ClientIntakeFormProps {
  clientId: string;
}

interface IntakeData {
  parqHeartCondition: boolean;
  parqChestPainActivity: boolean;
  parqChestPainRest: boolean;
  parqDizziness: boolean;
  parqBoneJoint: boolean;
  parqBloodPressureMeds: boolean;
  parqOtherReason: boolean;
  parqOtherDetails: string;
  fitnessExperience: string;
  currentActivityLevel: string;
  previousInjuries: string;
  medicalConditions: string;
  medications: string;
  primaryGoal: string;
  secondaryGoals: string[];
  preferredTrainingDays: string[];
  preferredSessionDuration: number;
  dietaryRestrictions: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  consentSigned: boolean;
}

const defaultIntake: IntakeData = {
  parqHeartCondition: false,
  parqChestPainActivity: false,
  parqChestPainRest: false,
  parqDizziness: false,
  parqBoneJoint: false,
  parqBloodPressureMeds: false,
  parqOtherReason: false,
  parqOtherDetails: '',
  fitnessExperience: '',
  currentActivityLevel: '',
  previousInjuries: '',
  medicalConditions: '',
  medications: '',
  primaryGoal: '',
  secondaryGoals: [],
  preferredTrainingDays: [],
  preferredSessionDuration: 60,
  dietaryRestrictions: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  consentSigned: false,
};

const PAR_Q_QUESTIONS = [
  {
    key: 'parqHeartCondition' as const,
    text: 'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?',
  },
  {
    key: 'parqChestPainActivity' as const,
    text: 'Do you feel pain in your chest when you do physical activity?',
  },
  {
    key: 'parqChestPainRest' as const,
    text: 'In the past month, have you had chest pain when you were not doing physical activity?',
  },
  {
    key: 'parqDizziness' as const,
    text: 'Do you lose your balance because of dizziness or do you ever lose consciousness?',
  },
  {
    key: 'parqBoneJoint' as const,
    text: 'Do you have a bone or joint problem that could be made worse by a change in your physical activity?',
  },
  {
    key: 'parqBloodPressureMeds' as const,
    text: 'Is your doctor currently prescribing drugs for your blood pressure or heart condition?',
  },
  {
    key: 'parqOtherReason' as const,
    text: 'Do you know of any other reason why you should not do physical activity?',
  },
];

const EXPERIENCE_LEVELS = [
  { value: 'none', label: 'No Experience' },
  { value: 'beginner', label: 'Beginner (0-6 months)' },
  { value: '1-2years', label: '1-2 Years' },
  { value: '3-5years', label: '3-5 Years' },
  { value: '5plus', label: '5+ Years' },
];

const GOALS = [
  'Lose Weight',
  'Build Muscle',
  'Get Stronger',
  'Improve Endurance',
  'Improve Flexibility',
  'General Fitness',
  'Sport Performance',
  'Rehabilitation',
];

const TRAINING_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function ClientIntakeForm({ clientId }: ClientIntakeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const { data: existingIntake, isLoading } = useQuery({
    queryKey: [`/api/intake/${clientId}`],
    queryFn: () => fetch(`/api/intake/${clientId}`).then((r) => r.json()),
  });

  const [formData, setFormData] = useState<IntakeData>(defaultIntake);

  // Initialize form with existing data when loaded
  useEffect(() => {
    if (existingIntake && existingIntake.id) {
      setFormData({
        ...defaultIntake,
        ...existingIntake,
        secondaryGoals: existingIntake.secondaryGoals || [],
        preferredTrainingDays: existingIntake.preferredTrainingDays || [],
      });
    }
  }, [existingIntake]);

  const submitMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/intake/${clientId}`, formData),
    onSuccess: () => {
      toast({
        title: 'Intake form saved',
        description: 'Client intake questionnaire has been saved.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/intake/${clientId}`] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save intake form.', variant: 'destructive' });
    },
  });

  const updateField = <K extends keyof IntakeData>(key: K, value: IntakeData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'secondaryGoals' | 'preferredTrainingDays', item: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].includes(item) ? prev[key].filter((i) => i !== item) : [...prev[key], item],
    }));
  };

  const hasParqConcerns = PAR_Q_QUESTIONS.some((q) => formData[q.key]);

  // Phone number validation (simple format check)
  const isPhoneValid = (phone: string) => {
    // Accept formats: (123) 456-7890, 123-456-7890, 1234567890, +1 123 456 7890
    const phoneRegex = /^[\d\s()+-]+$/;
    const digitsOnly = phone.replace(/\D/g, '');
    return phone.trim() !== '' && phoneRegex.test(phone) && digitsOnly.length >= 10;
  };

  // Form validation - ensure required fields are filled
  const isStepValid = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: // PAR-Q — all boolean, always valid (users may answer "No" to all)
        return true;
      case 1: // Fitness Background — experience level required
        return formData.fitnessExperience !== '';
      case 2: // Goals — primary goal required
        return formData.primaryGoal !== '';
      case 3: // Emergency Contact & Consent
        return (
          formData.emergencyContactName.trim() !== '' &&
          isPhoneValid(formData.emergencyContactPhone) &&
          formData.emergencyContactRelation.trim() !== '' &&
          formData.consentSigned
        );
      default:
        return true;
    }
  };

  const isFormValid = () => {
    return isStepValid(0) && isStepValid(1) && isStepValid(2) && isStepValid(3);
  };

  const steps = [
    { title: 'PAR-Q Health Screening', icon: Heart },
    { title: 'Fitness Background', icon: Dumbbell },
    { title: 'Goals & Preferences', icon: Target },
    { title: 'Emergency Contact & Consent', icon: Shield },
  ];

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="py-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  // If intake already completed, show summary
  if (existingIntake?.completedAt && step === 0) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-green-400" />
            Intake Questionnaire Completed
          </CardTitle>
          <CardDescription>
            Completed on {new Date(existingIntake.completedAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasParqConcerns && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-400">PAR-Q Flags Detected</p>
                <p className="text-xs text-white/60 mt-1">
                  This client answered "Yes" to one or more PAR-Q questions. Medical clearance may
                  be required.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/50">Experience</p>
              <p className="text-white/90">{existingIntake.fitnessExperience || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-white/50">Primary Goal</p>
              <p className="text-white/90">{existingIntake.primaryGoal || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-white/50">Session Duration</p>
              <p className="text-white/90">{existingIntake.preferredSessionDuration || 60} min</p>
            </div>
            <div>
              <p className="text-white/50">Emergency Contact</p>
              <p className="text-white/90">
                {existingIntake.emergencyContactName || 'Not provided'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormData({
                ...defaultIntake,
                ...existingIntake,
                secondaryGoals: existingIntake.secondaryGoals || [],
                preferredTrainingDays: existingIntake.preferredTrainingDays || [],
              });
              setStep(1);
            }}
          >
            Edit Questionnaire
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5" />
          Client Intake Questionnaire
        </CardTitle>
        <CardDescription>
          Step {step + 1} of {steps.length}: {steps[step].title}
        </CardDescription>
        {/* Progress bar */}
        <div className="flex gap-1 mt-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 0: PAR-Q */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Heart className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-white/70">
                The PAR-Q (Physical Activity Readiness Questionnaire) helps identify individuals who
                may need medical clearance before starting an exercise program.
              </p>
            </div>

            {PAR_Q_QUESTIONS.map((q) => (
              <label key={q.key} className="flex items-start gap-3 cursor-pointer group">
                <div
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    formData[q.key]
                      ? 'bg-red-500 border-red-500'
                      : 'border-white/30 group-hover:border-white/50'
                  }`}
                  onClick={() => updateField(q.key, !formData[q.key])}
                >
                  {formData[q.key] && <Check className="w-3 h-3 text-white" />}
                </div>
                <span
                  className="text-sm text-white/80"
                  onClick={() => updateField(q.key, !formData[q.key])}
                >
                  {q.text}
                </span>
              </label>
            ))}

            {formData.parqOtherReason && (
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30"
                placeholder="Please specify..."
                value={formData.parqOtherDetails}
                onChange={(e) => updateField('parqOtherDetails', e.target.value)}
                rows={2}
              />
            )}

            {hasParqConcerns && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300">
                  One or more "Yes" answers detected. This client should consult a physician before
                  beginning a physical activity program.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Fitness Background */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">
                Fitness Experience<span className="text-destructive ml-0.5">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    onClick={() => updateField('fitnessExperience', lvl.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      formData.fitnessExperience === lvl.value
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
              {step === 1 && formData.fitnessExperience === '' && (
                <p className="text-xs text-destructive mt-1">Please select your experience level</p>
              )}
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Previous Injuries</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30"
                placeholder="List any previous injuries or chronic conditions..."
                value={formData.previousInjuries}
                onChange={(e) => updateField('previousInjuries', e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Medical Conditions</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30"
                placeholder="List any medical conditions..."
                value={formData.medicalConditions}
                onChange={(e) => updateField('medicalConditions', e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Current Medications</label>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30"
                placeholder="List any current medications..."
                value={formData.medications}
                onChange={(e) => updateField('medications', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Goals & Preferences */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">
                Primary Goal<span className="text-destructive ml-0.5">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => updateField('primaryGoal', goal)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      formData.primaryGoal === goal
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
              {step === 2 && formData.primaryGoal === '' && (
                <p className="text-xs text-destructive mt-1">
                  Please select your primary fitness goal
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">
                Secondary Goals (select multiple)
              </label>
              <div className="flex flex-wrap gap-2">
                {GOALS.filter((g) => g !== formData.primaryGoal).map((goal) => (
                  <button
                    key={goal}
                    onClick={() => toggleArrayItem('secondaryGoals', goal)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      formData.secondaryGoals.includes(goal)
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Preferred Training Days</label>
              <div className="flex flex-wrap gap-2">
                {TRAINING_DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleArrayItem('preferredTrainingDays', day)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      formData.preferredTrainingDays.includes(day)
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">
                Preferred Session Duration
              </label>
              <div className="flex gap-2">
                {[30, 45, 60, 75, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => updateField('preferredSessionDuration', mins)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      formData.preferredSessionDuration === mins
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Dietary Restrictions</label>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30"
                placeholder="Any dietary restrictions or allergies..."
                value={formData.dietaryRestrictions}
                onChange={(e) => updateField('dietaryRestrictions', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Emergency Contact & Consent */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Phone className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-white/70">
                Emergency contact information is required for safety during training sessions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">
                  Contact Name<span className="text-destructive ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 ${
                    step === 3 && formData.emergencyContactName.trim() === ''
                      ? 'border-destructive'
                      : 'border-white/10'
                  }`}
                  placeholder="Full name..."
                  value={formData.emergencyContactName}
                  onChange={(e) => updateField('emergencyContactName', e.target.value)}
                />
                {step === 3 && formData.emergencyContactName.trim() === '' && (
                  <p className="text-xs text-destructive mt-1">
                    Emergency contact name is required
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">
                  Contact Phone<span className="text-destructive ml-0.5">*</span>
                </label>
                <input
                  type="tel"
                  className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 ${
                    step === 3 &&
                    formData.emergencyContactPhone !== '' &&
                    !isPhoneValid(formData.emergencyContactPhone)
                      ? 'border-destructive'
                      : 'border-white/10'
                  }`}
                  placeholder="(555) 123-4567"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
                />
                {step === 3 && formData.emergencyContactPhone.trim() === '' && (
                  <p className="text-xs text-destructive mt-1">
                    Emergency contact phone is required
                  </p>
                )}
                {step === 3 &&
                  formData.emergencyContactPhone !== '' &&
                  !isPhoneValid(formData.emergencyContactPhone) && (
                    <p className="text-xs text-destructive mt-1">
                      Please enter a valid phone number (at least 10 digits)
                    </p>
                  )}
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">
                Relationship<span className="text-destructive ml-0.5">*</span>
              </label>
              <input
                type="text"
                className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 ${
                  step === 3 && formData.emergencyContactRelation.trim() === ''
                    ? 'border-destructive'
                    : 'border-white/10'
                }`}
                placeholder="e.g., Spouse, Parent, Friend..."
                value={formData.emergencyContactRelation}
                onChange={(e) => updateField('emergencyContactRelation', e.target.value)}
              />
              {step === 3 && formData.emergencyContactRelation.trim() === '' && (
                <p className="text-xs text-destructive mt-1">Relationship is required</p>
              )}
            </div>

            <div
              className={`mt-6 p-4 bg-white/5 border rounded-lg ${
                step === 3 && !formData.consentSigned ? 'border-destructive' : 'border-white/10'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <div
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    formData.consentSigned ? 'bg-green-500 border-green-500' : 'border-white/30'
                  }`}
                  onClick={() => updateField('consentSigned', !formData.consentSigned)}
                >
                  {formData.consentSigned && <Check className="w-3 h-3 text-white" />}
                </div>
                <div onClick={() => updateField('consentSigned', !formData.consentSigned)}>
                  <p className="text-sm text-white/90 font-medium">
                    Informed Consent<span className="text-destructive ml-1">*</span>
                  </p>
                  <p className="text-xs text-white/50 mt-1">
                    I acknowledge that the information provided is accurate. I understand the risks
                    associated with physical activity and consent to participate in an exercise
                    program designed by my trainer.
                  </p>
                </div>
              </label>
              {step === 3 && !formData.consentSigned && (
                <p className="text-xs text-destructive mt-2">
                  You must provide consent to submit the form
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 border-t border-white/10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            Previous
          </Button>

          {step < steps.length - 1 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={!isStepValid(step)}>
              Next
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !isFormValid()}
            >
              {submitMutation.isPending ? 'Saving...' : 'Submit Questionnaire'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
