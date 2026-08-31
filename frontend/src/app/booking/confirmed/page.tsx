'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Clock, MapPin, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Confirmation token is missing');
      setIsLoading(false);
      return;
    }

    api.get(`/bookings/public/confirmation?token=${token}`)
      .then(res => {
        setData(res.data);
        if (res.data.redirectUrl) {
          // Add a small delay before redirecting to allow user to see they booked successfully?
          // The calendly standard is usually immediate or short delay.
          setTimeout(() => {
            window.location.href = res.data.redirectUrl;
          }, 3000);
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load booking details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mb-4"></div>
        <p className="text-zinc-500">Loading your confirmation...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Unavailable</h1>
        <p className="text-zinc-500 max-w-md">{error || 'Could not load confirmation details.'}</p>
      </div>
    );
  }

  const isCancelled = data.status === 'CANCELLED';

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-12">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 md:p-12 text-center">
        {isCancelled ? (
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        ) : (
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        )}
        
        <h1 className="text-3xl font-bold mb-2">
          {isCancelled ? 'Booking Cancelled' : 'You are scheduled'}
        </h1>
        
        {!isCancelled && (
          <p className="text-zinc-500 text-lg mb-8">
            A calendar invitation has been sent to your email address.
            {data.redirectUrl && <span className="block mt-2 text-brand-blue">Redirecting you shortly...</span>}
          </p>
        )}

        {data.confirmationMessage && (
          <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl text-left border border-blue-100 dark:border-blue-800/30">
            <p className="whitespace-pre-wrap">{data.confirmationMessage}</p>
          </div>
        )}

        <div className="text-left border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-950/50">
          <h2 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">
            {data.eventTitle} <span className="text-zinc-400 font-normal">with</span> {data.hostName}
          </h2>
          
          <div className="space-y-4 text-zinc-600 dark:text-zinc-300">
            <div className="flex items-start gap-3">
              <CalendarIcon className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {format(parseISO(data.startTime), 'EEEE, MMMM d, yyyy')}
                </p>
                <p>
                  {format(parseISO(data.startTime), 'h:mm a')} - {format(parseISO(data.endTime), 'h:mm a')}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
            </div>

            {data.meetLink ? (
              <div className="flex items-start gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <MapPin className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
                <div className="w-full">
                  <p className="font-medium text-zinc-900 dark:text-white mb-1">Web Conference</p>
                  <a 
                    href={data.meetLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-brand-blue hover:underline break-all block mb-3"
                  >
                    {data.meetLink}
                  </a>
                  {!isCancelled && (
                    <a 
                      href={data.meetLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full bg-brand-blue text-white rounded-lg py-2 font-medium text-sm hover:bg-brand-blue/90 transition-colors"
                    >
                      Join Meeting
                    </a>
                  )}
                </div>
              </div>
            ) : data.meetingLocation ? (
              <div className="flex items-start gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <MapPin className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">Location</p>
                  <p>{data.meetingLocation}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmedPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-brand-blue/20">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[500px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mb-4"></div>
          <p className="text-zinc-500">Loading your confirmation...</p>
        </div>
      }>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}
