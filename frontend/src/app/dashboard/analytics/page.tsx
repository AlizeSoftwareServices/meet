'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { Activity, Clock, Users, CalendarDays, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await api.get('/analytics/dashboard');
      return res.data;
    },
  });

  const getIconForTitle = (title: string) => {
    if (title.includes('Upcoming')) return <CalendarDays className="w-5 h-5 text-blue-500" />;
    if (title.includes('Completed')) return <Activity className="w-5 h-5 text-emerald-500" />;
    if (title.includes('Contacts')) return <Users className="w-5 h-5 text-purple-500" />;
    if (title.includes('Hours')) return <Clock className="w-5 h-5 text-amber-500" />;
    return <TrendingUp className="w-5 h-5 text-primary" />;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
          Analytics Overview
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Track your booking volume, engagement, and meeting stats.</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse bg-muted/50 border-border/50 h-32" />
          ))
        ) : (
          analytics?.stats.map((stat: any, index: number) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div className="w-10 h-10 rounded-full bg-background border border-border/50 flex items-center justify-center shadow-sm">
                      {getIconForTitle(stat.title)}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-bold tracking-tight">{stat.value}</h2>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <motion.div 
          className="lg:col-span-2"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Bookings Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] bg-muted/50 rounded-xl animate-pulse" />
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="bookings" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorBookings)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Secondary Info / Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-md h-full">
            <CardHeader>
              <CardTitle className="text-xl">Insights</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Growth Trend</h4>
                      <p className="text-sm text-muted-foreground">Your booking volume is steady over the last 7 days. Keep sharing your links!</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/10 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">CRM Engagements</h4>
                      <p className="text-sm text-muted-foreground">You have {analytics?.stats.find((s:any) => s.title.includes('Contacts'))?.value} unique contacts in your CRM. Re-engage with past guests to drive more meetings.</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
