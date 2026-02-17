import { memo } from 'react';
import { Users, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AreaChart, BarChart, LineChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardChartsProps {
  chartData: any;
  onNavigate: (path: string) => void;
}

const DashboardCharts = memo(({ chartData, onNavigate }: DashboardChartsProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Client Weight Progress */}
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-light">Client Progress</CardTitle>
        <CardDescription className="text-xs">Average weight trend</CardDescription>
      </CardHeader>
      <CardContent>
        {(chartData?.weightProgressData?.length || 0) > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData.weightProgressData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [`${value} lbs`, 'Weight']}
                />
                <Area type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} fill="url(#colorWeight)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Progress</span>
              {(() => {
                const data = chartData.weightProgressData;
                const diff = data.length >= 2 ? data[data.length - 1].weight - data[0].weight : 0;
                return (
                  <Badge variant="secondary" className={`${diff <= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'} border-none`}>
                    {diff <= 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                    {diff <= 0 ? '' : '+'}{diff} lbs
                  </Badge>
                );
              })()}
            </div>
          </>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center space-y-2">
            <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Log client weight progress to see trends</p>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate('/clients')}>
              Go to Clients
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Weekly Sessions */}
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-light">Weekly Sessions</CardTitle>
        <CardDescription className="text-xs">Scheduled vs completed</CardDescription>
      </CardHeader>
      <CardContent>
        {(chartData?.sessionsData?.length || 0) > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData.sessionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(value) => value === 'sessions' ? 'Scheduled' : 'Completed'} />
                <Bar dataKey="sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion Rate</span>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none">
                {chartData?.completionRate || 0}%
              </Badge>
            </div>
          </>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center space-y-2">
            <Calendar className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Schedule sessions to see weekly trends</p>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate('/schedule')}>
              Go to Schedule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Client Growth - Spans 2 columns for better visibility */}
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-light">Client Growth</CardTitle>
        <CardDescription className="text-xs">Cumulative clients by month</CardDescription>
      </CardHeader>
      <CardContent>
        {(chartData?.clientGrowthData?.length || 0) > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData.clientGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} domain={[0, 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [`${value}`, 'Clients']}
                />
                <Line type="monotone" dataKey="clients" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Growth Rate</span>
              {(() => {
                const data = chartData.clientGrowthData;
                const first = data.length >= 2 ? data[0].clients : 0;
                const last = data.length >= 2 ? data[data.length - 1].clients : 0;
                const growthRate = first > 0 ? Math.round(((last - first) / first) * 100) : (last > 0 ? 100 : 0);
                return (
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-none">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {growthRate >= 0 ? '+' : ''}{growthRate}%
                  </Badge>
                );
              })()}
            </div>
          </>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center space-y-2">
            <Users className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Add clients to see growth trends</p>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate('/clients')}>
              Go to Clients
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
));

DashboardCharts.displayName = 'DashboardCharts';

export default DashboardCharts;
