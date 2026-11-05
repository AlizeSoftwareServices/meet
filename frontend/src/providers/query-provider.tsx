'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initMobileAppLifecycle } from '@/lib/appLifecycle';

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2, // 2 minutes cache for blazing fast screen transitions
            gcTime: 1000 * 60 * 10, // Keep in memory for 10 minutes
            refetchOnWindowFocus: false, // Prevents hammering backend on browser tab switches
            retry: 1, // Only retry once on network glitch
          },
        },
      })
  );

  useEffect(() => {
    initMobileAppLifecycle(router);
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
