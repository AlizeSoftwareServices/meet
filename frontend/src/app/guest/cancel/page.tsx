'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/api';

function GuestCancelContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCancel = async () => {
    if (!token) return;
    setLoading(true);
    setStatus('idle');
    try {
      const res = await fetch(`${getApiBaseUrl()}/bookings/guest/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json();
        setStatus('error');
        setErrorMsg(data.message || 'Failed to cancel the booking. Link might be expired.');
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
          <p className="text-gray-600 mt-2">Cancellation token is missing from the URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
        {status === 'idle' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancel Booking</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to cancel this booking?</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Booking Cancelled</h2>
            <p className="text-gray-600 mb-6">Your booking has been successfully cancelled.</p>
            <p className="text-sm text-gray-500">You can now close this tab.</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Failed to Cancel</h2>
            <p className="text-gray-600 mb-6">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GuestCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <GuestCancelContent />
    </Suspense>
  );
}
