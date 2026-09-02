'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, getApiBaseUrl } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { triggerHaptic } from '@/lib/haptics';
import { useRouter, useParams } from 'next/navigation';

export default function SchedulingPage() {
  const router = useRouter();
  const params = useParams();
  const rawUsername = params?.username as string;
  const username = typeof rawUsername === 'string' ? decodeURIComponent(rawUsername) : 'me';
  const rawSlug = params?.slug as string;
  const slug = typeof rawSlug === 'string' ? decodeURIComponent(rawSlug) : '';

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<{ startTime: string, endTime: string } | null>(null);
  const [timezone, setTimezone] = useState<string>('');

  // Guest details state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('WEEKLY');
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringCount, setRecurringCount] = useState(2);
  
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Check if current visitor is the logged-in owner
  const { data: myProfile } = useQuery({
    queryKey: ['my-auth-profile'],
    queryFn: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return null;
      try {
        const res = await api.get('/profile');
        return res.data;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  // Fetch host and event profile
  const { data: profile, isLoading: isProfileLoading, error } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const res = await api.get(`/public/users/${username}`);
      return res.data;
    },
    enabled: !!username,
    retry: false
  });

  const isOwner = myProfile && (myProfile.username === username || (username === 'me' && myProfile));

  // Initialize timezone once on client side
  if (typeof Intl !== 'undefined' && timezone === '') {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }

  const timezones = typeof Intl !== 'undefined' && Intl.supportedValuesOf 
    ? Intl.supportedValuesOf('timeZone') 
    : ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];

  // Fetch month-level available dates
  const monthStr = format(currentMonth, 'yyyy-MM');
  const { data: availableDates = [], isLoading: isMonthLoading } = useQuery({
    queryKey: ['public-month-availability', username, slug, monthStr, timezone],
    queryFn: async () => {
      const res = await api.get(`/public/availability/${username}/${slug}/month?month=${monthStr}&timezone=${timezone || 'UTC'}`);
      return (res.data || []) as string[];
    },
    enabled: !!profile && !!timezone && !!slug,
  });

  const availableDatesSet = new Set(availableDates);

  // Fetch availability for the selected date
  const { data: availableSlots, isLoading: isSlotsLoading } = useQuery({
    queryKey: ['public-slots', username, slug, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null, timezone],
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await api.get(`/public/availability/${username}/${slug}/slots?date=${dateStr}&timezone=${timezone || 'UTC'}`);
      return res.data;
    },
    enabled: !!selectedDate && !!profile && !!timezone && !!slug,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !selectedTime) return;
      const matchedEvent = profile?.eventTypes?.find((e: any) => e.slug === slug);
      
      const payload: any = {
        hostId: profile.id,
        eventTypeId: matchedEvent?.id,
        guestName,
        guestEmail,
        guestNotes,
        startTime: selectedTime.startTime,
        endTime: selectedTime.endTime,
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value }))
      };
      
      if (isRecurring) {
        payload.recurrence = {
          frequency: recurringFrequency,
          interval: recurringInterval,
          count: recurringCount
        };
      }

      
      try {
        const res = await api.post('/public/bookings', payload);
        return res.data;
      } catch (err: any) {
        if (err.response && err.response.data && err.response.data.message) {
          throw new Error(err.response.data.message);
        }
        throw new Error('An error occurred while booking the meeting.');
      }
    },
    onSuccess: (data) => {
      triggerHaptic('success');
      if (data && data.confirmationToken) {
        // Redirect to dedicated confirmation page securely
        router.push(`/booking/confirmed?token=${data.confirmationToken}`);
      } else if (data && data.booking) {
        setBookingResult(data.booking);
      } else {
        setBookingResult(true);
      }
      setBookingError(null);
    },
    onError: (error: any) => {
      triggerHaptic('error');
      setBookingError(error.message);
    }
  });

  if (isProfileLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <h1 className="text-2xl font-bold">Event Not Found</h1>
      </div>
    );
  }

  const matchedEvent = profile?.eventTypes?.find((e: any) => e.slug === slug);
  const eventType = matchedEvent || {
    id: undefined,
    title: '30 Min Meeting',
    slug: slug || '30min',
    duration: 30,
    description: '30 minute 1-on-1 meeting',
    location: 'Google Meet',
    color: '#00a2ff',
    customQuestions: []
  };

  if (bookingResult) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
         <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">You are scheduled</h2>
            <p className="text-zinc-500 mb-6">A calendar invitation has been sent to your email address.</p>
            <div className="text-left border-t border-zinc-100 dark:border-zinc-800 pt-6">
              <h3 className="font-semibold">{eventType.title}</h3>
              <p className="text-zinc-500 mt-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {selectedTime && format(parseISO(selectedTime.startTime), 'EEEE, MMMM d, yyyy h:mm a')}
              </p>
              
              {bookingResult.meetingLink && (
                <div className="mt-6 p-4 bg-brand-blue/5 border border-brand-blue/20 rounded-xl">
                  <h4 className="font-bold text-sm text-brand-blue mb-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {bookingResult.meetingProvider}
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 break-all mb-3">
                    {bookingResult.meetingLink}
                  </p>
                  <a 
                    href={bookingResult.meetingLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full bg-brand-blue text-white rounded-lg py-2 font-medium text-sm hover:bg-brand-blue/90 transition-colors"
                  >
                    Join Meeting
                  </a>
                </div>
              )}
              {bookingResult.type === 'SERIES' && (
                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl text-left">
                  <h4 className="font-bold text-sm text-purple-700 mb-2">Recurring Series Summary</h4>
                  <ul className="text-sm space-y-1 text-purple-900">
                    <li>Requested occurrences: {bookingResult.requestedCount}</li>
                    <li>Successfully booked: {bookingResult.bookedCount}</li>
                    {bookingResult.skippedCount > 0 && (
                      <li className="text-red-600 font-medium">Skipped (unavailable): {bookingResult.skippedCount}</li>
                    )}
                  </ul>
                  {bookingResult.skippedCount > 0 && (
                    <div className="mt-3 text-xs text-red-600">
                      The skipped occurrences conflicted with the host's schedule or calendar.
                    </div>
                  )}
                </div>
              )}
            </div>
         </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100/60 to-violet-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-center py-8 px-3 sm:px-6 lg:px-8">
      {isOwner && (
        <div className="max-w-6xl w-full mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 backdrop-blur-md shadow-xs">
          <span className="font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            You are viewing your public booking page in preview mode.
          </span>
          {eventType && (
            <Link href={`/dashboard/events/${eventType.id}/edit`} className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100 transition-colors">
              Edit Event Type Settings
            </Link>
          )}
        </div>
      )}
      
      {/* Outer Card Wrapper with Subtle Gradient Border */}
      <div className="max-w-6xl xl:max-w-7xl w-full p-[1px] rounded-3xl bg-gradient-to-r from-violet-500/20 via-blue-500/20 to-purple-500/20 shadow-2xl shadow-violet-500/5">
        <div className="w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[23px] flex flex-col md:flex-row overflow-hidden min-h-[580px] md:h-[620px] transition-all">
          
          {/* Left Column - Event Details & Host Info */}
          <div className="md:w-5/12 lg:w-4/12 border-b md:border-b-0 md:border-r border-zinc-200/80 dark:border-zinc-800/80 p-6 lg:p-8 bg-zinc-50/60 dark:bg-zinc-950/40 flex flex-col justify-between">
            <div>
              <Link href={`/book/${profile.username}`} className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all mb-6 text-zinc-600 dark:text-zinc-300 shadow-xs">
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <div className="flex flex-col items-start gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 shadow-md border-2 border-white dark:border-zinc-800 ring-2 ring-violet-500/30">
                    <AvatarImage src={profile.avatar ? `${getApiBaseUrl()}${profile.avatar}` : ''} alt={profile.name} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-xl">
                      {profile.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 shadow-xs" title="Verified Host"></span>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">
                    {profile.bookingPageTitle || profile.name}
                  </p>
                  <h1 className="text-2xl lg:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight mb-2">
                    {eventType.title}
                  </h1>
                  
                  {eventType.schedulingType === 'ROUND_ROBIN' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-xs font-bold mb-3 border border-violet-200 dark:border-violet-800/50 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping"></span>
                      Team Event · Round Robin
                    </div>
                  )}
                  {eventType.schedulingType === 'COLLECTIVE' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold mb-3 border border-blue-200 dark:border-blue-800/50 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                      Team Event · All Hosts
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 text-zinc-700 dark:text-zinc-300 w-full pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span>{eventType.duration} Minutes</span>
                  </div>
                  
                  {eventType.location && (
                    <div className="flex items-center gap-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span>{eventType.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {eventType.description && (
                <div className="mt-5 p-3.5 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {eventType.description}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
              <span>Powered by <strong className="text-zinc-600 dark:text-zinc-300">Meet</strong></span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Encrypted</span>
            </div>
          </div>

          {/* Right Column - Calendar & Inner Scrollable Time Slots */}
          <div className="md:w-7/12 lg:w-8/12 p-6 lg:p-8 flex flex-col justify-between overflow-hidden">
            {!selectedTime ? (
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 flex-1 items-start h-full">
                {/* Calendar Column */}
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg lg:text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                      Select a Date & Time
                    </h2>
                    {isMonthLoading && (
                      <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-950/60 px-2.5 py-1 rounded-full border border-violet-200 dark:border-violet-800/50">
                        <span className="w-3 h-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></span>
                        Checking dates...
                      </div>
                    )}
                  </div>

                  <div className="relative bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-2 shadow-xs">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      month={currentMonth}
                      onMonthChange={(month) => {
                        setCurrentMonth(month);
                        setSelectedDate(undefined);
                      }}
                      onSelect={(date) => {
                        if (!date) return;
                        const dateStr = format(date, 'yyyy-MM-dd');
                        if (availableDatesSet.has(dateStr)) {
                          triggerHaptic('light');
                          setSelectedDate(date);
                        }
                      }}
                      className="w-full flex justify-center"
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date < today) return true;
                        const dateStr = format(date, 'yyyy-MM-dd');
                        return !isMonthLoading && !availableDatesSet.has(dateStr);
                      }}
                      modifiers={{
                        available: (date) => availableDatesSet.has(format(date, 'yyyy-MM-dd')),
                      }}
                      modifiersClassNames={{
                        available: 'font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60 ring-2 ring-violet-500/30',
                      }}
                    />
                  </div>

                  {!isMonthLoading && availableDates.length === 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs text-center font-medium">
                      No available dates found for this month. Try changing the month or timezone.
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold whitespace-nowrap">
                      <Globe className="w-3.5 h-3.5 text-violet-600" />
                      <span>Time zone</span>
                    </div>
                    <select 
                      className="bg-transparent border-none text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:ring-0 outline-none cursor-pointer max-w-[200px] truncate"
                      value={timezone}
                      onChange={(e) => {
                        setTimezone(e.target.value);
                        setSelectedDate(undefined);
                      }}
                    >
                      {timezones.map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Time Slots Column (FIXED HEIGHT CONTAINER - SCROLLS INSIDE WITHOUT EXPANDING PAGE) */}
                {selectedDate && (
                  <div className="w-full lg:w-64 flex flex-col h-full max-h-[480px]">
                    <div className="text-center font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center justify-center gap-2 text-xs bg-zinc-100 dark:bg-zinc-800/60 py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-xs">
                      <span>{format(selectedDate, 'EEEE, MMMM d')}</span>
                    </div>

                    {/* Inner Scroll Container for Time Slots */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[400px] scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                      {isSlotsLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
                          <span className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></span>
                          <span className="text-xs font-semibold">Loading available times...</span>
                        </div>
                      ) : availableSlots?.length > 0 ? (
                        availableSlots.map((slot: any, idx: number) => {
                          const localDate = parseISO(slot.startTime);
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                triggerHaptic('medium');
                                setSelectedTime(slot);
                              }}
                              className="w-full py-2.5 px-4 rounded-xl border border-violet-500/30 text-violet-700 dark:text-violet-300 font-bold bg-violet-50/50 dark:bg-violet-950/30 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 dark:hover:text-white hover:border-violet-600 transition-all text-center flex flex-col items-center justify-center gap-0.5 shadow-xs group cursor-pointer"
                            >
                              <span className="text-sm font-semibold tracking-tight">{format(localDate, 'h:mm a')}</span>
                              {slot.spotsRemaining !== undefined && eventType.isGroupEvent && (
                                <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider text-violet-600 group-hover:text-white">
                                  {slot.spotsRemaining} spots left
                                </span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-6 text-center text-zinc-500 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                          No slots available for this date.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Booking Details Form */
              <div className="max-w-lg w-full">
                <div className="flex items-center gap-4 mb-6">
                  <button 
                    onClick={() => setSelectedTime(null)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 shadow-xs"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">Enter Your Details</h2>
                </div>

                <div className="bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-transparent p-4 rounded-2xl mb-6 border border-violet-500/20">
                  <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-violet-600" />
                    {format(parseISO(selectedTime.startTime), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 ml-6 mt-1">
                    {format(parseISO(selectedTime.startTime), 'h:mm a')} – {format(parseISO(selectedTime.endTime), 'h:mm a')}
                  </p>
                  <p className="text-[11px] text-zinc-500 ml-6 mt-1">Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                </div>

              <form 
                onSubmit={(e: React.FormEvent) => { e.preventDefault(); bookMutation.mutate(); }}
                className="space-y-6"
              >
                {eventType.allowRecurring && (
                  <div className="p-5 border border-purple-200 bg-purple-50 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold text-purple-900">Recurring Meeting</Label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-sm font-medium text-purple-700">Enable</span>
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => setIsRecurring(e.target.checked)}
                          className="w-5 h-5 rounded text-purple-600 border-purple-300 focus:ring-purple-500"
                        />
                      </label>
                    </div>
                    {isRecurring && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-purple-200">
                        <div className="space-y-2">
                          <Label className="text-purple-800 text-xs">Frequency</Label>
                          <select 
                            value={recurringFrequency}
                            onChange={(e) => setRecurringFrequency(e.target.value)}
                            className="w-full rounded-lg border-purple-200 bg-white p-2.5 text-sm"
                          >
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-purple-800 text-xs">Repeat every</Label>
                          <select 
                            value={recurringInterval}
                            onChange={(e) => setRecurringInterval(Number(e.target.value))}
                            className="w-full rounded-lg border-purple-200 bg-white p-2.5 text-sm"
                          >
                            {[1, 2, 3, 4, 5, 6].map(i => (
                              <option key={i} value={i}>{i} {recurringFrequency === 'DAILY' ? 'days' : recurringFrequency === 'WEEKLY' ? 'weeks' : 'months'}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-purple-800 text-xs">Total Occurrences</Label>
                          <select 
                            value={recurringCount}
                            onChange={(e) => setRecurringCount(Number(e.target.value))}
                            className="w-full rounded-lg border-purple-200 bg-white p-2.5 text-sm"
                          >
                            {Array.from({ length: Math.min(24, eventType.recurringMaxOccurrences || 10) - 1 }).map((_, i) => (
                              <option key={i+2} value={i+2}>{i+2}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  {bookingError && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 mb-6 font-medium text-sm flex items-start gap-2">
                      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {bookingError}
                    </div>
                  )}
                  <Label>Name *</Label>
                  <Input 
                    required 
                    value={guestName} 
                    onChange={e => setGuestName(e.target.value)} 
                    placeholder="Jane Doe" 
                    className="p-6 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input 
                    required 
                    type="email" 
                    value={guestEmail} 
                    onChange={e => setGuestEmail(e.target.value)} 
                    placeholder="jane@example.com" 
                    className="p-6 text-base"
                  />
                </div>
                
                {eventType.customQuestions?.map((q: any) => (
                  <div key={q.id} className="space-y-2">
                    <Label>{q.label} {q.required && '*'}</Label>
                    {q.type === 'TEXT' || q.type === 'PHONE' || q.type === 'NUMBER' ? (
                      <Input 
                        required={q.required}
                        type={q.type === 'NUMBER' ? 'number' : q.type === 'PHONE' ? 'tel' : 'text'}
                        placeholder={q.placeholder || ''}
                        value={answers[q.id] || ''}
                        onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="p-6 text-base"
                      />
                    ) : q.type === 'LONG_TEXT' ? (
                      <Textarea 
                        required={q.required}
                        placeholder={q.placeholder || ''}
                        value={answers[q.id] || ''}
                        onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="p-4 min-h-[120px]"
                      />
                    ) : q.type === 'DROPDOWN' ? (
                      <select
                        required={q.required}
                        value={answers[q.id] || ''}
                        onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full flex h-12 rounded-xl border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="" disabled>{q.placeholder || 'Select an option'}</option>
                        {q.options?.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : q.type === 'MULTIPLE_CHOICE' ? (
                      <div className="space-y-2">
                        {q.options?.map((opt: string) => (
                          <label key={opt} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              required={q.required}
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : q.type === 'CHECKBOX' ? (
                       <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          required={q.required}
                          checked={answers[q.id] === 'true'}
                          onChange={e => setAnswers({ ...answers, [q.id]: e.target.checked ? 'true' : 'false' })}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm">{q.placeholder || q.label}</span>
                      </label>
                    ) : null}
                  </div>
                ))}

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea 
                    value={guestNotes} 
                    onChange={e => setGuestNotes(e.target.value)} 
                    placeholder="Please share anything that will help prepare for our Meet." 
                    className="p-4 min-h-[120px]"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base rounded-xl font-semibold"
                  style={{ backgroundColor: profile.brandColor || undefined, color: profile.brandColor ? '#fff' : undefined }}
                  disabled={bookMutation.isPending}
                >
                  {bookMutation.isPending ? 'Scheduling...' : 'Schedule Event'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
}
