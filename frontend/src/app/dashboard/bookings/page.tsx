'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, User, XCircle, FileText, Filter, CheckCircle2, MoreHorizontal, UserX } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'UPCOMING' | 'PENDING' | 'PAST';

export default function BookingsManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('UPCOMING');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings/host');
      return res.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/bookings/${id}/cancel`, { reason });
      return res.data;
    },
    onMutate: ({ id }) => setCancellingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setCancellingId(null);
    },
    onError: () => setCancellingId(null),
  });

  const noShowMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/bookings/${id}/no-show`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const cancelSeriesMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/bookings/series/${id}/cancel`, { reason });
      return res.data;
    },
    onMutate: ({ id }) => setCancellingId(`series-${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setCancellingId(null);
    },
    onError: () => setCancellingId(null),
  });

  const handleCancel = (id: string) => {
    if (confirm('Are you sure you want to cancel this booking? An email will be sent to the guest.')) {
      cancelMutation.mutate({ id, reason: 'Host cancelled via dashboard.' });
    }
  };

  const handleCancelSeries = (seriesId: string) => {
    if (confirm('Cancel entire series?\n\nThis will cancel all remaining future meetings in this recurring series.\nPast meetings will remain unchanged.')) {
      cancelSeriesMutation.mutate({ id: seriesId, reason: 'Host cancelled series via dashboard.' });
    }
  };

  const handleMarkNoShow = (id: string) => {
    if (confirm('Mark this guest as a No-Show?')) {
      noShowMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0"><CheckCircle2 className="w-3 h-3 mr-1"/> Confirmed</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0"><XCircle className="w-3 h-3 mr-1"/> Cancelled</Badge>;
      case 'RESCHEDULED':
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-0"><Clock className="w-3 h-3 mr-1"/> Rescheduled</Badge>;
      case 'NO_SHOW':
        return <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-0"><UserX className="w-3 h-3 mr-1"/> No Show</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const now = new Date();

  // Filter bookings based on active tab
  const filteredBookings = bookings?.filter((booking: any) => {
    const bookingDate = new Date(booking.startTime);
    if (activeTab === 'UPCOMING') {
      return bookingDate > now && booking.status !== 'CANCELLED';
    } else if (activeTab === 'PAST') {
      return bookingDate <= now || booking.status === 'CANCELLED';
    } else if (activeTab === 'PENDING') {
      // Assuming PENDING is a status we might use later, for now we just show none
      return booking.status === 'PENDING';
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Bookings
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage your schedule and review invitee details.</p>
        </div>
        <Button variant="outline" className="rounded-full shadow-sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </motion.div>

      {/* Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex border-b border-border/50 gap-6"
      >
        {(['UPCOMING', 'PENDING', 'PAST'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-all relative ${activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTab"
                className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-primary rounded-t-full"
              />
            )}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-lg relative overflow-hidden min-h-[400px]">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-muted/50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredBookings?.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {filteredBookings.map((booking: any) => (
                    <div key={booking.id} className="p-6 md:p-8 flex flex-col lg:flex-row lg:items-start justify-between gap-6 hover:bg-muted/10 transition-colors">
                      <div className="flex gap-6 flex-1">
                        
                        {/* Avatar initials (Fallback) */}
                        <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary items-center justify-center font-bold text-lg border border-primary/20">
                          {booking.guestName.charAt(0).toUpperCase()}
                        </div>

                        <div className="space-y-4 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-bold text-xl">{booking.guestName}</h3>
                            {booking.isExternal ? (
                              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold gap-1">
                                🔵 Google Calendar (Synced)
                              </Badge>
                            ) : (
                              getStatusBadge(booking.status)
                            )}
                            {booking.bookingSeriesId && (
                              <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
                                Recurring
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-foreground/80">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-primary/70" />
                              {new Date(booking.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-primary/70" />
                              {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-primary/70" />
                              <a href={`mailto:${booking.guestEmail}`} className="hover:text-primary transition-colors">{booking.guestEmail || 'Google Calendar Event'}</a>
                            </div>
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4 text-primary/70" />
                              <span className="font-medium">{booking.eventType?.title || (booking.isExternal ? 'Google Calendar' : 'Meet')}</span>
                            </div>
                          </div>

                          {booking.guestNotes && (
                            <div className="mt-4 text-sm bg-muted/30 border border-border/50 p-4 rounded-xl flex gap-3">
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                              <p className="text-muted-foreground leading-relaxed">{booking.guestNotes}</p>
                            </div>
                          )}
                          {booking.status === 'CANCELLED' && booking.cancelReason && (
                            <div className="mt-4 text-sm text-destructive bg-destructive/5 border border-destructive/20 p-4 rounded-xl">
                              <span className="font-semibold block mb-1">Cancellation Reason: </span>
                              {booking.cancelReason}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-row lg:flex-col gap-3 min-w-[140px] pt-2 sm:pl-[72px] lg:pl-0">
                        {booking.isExternal ? (
                          booking.meetingUrl ? (
                            <a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold gap-1.5 shadow-sm">
                                <Video className="w-3.5 h-3.5" />
                                Join Meeting
                              </Button>
                            </a>
                          ) : (
                            <Button variant="outline" disabled className="w-full rounded-full text-xs">
                              Google Synced
                            </Button>
                          )
                        ) : (
                          booking.status === 'CONFIRMED' && new Date(booking.startTime) > now && (
                            <>
                              <Button 
                                variant="outline" 
                                className="w-full text-destructive border-destructive/20 hover:text-destructive hover:bg-destructive/10 rounded-full"
                                onClick={() => handleCancel(booking.id)}
                                disabled={cancelMutation.isPending && cancellingId === booking.id}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                {cancelMutation.isPending && cancellingId === booking.id ? 'Cancelling...' : 'Cancel Occurrence'}
                              </Button>
                              {booking.bookingSeriesId && (
                                <Button 
                                  variant="outline" 
                                  className="w-full text-destructive border-destructive/20 hover:text-destructive hover:bg-destructive/10 rounded-full"
                                  onClick={() => handleCancelSeries(booking.bookingSeriesId)}
                                  disabled={cancelSeriesMutation.isPending && cancellingId === `series-${booking.bookingSeriesId}`}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  {cancelSeriesMutation.isPending && cancellingId === `series-${booking.bookingSeriesId}` ? 'Cancelling...' : 'Cancel Series'}
                                </Button>
                              )}
                              <Button variant="secondary" className="w-full rounded-full bg-secondary hover:bg-secondary/80">
                                Reschedule
                              </Button>
                            </>
                          )
                        )}
                        {!booking.isExternal && new Date(booking.startTime) <= now && (booking.status === 'CONFIRMED' || booking.status === 'RESCHEDULED') && (
                          <Button 
                            variant="outline"
                            className="w-full text-amber-600 border-amber-500/20 hover:bg-amber-500/10 rounded-full text-xs"
                            onClick={() => handleMarkNoShow(booking.id)}
                            disabled={noShowMutation.isPending}
                          >
                            <UserX className="w-3.5 h-3.5 mr-1.5" />
                            Mark No-Show
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="hidden lg:flex self-end mt-auto text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 px-6 flex flex-col items-center justify-center h-full">
                  <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                    <Calendar className="w-10 h-10 text-primary/40" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No {activeTab.toLowerCase()} bookings</h3>
                  <p className="text-muted-foreground max-w-sm">
                    {activeTab === 'UPCOMING' 
                      ? "You don't have any upcoming Meets scheduled yet. Share your event links to get booked!" 
                      : `No ${activeTab.toLowerCase()} Meets found in your history.`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
