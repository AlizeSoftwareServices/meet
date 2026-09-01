'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiBaseUrl } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  bio: z.string().max(160, 'Bio must be less than 160 characters').optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.string().min(1, 'Language is required'),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
  brandColor: z.string().optional(),
  bookingPageTitle: z.string().optional(),
  bookingPageDescription: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/profile');
      return res.data;
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      username: '',
      bio: '',
      timezone: 'UTC',
      language: 'en',
      phone: '',
      company: '',
      website: '',
      brandColor: '',
      bookingPageTitle: '',
      bookingPageDescription: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || '',
        email: profile.email || '',
        username: profile.username || '',
        bio: profile.bio || '',
        timezone: profile.timezone || 'UTC',
        language: profile.language || 'en',
        phone: profile.phone || '',
        company: profile.company || '',
        website: profile.website || '',
        brandColor: profile.brandColor || '#2563eb',
        bookingPageTitle: profile.bookingPageTitle || '',
        bookingPageDescription: profile.bookingPageDescription || '',
      });
    }
  }, [profile, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await api.put('/profile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    setSuccess(false);
    updateMutation.mutate(data);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) return;
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (50KB)
    if (file.size > 50 * 1024) {
      alert('File size must be 50KB or less');
      return;
    }

    // Check file type (JPEG, PNG)
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Only JPEG, JPG, and PNG files are allowed');
      return;
    }

    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      // Invalidate to fetch new avatar
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err) {
      console.error('Avatar upload failed', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-pulse">
        <div className="h-10 w-48 bg-zinc-100 rounded" />
        <div className="h-96 w-full bg-zinc-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-zinc-500">Manage your public profile and preferences.</p>
      </div>

      <Card className="shadow-sm sm:shadow-md border-border/50 relative">
        <CardHeader className="p-5 sm:p-8 sm:pb-6 flex flex-row justify-between items-start">
          <div>
            <CardTitle>Public Profile</CardTitle>
            <CardDescription>
              This information will be displayed publicly on your booking page.
            </CardDescription>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="ml-4">
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-8 sm:pt-0">
          <div className="mb-8 flex items-center gap-6">
            <div className={`h-24 w-24 rounded-full bg-zinc-200 border-2 border-zinc-300 overflow-hidden flex items-center justify-center relative ${isEditing ? 'group' : ''}`}>
              {profile?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${getApiBaseUrl()}${profile.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-zinc-400 text-3xl font-semibold">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </span>
              )}
              {isEditing && (
                <label className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-medium">
                  Upload
                  <input type="file" className="hidden" accept="image/jpeg, image/png" onChange={handleAvatarUpload} />
                </label>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{profile?.name || 'Your Avatar'}</h3>
              <p className="text-sm text-zinc-500">
                {isEditing ? 'Click the avatar to upload a new image. Max size 50KB (JPG/PNG).' : 'Your current avatar image.'}
              </p>
            </div>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 min-w-0">
                <Label htmlFor="name" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Display Name</Label>
                <Input disabled={!isEditing} id="name" className="h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:bg-background focus-visible:ring-brand-blue/30 focus-visible:ring-2 focus-visible:border-brand-blue/50 transition-all shadow-sm disabled:opacity-70" placeholder="John Doe" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-sm text-red-500 ml-1">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-3 min-w-0">
                <Label htmlFor="email" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Email Address</Label>
                <Input disabled={!isEditing} id="email" type="email" className="h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:bg-background focus-visible:ring-brand-blue/30 focus-visible:ring-2 focus-visible:border-brand-blue/50 transition-all shadow-sm disabled:opacity-70" placeholder="john@example.com" {...form.register('email')} />
                {form.formState.errors.email && <p className="text-sm text-red-500 ml-1">{form.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-3 min-w-0 md:col-span-2">
                <Label htmlFor="username" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Username (URL Slug)</Label>
                <div className={`flex rounded-xl shadow-sm w-full transition-all bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 overflow-hidden ${isEditing ? 'focus-within:ring-2 focus-within:ring-brand-blue/30 focus-within:border-brand-blue/50' : 'opacity-70'}`}>
                  <span className="inline-flex items-center px-4 bg-muted/50 text-muted-foreground sm:text-sm whitespace-nowrap font-medium border-r border-zinc-200/80 dark:border-zinc-800">
                    meetsync.com/
                  </span>
                  <Input disabled={!isEditing} id="username" className="h-12 px-4 rounded-none border-0 min-w-0 flex-1 w-full focus-visible:ring-0 shadow-none bg-transparent disabled:opacity-100" placeholder="johndoe" {...form.register('username')} />
                </div>
                {form.formState.errors.username && <p className="text-sm text-red-500 ml-1">{form.formState.errors.username.message}</p>}
              </div>
            </div>

            <div className="space-y-3 min-w-0">
              <Label htmlFor="bio" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Bio</Label>
              <textarea
                disabled={!isEditing}
                id="bio"
                className="flex min-h-[120px] w-full rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue/50 transition-all resize-y disabled:opacity-70 disabled:bg-zinc-100/50"
                placeholder="A brief description about you..."
                {...form.register('bio')}
              />
              {form.formState.errors.bio && <p className="text-sm text-red-500 ml-1">{form.formState.errors.bio.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 min-w-0">
                <Label htmlFor="timezone" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Timezone</Label>
                <select 
                  disabled={!isEditing}
                  id="timezone"
                  className="flex h-12 w-full rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 px-4 py-2 text-sm shadow-sm transition-all focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue/50 disabled:cursor-not-allowed disabled:opacity-70"
                  {...form.register('timezone')}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Denver">Mountain Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="Europe/London">London</option>
                  <option value="Asia/Kolkata">India Standard Time</option>
                </select>
                {form.formState.errors.timezone && <p className="text-sm text-red-500 ml-1">{form.formState.errors.timezone.message}</p>}
              </div>

              <div className="space-y-3 min-w-0">
                <Label htmlFor="company" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Company</Label>
                <Input disabled={!isEditing} id="company" className="h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:bg-background focus-visible:ring-brand-blue/30 focus-visible:ring-2 focus-visible:border-brand-blue/50 transition-all shadow-sm disabled:opacity-70" placeholder="Acme Inc." {...form.register('company')} />
              </div>

              <div className="space-y-3 min-w-0">
                <Label htmlFor="website" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Website</Label>
                <Input disabled={!isEditing} id="website" className="h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:bg-background focus-visible:ring-brand-blue/30 focus-visible:ring-2 focus-visible:border-brand-blue/50 transition-all shadow-sm disabled:opacity-70" placeholder="https://example.com" {...form.register('website')} />
              </div>

              <div className="space-y-3 min-w-0">
                <Label htmlFor="phone" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Phone Number</Label>
                <Input disabled={!isEditing} id="phone" className="h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:bg-background focus-visible:ring-brand-blue/30 focus-visible:ring-2 focus-visible:border-brand-blue/50 transition-all shadow-sm disabled:opacity-70" placeholder="+1 (555) 000-0000" {...form.register('phone')} />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-border/50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Booking Page Branding</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 min-w-0">
                  <Label htmlFor="bookingPageTitle" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Page Title</Label>
                  <Input disabled={!isEditing} id="bookingPageTitle" className="h-12 px-4 rounded-xl disabled:opacity-70" placeholder="John's Calendar" {...form.register('bookingPageTitle')} />
                </div>
                
                <div className="space-y-3 min-w-0 flex flex-col">
                  <Label htmlFor="brandColor" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Brand Color</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <input disabled={!isEditing} type="color" id="brandColor" className="h-12 w-12 rounded cursor-pointer border-0 p-0 disabled:opacity-70 disabled:cursor-not-allowed" {...form.register('brandColor')} />
                    <span className="text-sm text-zinc-500">{form.watch('brandColor')}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 min-w-0">
                <Label htmlFor="bookingPageDescription" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Page Description</Label>
                <textarea
                  disabled={!isEditing}
                  id="bookingPageDescription"
                  className="flex min-h-[100px] w-full rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue/50 transition-all resize-y disabled:opacity-70 disabled:bg-zinc-100/50"
                  placeholder="Welcome to my scheduling page..."
                  {...form.register('bookingPageDescription')}
                />
              </div>
            </div>

            {success && (
              <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md">
                Profile updated successfully!
              </div>
            )}

            {isEditing && (
              <div className="flex justify-end gap-4 pt-6 border-t border-border/50">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="lg" 
                  className="rounded-xl px-8" 
                  onClick={() => {
                    setIsEditing(false);
                    // Reset to original values
                    if (profile) {
                      form.reset({
                        name: profile.name || '',
                        email: profile.email || '',
                        username: profile.username || '',
                        bio: profile.bio || '',
                        timezone: profile.timezone || 'UTC',
                        language: profile.language || 'en',
                        phone: profile.phone || '',
                        company: profile.company || '',
                        website: profile.website || '',
                        brandColor: profile.brandColor || '#2563eb',
                        bookingPageTitle: profile.bookingPageTitle || '',
                        bookingPageDescription: profile.bookingPageDescription || '',
                      });
                    }
                  }}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" size="lg" className="rounded-xl px-8 shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
