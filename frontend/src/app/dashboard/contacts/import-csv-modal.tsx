'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedContact {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  tags?: string[];
  notes?: string;
}

export function ImportCSVModal({ isOpen, onClose }: ImportCSVModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedContact[]>([]);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleDownloadSample = () => {
    const sampleHeaders = 'Name,Email,Phone,Company,JobTitle,Tags,Notes';
    const sampleRows = [
      sampleHeaders,
      '"Sarah Connor","sarah@cyberdyne.com","+1 (555) 123-4567","Cyberdyne Systems","VP of Operations","VIP,Client","Met at Tech Summit 2026"',
      '"Alex Morgan","alex@innovate.co","+1 (555) 987-6543","Innovate Labs","Tech Lead","Lead","Interested in team scheduling"',
      '"David Miller","david@acme.org","","Acme Corp","Director","Partner","Key enterprise partner"',
    ].join('\n');

    const blob = new Blob([sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meet_contacts_sample.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCSVText = (text: string) => {
    try {
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('CSV must contain at least a header row and 1 contact row.');
      }

      // Parse headers
      const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
      const nameIndex = headers.findIndex((h) => h.includes('name'));
      const emailIndex = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
      const phoneIndex = headers.findIndex((h) => h.includes('phone') || h.includes('mobile'));
      const companyIndex = headers.findIndex((h) => h.includes('company') || h.includes('org'));
      const jobTitleIndex = headers.findIndex((h) => h.includes('title') || h.includes('role') || h.includes('job'));
      const tagsIndex = headers.findIndex((h) => h.includes('tag'));
      const notesIndex = headers.findIndex((h) => h.includes('note'));

      if (emailIndex === -1) {
        throw new Error('CSV must contain an "Email" column.');
      }

      const results: ParsedContact[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Regex to split by comma ignoring commas inside quotes
        const rawTokens = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const tokens = rawTokens.map((t) => t.replace(/^["']|["']$/g, '').trim());

        const email = tokens[emailIndex];
        if (!email || !email.includes('@')) continue;

        const name = nameIndex !== -1 && tokens[nameIndex] ? tokens[nameIndex] : email.split('@')[0];
        const phone = phoneIndex !== -1 ? tokens[phoneIndex] : undefined;
        const company = companyIndex !== -1 ? tokens[companyIndex] : undefined;
        const jobTitle = jobTitleIndex !== -1 ? tokens[jobTitleIndex] : undefined;
        const tagsRaw = tagsIndex !== -1 ? tokens[tagsIndex] : undefined;
        const tags = tagsRaw ? tagsRaw.split(';').map((t) => t.trim()).filter(Boolean) : [];
        const notes = notesIndex !== -1 ? tokens[notesIndex] : undefined;

        results.push({ name, email, phone, company, jobTitle, tags, notes });
      }

      if (results.length === 0) {
        throw new Error('No valid contacts with emails found in the file.');
      }

      setParsedRows(results);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV file');
      setParsedRows([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSVText(text);
      };
      reader.readAsText(selected);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/contacts/import', { contacts: parsedRows });
      return res.data;
    },
    onSuccess: (data) => {
      setSuccessCount(data.count);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setTimeout(() => {
        onClose();
        setFile(null);
        setParsedRows([]);
        setSuccessCount(null);
      }, 1800);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err.message || 'Import failed');
    },
  });

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

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl p-6 sm:p-8 z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Import Contacts via CSV</h2>
                  <p className="text-xs text-muted-foreground">
                    Upload your contacts list from spreadsheets, Google Contacts, or CRM
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

            {/* Success State */}
            {successCount !== null ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold">Successfully Imported {successCount} Contacts!</h3>
                <p className="text-sm text-muted-foreground">Your directory has been synchronized and updated.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {/* Download Sample Action */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                    <span>Need the right format? Use our standard CSV columns.</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadSample}
                    className="text-xs rounded-lg h-8 gap-1.5 font-medium shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Sample Template
                  </Button>
                </div>

                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-background/50 hover:bg-muted/10 group text-center"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {file ? file.name : 'Click to upload or drag & drop CSV file'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepts standard comma-separated .csv files
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                    {error}
                  </div>
                )}

                {/* Preview Table */}
                {parsedRows.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" /> {parsedRows.length} Contacts Found Ready to Import
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-border rounded-xl text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-muted/50 border-b border-border sticky top-0">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Name</th>
                            <th className="px-3 py-2 font-semibold">Email</th>
                            <th className="px-3 py-2 font-semibold">Company / Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {parsedRows.slice(0, 10).map((row, idx) => (
                            <tr key={idx} className="hover:bg-muted/20">
                              <td className="px-3 py-2 font-medium">{row.name}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.email}</td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {row.company || row.jobTitle ? `${row.company || ''} ${row.jobTitle ? `(${row.jobTitle})` : ''}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedRows.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">
                        + {parsedRows.length - 10} more contacts...
                      </p>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={parsedRows.length === 0 || importMutation.isPending}
                    onClick={() => importMutation.mutate()}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 shadow-md shadow-blue-500/20"
                  >
                    {importMutation.isPending ? 'Importing...' : `Import ${parsedRows.length} Contacts`}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

