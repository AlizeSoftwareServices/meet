'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/api';

function GuestRescheduleContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [newStartTime, setNewStartTime] = useState('');

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newStartTime) return;
    setLoading(true);
    setStatus('idle');
    try {
      const res = await fetch(`${getApiBaseUrl()}/bookings/guest/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newStartTime: new Date(newStartTime).toISOString() }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json();
        setStatus('error');
        setErrorMsg(data.message || 'Failed to reschedule. Link might be expired or time slot unavailable.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600">Invalid Link</h2>
          <p className="text-gray-600 mt-2">Reschedule token is missing from the URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
        {status === 'idle' && (
          <form onSubmit={handleReschedule}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reschedule Booking</h2>
            <p className="text-gray-600 mb-6">Select a new date and time for your booking.</p>
            
            <div className="mb-6 text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">New Start Time (Local Time)</label>
              <input
                type="datetime-local"
                required
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
              />
              <p className="mt-2 text-xs text-gray-500">Note: In a full UI, this would render the host's actual availability calendar.</p>
            </div>

            <button
              type="submit"
              disabled={loading || !newStartTime}
              className="w-full flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Rescheduling...' : 'Reschedule'}
            </button>
          </form>
        )}

        {status === 'success' && (
          <div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Rescheduled!</h2>
            <p className="text-gray-600 mb-6">Your booking has been successfully rescheduled.</p>
            <p className="text-sm text-gray-500">You can now close this tab. A confirmation email has been sent.</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Failed to Reschedule</h2>
            <p className="text-gray-600 mb-6">{errorMsg}</p>
            <button
              onClick={() => setStatus('idle')}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GuestReschedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <GuestRescheduleContent />
    </Suspense>
  );
}
