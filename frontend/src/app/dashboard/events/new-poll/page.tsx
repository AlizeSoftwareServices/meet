'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToNewPoll() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/polls/new');
  }, [router]);

  return (
    <div className="flex justify-center items-center h-[50vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
