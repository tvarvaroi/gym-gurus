import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CreditCard, Plus, DollarSign, TrendingUp, ArrowUpRight,
  ArrowDownRight, Package, Users, Calendar, MoreVertical, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/AnimationComponents';
import { QueryErrorState } from '@/components/query-states/QueryErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PaymentPlan {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number;
  currency: string;
  billingInterval: string;
  sessionCount: number | null;
  isActive: boolean;
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  clientId: string;
  clientName: string;
  planName: string | null;
  amountInCents: number;
  currency: string;
  status: string;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface PaymentSummary {
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  totalRevenue: number;
  changePercent: number;
  totalPayments: number;
  monthlyRevenue: { month: string; revenue: number }[];
  outstandingAmount: number;
}

export default function PaymentsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', description: '', price: '', interval: 'monthly', sessions: '' });
  const [newPayment, setNewPayment] = useState({ clientId: '', amount: '', description: '' });

  const { data: plans = [], isLoading: plansLoading, error: plansError } = useQuery<PaymentPlan[]>({
    queryKey: ['/api/payments/plans'],
  });

  const { data: paymentHistory = [], isLoading: paymentsLoading } = useQuery<PaymentRecord[]>({
    queryKey: ['/api/payments'],
  });

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery<PaymentSummary>({
    queryKey: ['/api/payments/summary'],
  });

  const isLoading = plansLoading || paymentsLoading || summaryLoading;

  const { data: clientsList = [] } = useQuery<any[]>({
    queryKey: [`/api/clients/${user?.id}`],
    enabled: !!user?.id,
  });

  const createPlanMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/payments/plans', {
      name: newPlan.name,
      description: newPlan.description || null,
      priceInCents: Math.round(parseFloat(newPlan.price) * 100),
      billingInterval: newPlan.interval,
      sessionCount: newPlan.sessions ? parseInt(newPlan.sessions) : null,
    }),
    onSuccess: () => {
      toast({ title: 'Plan Created', description: 'Payment plan has been created.' });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/plans'] });
      setShowPlanModal(false);
      setNewPlan({ name: '', description: '', price: '', interval: 'monthly', sessions: '' });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error Creating Plan",
        description: error.message || "Failed to create payment plan"
      });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/payments/record', {
      clientId: newPayment.clientId,
      amountInCents: Math.round(parseFloat(newPayment.amount) * 100),
      description: newPayment.description || null,
    }),
    onSuccess: () => {
      toast({ title: 'Payment Recorded', description: 'Payment has been recorded.' });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/summary'] });
      setShowRecordModal(false);
      setNewPayment({ clientId: '', amount: '', description: '' });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error Recording Payment",
        description: error.message || "Failed to record payment"
      });
    },
  });

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (plansError || summaryError) {
    return (
      <PageTransition>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <QueryErrorState
            error={plansError || summaryError}
            title="Failed to load payments"
            onRetry={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
              queryClient.invalidateQueries({ queryKey: ['/api/payments/plans'] });
              queryClient.invalidateQueries({ queryKey: ['/api/payments/summary'] });
            }}
          />
        </div>
      </PageTransition>
    );
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="glass">
                <CardContent className="pt-6 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
            <Card className="glass"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Payments</h1>
            <p className="text-sm text-white/60">Manage billing, plans, and payment history</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRecordModal(true)}>
              <DollarSign className="w-4 h-4 mr-1" />
              Record Payment
            </Button>
            <Button size="sm" onClick={() => setShowPlanModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              New Plan
            </Button>
          </div>
        </div>

        {/* Revenue Summary Cards */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StaggerItem>
            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wide">This Month</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {formatCurrency(summary?.thisMonthRevenue || 0)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${(summary?.changePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(summary?.changePercent || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(summary?.changePercent || 0)}%
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="glass">
              <CardContent className="pt-6">
                <p className="text-xs text-white/50 uppercase tracking-wide">Total Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(summary?.totalRevenue || 0)}</p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="glass">
              <CardContent className="pt-6">
                <p className="text-xs text-white/50 uppercase tracking-wide">Outstanding</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{formatCurrency(summary?.outstandingAmount || 0)}</p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="glass">
              <CardContent className="pt-6">
                <p className="text-xs text-white/50 uppercase tracking-wide">Total Payments</p>
                <p className="text-2xl font-bold text-white mt-1">{summary?.totalPayments || 0}</p>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* Revenue Chart */}
        {summary?.monthlyRevenue && summary.monthlyRevenue.length > 0 && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="rgba(212, 175, 55, 0.8)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Plans */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Payment Plans
              </CardTitle>
              <CardDescription>Your pricing packages for clients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {plans.length === 0 ? (
                <div className="text-center py-6">
                  <Package className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">No plans yet</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowPlanModal(true)}>
                    Create First Plan
                  </Button>
                </div>
              ) : (
                plans.filter(p => p.isActive).map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <p className="text-sm font-medium text-white/90">{plan.name}</p>
                      <p className="text-xs text-white/50">{plan.description || plan.billingInterval}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">${(plan.priceInCents / 100).toFixed(2)}</p>
                      <p className="text-[10px] text-white/40">/{plan.billingInterval === 'one_time' ? 'once' : plan.billingInterval.replace('ly', '')}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Recent Payments
              </CardTitle>
              <CardDescription>Latest payment transactions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentHistory.length === 0 ? (
                <div className="text-center py-6">
                  <CreditCard className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">No payments recorded yet</p>
                </div>
              ) : (
                paymentHistory.slice(0, 8).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        payment.status === 'completed' ? 'bg-green-400' :
                        payment.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                      <div>
                        <p className="text-sm text-white/90">{payment.clientName || 'Unknown Client'}</p>
                        <p className="text-xs text-white/40">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'Pending'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">${(payment.amountInCents / 100).toFixed(2)}</p>
                      <Badge variant="outline" className="text-[10px]">{payment.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create Plan Modal */}
        <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
          <DialogContent className="glass-strong border-border/50">
            <DialogHeader>
              <DialogTitle>Create Payment Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Plan Name<span className="text-destructive ml-0.5">*</span></label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90"
                  placeholder="e.g., Monthly Training Package"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Description</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90"
                  placeholder="Brief description..."
                  value={newPlan.description}
                  onChange={(e) => setNewPlan(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Price ($)<span className="text-destructive ml-0.5">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90"
                    placeholder="0.00"
                    value={newPlan.price}
                    onChange={(e) => setNewPlan(p => ({ ...p, price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Billing Interval<span className="text-destructive ml-0.5">*</span></label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90"
                    value={newPlan.interval}
                    onChange={(e) => setNewPlan(p => ({ ...p, interval: e.target.value }))}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="one_time">One-Time</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Sessions Included (optional)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90"
                  placeholder="Leave empty for unlimited"
                  value={newPlan.sessions}
                  onChange={(e) => setNewPlan(p => ({ ...p, sessions: e.target.value }))}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createPlanMutation.mutate()}
                disabled={
                  !newPlan.name ||
                  !newPlan.price ||
                  isNaN(parseFloat(newPlan.price)) ||
                  parseFloat(newPlan.price) <= 0 ||
                  createPlanMutation.isPending
                }
              >
                {createPlanMutation.isPending ? 'Creating...' : 'Create Plan'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Record Payment Modal */}
        <Dialog open={showRecordModal} onOpenChange={setShowRecordModal}>
          <DialogContent className="glass-strong border-border/50">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Client<span className="text-destructive ml-0.5">*</span></label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90"
                  value={newPayment.clientId}
                  onChange={(e) => setNewPayment(p => ({ ...p, clientId: e.target.value }))}
                >
                  <option value="">Select client...</option>
                  {clientsList.map((client: any) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Amount ($)<span className="text-destructive ml-0.5">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90"
                  placeholder="0.00"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Description</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90"
                  placeholder="Payment for..."
                  value={newPayment.description}
                  onChange={(e) => setNewPayment(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => recordPaymentMutation.mutate()}
                disabled={
                  !newPayment.clientId ||
                  !newPayment.amount ||
                  isNaN(parseFloat(newPayment.amount)) ||
                  parseFloat(newPayment.amount) <= 0 ||
                  recordPaymentMutation.isPending
                }
              >
                {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
