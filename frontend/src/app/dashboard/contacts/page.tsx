'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Download,
  Upload,
  Plus,
  Trash2,
  Mail,
  Phone,
  Building,
  Calendar,
  Sparkles,
  ExternalLink,
  X,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MeetLoader } from '@/components/ui/meet-loader';
import { AddContactModal } from './add-contact-modal';
import { ImportCSVModal } from './import-csv-modal';
import { ScheduleMeetingModal } from './schedule-meeting-modal';
import { ContactDrawer } from './contact-drawer';

const TAG_FILTERS = ['All', 'Lead', 'Client', 'VIP', 'Partner', 'Candidate'];

export default function ContactsPage() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  // Modals & Drawer state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<any | null>(null);
  const [selectedContactForDrawer, setSelectedContactForDrawer] = useState<any | null>(null);
  const [contactToSchedule, setContactToSchedule] = useState<any | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch contacts
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', search, selectedTag],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedTag && selectedTag !== 'All') params.append('tag', selectedTag);
      const res = await api.get(`/contacts?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch host's profile for username (for quick profile link)
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      if (selectedContactForDrawer) setSelectedContactForDrawer(null);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await api.post('/contacts/bulk-delete', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setSelectedIds([]);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} contacts?`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && contacts) {
      setSelectedIds(contacts.map((c: any) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = (exportContacts = contacts) => {
    if (!exportContacts || exportContacts.length === 0) return;

    const headers = ['Name', 'Email', 'Phone', 'Company', 'Job Title', 'Tags', 'Total Meets', 'Last Meet Date'];
    const csvContent = [
      headers.join(','),
      ...exportContacts.map((c: any) => [
        `"${c.name || ''}"`,
        `"${c.email || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.company || ''}"`,
        `"${c.jobTitle || ''}"`,
        `"${(c.tags || []).join(';')}"`,
        c.totalMeetings ?? 0,
        c.lastMeetingDate ? `"${new Date(c.lastMeetingDate).toLocaleDateString()}"` : '""',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meet_contacts_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkExport = () => {
    const selected = contacts?.filter((c: any) => selectedIds.includes(c.id));
    handleExport(selected);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Contacts
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your network, client relationships, and meeting histories.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="rounded-xl h-9 gap-1.5 text-xs font-semibold"
          >
            <Upload className="w-3.5 h-3.5 text-primary" /> Import CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport()}
            disabled={!contacts || contacts.length === 0}
            className="rounded-xl h-9 gap-1.5 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setContactToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="rounded-xl h-9 gap-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Add Contact
          </Button>
        </div>
      </motion.div>

      {/* Search & Tag Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card/60 backdrop-blur-md p-2 rounded-2xl border border-border/70 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, company, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background/60 border-border/60"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tag Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          <span className="text-muted-foreground font-semibold flex items-center gap-1 pl-1 text-[11px] shrink-0">
            <Filter className="w-3 h-3 text-primary" /> Filter:
          </span>
          {TAG_FILTERS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                selectedTag === tag
                  ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted border border-border/40'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium"
          >
            <span className="font-semibold text-primary">
              {selectedIds.length} contact{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                className="h-7 text-xs rounded-lg gap-1 font-semibold"
              >
                <Download className="w-3 h-3" /> Export Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className="h-7 text-xs rounded-lg gap-1 font-semibold"
              >
                <Trash2 className="w-3 h-3" /> Delete Selected
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {isLoading ? (
        <Card className="border-border/60 bg-background/50 backdrop-blur-md shadow-xs py-20 flex justify-center">
          <MeetLoader size="lg" variant="brand" text="Loading contacts directory..." />
        </Card>
      ) : contacts && contacts.length > 0 ? (
        <Card className="border-border/70 bg-background/60 backdrop-blur-xl shadow-lg relative overflow-hidden rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === contacts.length && contacts.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3.5">Name</th>
                    <th className="px-4 py-3.5">Contact Info</th>
                    <th className="px-4 py-3.5 hidden md:table-cell">Company / Role</th>
                    <th className="px-4 py-3.5 hidden lg:table-cell">Tags</th>
                    <th className="px-4 py-3.5 hidden sm:table-cell">Meeting Activity</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {contacts.map((contact: any) => {
                    const isSelected = selectedIds.includes(contact.id);
                    return (
                      <tr
                        key={contact.id}
                        className={`hover:bg-muted/15 transition-colors group cursor-pointer ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="px-4 py-3.5"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(contact.id)}
                            className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                        </td>

                        {/* Name & Avatar */}
                        <td
                          className="px-4 py-3.5"
                          onClick={() => setSelectedContactForDrawer(contact)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                              {contact.name?.charAt(0).toUpperCase() || 'C'}
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                                {contact.name}
                              </p>
                              {contact.jobTitle && (
                                <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                                  {contact.jobTitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td
                          className="px-4 py-3.5 space-y-1"
                          onClick={() => setSelectedContactForDrawer(contact)}
                        >
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                            <span className="truncate max-w-[160px] sm:max-w-[200px] hover:text-foreground">
                              {contact.email}
                            </span>
                          </div>
                          {contact.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{contact.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Company & Role */}
                        <td
                          className="px-4 py-3.5 hidden md:table-cell text-muted-foreground"
                          onClick={() => setSelectedContactForDrawer(contact)}
                        >
                          {contact.company ? (
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[140px]">{contact.company}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">-</span>
                          )}
                        </td>

                        {/* Tags */}
                        <td
                          className="px-4 py-3.5 hidden lg:table-cell"
                          onClick={() => setSelectedContactForDrawer(contact)}
                        >
                          {contact.tags && contact.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {contact.tags.slice(0, 2).map((tag: string) => (
                                <span
                                  key={tag}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border/60"
                                >
                                  {tag}
                                </span>
                              ))}
                              {contact.tags.length > 2 && (
                                <span className="text-[10px] text-muted-foreground font-semibold px-1">
                                  +{contact.tags.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">-</span>
                          )}
                        </td>

                        {/* Meeting Activity */}
                        <td
                          className="px-4 py-3.5 hidden sm:table-cell"
                          onClick={() => setSelectedContactForDrawer(contact)}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground">
                              {contact.totalMeetings ?? 0} Meet{(contact.totalMeetings ?? 0) !== 1 ? 's' : ''}
                            </span>
                            {contact.lastMeetingDate && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                Last: {new Date(contact.lastMeetingDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContactToSchedule(contact);
                              }}
                              className="h-7 text-xs rounded-lg gap-1 font-semibold text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
                              title="Schedule Meet with Contact"
                            >
                              <Calendar className="w-3 h-3" /> Schedule
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(contact.id);
                              }}
                              title="Delete Contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Rich Eye-Catching Empty State (Superior to Calendly) */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Calendly-inspired Value Prop Card */}
          <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-50/50 via-background to-indigo-50/40 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/20 p-8 sm:p-12 shadow-xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Left Column: Explanatory Copy & CTAs */}
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" /> Directory & Relationship Hub
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                  Stay organized as you build relationships
                </h2>

                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Contacts are automatically created and updated whenever someone books a Meet with you.
                  View complete meeting history, save private client notes, and schedule your next conversation — all in one centralized directory.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    onClick={() => {
                      setContactToEdit(null);
                      setIsAddModalOpen(true);
                    }}
                    className="rounded-xl h-11 px-6 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add First Contact
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      if (profile?.username) {
                        window.open(`/book/${profile.username}`, '_blank');
                      }
                    }}
                    className="rounded-xl h-11 px-6 text-sm font-semibold gap-2 border-border/80"
                  >
                    <ExternalLink className="w-4 h-4 text-primary" /> View Your Public Booking Page
                  </Button>
                </div>
              </div>

              {/* Right Column: Visual Mockup Table (Calendly Inspiration Style) */}
              <div className="lg:col-span-5">
                <div className="p-4 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/80 shadow-2xl space-y-3 pointer-events-none select-none">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Sample Directory</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full">
                      Auto-synced
                    </span>
                  </div>

                  {/* Mock rows */}
                  {[
                    { name: 'Sarah Connor', email: 'sarah@cyberdyne.com', role: 'VP Operations', tag: 'VIP', color: 'from-blue-600 to-indigo-600' },
                    { name: 'Alex Morgan', email: 'alex@innovate.co', role: 'Tech Lead', tag: 'Lead', color: 'from-purple-600 to-pink-600' },
                    { name: 'David Miller', email: 'david@acme.org', role: 'Director', tag: 'Client', color: 'from-emerald-600 to-teal-600' },
                  ].map((mock, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-background/50 border border-border/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${mock.color} text-white font-bold flex items-center justify-center text-xs`}>
                          {mock.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-xs">{mock.name}</p>
                          <p className="text-[10px] text-muted-foreground">{mock.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {mock.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modals & Drawer */}
      <AddContactModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setContactToEdit(null);
        }}
        contactToEdit={contactToEdit}
      />

      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <ScheduleMeetingModal
        isOpen={Boolean(contactToSchedule)}
        onClose={() => setContactToSchedule(null)}
        contact={contactToSchedule}
      />

      <ContactDrawer
        isOpen={Boolean(selectedContactForDrawer)}
        onClose={() => setSelectedContactForDrawer(null)}
        contact={selectedContactForDrawer}
        onEdit={(contact) => {
          setContactToEdit(contact);
          setIsAddModalOpen(true);
        }}
        onDelete={(id) => {
          handleDelete(id);
        }}
        onSchedule={(contact) => {
          setContactToSchedule(contact);
        }}
      />
    </div>
  );
}
