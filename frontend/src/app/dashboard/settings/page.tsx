'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiBaseUrl } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Mail, 
  Globe, 
  Building2, 
  Phone, 
  Clock, 
  Camera, 
  Check, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Palette, 
  Pencil, 
  ShieldCheck, 
  CheckCircle2, 
  X,
  Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  bio: z.string().max(300, 'Bio must be less than 300 characters').optional(),
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
      timezone: 'Asia/Kolkata',
      language: 'en',
      phone: '',
      company: '',
      website: '',
      brandColor: '#2563eb',
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
        timezone: profile.timezone || 'Asia/Kolkata',
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
      queryClient.invalidateQueries({ queryKey: ['my-auth-profile'] });
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
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be 5MB or less');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Only image files (JPEG, PNG, WEBP, GIF) are allowed');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setUploadingAvatar(true);
      await api.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['my-auth-profile'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Avatar upload failed', err);
      const errMsg = err?.response?.data?.message || 'Avatar upload failed. Please try again.';
      alert(errMsg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const username = profile?.username || 'me';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://meet.alizesoftwareservices.com';
  const bookingUrl = `${origin}/book/${username}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
        <div className="h-10 w-48 bg-muted rounded-xl" />
        <div className="h-44 w-full bg-muted rounded-3xl" />
        <div className="h-96 w-full bg-muted rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-black tracking-tight text-foreground flex items-center gap-2.5">
            My Profile
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Host
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your personal presence, public booking links, and scheduling branding.
          </p>
        </div>

        {/* Global Save/Success Notification Toast */}
        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Profile updated successfully!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Profile Showcase Card */}
      <Card className="border border-border/80 bg-card rounded-3xl shadow-sm overflow-hidden transition-all">
        {/* Eye-attractive Header Cover Banner */}
        <div className="h-32 sm:h-44 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/20" />
          <div className="absolute top-4 right-4 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur-md text-white text-xs font-semibold border border-white/15 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Public Booking Profile
          </div>
        </div>

        {/* Avatar & Header Information Bar */}
        <div className="px-6 sm:px-8 pb-6 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            {/* Avatar with Camera Overlay and User Details */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Only Avatar has negative margin to overlap the banner cleanly */}
              <div className="relative group shrink-0 -mt-12 sm:-mt-16">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl ring-4 ring-card bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl overflow-hidden flex items-center justify-center">
                  {profile?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={`${getApiBaseUrl()}${profile.avatar}`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-white text-3xl sm:text-4xl font-extrabold">
                      {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  )}
                </div>

                {/* Upload Button overlay */}
                <label 
                  htmlFor="avatar-upload"
                  className="absolute inset-0 rounded-3xl bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-200 backdrop-blur-xs ring-4 ring-card"
                  title="Upload profile picture"
                >
                  <Camera className="w-6 h-6 mb-1 text-white" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                  <input 
                    id="avatar-upload"
                    type="file" 
                    className="hidden" 
                    accept="image/jpeg, image/png, image/webp" 
                    onChange={handleAvatarUpload} 
                    disabled={uploadingAvatar}
                  />
                </label>

                {uploadingAvatar && (
                  <div className="absolute inset-0 rounded-3xl bg-black/70 flex items-center justify-center ring-4 ring-card">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Name & Email - positioned 100% on card surface below banner */}
              <div className="pt-2 sm:pt-0 sm:pb-1">
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground tracking-tight">
                  {profile?.name || 'Your Name'}
                </h2>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  {profile?.email || 'user@example.com'}
                </p>
              </div>
            </div>

            {/* Header Right Actions - cleanly positioned on card surface */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0 sm:pb-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-9 px-3.5 rounded-xl border-border text-xs font-semibold gap-1.5 hover:border-blue-500/40 hover:text-blue-600 transition-all shadow-xs"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied Link!' : 'Copy Booking Link'}
              </Button>

              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-xl border-border text-xs font-semibold gap-1.5 hover:border-blue-500/40 hover:text-blue-600 transition-all shadow-xs"
                  title="Preview Public Page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Public
                </Button>
              </a>

              {!isEditing ? (
                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    if (profile) form.reset(profile);
                  }}
                  className="h-9 px-3.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content Body */}
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Section 1: Personal & Contact Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-extrabold text-base text-foreground">
                  Personal Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Display Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Full Name
                  </Label>
                  {isEditing ? (
                    <Input 
                      id="name" 
                      className="h-11 rounded-xl bg-background border-border focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-medium text-sm transition-all" 
                      placeholder="e.g. John Doe" 
                      {...form.register('name')} 
                    />
                  ) : (
                    <div className="h-11 px-3.5 rounded-xl bg-muted/40 border border-border/40 flex items-center text-sm font-semibold text-foreground">
                      {form.watch('name') || <span className="text-muted-foreground italic">Not set</span>}
                    </div>
                  )}
                  {form.formState.errors.name && (
                    <p className="text-xs text-red-500 font-medium mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Email Address
                  </Label>
                  {isEditing ? (
                    <Input 
                      id="email" 
                      type="email" 
                      className="h-11 rounded-xl bg-background border-border focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-medium text-sm transition-all" 
                      placeholder="john@example.com" 
                      {...form.register('email')} 
                    />
                  ) : (
                    <div className="h-11 px-3.5 rounded-xl bg-muted/40 border border-border/40 flex items-center text-sm font-semibold text-foreground truncate">
                      {form.watch('email') || <span className="text-muted-foreground italic">Not set</span>}
                    </div>
                  )}
                  {form.formState.errors.email && (
                    <p className="text-xs text-red-500 font-medium mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>

                {/* Booking URL (Username) */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="username" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Personal Booking URL Slug</span>
                    <span className="text-[11px] text-blue-600 font-normal lowercase">meet.alizesoftwareservices.com/book/{form.watch('username') || username}</span>
                  </Label>
                  
                  {isEditing ? (
                    <div className="flex rounded-xl shadow-xs overflow-hidden border border-border focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all bg-background">
                      <span className="inline-flex items-center px-3.5 bg-muted/60 text-muted-foreground text-xs font-mono font-medium border-r border-border shrink-0">
                        {origin}/book/
                      </span>
                      <Input 
                        id="username" 
                        className="h-11 px-3.5 rounded-none border-0 focus-visible:ring-0 shadow-none font-mono text-sm font-semibold text-foreground" 
                        placeholder="yourname" 
                        {...form.register('username')} 
                      />
                    </div>
                  ) : (
                    <div className="h-11 px-3.5 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between text-sm font-mono text-foreground">
                      <span className="truncate">
                        <span className="text-muted-foreground">{origin}/book/</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{form.watch('username') || username}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="text-xs text-muted-foreground hover:text-foreground font-sans font-medium flex items-center gap-1 shrink-0 ml-2"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </button>
                    </div>
                  )}
                  {form.formState.errors.username && (
                    <p className="text-xs text-red-500 font-medium mt-1">{form.formState.errors.username.message}</p>
                  )}
                </div>

                {/* Bio / Description */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="bio" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Bio & Introduction
                  </Label>
                  {isEditing ? (
                    <textarea
                      id="bio"
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background p-3.5 text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all resize-y shadow-xs"
                      placeholder="Write a brief professional intro about yourself for your booking invitees..."
                      {...form.register('bio')}
                    />
                  ) : (
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 text-sm text-foreground leading-relaxed min-h-[60px]">
                      {form.watch('bio') || <span className="text-muted-foreground italic">No bio provided. Click &quot;Edit Profile&quot; to add a brief introduction.</span>}
                    </div>
                  )}
                  {form.formState.errors.bio && (
                    <p className="text-xs text-red-500 font-medium mt-1">{form.formState.errors.bio.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Organization & Location Preferences */}
            <div className="pt-6 border-t border-border/60">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-extrabold text-base text-foreground">
                  Organization & Schedule Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Timezone */}
                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Default Timezone
                  </Label>
                  {isEditing ? (
                    <select 
                      id="timezone"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-medium shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all cursor-pointer"
                      {...form.register('timezone')}
                    >
                      <option value="Asia/Kolkata">India Standard Time (IST - Asia/Kolkata)</option>
                      <option value="UTC">Coordinated Universal Time (UTC)</option>
                      <option value="America/New_York">Eastern Time (US & Canada)</option>
                      <option value="America/Chicago">Central Time (US & Canada)</option>
                      <option value="America/Denver">Mountain Time (US & Canada)</option>
                      <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                      <option value="Europe/London">London / Greenwich Mean Time</option>
                      <option value="Europe/Paris">Central European Time (Paris, Berlin)</option>
                      <option value="Asia/Dubai">Gulf Standard Time (Dubai)</option>
                      <option value="Asia/Singapore">Singapore / Hong Kong Time</option>
                      <option value="Australia/Sydney">Australian Eastern Time (Sydney)</option>
                    </select>
                  ) : (
                    <div className="h-11 px-3.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{form.watch('timezone') || 'Asia/Kolkata'}</span>
                    </div>
                  )}
                  {form.formState.errors.timezone && (
                    <p className="text-xs text-red-500 font-medium mt-1">{form.formState.errors.timezone.message}</p>
                  )}
                </div>

                {/* Company Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    Company / Organization
                  </Label>
                  {isEditing ? (
                    <Input 
                      id="company" 
                      className="h-11 rounded-xl bg-background border-border focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-medium text-sm transition-all" 
                      placeholder="e.g. Alize Software Services" 
                      {...form.register('company')} 
                    />
                  ) : (
                    <div className="h-11 px-3.5 rounded-xl bg-muted/40 border border-border/40 flex items-center text-sm font-semibold text-foreground">
                      {form.watch('company') || <span className="text-muted-foreground italic">Not specified</span>}
                    </div>
                  )}
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    Website
                  </Label>
                  {isEditing ? (
                    <Input 
                      id="website" 
                      className="h-11 rounded-xl bg-background border-border focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-medium text-sm transition-all" 
                      placeholder="https://yourdomain.com" 
                      {...form.register('website')} 
                    />
                  ) : (
                    <div className="h-11 px-3.5 rounded-xl bg-muted/40 border border-border/40 flex items-center text-sm font-semibold text-foreground truncate">
                      {form.watch('website') ? (
                        <a href={form.watch('website')} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 truncate">
                          {form.watch('website')}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">Not specified</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-500" />
                    Phone / WhatsApp Contact
                  </Label>
                  {isEditing ? (
                    <Input 
                      id="phone" 
                      className="h-11 rounded-xl bg-background border-border focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-medium text-sm transition-all" 
                      placeholder="+91 98765 43210" 
                      {...form.register('phone')} 
                    />
                  ) : (
                    <div className="h-11 px-3.5 rounded-xl bg-muted/40 border border-border/40 flex items-center text-sm font-semibold text-foreground">
                      {form.watch('phone') || <span className="text-muted-foreground italic">Not specified</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Booking Page Appearance & Custom Branding */}
            <div className="pt-6 border-t border-border/60">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-foreground">
                    Public Page Branding
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Customize the appearance of your public scheduling profile.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Page Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="bookingPageTitle" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Header Page Title
                  </Label>
                  {isEditing ? (
                    <Input 
                      id="bookingPageTitle" 
                      className="h-11 rounded-xl bg-background border-border focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-medium text-sm transition-all" 
                      placeholder="e.g. Schedule a Meeting with Alize" 
                      {...form.register('bookingPageTitle')} 
                    />
                  ) : (
                    <div className="h-11 px-3.5 rounded-xl bg-muted/40 border border-border/40 flex items-center text-sm font-semibold text-foreground">
                      {form.watch('bookingPageTitle') || `${form.watch('name') || 'Your'}'s Scheduling Page`}
                    </div>
                  )}
                </div>

                {/* Brand Color Theme with preset swatches */}
                <div className="space-y-1.5">
                  <Label htmlFor="brandColor" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Accent Brand Color
                  </Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-xl shadow-inner border-2 border-border shrink-0 transition-transform flex items-center justify-center"
                      style={{ backgroundColor: form.watch('brandColor') || '#2563eb' }}
                    >
                      <Sparkles className="w-4 h-4 text-white drop-shadow-sm" />
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        {['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0284c7'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => form.setValue('brandColor', c)}
                            className={`w-7 h-7 rounded-lg transition-transform active:scale-90 ${form.watch('brandColor') === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                        <input 
                          type="color" 
                          id="brandColor" 
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0 ml-1" 
                          {...form.register('brandColor')} 
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-mono font-bold text-foreground">
                        {form.watch('brandColor') || '#2563eb'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Page Description */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="bookingPageDescription" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Welcome Subtitle / Instructions
                  </Label>
                  {isEditing ? (
                    <textarea
                      id="bookingPageDescription"
                      rows={2}
                      className="w-full rounded-xl border border-border bg-background p-3.5 text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all resize-y shadow-xs"
                      placeholder="e.g. Choose a convenient time slot below for our Google Meet session."
                      {...form.register('bookingPageDescription')}
                    />
                  ) : (
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 text-sm text-foreground leading-relaxed">
                      {form.watch('bookingPageDescription') || 'Welcome to my scheduling page. Please select an available slot below.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Floating Save Action Bar when in Edit Mode */}
            {isEditing && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-6 border-t border-border/80 flex items-center justify-end gap-3 sticky bottom-4 bg-card/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-border"
              >
                <Button 
                  type="button" 
                  variant="outline" 
                  size="default" 
                  className="rounded-xl px-5 h-11 text-xs font-bold" 
                  onClick={() => {
                    setIsEditing(false);
                    if (profile) form.reset(profile);
                  }}
                  disabled={updateMutation.isPending}
                >
                  Discard Changes
                </Button>
                <Button 
                  type="submit" 
                  size="default" 
                  className="rounded-xl px-7 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all gap-2" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
