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
import { ArrowLeft, Check, Sparkles, Bell, Users, UsersRound, Shuffle, GitMerge } from 'lucide-react';
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
    }
  }, [searchParams, form]);

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
                  <Label htmlFor="location" className="text-base font-semibold">Location</Label>
                  <Input
                    id="location"
                    className="h-[50px] rounded-xl bg-background shadow-sm"
                    placeholder="e.g. Google Meet, Zoom, Phone call"
                    {...form.register('location')}
                  />
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
