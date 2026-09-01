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

  // Redirect owner to their event settings
  if (isOwner && typeof window !== 'undefined') {
    const eventType = profile?.eventTypes?.find((e: any) => e.slug === slug);
    if (eventType) {
      router.replace(`/dashboard/events/${eventType.id}/edit`);
    } else {
      router.replace('/dashboard/events');
    }
  }

  // Initialize timezone once on client side
  if (typeof Intl !== 'undefined' && timezone === '') {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }

  const timezones = typeof Intl !== 'undefined' && Intl.supportedValuesOf 
    ? Intl.supportedValuesOf('timeZone') 
    : ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];

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
      const eventType = profile.eventTypes.find((e: any) => e.slug === slug);
      
      const payload: any = {
        hostId: profile.id,
        eventTypeId: eventType.id,
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

  const eventType = profile.eventTypes.find((e: any) => e.slug === slug);
  if (!eventType) {
    return <div className="flex justify-center items-center h-screen">Event type not found</div>;
  }

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row overflow-hidden min-h-[600px]">
        
        {/* Left Column - Event Details */}
        <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50/50 dark:bg-zinc-950/50">
          <Link href={`/book/${profile.username}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors mb-6 text-zinc-500">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="mb-6 flex flex-col items-start gap-4">
            <Avatar className="w-16 h-16 shadow-sm border" style={{ borderColor: profile.brandColor || '#e5e7eb' }}>
              <AvatarImage src={profile.avatar ? `${getApiBaseUrl()}${profile.avatar}` : ''} alt={profile.name} />
              <AvatarFallback>{profile.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-2">{profile.bookingPageTitle || profile.name}</p>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">{eventType.title}</h1>
              
              {eventType.schedulingType === 'ROUND_ROBIN' && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-xs font-semibold mb-4 border border-violet-200 dark:border-violet-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                  Team Event · Round Robin
                </div>
              )}
              {eventType.schedulingType === 'COLLECTIVE' && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold mb-4 border border-blue-200 dark:border-blue-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Team Event · All Hosts
                </div>
              )}
            </div>
            <div className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2 font-medium">
                <Clock className="w-5 h-5" />
                <span>{eventType.duration} min</span>
              </div>
              {eventType.location && (
                <div className="flex items-center gap-2 font-medium">
                  <MapPin className="w-5 h-5" />
                  <span>{eventType.location}</span>
                </div>
              )}
            </div>
          </div>
          {eventType.description && (
            <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap mt-6">
              {eventType.description}
            </p>
          )}
        </div>

        {/* Right Column - Scheduler or Form */}
        <div className="md:w-2/3 p-8 flex flex-col">
          {!selectedTime ? (
            <div className="flex flex-col md:flex-row gap-8 flex-1">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-4">Select a Date & Time</h2>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    triggerHaptic('light');
                    setSelectedDate(date);
                  }}
                  className="rounded-xl border shadow-sm p-3 w-full flex justify-center"
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                />
                <div className="mt-4 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2">
                   <Label className="text-xs text-zinc-500 font-medium whitespace-nowrap mr-3">Time zone</Label>
                   <select 
                     className="bg-transparent border-none text-sm focus:ring-0 w-full outline-none"
                     value={timezone}
                     onChange={(e) => setTimezone(e.target.value)}
                   >
                     {timezones.map(tz => (
                       <option key={tz} value={tz}>{tz}</option>
                     ))}
                   </select>
                </div>
              </div>
              
              {selectedDate && (
                <div className="w-full md:w-64 flex flex-col">
                  <h3 className="text-center font-medium mb-4">
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </h3>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 h-[400px]">
                    {isSlotsLoading ? (
                      <div className="text-center text-zinc-500 py-8">Loading times...</div>
                    ) : availableSlots?.length > 0 ? (
                      availableSlots.map((slot: any, idx: number) => {
                        // The backend returns ISO strings, we parse and format them locally.
                        // Because we parse the UTC ISO string, it displays in the guest's local time automatically!
                        const localDate = parseISO(slot.startTime);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              triggerHaptic('medium');
                              setSelectedTime(slot);
                            }}
                            className="w-full py-3 px-4 rounded-xl border border-primary/30 text-primary font-medium hover:bg-primary hover:text-white hover:border-primary transition-all text-center block flex flex-col items-center justify-center gap-0.5"
                          >
                            <span>{format(localDate, 'h:mm a')}</span>
                            {slot.spotsRemaining !== undefined && eventType.isGroupEvent && (
                              <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                                {slot.spotsRemaining} spots left
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center text-zinc-500 py-8">No times available</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-md">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setSelectedTime(null)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-xl font-bold">Enter Details</h2>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl mb-8 border border-zinc-200 dark:border-zinc-800">
                <p className="font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  {format(parseISO(selectedTime.startTime), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 ml-6 mt-1">
                  {format(parseISO(selectedTime.startTime), 'h:mm a')} - {format(parseISO(selectedTime.endTime), 'h:mm a')}
                </p>
                <p className="text-sm text-zinc-500 ml-6 mt-2">Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
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
  );
}
