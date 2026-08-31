'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
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
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Delete account state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

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
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    setSuccess(false);
    updateMutation.mutate(data);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      setDeleteError('Please type DELETE MY ACCOUNT exactly to confirm.');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');

    try {
      await api.delete('/users/account');
      localStorage.removeItem('token');
      router.push('/login');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account');
      setDeleteLoading(false);
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

      <Card className="shadow-sm sm:shadow-md border-border/50">
        <CardHeader className="p-5 sm:p-8 sm:pb-6">
          <CardTitle>Public Profile</CardTitle>
          <CardDescription>
            This information will be displayed publicly on your booking page.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-8 sm:pt-0">
          <div className="mb-8 flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-zinc-200 border-2 border-zinc-300 overflow-hidden flex items-center justify-center relative group">
              {profile?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${getApiBaseUrl()}${profile.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-zinc-400 text-3xl font-semibold">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </span>
              )}
              <label className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-medium">
                Upload
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{profile?.name || 'Your Avatar'}</h3>
              <p className="text-sm text-zinc-500">Click the avatar to upload a new image. Max size 5MB.</p>
            </div>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 min-w-0">
                <Label htmlFor="name" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Display Name</Label>
                <Input id="name" className="h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:bg-background focus-visible:ring-brand-blue/30 focus-visible:ring-2 focus-visible:border-brand-blue/50 transition-all shadow-sm" placeholder="John Doe" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-sm text-red-500 ml-1">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-3 min-w-0">
                <Label htmlFor="email" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Email Address</Label>
                <Input id="email" type="email" className="h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:bg-background focus-visible:ring-brand-blue/30 focus-visible:ring-2 focus-visible:border-brand-blue/50 transition-all shadow-sm" placeholder="john@example.com" {...form.register('email')} />
                {form.formState.errors.email && <p className="text-sm text-red-500 ml-1">{form.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-3 min-w-0 md:col-span-2">
                <Label htmlFor="username" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Username (URL Slug)</Label>
                <div className="flex rounded-xl shadow-sm w-full focus-within:ring-2 focus-within:ring-brand-blue/30 focus-within:border-brand-blue/50 transition-all bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
                  <span className="inline-flex items-center px-4 bg-muted/50 text-muted-foreground sm:text-sm whitespace-nowrap font-medium border-r border-zinc-200/80 dark:border-zinc-800">
                    meetsync.com/
                  </span>
                  <Input id="username" className="h-12 px-4 rounded-none border-0 min-w-0 flex-1 w-full focus-visible:ring-0 shadow-none bg-transparent" placeholder="johndoe" {...form.register('username')} />
                </div>
                {form.formState.errors.username && <p className="text-sm text-red-500 ml-1">{form.formState.errors.username.message}</p>}
              </div>
            </div>

            <div className="space-y-3 min-w-0">
              <Label htmlFor="bio" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Bio</Label>
              <textarea
                id="bio"
                className="flex min-h-[120px] w-full rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue/50 transition-all resize-y"
                placeholder="A brief description about you..."
                {...form.register('bio')}
              />
              {form.formState.errors.bio && <p className="text-sm text-red-500 ml-1">{form.formState.errors.bio.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 min-w-0">
                <Label htmlFor="timezone" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Timezone</Label>
                <select 
                  id="timezone"
                  className="flex h-12 w-full rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 px-4 py-2 text-sm shadow-sm transition-all focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue/50 disabled:cursor-not-allowed disabled:opacity-50"
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
                <Input id="company" className="h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:bg-background focus-visible:ring-brand-blue/30 focus-visible:ring-2 focus-visible:border-brand-blue/50 transition-all shadow-sm" placeholder="Acme Inc." {...form.register('company')} />
              </div>

              <div className="space-y-3 min-w-0">
                <Label htmlFor="website" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Website</Label>
                <Input id="website" className="h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:bg-background focus-visible:ring-brand-blue/30 focus-visible:ring-2 focus-visible:border-brand-blue/50 transition-all shadow-sm" placeholder="https://example.com" {...form.register('website')} />
              </div>

              <div className="space-y-3 min-w-0">
                <Label htmlFor="phone" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Phone Number</Label>
                <Input id="phone" className="h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:bg-background focus-visible:ring-brand-blue/30 focus-visible:ring-2 focus-visible:border-brand-blue/50 transition-all shadow-sm" placeholder="+1 (555) 000-0000" {...form.register('phone')} />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-border/50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Booking Page Branding</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 min-w-0">
                  <Label htmlFor="bookingPageTitle" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Page Title</Label>
                  <Input id="bookingPageTitle" className="h-12 px-4 rounded-xl" placeholder="John's Calendar" {...form.register('bookingPageTitle')} />
                </div>
                
                <div className="space-y-3 min-w-0 flex flex-col">
                  <Label htmlFor="brandColor" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Brand Color</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <input type="color" id="brandColor" className="h-12 w-12 rounded cursor-pointer border-0 p-0" {...form.register('brandColor')} />
                    <span className="text-sm text-zinc-500">{form.watch('brandColor')}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 min-w-0">
                <Label htmlFor="bookingPageDescription" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Page Description</Label>
                <textarea
                  id="bookingPageDescription"
                  className="flex min-h-[100px] w-full rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue/50 transition-all resize-y"
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

            <div className="flex justify-end pt-6 border-t border-border/50">
              <Button type="submit" size="lg" className="rounded-xl px-8 shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm sm:shadow-md border-border/50">
        <CardHeader className="p-5 sm:p-8 sm:pb-6">
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-8 sm:pt-0">
          <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
            <div className="space-y-3">
              <Label>Current Password</Label>
              <Input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label>New Password (min 8 chars)</Label>
              <Input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label>Confirm New Password</Label>
              <Input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>

            {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
            {passwordSuccess && <p className="text-green-600 text-sm">Password changed successfully!</p>}

            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!isNative && (
        <Card className="border-red-200 shadow-sm sm:shadow-md">
          <CardHeader className="p-5 sm:p-8 sm:pb-6 bg-red-50 rounded-t-xl">
            <CardTitle className="text-red-700">Danger Zone</CardTitle>
            <CardDescription className="text-red-600">
              Permanently delete your account and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-8">
            <div className="space-y-4 max-w-md">
              <p className="text-sm text-gray-600">
                This action cannot be undone. This will permanently delete your profile, event types, contacts, and cancel all future bookings.
              </p>
              <div className="space-y-3">
                <Label className="text-red-600">Type DELETE MY ACCOUNT to confirm</Label>
                <Input 
                  value={deleteConfirmation} 
                  onChange={e => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="border-red-300 focus-visible:ring-red-500"
                />
              </div>
              
              {deleteError && <p className="text-red-500 text-sm">{deleteError}</p>}

              <Button 
                type="button" 
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmation !== 'DELETE MY ACCOUNT'}
                className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
