'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getApiBaseUrl } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, MapPin, ChevronRight, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const rawUsername = params?.username as string;
  const username = typeof rawUsername === 'string' ? decodeURIComponent(rawUsername) : 'me';

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

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const res = await api.get(`/public/users/${username}`);
      return res.data;
    },
    enabled: !!username,
    retry: false
  });

  const isOwner = myProfile && (myProfile.username === username || (username === 'me' && myProfile));

  useEffect(() => {
    if (isOwner) {
      router.replace('/dashboard/events');
    }
  }, [isOwner, router]);

  if (isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground font-medium">Opening your account dashboard...</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.replace('/dashboard/events')}
          className="mt-4 gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <h1 className="text-2xl font-bold">User Not Found</h1>
        <p className="text-muted-foreground mt-2">The scheduling page you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        {/* Profile Header */}
        <div className="text-center">
          <Avatar className="w-24 h-24 mx-auto shadow-md border-2" style={{ borderColor: profile.brandColor || '#e5e7eb' }}>
            <AvatarImage src={profile.avatar ? `${getApiBaseUrl()}${profile.avatar}` : ''} alt={profile.name} />
            <AvatarFallback className="text-2xl">{profile.name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-white">{profile.bookingPageTitle || profile.name}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg mx-auto">
            {profile.bookingPageDescription || profile.bio || 'Welcome to my scheduling page. Please follow the instructions to add an event to my calendar.'}
          </p>
        </div>

        {/* Event Types */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {profile.eventTypes.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No active event types found.</div>
            ) : (
              profile.eventTypes.map((event: any) => (
                <Link 
                  key={event.id} 
                  href={`/book/${profile.username}/${event.slug}`}
                  className="block hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: event.color || '#00a2ff' }} />
                      <div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {event.duration} min
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
