'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, Download, Trash2, Mail, Phone, Building, Calendar } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: async () => {
      const res = await api.get(`/contacts${search ? `?search=${search}` : ''}`);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/contacts/${id}`);
    },
    onMutate: (id) => setDeletingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setDeletingId(null);
    },
    onError: () => setDeletingId(null)
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = () => {
    if (!contacts || contacts.length === 0) return;
    
    // Simple CSV export
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Total Meetings', 'Last Meeting Date'];
    const csvContent = [
      headers.join(','),
      ...contacts.map((c: any) => [
        `"${c.name || ''}"`,
        `"${c.email || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.company || ''}"`,
        c.totalMeetings || 0,
        c.lastMeetingDate ? `"${new Date(c.lastMeetingDate).toLocaleDateString()}"` : '""'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Contacts
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage people you've interacted with.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search contacts..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 backdrop-blur-sm border-border/50 rounded-full"
            />
          </div>
          <Button variant="outline" className="rounded-full shadow-sm" onClick={handleExport} disabled={!contacts || contacts.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : contacts?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Contact Info</th>
                      <th className="px-6 py-4 font-semibold hidden md:table-cell">Company</th>
                      <th className="px-6 py-4 font-semibold hidden sm:table-cell">Activity</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {contacts.map((contact: any) => (
                      <tr key={contact.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-base">{contact.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3.5 h-3.5" />
                            <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors truncate max-w-[150px] sm:max-w-[200px]">{contact.email}</a>
                          </div>
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-3.5 h-3.5" />
                              <a href={`tel:${contact.phone}`} className="hover:text-primary transition-colors">{contact.phone}</a>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                          {contact.company ? (
                            <div className="flex items-center gap-2">
                              <Building className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[150px]">{contact.company}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">{contact.totalMeetings} meeting{contact.totalMeetings !== 1 ? 's' : ''}</span>
                            {contact.lastMeetingDate && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                Last: {new Date(contact.lastMeetingDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                            onClick={() => handleDelete(contact.id)}
                            disabled={deleteMutation.isPending && deletingId === contact.id}
                            title="Delete Contact"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-24 px-6 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                  <Users className="w-10 h-10 text-primary/40" />
                </div>
                <h3 className="text-xl font-bold mb-2">No contacts found</h3>
                <p className="text-muted-foreground max-w-sm">
                  {search 
                    ? `No contacts matching "${search}".` 
                    : "Your contacts list is empty. People will be automatically added here when they book a meeting with you."}
                </p>
                {search && (
                  <Button variant="outline" className="mt-4 rounded-full" onClick={() => setSearch('')}>
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
