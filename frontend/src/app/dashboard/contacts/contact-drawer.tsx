'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  Clock,
  Video,
  FileText,
  Tag,
  Trash2,
  Edit2,
  ExternalLink,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MeetLoader } from '@/components/ui/meet-loader';

interface ContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contact: any | null;
  onEdit: (contact: any) => void;
  onDelete: (id: string) => void;
  onSchedule: (contact: any) => void;
}

export function ContactDrawer({
  isOpen,
  onClose,
  contact,
  onEdit,
  onDelete,
  onSchedule,
}: ContactDrawerProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(contact?.notes || '');
  const [isSavedNote, setIsSavedNote] = useState(false);

  React.useEffect(() => {
    if (contact) {
      setNotes(contact.notes || '');
      setIsSavedNote(false);
    }
  }, [contact]);

  // Fetch meeting history for this contact
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['contact-bookings', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      const res = await api.get(`/contacts/${contact.id}/bookings`);
      return res.data;
    },
    enabled: Boolean(isOpen && contact?.id),
  });

  // Save notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      if (!contact?.id) return;
      return api.patch(`/contacts/${contact.id}`, { notes });
    },
    onSuccess: () => {
      setIsSavedNote(true);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setTimeout(() => setIsSavedNote(false), 2000);
    },
  });

  return (
    <AnimatePresence>
      {isOpen && contact && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-screen max-w-md bg-card border-l border-border shadow-2xl flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-6 border-b border-border/80 bg-background/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    Contact Details
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(contact)}
                      className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground"
                      title="Edit Contact"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(contact.id)}
                      className="w-8 h-8 rounded-full text-muted-foreground hover:text-destructive"
                      title="Delete Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground ml-1"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Profile Overview */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                    {contact.name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <h3 className="text-xl font-bold tracking-tight text-foreground truncate">
                      {contact.name}
                    </h3>
                    {(contact.jobTitle || contact.company) && (
                      <p className="text-xs text-muted-foreground truncate font-medium">
                        {contact.jobTitle ? contact.jobTitle : ''}
                        {contact.jobTitle && contact.company ? ' at ' : ''}
                        {contact.company ? contact.company : ''}
                      </p>
                    )}
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {contact.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Toolbar */}
                <div className="grid grid-cols-2 gap-2 mt-5">
                  <Button
                    onClick={() => onSchedule(contact)}
                    className="w-full h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Schedule Meet
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`mailto:${contact.email}`, '_blank')}
                    className="w-full h-9 rounded-xl text-xs font-semibold gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-primary" /> Send Email
                  </Button>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Contact Info
                  </h4>
                  <div className="space-y-2.5 rounded-xl border border-border/80 bg-background/50 p-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" /> Email:
                      </span>
                      <a href={`mailto:${contact.email}`} className="font-semibold text-primary hover:underline truncate max-w-[200px]">
                        {contact.email}
                      </a>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5" /> Phone:
                        </span>
                        <a href={`tel:${contact.phone}`} className="font-semibold text-foreground hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                    {contact.company && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Building className="w-3.5 h-3.5" /> Company:
                        </span>
                        <span className="font-semibold text-foreground">{contact.company}</span>
                      </div>
                    )}
                    {contact.jobTitle && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5" /> Role:
                        </span>
                        <span className="font-semibold text-foreground">{contact.jobTitle}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> Total Meets:
                      </span>
                      <span className="font-bold text-foreground">
                        {contact.totalMeetings ?? 0} Meetings
                      </span>
                    </div>
                  </div>
                </div>

                {/* Private Host Notes */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Private Host Notes
                    </h4>
                    {isSavedNote && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Saved!
                      </span>
                    )}
                  </div>
                  <Textarea
                    placeholder="Write private notes about this contact (requirements, discussion history, preferences)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[100px] text-xs resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saveNotesMutation.isPending || notes === contact.notes}
                      onClick={() => saveNotesMutation.mutate()}
                      className="text-xs h-7 rounded-lg gap-1 font-medium"
                    >
                      <Save className="w-3 h-3" /> Save Note
                    </Button>
                  </div>
                </div>

                {/* Meeting History Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Meeting History
                  </h4>

                  {isLoadingBookings ? (
                    <div className="py-6 flex justify-center">
                      <MeetLoader size="sm" variant="dots" text="Loading meeting history..." />
                    </div>
                  ) : bookings && bookings.length > 0 ? (
                    <div className="space-y-2.5">
                      {bookings.map((b: any) => {
                        const isUpcoming = new Date(b.startTime) > new Date();
                        return (
                          <div
                            key={b.id}
                            className="p-3 rounded-xl border border-border/80 bg-background/50 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                {b.eventType?.title || 'Scheduled Meeting'}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  b.status === 'CONFIRMED'
                                    ? isUpcoming
                                      ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    : 'bg-destructive/10 text-destructive'
                                }`}
                              >
                                {b.status === 'CONFIRMED' ? (isUpcoming ? 'UPCOMING' : 'COMPLETED') : b.status}
                              </span>
                            </div>

                            <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
                              <span>📅 {new Date(b.startTime).toLocaleDateString()}</span>
                              <span>⏰ {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {b.meetLink && (
                              <div className="pt-1 flex items-center justify-between border-t border-border/50">
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Video className="w-3 h-3 text-blue-600" /> Google Meet
                                </span>
                                <a
                                  href={b.meetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px]"
                                >
                                  Join <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border/80 bg-muted/20">
                      <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-foreground">No meetings recorded</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Meetings booked with this email will appear here automatically.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-background/50 flex justify-between items-center text-xs text-muted-foreground">
                <span>Joined {new Date(contact.createdAt).toLocaleDateString()}</span>
                <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg h-8">
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
