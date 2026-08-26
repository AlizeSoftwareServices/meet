'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Check, Sparkles, Bell, Users } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';

const eventTypeSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  duration: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
  location: z.string().optional(),
  slug: z.string().min(2, 'URL slug is required'),
  color: z.string().optional(),
  isGroupEvent: z.boolean().optional(),
  maxInvitees: z.coerce.number().min(1).optional(),
  enableReminder24h: z.boolean().optional(),
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
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

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
    },
  });

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
    createMutation.mutate(data);
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
                      {...form.register('duration')}
                    />
                    {form.formState.errors.duration && (
                      <p className="text-sm text-destructive">{form.formState.errors.duration.message}</p>
                    )}
                  </div>
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
                        {...form.register('maxInvitees')}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">When this limit is reached, the time slot will automatically close.</p>
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
