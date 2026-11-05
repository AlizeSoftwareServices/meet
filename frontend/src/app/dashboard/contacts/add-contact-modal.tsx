'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, Building, Briefcase, Tag, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactToEdit?: any | null;
}

const PRESET_TAGS = ['Lead', 'Client', 'VIP', 'Partner', 'Candidate', 'Team'];

export function AddContactModal({ isOpen, onClose, contactToEdit }: AddContactModalProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(contactToEdit);

  const [name, setName] = useState(contactToEdit?.name || '');
  const [email, setEmail] = useState(contactToEdit?.email || '');
  const [phone, setPhone] = useState(contactToEdit?.phone || '');
  const [company, setCompany] = useState(contactToEdit?.company || '');
  const [jobTitle, setJobTitle] = useState(contactToEdit?.jobTitle || '');
  const [notes, setNotes] = useState(contactToEdit?.notes || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(contactToEdit?.tags || []);
  const [customTag, setCustomTag] = useState('');
  const [error, setError] = useState('');

  // Sync state if contactToEdit changes
  React.useEffect(() => {
    if (contactToEdit) {
      setName(contactToEdit.name || '');
      setEmail(contactToEdit.email || '');
      setPhone(contactToEdit.phone || '');
      setCompany(contactToEdit.company || '');
      setJobTitle(contactToEdit.jobTitle || '');
      setNotes(contactToEdit.notes || '');
      setSelectedTags(contactToEdit.tags || []);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setJobTitle('');
      setNotes('');
      setSelectedTags([]);
    }
    setError('');
  }, [contactToEdit, isOpen]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTag.trim()) {
      e.preventDefault();
      const clean = customTag.trim();
      if (!selectedTags.includes(clean)) {
        setSelectedTags([...selectedTags, clean]);
      }
      setCustomTag('');
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Name is required');
      if (!email.trim() || !email.includes('@')) throw new Error('Valid email is required');

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        jobTitle: jobTitle.trim() || null,
        notes: notes.trim() || null,
        tags: selectedTags,
      };

      if (isEditing) {
        return api.patch(`/contacts/${contactToEdit.id}`, payload);
      } else {
        return api.post('/contacts', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err.message || 'Failed to save contact');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    saveMutation.mutate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Card */}
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
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {isEditing ? 'Edit Contact' : 'Add New Contact'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isEditing ? 'Update your contact information and notes' : 'Manually add a client, prospect or colleague to your directory'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" /> Full Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-primary" /> Email Address *
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10"
                    disabled={isEditing}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" /> Phone Number
                  </label>
                  <Input
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Company */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-primary" /> Company
                  </label>
                  <Input
                    placeholder="Acme Corp"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Job Title */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" /> Job Title
                  </label>
                  <Input
                    placeholder="e.g. Marketing Director / Product Manager"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Tags / Categorization
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-muted/40 text-muted-foreground hover:bg-muted border-border/60'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {tag}
                      </button>
                    );
                  })}
                  <Input
                    placeholder="+ Custom tag (Press Enter)"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={handleAddCustomTag}
                    className="h-8 text-xs w-44 rounded-full"
                  />
                </div>
              </div>

              {/* Private Notes */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Private Notes
                </label>
                <Textarea
                  placeholder="Add private observations, preferred meeting times, discussion points..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[85px] text-sm resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 font-semibold px-6"
                >
                  {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Contact' : 'Add Contact'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
