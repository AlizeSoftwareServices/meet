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
  Activity,
  Video,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  X
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
  const [isExporting, setIsExporting] = useState(false);

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

  // Find next upcoming meeting
  const now = new Date();
  const upcomingMeets = displayBookings
    .filter((b: any) => b.status !== 'CANCELLED' && new Date(b.endTime) >= now)
    .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const nextMeeting = upcomingMeets[0];

  const statIcons: Record<string, any> = {
    'Upcoming Meetings': CalendarIcon,
    'Upcoming Meets': CalendarIcon,
    'Completed Meetings': CheckCircle2,
    'Completed Meets': CheckCircle2,
    'Total Contacts': Users,
    'Total Hours Booked': Clock,
  };

  const statColors: Record<string, string> = {
    'Upcoming Meetings': 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'Upcoming Meets': 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'Completed Meetings': 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'Completed Meets': 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'Total Contacts': 'from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20',
    'Total Hours Booked': 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };

  const statLinks: Record<string, string> = {
    'Upcoming Meetings': '/dashboard/bookings',
    'Upcoming Meets': '/dashboard/bookings',
    'Completed Meetings': '/dashboard/bookings',
    'Completed Meets': '/dashboard/bookings',
    'Total Contacts': '/dashboard/contacts',
    'Total Hours Booked': '/dashboard/analytics',
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
            <h1 className="text-3xl font-heading font-extrabold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
              Welcome back to Meet. Here is an overview of your scheduling activity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto mt-4 md:mt-0">
            {/* Unified Elegant Date Range Box */}
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-2xs">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                title="Filter Start Date"
                className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
              />
              <span className="text-xs text-muted-foreground font-medium">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                title="Filter End Date"
                className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-muted-foreground hover:text-foreground text-xs ml-1 p-0.5 rounded-md hover:bg-muted cursor-pointer"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link href="/dashboard/analytics">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-1.5 h-9 rounded-xl border-border hover:border-blue-500/30 hover:text-blue-600 text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  Analytics
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-1.5 h-9 rounded-xl border-border text-xs font-semibold shadow-2xs cursor-pointer" 
                disabled={isExporting}
                onClick={async () => {
                  try {
                    setIsExporting(true);
                    const res = await api.get(`/analytics/export${queryString}`, { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `bookings-export-${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                  } catch (err) {
                    console.error('Export failed', err);
                    alert('Export failed. Please try again.');
                  } finally {
                    setIsExporting(false);
                  }
                }}
              >
                {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Calendly-style Next Upcoming Meeting / 1-Tap Join Banner */}
      {nextMeeting && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-[1px] shadow-lg shadow-blue-500/10"
        >
          <div className="bg-background/95 backdrop-blur-xl rounded-[15px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-sm">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <Sparkles className="w-3 h-3" />
                    Next Meeting
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(nextMeeting.startTime).toDateString() === now.toDateString() 
                      ? 'Today' 
                      : new Date(nextMeeting.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mt-1">
                  {nextMeeting.guestName} — <span className="font-normal text-muted-foreground">{nextMeeting.eventType?.title || 'Meet Call'}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {new Date(nextMeeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(nextMeeting.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {nextMeeting.guestEmail && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{nextMeeting.guestEmail}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:self-center shrink-0">
              {nextMeeting.meetLink ? (
                <a
                  href={nextMeeting.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button 
                    className="w-full sm:w-auto h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-95 text-xs"
                  >
                    <Video className="w-4 h-4" />
                    Join Call
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </Button>
                </a>
              ) : (
                <Link href="/dashboard/bookings" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-semibold gap-1.5">
                    View in Bookings
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {displayAnalytics.stats.map((stat: any) => {
          const Icon = statIcons[stat.title] || CalendarIcon;
          const styleClasses = statColors[stat.title] || 'from-primary/20 to-primary/5 text-primary border-primary/20';
          const targetLink = statLinks[stat.title] || '/dashboard/bookings';
          
          return (
            <motion.div key={stat.title} variants={itemVariants} whileHover={{ y: -4 }}>
              <Link href={targetLink} className="block group">
                <Card className="relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300 border-border bg-card cursor-pointer">
                  {/* Decorative background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${styleClasses.split(' ').slice(0, 2).join(' ')} opacity-30 group-hover:opacity-70 transition-opacity duration-500`} />
                  
                  <CardHeader className="relative flex flex-row items-center justify-between pb-2 z-10 px-6 pt-6">
                    <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase group-hover:text-foreground transition-colors">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-xl bg-background shadow-sm border ${styleClasses.split(' ').slice(2).join(' ')} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 px-6 pb-6">
                    <div className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-foreground mt-1">{stat.value}</div>
                  </CardContent>
                </Card>
              </Link>
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
                <div className="overflow-y-auto max-h-[340px] p-4 space-y-2.5">
                  {displayBookings.map((booking: any) => (
                    <motion.div 
                      key={booking.id} 
                      whileHover={{ scale: 1.01, backgroundColor: 'hsl(var(--muted)/0.6)' }}
                      className="p-3.5 rounded-2xl flex justify-between items-center transition-all cursor-default bg-card border border-border/70 hover:border-blue-500/30 shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-500/20">
                          {booking.guestName ? booking.guestName.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{booking.guestName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${booking.status === 'CANCELLED' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                            <span className="truncate">{booking.eventType?.title || 'Meet'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-bold text-foreground">
                          {new Date(booking.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5 bg-muted/60 px-2 py-0.5 rounded-lg border border-border/50 inline-block font-mono">
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
