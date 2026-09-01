'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AboutPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/#about');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="flex items-center gap-3 text-sm font-medium">
        <div className="w-5 h-5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        Redirecting to About Us...
      </div>
    </div>
  );
}
