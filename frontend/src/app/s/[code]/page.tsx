'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ShortLinkRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) return;

    let isMounted = true;
    api.get(`/public/s/${encodeURIComponent(code)}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.username) {
          router.replace(`/book/${res.data.username}`);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        console.error('Failed to resolve short code:', err);
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [code, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-4 border border-red-200 dark:border-red-900 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Short Link Not Found</h1>
        <p className="text-sm text-zinc-500 max-w-sm mb-6">
          The short booking link <code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">/s/{code}</code> could not be found or has expired.
        </p>
        <Link 
          href="/"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-4">
        <Clock className="w-6 h-6 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Redirecting to booking profile...
      </p>
    </div>
  );
}
