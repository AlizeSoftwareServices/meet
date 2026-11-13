'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Check, Sparkles, Bell, Users, UsersRound, Shuffle, GitMerge, Video, Phone, MapPin, AlertCircle, Plug } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { CustomQuestionsEditor } from '@/components/dashboard/CustomQuestionsEditor';

const eventTypeSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  location: z.string().optional(),
  slug: z.string().min(2, 'URL slug is required'),
  color: z.string().optional(),
  isGroupEvent: z.boolean().optional(),
  maxInvitees: z.number().min(1).optional(),
  enableReminder24h: z.boolean().optional(),
  availabilityId: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  confirmationMessage: z.string().optional(),
  redirectUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  customQuestions: z.array(z.object({
    id: z.string().optional(),
    type: z.enum(['TEXT', 'LONG_TEXT', 'PHONE', 'NUMBER', 'DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOX']),
    label: z.string().min(1, 'Label is required'),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    order: z.number()
  })).optional(),
});

type EventTypeFormValues = z.infer<typeof eventTypeSchema>;

const PRESET_COLORS = [
  'hsl(var(--primary))',
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export default function NewEventTypePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [schedulingType, setSchedulingType] = useState<'PERSONAL' | 'ROUND_ROBIN' | 'COLLECTIVE'>('PERSONAL');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>([]);
  const [locationType, setLocationType] = useState<string>('Google Meet');
  const [locationDetails, setLocationDetails] = useState('');

  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const res = await api.get('/integrations');
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const isGoogleConnected = Boolean(integrations?.some((i: any) => i.provider === 'google' && !i.isExpired));
  const isZoomConnected = Boolean(integrations?.some((i: any) => i.provider === 'zoom' && !i.isExpired));
  const isZohoConnected = Boolean(integrations?.some((i: any) => i.provider === 'zoho' && !i.isExpired));
  const isSlackConnected = Boolean(integrations?.some((i: any) => i.provider === 'slack' && !i.isExpired));

  const form = useForm<EventTypeFormValues>({
    resolver: zodResolver(eventTypeSchema),
    defaultValues: {
      title: '',
      description: '',
      duration: 30,
      location: 'Google Meet',
      slug: '',
      color: PRESET_COLORS[0],
      isGroupEvent: false,
      maxInvitees: 1,
      enableReminder24h: true,
      availabilityId: '',
      price: 0,
      currency: 'USD',
      confirmationMessage: '',
      redirectUrl: '',
      customQuestions: [],
    },
  });

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'round-robin') {
      setSchedulingType('ROUND_ROBIN');
    } else if (typeParam === 'collective') {
      setSchedulingType('COLLECTIVE');
    } else if (typeParam === 'group') {
      form.setValue('isGroupEvent', true);
      form.setValue('maxInvitees', 5);
    } else if (typeParam === 'one-off') {
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      form.setValue('title', 'One-off Meeting');
      form.setValue('slug', `meet-${uniqueSuffix}`);
      form.setValue('description', 'Custom one-off private meeting link.');
    }
  }, [searchParams, form]);

  useEffect(() => {
    if (integrations) {
      const hasGoogle = integrations.some((i: any) => i.provider === 'google' && !i.isExpired);
      const hasZoom = integrations.some((i: any) => i.provider === 'zoom' && !i.isExpired);
      const hasZoho = integrations.some((i: any) => i.provider === 'zoho' && !i.isExpired);
      const hasSlack = integrations.some((i: any) => i.provider === 'slack' && !i.isExpired);

      if (!hasGoogle && hasZoom && locationType === 'Google Meet') {
        setLocationType('Zoom Video');
        form.setValue('location', 'Zoom Video');
      } else if (!hasGoogle && !hasZoom && hasZoho && locationType === 'Google Meet') {
        setLocationType('Zoho Meeting');
        form.setValue('location', 'Zoho Meeting');
      } else if (!hasGoogle && !hasZoom && !hasZoho && hasSlack && locationType === 'Google Meet') {
        setLocationType('Slack Huddle');
        form.setValue('location', 'Slack Huddle');
      } else if (!hasGoogle && !hasZoom && !hasZoho && !hasSlack && (locationType === 'Google Meet' || locationType === 'Zoom Video' || locationType === 'Zoho Meeting' || locationType === 'Slack Huddle')) {
        setLocationType('Phone Call');
        form.setValue('location', 'Phone Call');
      }
    }
  }, [integrations]);

  const { data: schedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const res = await api.get('/availability/schedules');
      return res.data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await api.get('/teams');
      return res.data;
    },
  });

  const selectedTeam = teams?.find((t: any) => t.id === selectedTeamId);
  const teamMembers: any[] = selectedTeam?.members || [];

  const createMutation = useMutation({
    mutationFn: async (data: EventTypeFormValues) => {
      const response = await api.post('/event-types', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      router.push('/dashboard/events');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create event type');
    },
  });

  const onSubmit = (data: EventTypeFormValues) => {
    setError(null);
    const payload: any = { ...data };
    if (schedulingType !== 'PERSONAL') {
      payload.schedulingType = schedulingType;
      payload.teamId = selectedTeamId || undefined;
      payload.hostIds = selectedHostIds;
    }
    createMutation.mutate(payload);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Link href="/dashboard/events">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Create Event Type
          </h1>
          <p className="text-muted-foreground mt-1">Configure the settings for your new Meet type.</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
          
          <CardContent className="pt-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-base font-semibold">Event Title</Label>
                  <Input
                    id="title"
                    className="h-12 text-lg rounded-xl bg-background border-border shadow-sm focus-visible:ring-primary/20"
                    placeholder="e.g. 30 Minute Discovery Call"
                    {...form.register('title')}
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="slug" className="text-base font-semibold">URL Slug</Label>
                    <div className="flex rounded-xl shadow-sm overflow-hidden border border-border bg-background focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring">
                      <span className="inline-flex items-center px-4 bg-muted/50 text-muted-foreground font-medium border-r border-border">
                        /book/
                      </span>
                      <input
                        id="slug"
                        className="flex-1 bg-transparent px-3 py-3 outline-none text-foreground"
                        placeholder="30-min-call"
                        {...form.register('slug')}
                      />
                    </div>
                    {form.formState.errors.slug && (
                      <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="duration" className="text-base font-semibold">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      className="h-[50px] rounded-xl bg-background shadow-sm"
                      {...form.register('duration', { valueAsNumber: true })}
                    />
                    {form.formState.errors.duration && (
                      <p className="text-sm text-destructive">{form.formState.errors.duration.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="availabilityId" className="text-base font-semibold flex items-center gap-2">
                    Availability Schedule
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Required</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">Select which working hours apply to this event.</p>
                  <select
                    id="availabilityId"
                    className="w-full h-12 rounded-xl bg-background border border-border px-3 text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                    {...form.register('availabilityId')}
                  >
                    <option value="">Using Default Schedule</option>
                    {schedules?.map((sch: any) => (
                      <option key={sch.id} value={sch.id}>
                        {sch.name} {sch.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <Label className="text-base font-semibold">Meeting Location / Type</Label>
                      <p className="text-xs text-muted-foreground">Select how and where this meeting will take place.</p>
                    </div>
                    <Link
                      href="/dashboard/integrations"
                      target="_blank"
                      className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 shrink-0"
                    >
                      <Plug className="w-3.5 h-3.5" />
                      Manage Connected Platforms
                    </Link>
                  </div>

                  {/* If no video platform connected at all */}
                  {!isGoogleConnected && !isZoomConnected && !isZohoConnected && !isSlackConnected && (
                    <div className="p-4 rounded-2xl border border-dashed border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                          <Video className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs sm:text-sm text-foreground">No Video Platforms Connected</p>
                          <p className="text-xs text-muted-foreground">Connect Zoom, Google Meet, Zoho, or Slack to auto-generate video conference links.</p>
                        </div>
                      </div>
                      <Link 
                        href="/dashboard/integrations" 
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold shrink-0 transition-colors"
                      >
                        <Plug className="w-3.5 h-3.5" />
                        Connect in Integrations
                      </Link>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Google Meet - Dynamically rendered if connected */}
                    {isGoogleConnected && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationType('Google Meet');
                          form.setValue('location', 'Google Meet');
                        }}
                        className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                          locationType === 'Google Meet'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                            : 'border-border bg-card hover:bg-secondary/40'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#00832d" d="M14 12l3.5-3v6z"/>
                            <path fill="#0066da" d="M3 7.5A2.5 2.5 0 0 1 5.5 5H12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5z"/>
                            <path fill="#e94235" d="M17.5 9L21 6v12l-3.5-3z"/>
                            <path fill="#2684fc" d="M12 5H5.5A2.5 2.5 0 0 0 3 7.5V11h11V7a2 2 0 0 0-2-2z"/>
                            <path fill="#00ac47" d="M3 13v3.5A2.5 2.5 0 0 0 5.5 19H12a2 2 0 0 0 2-2v-4z"/>
                            <path fill="#ffba00" d="M14 11H3v2h11z"/>
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-sm text-foreground">Google Meet</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Connected</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Auto-generates meeting link</p>
                        </div>
                      </button>
                    )}

                    {/* Zoom Video - Dynamically rendered if connected */}
                    {isZoomConnected && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationType('Zoom Video');
                          form.setValue('location', 'Zoom Video');
                        }}
                        className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                          locationType === 'Zoom Video' || locationType === 'Zoom'
                            ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-border bg-card hover:bg-secondary/40'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#2D8CFF]/10 text-[#2D8CFF] flex items-center justify-center">
                          <svg className="w-5 h-5 fill-[#2D8CFF]" viewBox="0 0 24 24">
                            <path d="M4.5 6A2.5 2.5 0 0 0 2 8.5v7A2.5 2.5 0 0 0 4.5 18h8a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 12.5 6h-8zm12.5 4.35 4.14-2.76A1 1 0 0 1 23 8.42v7.16a1 1 0 0 1-1.86.83L17 13.65v-3.3z" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-sm text-foreground">Zoom Video</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">Connected</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Auto-generates Zoom meeting link</p>
                        </div>
                      </button>
                    )}

                    {/* Zoho Meeting - Dynamically rendered if connected */}
                    {isZohoConnected && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationType('Zoho Meeting');
                          form.setValue('location', 'Zoho Meeting');
                        }}
                        className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                          locationType === 'Zoho Meeting' || locationType === 'Zoho'
                            ? 'border-red-500 bg-red-500/5 ring-2 ring-red-500/20 shadow-xs'
                            : 'border-border bg-card hover:bg-secondary/40'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center p-1.5 shadow-xs grid grid-cols-2 gap-0.5">
                          <div className="bg-[#E42527] w-full h-full rounded-[2px]" />
                          <div className="bg-[#226EB4] w-full h-full rounded-[2px]" />
                          <div className="bg-[#439539] w-full h-full rounded-[2px]" />
                          <div className="bg-[#F4B41A] w-full h-full rounded-[2px]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-sm text-foreground">Zoho Meeting</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-500/10 text-red-600 border border-red-500/20">Connected</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Auto-generates Zoho Meeting link</p>
                        </div>
                      </button>
                    )}

                    {/* Slack Huddle - Dynamically rendered if connected */}
                    {isSlackConnected && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationType('Slack Huddle');
                          form.setValue('location', 'Slack Huddle');
                        }}
                        className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                          locationType === 'Slack Huddle' || locationType === 'Slack'
                            ? 'border-[#4A154B] bg-[#4A154B]/5 ring-2 ring-[#4A154B]/20 shadow-xs'
                            : 'border-border bg-card hover:bg-secondary/40'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#4A154B]/10 flex items-center justify-center p-2">
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
                            <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
                            <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
                            <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-sm text-foreground">Slack Huddle</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[#4A154B]/10 text-[#4A154B] border border-[#4A154B]/20">Internal Team</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Team video huddle with auto-fallback for external</p>
                        </div>
                      </button>
                    )}

                    {/* Phone Call */}
                    <button
                      type="button"
                      onClick={() => {
                        setLocationType('Phone Call');
                        form.setValue('location', locationDetails ? `Phone Call: ${locationDetails}` : 'Phone Call');
                      }}
                      className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                        locationType === 'Phone Call'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                          : 'border-border bg-card hover:bg-secondary/40'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">Phone Call</p>
                        <p className="text-xs text-muted-foreground">Inbound or outbound call</p>
                      </div>
                    </button>

                    {/* In Person */}
                    <button
                      type="button"
                      onClick={() => {
                        setLocationType('In Person');
                        form.setValue('location', locationDetails ? `In Person: ${locationDetails}` : 'In Person');
                      }}
                      className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                        locationType === 'In Person'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                          : 'border-border bg-card hover:bg-secondary/40'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">In Person</p>
                        <p className="text-xs text-muted-foreground">Face-to-face physical meeting</p>
                      </div>
                    </button>
                  </div>

                  {locationType === 'Phone Call' && (
                    <div className="animate-in fade-in duration-200">
                      <Input
                        placeholder="e.g. Host will call guest at their provided phone number"
                        value={locationDetails}
                        onChange={(e) => {
                          setLocationDetails(e.target.value);
                          form.setValue('location', e.target.value ? `Phone Call: ${e.target.value}` : 'Phone Call');
                        }}
                        className="h-[48px] rounded-xl bg-background shadow-xs mt-2"
                      />
                    </div>
                  )}

                  {locationType === 'In Person' && (
                    <div className="animate-in fade-in duration-200">
                      <Input
                        placeholder="e.g. Office Suite 402, Anna Salai, Chennai"
                        value={locationDetails}
                        onChange={(e) => {
                          setLocationDetails(e.target.value);
                          form.setValue('location', e.target.value ? `In Person: ${e.target.value}` : 'In Person');
                        }}
                        className="h-[48px] rounded-xl bg-background shadow-xs mt-2"
                      />
                    </div>
                  )}
                </div>

                {/* Paid Event / Consultation Fee (Optional) */}
                <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                      💰 Collect Payment (Optional)
                    </Label>
                    <p className="text-xs text-muted-foreground">Charge invitees before confirming this meeting (e.g. consulting fee).</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price" className="text-xs font-medium text-muted-foreground mb-1 block">Price Amount (0 for free)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="h-[46px] rounded-xl bg-background shadow-xs"
                        {...form.register('price', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency" className="text-xs font-medium text-muted-foreground mb-1 block">Currency</Label>
                      <select
                        id="currency"
                        className="w-full h-[46px] rounded-xl bg-background border border-border px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                        {...form.register('currency')}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="AUD">AUD ($)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="description" className="text-base font-semibold">Description (Optional)</Label>
                  <textarea
                    id="description"
                    className="flex min-h-[100px] w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
                    placeholder="Describe the purpose of this Meet..."
                    {...form.register('description')}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="confirmationMessage" className="text-base font-semibold">Custom Confirmation Message (Optional)</Label>
                  <textarea
                    id="confirmationMessage"
                    className="flex min-h-[80px] w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
                    placeholder="Thanks for booking! Please join from the Google Meet link..."
                    {...form.register('confirmationMessage')}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="redirectUrl" className="text-base font-semibold">Redirect After Booking (Optional)</Label>
                  <Input
                    id="redirectUrl"
                    className="h-[50px] rounded-xl bg-background shadow-sm"
                    placeholder="https://yourwebsite.com/thank-you"
                    {...form.register('redirectUrl')}
                  />
                  {form.formState.errors.redirectUrl && (
                    <p className="text-sm text-destructive">{form.formState.errors.redirectUrl.message}</p>
                  )}
                </div>

                {/* Group Event Settings */}
                <div className="space-y-4 border border-border/50 rounded-2xl p-5 bg-card/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold">Group Event (1-to-Many)</Label>
                        <p className="text-sm text-muted-foreground mt-0.5">Allow multiple people to book the same time slot simultaneously.</p>
                      </div>
                    </div>
                    <Switch
                      checked={form.watch('isGroupEvent')}
                      onCheckedChange={(val) => form.setValue('isGroupEvent', val)}
                    />
                  </div>
                  
                  {form.watch('isGroupEvent') && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-border/50">
                      <Label htmlFor="maxInvitees" className="text-sm font-semibold">Maximum Attendees Per Slot</Label>
                      <Input
                        id="maxInvitees"
                        type="number"
                        min="1"
                        className="h-[44px] mt-2 max-w-[200px] rounded-xl bg-background shadow-sm"
                        {...form.register('maxInvitees', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">When this limit is reached, the time slot will automatically close.</p>
                    </motion.div>
                  )}
                </div>

                {/* Team Scheduling Type */}
                <div className="space-y-4 border border-border/50 rounded-2xl p-5 bg-card/60">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                      <UsersRound className="w-5 h-5" />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">Scheduling Type</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">Control how meetings are distributed across hosts.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: 'PERSONAL', label: 'Personal', description: 'Only you', icon: <Users className="w-4 h-4" /> },
                      { value: 'ROUND_ROBIN', label: 'Round Robin', description: 'Rotate hosts', icon: <Shuffle className="w-4 h-4" /> },
                      { value: 'COLLECTIVE', label: 'Collective', description: 'All hosts required', icon: <GitMerge className="w-4 h-4" /> },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSchedulingType(opt.value as any)}
                        className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${schedulingType === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}
                      >
                        <div className={`mb-2 ${schedulingType === opt.value ? 'text-primary' : 'text-muted-foreground'}`}>
                          {opt.icon}
                        </div>
                        <span className="font-semibold text-sm">{opt.label}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{opt.description}</span>
                      </button>
                    ))}
                  </div>

                  {schedulingType !== 'PERSONAL' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-border/50 space-y-4">
                      <div>
                        <Label className="text-sm font-semibold">Select Team</Label>
                        <select
                          className="mt-1.5 w-full h-10 rounded-xl bg-background border border-border px-3 text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                          value={selectedTeamId}
                          onChange={e => { setSelectedTeamId(e.target.value); setSelectedHostIds([]); }}
                        >
                          <option value="">-- Select a team --</option>
                          {teams?.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      {selectedTeamId && teamMembers.length > 0 && (
                        <div>
                          <Label className="text-sm font-semibold">Select Hosts</Label>
                          <p className="text-xs text-muted-foreground mb-2">Choose which team members can host this event.</p>
                          <div className="space-y-2">
                            {teamMembers.map((m: any) => (
                              <label key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedHostIds.includes(m.userId)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedHostIds(prev => [...prev, m.userId]);
                                    } else {
                                      setSelectedHostIds(prev => prev.filter(id => id !== m.userId));
                                    }
                                  }}
                                  className="w-4 h-4 rounded accent-primary"
                                />
                                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                                  {(m.user?.profile?.name || m.user?.email || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{m.user?.profile?.name || m.user?.email}</p>
                                  {m.user?.profile?.name && <p className="text-xs text-muted-foreground truncate">{m.user?.email}</p>}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Automated Workflow Reminders */}
                <div className="space-y-4 border border-border/50 rounded-2xl p-5 bg-card/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold">Automated Email Reminder (24h Before)</Label>
                        <p className="text-sm text-muted-foreground mt-0.5">Automatically send a reminder email to guests 24 hours prior to meeting.</p>
                      </div>
                    </div>
                    <Switch
                      checked={form.watch('enableReminder24h')}
                      onCheckedChange={(val) => form.setValue('enableReminder24h', val)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Custom Questions</h3>
                  <CustomQuestionsEditor control={form.control as any} />
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Event Color</Label>
                  <div className="flex gap-3 items-center">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => form.setValue('color', color)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${form.watch('color') === color ? 'ring-2 ring-offset-2 ring-offset-background scale-110 shadow-md' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      >
                        {form.watch('color') === color && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      className="w-10 h-10 rounded-full border-0 p-0 overflow-hidden cursor-pointer shadow-sm ml-2"
                      {...form.register('color')}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 text-sm font-medium text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
                  {error}
                </motion.div>
              )}

              <div className="flex justify-end gap-4 border-t border-border/50 pt-6">
                <Link href="/dashboard/events">
                  <Button variant="outline" type="button" className="rounded-full px-6 h-11">Cancel</Button>
                </Link>
                <Button type="submit" disabled={createMutation.isPending} className="rounded-full px-8 h-11 shadow-lg shadow-primary/25 hover:shadow-primary/40">
                  {createMutation.isPending ? 'Saving...' : (
                    <>
                      Save Event Type
                      <Sparkles className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
