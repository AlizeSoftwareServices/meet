'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Code, Link as LinkIcon, Plus, Trash2, Edit2, User, Users, ArrowRightLeft, CalendarDays, Link2, BarChart, Settings, Share2, Copy, QrCode, Download, X } from 'lucide-react';
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
  const [selectedQrEvent, setSelectedQrEvent] = useState<any | null>(null);
  const [selectedEmbedEvent, setSelectedEmbedEvent] = useState<any | null>(null);
  const [embedTab, setEmbedTab] = useState<'inline' | 'popup'>('inline');

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
        <h1 className="text-3xl font-heading font-extrabold tracking-tight text-foreground">Scheduling</h1>
        
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
                                onClick={() => setSelectedEmbedEvent(event)}
                              >
                                <Code className="w-4 h-4 mr-2 text-muted-foreground" /> Add to website
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
                        
                        <CardFooter className="border-t border-border/50 px-4 py-3 flex justify-between items-center bg-muted/10">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleShare(event)} 
                              className="text-primary hover:text-primary hover:bg-primary/10 rounded-lg font-bold px-2.5 h-8 text-xs gap-1.5"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              Share
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={async () => {
                                const url = `${window.location.origin}/book/me/${event.slug}`;
                                await navigator.clipboard.writeText(url);
                                triggerHaptic('light');
                                alert('Link copied to clipboard!');
                              }} 
                              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg font-medium px-2 h-8 text-xs gap-1"
                              title="Copy link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Copy
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                triggerHaptic('light');
                                setSelectedQrEvent(event);
                              }} 
                              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg font-medium px-2 h-8 text-xs gap-1"
                              title="Show QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              QR
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2">
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

      {/* QR Code Modal for In-Person & Mobile Booking */}
      <AnimatePresence>
        {selectedQrEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center"
            >
              <button 
                onClick={() => setSelectedQrEvent(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <QrCode className="w-6 h-6" />
              </div>

              <h3 className="font-heading font-extrabold text-xl text-foreground">
                {selectedQrEvent.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-5">
                Scan with any mobile camera to open this booking page immediately.
              </p>

              <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-inner mb-6">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/book/me/${selectedQrEvent.slug}` : '')}`} 
                  alt="Booking QR Code" 
                  className="w-48 h-48 rounded-lg"
                />
              </div>

              <div className="flex gap-2 w-full">
                <Button 
                  className="flex-1 rounded-xl gap-2 font-bold text-xs h-10"
                  onClick={async () => {
                    const url = `${window.location.origin}/book/me/${selectedQrEvent.slug}`;
                    await navigator.clipboard.writeText(url);
                    triggerHaptic('light');
                    alert('Booking URL copied to clipboard!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
                <a 
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=15&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/book/me/${selectedQrEvent.slug}` : '')}`}
                  target="_blank"
                  download={`meet-qr-${selectedQrEvent.slug}.png`}
                  className="inline-flex items-center justify-center px-4 rounded-xl border border-border hover:bg-muted text-xs font-semibold h-10 transition-colors"
                  title="Download High-Res QR"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embed on Website Modal */}
      <AnimatePresence>
        {selectedEmbedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative flex flex-col"
            >
              <button 
                onClick={() => setSelectedEmbedEvent(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-600/10 text-violet-600 flex items-center justify-center">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-xl text-foreground">
                    Add to Website
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Embed {selectedEmbedEvent.title} seamlessly onto your website or landing page.
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 my-4 p-1 bg-muted/40 rounded-xl border border-border/50">
                <button
                  onClick={() => setEmbedTab('inline')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    embedTab === 'inline' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Inline Embed (iFrame)
                </button>
                <button
                  onClick={() => setEmbedTab('popup')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    embedTab === 'popup' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Popup Button
                </button>
              </div>

              {/* Code snippet display */}
              <div className="relative mb-5">
                <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto max-h-48 border border-zinc-800">
                  <code>
                    {embedTab === 'inline' ? (
`<iframe 
  src="${typeof window !== 'undefined' ? window.location.origin : 'https://meet.alizesoftwareservices.com'}/book/me/${selectedEmbedEvent.slug}" 
  width="100%" 
  height="700px" 
  frameborder="0"
  style="border: 0; min-height: 650px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"
></iframe>`
                    ) : (
`<a 
  href="${typeof window !== 'undefined' ? window.location.origin : 'https://meet.alizesoftwareservices.com'}/book/me/${selectedEmbedEvent.slug}" 
  target="_blank" 
  style="display: inline-flex; align-items: center; padding: 12px 24px; background: #6366f1; color: #fff; font-weight: bold; border-radius: 9999px; text-decoration: none; font-family: sans-serif; box-shadow: 0 4px 14px rgba(99,102,241,0.4);"
>
  📅 Schedule a Meeting
</a>`
                    )}
                  </code>
                </pre>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  Works with WordPress, Webflow, Squarespace, Shopify, React, and plain HTML.
                </p>
                <Button
                  className="rounded-xl font-bold text-xs gap-1.5 shrink-0"
                  onClick={async () => {
                    const code = embedTab === 'inline' 
                      ? `<iframe src="${window.location.origin}/book/me/${selectedEmbedEvent.slug}" width="100%" height="700px" frameborder="0" style="border: 0; min-height: 650px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"></iframe>`
                      : `<a href="${window.location.origin}/book/me/${selectedEmbedEvent.slug}" target="_blank" style="display: inline-flex; align-items: center; padding: 12px 24px; background: #6366f1; color: #fff; font-weight: bold; border-radius: 9999px; text-decoration: none; font-family: sans-serif; box-shadow: 0 4px 14px rgba(99,102,241,0.4);">📅 Schedule a Meeting</a>`;
                    await navigator.clipboard.writeText(code);
                    triggerHaptic('light');
                    alert('Embed code copied to clipboard!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                  Copy Embed Code
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
