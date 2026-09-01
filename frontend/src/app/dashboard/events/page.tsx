'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Link as LinkIcon, Plus, Trash2, Edit2, User, Users, ArrowRightLeft, CalendarDays, Link2, BarChart, Settings, Share2, Copy } from 'lucide-react';
import { shareMeetingLink } from '@/lib/nativeShare';
import { triggerHaptic } from '@/lib/haptics';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

export default function EventTypesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'event_types' | 'single_use' | 'polls'>('event_types');

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['event-types'],
    queryFn: async () => {
      const res = await api.get('/event-types');
      return res.data;
    },
  });

  const { data: polls, isLoading: pollsLoading } = useQuery({
    queryKey: ['polls'],
    queryFn: async () => {
      const res = await api.get('/polls');
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

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/event-types/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
    }
  });

  const generateLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/event-types/${id}/single-use-link`);
      return { id, data: res.data };
    },
    onSuccess: (result) => {
      const event = events?.find((e: any) => e.id === result.id);
      const url = `${window.location.origin}/book/me/${event?.slug}?singleUseToken=${result.data.token}`;
      navigator.clipboard.writeText(url);
      alert('Single-use link copied to clipboard!');
    }
  });

  const handleShare = async (event: any) => {
    const url = `${window.location.origin}/book/me/${event.slug}`;
    const opened = await shareMeetingLink({
      title: event.title || 'Schedule a Meeting',
      text: `Book a ${event.duration || 30}-min meeting with me on Meet:`,
      url,
      dialogTitle: `Share ${event.title}`
    });
    if (!opened) {
      alert('Link copied to clipboard!');
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-light text-foreground">Scheduling</h1>
        
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-10 font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          } />
          <DropdownMenuContent align="end" className="w-[340px] p-2 rounded-2xl shadow-xl border-border/50">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-bold px-2 py-1.5">Event type</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push('/dashboard/events/new?type=one-on-one')} className="p-3 rounded-xl cursor-pointer hover:bg-muted focus:bg-muted transition-colors group">
                <div className="flex gap-3">
                  <div className="mt-0.5"><User className="w-5 h-5 text-brand-blue" /></div>
                  <div>
                    <p className="font-bold text-foreground">One-on-one</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5 group-hover:text-foreground/70">1 host, 1 invitee</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Good for coffee chats, 1:1 interviews, etc.</p>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/events/new?type=group')} className="p-3 rounded-xl cursor-pointer hover:bg-muted focus:bg-muted transition-colors group">
                <div className="flex gap-3">
                  <div className="mt-0.5"><Users className="w-5 h-5 text-brand-purple" /></div>
                  <div>
                    <p className="font-bold text-foreground">Group</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5 group-hover:text-foreground/70">1 host, Multiple invitees</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Webinars, online classes, etc.</p>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/events/new?type=round-robin')} className="p-3 rounded-xl cursor-pointer hover:bg-muted focus:bg-muted transition-colors group">
                <div className="flex gap-3">
                  <div className="mt-0.5"><ArrowRightLeft className="w-5 h-5 text-brand-red" /></div>
                  <div>
                    <p className="font-bold text-foreground">Round robin</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5 group-hover:text-foreground/70">Rotating hosts, 1 invitee</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Distribute meetings between team members</p>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/events/new?type=collective')} className="p-3 rounded-xl cursor-pointer hover:bg-muted focus:bg-muted transition-colors group">
                <div className="flex gap-3">
                  <div className="mt-0.5"><CalendarDays className="w-5 h-5 text-brand-green" /></div>
                  <div>
                    <p className="font-bold text-foreground">Collective</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5 group-hover:text-foreground/70">Multiple hosts, 1 invitee</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Panel interviews, group sales calls, etc.</p>
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator className="my-2 bg-border/50" />
            
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-bold px-2 py-1.5">More ways to meet</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push('/dashboard/events/new?type=one-off')} className="p-3 rounded-xl cursor-pointer hover:bg-muted focus:bg-muted transition-colors group">
                <div className="flex gap-3">
                  <div className="mt-0.5"><Link2 className="w-5 h-5 text-zinc-500" /></div>
                  <div>
                    <p className="font-bold text-foreground">One-off meeting</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5 group-hover:text-foreground/70">Offer time outside your normal schedule</p>
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex gap-6 border-b border-border">
        {['event_types', 'single_use'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === tab 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'event_types' && 'Event types'}
            {tab === 'single_use' && 'Single-use links'}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTabIndicator" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" 
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'event_types' && (
            <div className="space-y-6">
              {eventsLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 bg-card animate-pulse rounded-2xl border border-border/50 shadow-sm" />
                  ))}
                </div>
              ) : events?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-card border border-border/60 rounded-3xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-blue/80" />
                  <div className="w-20 h-20 bg-brand-blue/10 rounded-full flex items-center justify-center mb-6">
                    <Calendar className="w-10 h-10 text-brand-blue" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">No event types yet</h3>
                  <p className="text-muted-foreground font-medium max-w-md mb-8">
                    Create your first event type to allow people to schedule meetings with you.
                  </p>
                  <Button onClick={() => router.push('/dashboard/events/new?type=one-on-one')} className="rounded-full px-8 h-12 font-bold shadow-md bg-brand-blue hover:bg-brand-blue/90 text-white transition-all hover:scale-105 active:scale-95">
                    <Plus className="w-4 h-4 mr-2" /> Create Event Type
                  </Button>
                </div>
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {events?.map((event: any) => (
                    <motion.div key={event.id} variants={itemVariants} whileHover={{ y: -4 }}>
                      <Card className={`h-[240px] flex flex-col relative overflow-hidden group shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all duration-300 border-border/50 bg-card rounded-2xl ${!event.isActive && 'opacity-60 grayscale-[0.2]'}`}>
                        <div className="absolute top-0 left-0 w-full h-1.5 transition-all duration-300" style={{ backgroundColor: event.color || '#00a2ff' }} />
                        
                        <div className="absolute top-4 right-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center text-muted-foreground hover:bg-accent h-8 w-8 rounded-full outline-none">
                              <Settings className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border-border">
                              <DropdownMenuItem 
                                className="cursor-pointer font-medium" 
                                onClick={() => router.push(`/dashboard/events/${event.id}/edit`)}
                              >
                                <Edit2 className="w-4 h-4 mr-2 text-muted-foreground" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="cursor-pointer font-medium" 
                                onClick={() => generateLinkMutation.mutate(event.id)}
                              >
                                <Link2 className="w-4 h-4 mr-2 text-muted-foreground" /> Single-use link
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="cursor-pointer font-medium" 
                                onClick={() => duplicateMutation.mutate(event.id)}
                              >
                                <Copy className="w-4 h-4 mr-2 text-muted-foreground" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer font-medium text-destructive focus:text-destructive" onClick={() => deleteMutation.mutate(event.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <CardHeader className="pb-2 pt-6 px-6 flex-1">
                          <div>
                            <CardTitle className="text-xl font-bold text-foreground mb-1">{event.title}</CardTitle>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                              {event.duration} mins • {event.location}
                            </p>
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-xs font-semibold text-foreground/70">
                              {event.type === 'ONE_ON_ONE' && <User className="w-3 h-3" />}
                              {event.type === 'GROUP' && <Users className="w-3 h-3" />}
                              {event.type === 'ROUND_ROBIN' && <ArrowRightLeft className="w-3 h-3" />}
                              {event.type === 'COLLECTIVE' && <CalendarDays className="w-3 h-3" />}
                              {event.typeLabel || 'One-on-one'}
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardFooter className="border-t border-border/50 px-4 py-4 flex justify-between items-center bg-muted/10">
                          <Button variant="ghost" size="sm" onClick={() => handleShare(event)} className="text-primary hover:text-primary hover:bg-primary/10 rounded-lg font-bold px-3">
                            <Share2 className="w-4 h-4 mr-2" />
                            Share link
                          </Button>
                          
                          <div className="flex items-center gap-3">
                            <Switch checked={event.isActive} onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: event.id, isActive: checked })} />
                          </div>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {activeTab === 'single_use' && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center border border-border/60 rounded-3xl bg-card shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-blue to-brand-purple" />
              <div className="w-20 h-20 bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <Link2 className="w-10 h-10 text-brand-blue" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Share a single-use link</h3>
              <p className="text-muted-foreground font-medium max-w-md mb-10 leading-relaxed">
                Generate a unique link that expires after it's booked once. Perfect for offering times outside your normal schedule.
              </p>
              <div className="text-sm text-left max-w-md w-full bg-muted/40 p-7 rounded-2xl border border-border/50">
                <h4 className="font-bold text-foreground mb-4 flex items-center"><Settings className="w-4 h-4 mr-2 text-brand-blue" /> How to use</h4>
                <ul className="space-y-4 text-muted-foreground font-medium">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-foreground">1</span>
                    <span>Go back to the <strong className="text-foreground">Event types</strong> tab</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-foreground">2</span>
                    <span>Click the <Settings className="w-4 h-4 inline-block mx-0.5 text-foreground" /> icon on any event</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-foreground">3</span>
                    <span>Select <strong className="text-foreground">Single-use link</strong> to copy a one-time link</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
