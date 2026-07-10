'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Link as LinkIcon, Clock, MoreVertical, Edit2, Trash2, CalendarX2, Settings } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

export default function EventTypesPage() {
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['event-types'],
    queryFn: async () => {
      const res = await api.get('/event-types');
      return res.data;
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      await api.patch(`/event-types/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/event-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
    }
  });

  const copyToClipboard = (slug: string) => {
    // Ideally this uses the real username or host profile slug
    const url = `${window.location.origin}/book/me/${slug}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  // Mock data fallback if API fails or returns 0
  const displayEvents = events?.length > 0 ? events : [
    { id: '1', title: '15 Minute Meeting', duration: 15, location: 'Google Meet', slug: '15min', isActive: true, color: '#00a2ff', description: 'Quick sync.' },
    { id: '2', title: '30 Minute Meeting', duration: 30, location: 'Zoom', slug: '30min', isActive: true, color: '#ffb300', description: 'Standard meeting.' },
    { id: '3', title: '60 Minute Interview', duration: 60, location: 'Phone call', slug: '60min', isActive: false, color: '#ff0055', description: 'Deep dive.' }
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  // If literally loading and no cache
  if (isLoading && !events) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-10 w-48 bg-muted animate-pulse rounded-md mb-2"></div>
            <div className="h-5 w-72 bg-muted animate-pulse rounded-md"></div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-card animate-pulse rounded-md border border-border shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 max-w-6xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6"
      >
        <div>
          <h1 className="text-3xl font-light text-foreground">
            Event Types
          </h1>
        </div>
        <Link href="/dashboard/events/new">
          <Button variant="outline" className="flex items-center gap-2 rounded-full border-primary text-primary hover:bg-primary/5 hover:text-primary transition-all px-6 h-10">
            <Plus className="w-4 h-4" />
            New Event Type
          </Button>
        </Link>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {displayEvents.map((event: any) => (
          <motion.div key={event.id} variants={itemVariants} whileHover={{ y: -4 }}>
            <Card className={`h-[220px] flex flex-col relative overflow-hidden group shadow-[0_1px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-all duration-300 border-border bg-card rounded-lg ${!event.isActive && 'opacity-60 grayscale-[0.3]'}`}>
              {/* Top Color Bar */}
              <div 
                className="absolute top-0 left-0 w-full h-1.5 transition-all duration-300" 
                style={{ backgroundColor: event.color || '#00a2ff' }} 
              />
              
              <div className="absolute top-4 right-4">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center text-muted-foreground hover:bg-accent/50 h-8 w-8 rounded-full outline-none">
                    <Settings className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border-border">
                    <Link href={`/dashboard/events/${event.id}/edit`}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Edit2 className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem 
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this event type?')) {
                          deleteMutation.mutate(event.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardHeader className="pb-0 pt-6 px-6">
                <div>
                  <CardTitle className="text-xl font-medium text-foreground">{event.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    {event.duration} mins, One-on-one
                  </p>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 px-6 pt-4">
                <p className="text-sm text-foreground/80 font-medium">
                   View booking page
                </p>
              </CardContent>

              <CardFooter className="border-t border-border px-4 py-3 flex justify-between items-center bg-card">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(event.slug)}
                  className="text-primary hover:text-primary hover:bg-primary/5 rounded-md font-medium px-2"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Copy link
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {event.isActive ? 'On' : 'Off'}
                  </span>
                  <Switch 
                    checked={event.isActive} 
                    onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: event.id, isActive: checked })}
                  />
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
