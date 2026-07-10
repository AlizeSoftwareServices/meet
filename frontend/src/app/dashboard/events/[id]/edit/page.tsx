'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Check, Save } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const eventTypeSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  duration: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
  location: z.string().optional(),
  slug: z.string().min(2, 'URL slug is required'),
  color: z.string().optional(),
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

export default function EditEventTypePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event-type', params.id],
    queryFn: async () => {
      const res = await api.get(`/event-types/${params.id}`);
      return res.data;
    }
  });

  const form = useForm({
    resolver: zodResolver(eventTypeSchema),
    defaultValues: {
      title: '',
      description: '',
      duration: 30,
      location: 'Google Meet',
      slug: '',
      color: PRESET_COLORS[0],
    },
  });

  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description || '',
        duration: event.duration,
        location: event.location || '',
        slug: event.slug,
        color: event.color || PRESET_COLORS[0],
      });
    }
  }, [event, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EventTypeFormValues) => {
      const response = await api.patch(`/event-types/${params.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      queryClient.invalidateQueries({ queryKey: ['event-type', params.id] });
      router.push('/dashboard/events');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to update event type');
    },
  });

  const onSubmit = (data: EventTypeFormValues) => {
    setError(null);
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-10 flex justify-center">
        <div className="animate-pulse w-10 h-10 rounded-full bg-primary/20" />
      </div>
    );
  }

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
            Edit Event Type
          </h1>
          <p className="text-muted-foreground mt-1">Update the settings for this meeting type.</p>
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
                    placeholder="Describe the purpose of this meeting..."
                    {...form.register('description')}
                  />
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
                <Button type="submit" disabled={updateMutation.isPending} className="rounded-full px-8 h-11 shadow-lg shadow-primary/25 hover:shadow-primary/40">
                  {updateMutation.isPending ? 'Saving...' : (
                    <>
                      Save Changes
                      <Save className="w-4 h-4 ml-2" />
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
