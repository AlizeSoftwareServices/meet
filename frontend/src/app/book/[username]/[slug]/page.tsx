'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function SchedulingPage({ params }: { params: { username: string, slug: string } }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<{ startTime: string, endTime: string } | null>(null);
  
  // Guest details state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Fetch host and event profile
  const { data: profile, isLoading: isProfileLoading, error } = useQuery({
    queryKey: ['public-profile', params.username],
    queryFn: async () => {
      const res = await api.get(`/public/users/${params.username}`);
      return res.data;
    },
    retry: false
  });

  // Fetch availability for the selected date
  const { data: availableSlots, isLoading: isSlotsLoading } = useQuery({
    queryKey: ['public-slots', params.username, params.slug, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      // Intentionally passing guest's local timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await api.get(`/public/availability/${params.username}/${params.slug}/slots?date=${dateStr}&timezone=${timezone}`);
      return res.data;
    },
    enabled: !!selectedDate && !!profile,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !selectedTime) return;
      const eventType = profile.eventTypes.find((e: any) => e.slug === params.slug);
      
      const payload = {
        hostId: profile.id,
        eventTypeId: eventType.id,
        guestName,
        guestEmail,
        guestNotes,
        startTime: selectedTime.startTime,
        endTime: selectedTime.endTime,
      };
      
      const res = await api.post('/public/bookings', payload);
      return res.data;
    },
    onSuccess: () => {
      setBookingConfirmed(true);
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

  const eventType = profile.eventTypes.find((e: any) => e.slug === params.slug);
  if (!eventType) {
    return <div className="flex justify-center items-center h-screen">Event type not found</div>;
  }

  if (bookingConfirmed) {
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
          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-500 mb-2">{profile.name}</p>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">{eventType.title}</h1>
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
                  onSelect={setSelectedDate}
                  className="rounded-xl border shadow-sm p-3 w-full flex justify-center"
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                />
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
                            onClick={() => setSelectedTime(slot)}
                            className="w-full py-3.5 px-4 rounded-xl border border-primary/30 text-primary font-medium hover:bg-primary hover:text-white hover:border-primary transition-all text-center block"
                          >
                            {format(localDate, 'h:mm a')}
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
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea 
                    value={guestNotes} 
                    onChange={e => setGuestNotes(e.target.value)} 
                    placeholder="Please share anything that will help prepare for our meeting." 
                    className="p-4 min-h-[120px]"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base rounded-xl font-semibold"
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
