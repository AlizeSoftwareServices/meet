'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  Link as LinkIcon, 
  Download, 
  Activity 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';

export default function DashboardPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['analytics', startDate, endDate],
    queryFn: async () => {
      const res = await api.get(`/analytics/dashboard${queryString}`);
      return res.data;
    },
  });

  const { data: bookings, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings/host');
      return res.data;
    },
  });

  const defaultAnalytics = {
    stats: [
      { title: 'Upcoming Meets', value: '0' },
      { title: 'Completed Meets', value: '0' },
      { title: 'Total Contacts', value: '0' },
      { title: 'Total Hours Booked', value: '0' },
    ],
    chartData: [
      { name: 'Mon', bookings: 0 },
      { name: 'Tue', bookings: 0 },
      { name: 'Wed', bookings: 0 },
      { name: 'Thu', bookings: 0 },
      { name: 'Fri', bookings: 0 },
      { name: 'Sat', bookings: 0 },
      { name: 'Sun', bookings: 0 },
    ]
  };

  const displayAnalytics = analytics || defaultAnalytics;
  const displayBookings = Array.isArray(bookings) ? bookings : [];

  const statIcons: Record<string, any> = {
    'Upcoming Meets': CalendarIcon,
    'Completed Meets': Users,
    'Total Contacts': LinkIcon,
    'Total Hours Booked': Clock,
  };

  const statColors: Record<string, string> = {
    'Upcoming Meets': 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'Completed Meets': 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'Total Contacts': 'from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20',
    'Total Hours Booked': 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (isAnalyticsLoading && !analytics) {
    return (
      <div className="space-y-8 pb-10 max-w-7xl mx-auto">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-2xl animate-pulse border border-border/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="border-b border-border/50 pb-6"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
              Welcome back to Meet. Here is an overview of your scheduling activity.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="w-36 h-10"
              />
              <span className="text-muted-foreground">to</span>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="w-36 h-10"
              />
            </div>
            <Button variant="outline" className="gap-2 h-10" onClick={async () => {
              const res = await api.get(`/analytics/export${queryString}`, { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'bookings-export.csv');
              document.body.appendChild(link);
              link.click();
            }}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {displayAnalytics.stats.map((stat: any) => {
          const Icon = statIcons[stat.title] || CalendarIcon;
          const styleClasses = statColors[stat.title] || 'from-primary/20 to-primary/5 text-primary border-primary/20';
          
          return (
            <motion.div key={stat.title} variants={itemVariants} whileHover={{ y: -4 }}>
              <Card className="relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300 border-border bg-card">
                {/* Decorative background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${styleClasses.split(' ').slice(0, 2).join(' ')} opacity-30 group-hover:opacity-70 transition-opacity duration-500`} />
                
                <CardHeader className="relative flex flex-row items-center justify-between pb-2 z-10 px-6 pt-6">
                  <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-xl bg-background shadow-sm border ${styleClasses.split(' ').slice(2).join(' ')} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 px-6 pb-6">
                  <div className="text-4xl font-light tracking-tight mt-1">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-7">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-4"
        >
          <Card className="h-full border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4 px-6 pt-6">
              <div>
                <CardTitle className="text-xl font-medium">Booking Trends</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Activity over the last 7 days</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <Activity className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-6 px-6">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={displayAnalytics.chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        borderRadius: '12px',
                        border: '1px solid hsl(var(--border))',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorBookings)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-3"
        >
          <Card className="h-full flex flex-col border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="border-b border-border/50 pb-4 px-6 pt-6">
              <CardTitle className="text-xl font-medium">Recent Bookings</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Your upcoming schedule</p>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden relative">
              {displayBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center h-[280px]">
                  <CalendarIcon className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-sm text-foreground">No upcoming meetings</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                    Share your booking links to start receiving meeting reservations.
                  </p>
                  <Link href="/dashboard/events">
                    <Button variant="outline" size="sm" className="mt-4 text-xs">
                      View Event Types
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/50 overflow-auto max-h-[350px] p-4">
                  {displayBookings.map((booking: any) => (
                    <motion.div 
                      key={booking.id} 
                      whileHover={{ scale: 1.01, backgroundColor: 'hsl(var(--muted))' }}
                      className="p-4 rounded-xl flex justify-between items-center transition-colors cursor-default my-2 border border-border/50 shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {booking.guestName ? booking.guestName.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{booking.guestName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${booking.status === 'CANCELLED' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                            {booking.eventType?.title || 'Meet'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {new Date(booking.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 bg-muted px-2 py-0.5 rounded-md inline-block">
                          {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
