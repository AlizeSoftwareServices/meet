'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Video, Copy, ExternalLink, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MeetLoader } from '@/components/ui/meet-loader';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: any | null;
}

export function ScheduleMeetingModal({ isOpen, onClose, contact }: ScheduleMeetingModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch host's profile for username
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/profile');
      return res.data;
    },
  });

  // Fetch event types
  const { data: eventTypes, isLoading } = useQuery({
    queryKey: ['event-types'],
    queryFn: async () => {
      const res = await api.get('/event-types');
      return res.data;
    },
  });

  const generatePersonalizedLink = (slug: string) => {
    if (!profile?.username) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://meet.alizesoftwareservices.com';
    const params = new URLSearchParams();
    if (contact?.name) params.set('name', contact.name);
    if (contact?.email) params.set('email', contact.email);
    if (contact?.company) params.set('company', contact.company);
    if (contact?.phone) params.set('phone', contact.phone);

    return `${base}/book/${profile.username}/${slug}?${params.toString()}`;
  };

  const handleCopyLink = (event: any) => {
    const url = generatePersonalizedLink(event.slug);
    navigator.clipboard.writeText(url);
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenBooking = (event: any) => {
    const url = generatePersonalizedLink(event.slug);
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && contact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-xl bg-card border border-border shadow-2xl rounded-2xl p-6 sm:p-8 z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Schedule with {contact.name}</h2>
                  <p className="text-xs text-muted-foreground">{contact.email}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="mt-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Select an event type below. The link will automatically pre-fill <strong>{contact.name}</strong>'s details for instant booking without re-entering email or name!
                </p>
              </div>

              {isLoading ? (
                <div className="py-12 flex justify-center">
                  <MeetLoader size="md" variant="brand" text="Loading event types..." />
                </div>
              ) : eventTypes && eventTypes.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {eventTypes.map((event: any) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-xl border border-border/80 bg-background/50 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: event.color || '#2563eb' }}
                          />
                          <h4 className="font-semibold text-sm text-foreground">{event.title}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {event.duration} mins
                          </span>
                          <span className="flex items-center gap-1">
                            <Video className="w-3.5 h-3.5" /> {event.location || 'Video Call'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(event)}
                          className="h-8 text-xs rounded-lg gap-1.5 font-medium"
                        >
                          {copiedId === event.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied Link
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Link
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleOpenBooking(event)}
                          className="h-8 text-xs rounded-lg gap-1.5 bg-primary text-primary-foreground font-medium shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Book Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No active event types found. Please create an event type first in Dashboard &gt; Event Types.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-border mt-5">
              <Button variant="outline" onClick={onClose} className="rounded-xl">
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

