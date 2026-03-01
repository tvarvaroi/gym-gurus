import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Shield,
  CreditCard,
  Bell,
  AlertTriangle,
  Crown,
  Zap,
  Calendar,
  Users,
  Dumbbell,
  Loader2,
  Camera,
  Scale,
} from 'lucide-react';
import { useRef } from 'react';
// Inline subscription helpers (mirrors server/services/subscription.ts logic)
function isInTrial(user: {
  trialEndsAt?: string | null;
  subscriptionStatus?: string | null;
}): boolean {
  if (!user.trialEndsAt) return false;
  if (user.subscriptionStatus) return false;
  return new Date(user.trialEndsAt) > new Date();
}
function isTrialExpired(user: {
  trialEndsAt?: string | null;
  subscriptionStatus?: string | null;
}): boolean {
  if (!user.trialEndsAt) return false;
  if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') return false;
  return new Date(user.trialEndsAt) <= new Date();
}
function trialDaysRemaining(user: { trialEndsAt?: string | null }): number {
  if (!user.trialEndsAt) return 0;
  const ms = new Date(user.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// Helper to get initials from name
function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return '?';
}

// Default notification preferences
const DEFAULT_PREFS = {
  emailWorkoutReminders: true,
  emailWeeklyReport: true,
  emailNewFeatures: false,
  inAppWorkoutReminders: true,
  inAppAchievements: true,
  inAppSystemUpdates: true,
};

// ─────────────────────────────────────────────
// Body Stats Card
// ─────────────────────────────────────────────
function BodyStatsCard() {
  const { toast } = useToast();
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [weight, setWeight] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [initialized, setInitialized] = useState(false);

  const { data: profile } = useQuery<{
    weightKg?: string | null;
    heightCm?: string | null;
    bodyFatPercentage?: string | null;
  }>({
    queryKey: ['/api/users/fitness-profile'],
    staleTime: 60_000,
  });

  // Populate inputs from fetched profile (runs once)
  useEffect(() => {
    if (!profile || initialized) return;
    if (profile.weightKg) {
      const kg = parseFloat(profile.weightKg);
      setWeight(String(Math.round(kg * 10) / 10));
    }
    if (profile.heightCm) {
      setHeightCm(String(Math.round(parseFloat(profile.heightCm))));
    }
    if (profile.bodyFatPercentage) {
      setBodyFat(String(Math.round(parseFloat(profile.bodyFatPercentage) * 10) / 10));
    }
    setInitialized(true);
  }, [profile, initialized]);

  function switchUnit(newUnit: 'metric' | 'imperial') {
    if (newUnit === unit) return;

    // Convert weight
    const w = parseFloat(weight);
    if (Number.isFinite(w)) {
      setWeight(
        newUnit === 'imperial'
          ? String(Math.round(w * 2.2046 * 10) / 10) // kg → lbs
          : String(Math.round((w / 2.2046) * 10) / 10) // lbs → kg
      );
    }

    // Convert height
    if (newUnit === 'imperial') {
      const cm = parseFloat(heightCm);
      if (Number.isFinite(cm) && cm > 0) {
        const totalIn = cm / 2.54;
        setHeightFt(String(Math.floor(totalIn / 12)));
        setHeightIn(String(Math.round(totalIn % 12)));
      }
      setHeightCm('');
    } else {
      const ft = parseFloat(heightFt) || 0;
      const inches = parseFloat(heightIn) || 0;
      const cm = (ft * 12 + inches) * 2.54;
      if (cm > 0) setHeightCm(String(Math.round(cm)));
      setHeightFt('');
      setHeightIn('');
    }

    setUnit(newUnit);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Convert all values to metric before sending
      let weightKg: number | null = null;
      let heightCmVal: number | null = null;

      const w = parseFloat(weight);
      if (Number.isFinite(w)) {
        weightKg = unit === 'metric' ? w : Math.round((w / 2.2046) * 10) / 10;
      }

      if (unit === 'metric') {
        const cm = parseFloat(heightCm);
        if (Number.isFinite(cm)) heightCmVal = cm;
      } else {
        const ft = parseFloat(heightFt) || 0;
        const inches = parseFloat(heightIn) || 0;
        const cm = (ft * 12 + inches) * 2.54;
        if (cm > 0) heightCmVal = Math.round(cm * 10) / 10;
      }

      const bodyFatVal = bodyFat ? parseFloat(bodyFat) : null;

      const res = await fetch('/api/users/fitness-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weightKg: weightKg != null && Number.isFinite(weightKg) ? weightKg : null,
          heightCm: heightCmVal != null && Number.isFinite(heightCmVal) ? heightCmVal : null,
          bodyFatPercentage: bodyFatVal != null && Number.isFinite(bodyFatVal) ? bodyFatVal : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? 'Failed to save body stats');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Body stats saved', description: 'Your physical stats have been updated.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Body Stats
        </CardTitle>
        <CardDescription>
          Your physical measurements help the AI coach give personalised advice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Unit toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => switchUnit('metric')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              unit === 'metric'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            Metric (kg, cm)
          </button>
          <button
            type="button"
            onClick={() => switchUnit('imperial')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              unit === 'imperial'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            Imperial (lbs, ft/in)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Weight */}
          <div className="space-y-2">
            <Label htmlFor="bodyWeight">Weight ({unit === 'metric' ? 'kg' : 'lbs'})</Label>
            <Input
              id="bodyWeight"
              type="number"
              min="20"
              max={unit === 'metric' ? '300' : '660'}
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={unit === 'metric' ? 'e.g. 75' : 'e.g. 165'}
            />
          </div>

          {/* Height — metric */}
          {unit === 'metric' ? (
            <div className="space-y-2">
              <Label htmlFor="heightCm">Height (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                min="100"
                max="250"
                step="1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="e.g. 175"
              />
            </div>
          ) : (
            /* Height — imperial */
            <div className="space-y-2">
              <Label>Height (ft / in)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="3"
                  max="8"
                  step="1"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  placeholder="5"
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">ft</span>
                <Input
                  type="number"
                  min="0"
                  max="11"
                  step="1"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  placeholder="9"
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">in</span>
              </div>
            </div>
          )}

          {/* Body fat % */}
          <div className="space-y-2">
            <Label htmlFor="bodyFat">
              Body Fat %{' '}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <Input
              id="bodyFat"
              type="number"
              min="3"
              max="60"
              step="0.1"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              placeholder="e.g. 18"
            />
          </div>
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Body Stats
        </Button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Profile Tab
// ─────────────────────────────────────────────
function ProfileTab() {
  const { user, refetchUser } = useUser();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to update profile');
      }
      return res.json();
    },
    onSuccess: () => {
      refetchUser();
      toast({ title: 'Profile updated', description: 'Your name has been saved.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/uploads/image?folder=profiles', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error ?? 'Upload failed');
      }

      const { url } = await uploadRes.json();

      const saveRes = await fetch('/api/settings/profile-image', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to save profile image');
      }

      await refetchUser();
      toast({ title: 'Photo updated', description: 'Your profile photo has been saved.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const initials = getInitials(user?.firstName, user?.lastName, user?.email);

  return (
    <div className="space-y-6">
      <BodyStatsCard />
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your display name. Email changes require support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <label
              className="relative w-20 h-20 rounded-full cursor-pointer group shrink-0"
              title="Click to change photo"
            >
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover"
                  style={{ border: '2px solid hsl(var(--primary) / 0.4)' }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold"
                  style={{
                    background:
                      'linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.15))',
                    border: '2px solid hsl(var(--primary) / 0.4)',
                    color: 'hsl(var(--primary))',
                  }}
                >
                  {uploadingPhoto ? <Loader2 className="w-6 h-6 animate-spin" /> : initials}
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingPhoto ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
                disabled={uploadingPhoto}
              />
            </label>
            <div>
              <p className="font-medium">
                {user?.firstName
                  ? `${user.firstName} ${user.lastName ?? ''}`.trim()
                  : (user?.email ?? '')}
              </p>
              <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Click photo to change</p>
            </div>
          </div>

          <Separator />

          {/* Name fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={user?.email ?? ''}
              readOnly
              className="bg-muted/50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Contact support to change your email address.
            </p>
          </div>

          <Button
            onClick={() =>
              updateProfile.mutate({ firstName: firstName.trim(), lastName: lastName.trim() })
            }
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// Security Tab
// ─────────────────────────────────────────────
function SecurityTab() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePassword = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? 'Failed to change password');
      }
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Password changed', description: 'Your password has been updated.' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Failed to change password',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Minimum 8 characters.',
        variant: 'destructive',
      });
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password. Use a strong, unique password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// Subscription Tab
// ─────────────────────────────────────────────
function SubscriptionTab() {
  const { user } = useUser();
  const { toast } = useToast();

  const { data: stats } = useQuery<{
    clientCount: number;
    workoutCount: number;
    daysSinceJoining: number;
  }>({
    queryKey: ['/api/settings/stats'],
    staleTime: 60_000,
  });

  const openPortal = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/payments/create-portal-session', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to open billing portal');
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const inTrial = user ? isInTrial(user) : false;
  const trialExpired = user ? isTrialExpired(user) : false;
  const daysLeft = user ? trialDaysRemaining(user) : 0;
  const isActive = user?.subscriptionStatus === 'active';

  // Tier display names
  const TIER_NAMES: Record<string, string> = {
    free: 'Free Trial',
    solo: 'Ronin',
    solo_free: 'Ronin Free',
    solo_ai: 'Ronin AI',
    trainer: 'Guru',
    trainer_basic: 'Guru Basic',
    trainer_pro: 'Guru Pro',
    pro: 'Pro Guru',
  };

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isActive ? (
              <Crown className="h-5 w-5 text-primary" />
            ) : (
              <Zap className="h-5 w-5 text-primary" />
            )}
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isActive && user?.subscriptionTier ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  {TIER_NAMES[user.subscriptionTier] ?? user.subscriptionTier}
                </p>
                <p className="text-sm text-muted-foreground">Active subscription</p>
                {user.subscriptionCurrentPeriodEnd && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Renews{' '}
                    {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => openPortal.mutate()}
                disabled={openPortal.isPending}
              >
                {openPortal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Manage Subscription
              </Button>
            </div>
          ) : inTrial ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Free Trial</p>
                <p className="text-sm text-muted-foreground">
                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                </p>
              </div>
              <Button onClick={() => window.location.assign('/pricing')}>Upgrade Now</Button>
            </div>
          ) : trialExpired ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-destructive">Trial Expired</p>
                <p className="text-sm text-muted-foreground">
                  Subscribe to continue using all features
                </p>
              </div>
              <Button onClick={() => window.location.assign('/pricing')}>Subscribe</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">No Active Plan</p>
                <p className="text-sm text-muted-foreground">
                  Choose a plan to unlock all features
                </p>
              </div>
              <Button onClick={() => window.location.assign('/pricing')}>View Plans</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage stats */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-2xl font-semibold">{stats?.daysSinceJoining ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Days with GymGurus</p>
              </div>
            </div>
            {user?.role !== 'client' && (
              <>
                {user?.role === 'trainer' && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                    <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-2xl font-semibold">{stats?.clientCount ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">Active Clients</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                  <Dumbbell className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-2xl font-semibold">{stats?.workoutCount ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">Workout Plans</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// Notifications Tab
// ─────────────────────────────────────────────
function NotificationsTab() {
  const { user, refetchUser } = useUser();
  const { toast } = useToast();

  const saved = (user as any)?.notificationPreferences ?? DEFAULT_PREFS;
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS, ...saved });

  const updateNotifications = useMutation({
    mutationFn: async (notificationPreferences: typeof DEFAULT_PREFS) => {
      const res = await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationPreferences }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to save preferences');
      }
      return res.json();
    },
    onSuccess: () => {
      refetchUser();
      toast({ title: 'Preferences saved', description: 'Notification settings updated.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  function toggle(key: keyof typeof DEFAULT_PREFS) {
    setPrefs((p: typeof DEFAULT_PREFS) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Choose which emails you receive from GymGurus.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              {
                key: 'emailWorkoutReminders',
                label: 'Workout reminders',
                desc: 'Reminders before scheduled sessions',
              },
              {
                key: 'emailWeeklyReport',
                label: 'Weekly progress report',
                desc: 'Your weekly activity summary',
              },
              {
                key: 'emailNewFeatures',
                label: 'New features & announcements',
                desc: 'Product updates from the GymGurus team',
              },
            ] as const
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={prefs[key]} onCheckedChange={() => toggle(key)} aria-label={label} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>In-App Notifications</CardTitle>
          <CardDescription>Control what you see in the notification center.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              {
                key: 'inAppWorkoutReminders',
                label: 'Workout reminders',
                desc: 'Alert before upcoming sessions',
              },
              {
                key: 'inAppAchievements',
                label: 'Achievements & milestones',
                desc: 'Celebrate your progress',
              },
              {
                key: 'inAppSystemUpdates',
                label: 'System updates',
                desc: 'Important platform notifications',
              },
            ] as const
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={prefs[key]} onCheckedChange={() => toggle(key)} aria-label={label} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={() => updateNotifications.mutate(prefs)}
        disabled={updateNotifications.isPending}
      >
        {updateNotifications.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Preferences
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Danger Zone Tab
// ─────────────────────────────────────────────
function DangerZoneTab() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const deleteAccount = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to delete account');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });
      navigate('/');
    },
    onError: (err: Error) => {
      toast({ title: 'Deletion failed', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">Before you delete your account:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>All your client data and workout plans will be inaccessible</li>
              <li>
                Your subscription will not be automatically cancelled — cancel it first in the Plan
                tab
              </li>
              <li>Your personal information will be anonymised in our database</li>
              <li>This cannot be reversed</li>
            </ul>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete My Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This will permanently delete your account. Type{' '}
                  <span className="font-mono font-semibold text-foreground">DELETE MY ACCOUNT</span>{' '}
                  to confirm.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="font-mono"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmText !== 'DELETE MY ACCOUNT' || deleteAccount.isPending}
                  onClick={() => deleteAccount.mutate()}
                >
                  {deleteAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Permanently Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main SettingsPage
// ─────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-['Playfair_Display']">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, security, and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4 hidden sm:block" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-4 w-4 hidden sm:block" />
            Security
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5">
            <CreditCard className="h-4 w-4 hidden sm:block" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4 hidden sm:block" />
            Alerts
          </TabsTrigger>
          <TabsTrigger
            value="danger"
            className="gap-1.5 text-destructive data-[state=active]:text-destructive"
          >
            <AlertTriangle className="h-4 w-4 hidden sm:block" />
            Danger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="subscription">
          <SubscriptionTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="danger">
          <DangerZoneTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
