'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  bio: z.string().max(160, 'Bio must be less than 160 characters').optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.string().min(1, 'Language is required'),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);

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
      username: '',
      bio: '',
      timezone: 'UTC',
      language: 'en',
      phone: '',
      company: '',
      website: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        timezone: profile.timezone || 'UTC',
        language: profile.language || 'en',
        phone: profile.phone || '',
        company: profile.company || '',
        website: profile.website || '',
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

      <Card>
        <CardHeader className="p-8 pb-6">
          <CardTitle>Public Profile</CardTitle>
          <CardDescription>
            This information will be displayed publicly on your booking page.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 min-w-0">
                <Label htmlFor="name" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Display Name</Label>
                <Input id="name" className="h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:bg-background focus-visible:ring-brand-blue/30 focus-visible:ring-2 focus-visible:border-brand-blue/50 transition-all shadow-sm" placeholder="John Doe" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-sm text-red-500 ml-1">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-3 min-w-0">
                <Label htmlFor="username" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Username (URL Slug)</Label>
                <div className="flex rounded-xl shadow-sm w-full focus-within:ring-2 focus-within:ring-brand-blue/30 focus-within:border-brand-blue/50 transition-all bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
                  <span className="inline-flex items-center px-4 bg-muted/50 text-muted-foreground sm:text-sm whitespace-nowrap font-medium border-r border-zinc-200/80 dark:border-zinc-800">
                    /book/
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
    </div>
  );
}
