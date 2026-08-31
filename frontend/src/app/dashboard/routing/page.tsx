'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Split, 
  Plus, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  CopyCheck, 
  Power, 
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RoutingFormsPage() {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/profile');
      return res.data;
    },
  });

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['routing-forms'],
    queryFn: async () => {
      const res = await api.get('/routing');
      return res.data;
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/routing/${id}/duplicate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-forms'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/routing/${id}/toggle`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-forms'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/routing/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-forms'] });
    },
  });

  const handleCopyLink = (formSlug: string, formId: string) => {
    const username = profile?.username || 'me';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/forms/${username}/${formSlug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(formId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const username = profile?.username || 'me';

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Split className="w-6 h-6" />
            </div>
            Routing Forms
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Qualify, route, and connect respondents to the right person or event type based on their answers.
          </p>
        </div>
        <Link href="/dashboard/routing/new">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            New Routing Form
          </Button>
        </Link>
      </div>

      {/* Forms List / Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse border border-zinc-200 dark:border-zinc-800" />
          ))}
        </div>
      ) : forms.length === 0 ? (
        <Card className="border-dashed border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-4">
            <Split className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            No routing forms yet
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
            Create intake forms with custom questions and smart rules to automatically route respondents to different calendars or booking pages.
          </p>
          <Link href="/dashboard/routing/new">
            <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              Create your first Routing Form
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form: any) => (
            <Card key={form.id} className="group border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {form.title}
                    </CardTitle>
                    <p className="text-xs text-zinc-500 font-mono">
                      /forms/{username}/{form.slug}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    form.isActive 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {form.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {form.description && (
                  <CardDescription className="text-xs text-zinc-500 line-clamp-2 mt-2">
                    {form.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{form.questions?.length || 0} Questions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{form.rules?.length || 0} Rules</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(form.slug, form.id)}
                      className="h-8 px-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-violet-600"
                      title="Copy Public Link"
                    >
                      {copiedId === form.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Link
                        </>
                      )}
                    </Button>
                    <Link href={`/forms/${username}/${form.slug}`} target="_blank">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-violet-600"
                        title="View Public Form"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate(form.id)}
                      className={`h-8 px-2 text-xs ${
                        form.isActive 
                          ? 'text-emerald-600 hover:text-amber-600' 
                          : 'text-zinc-400 hover:text-emerald-600'
                      }`}
                      title={form.isActive ? 'Deactivate Form' : 'Activate Form'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateMutation.mutate(form.id)}
                      className="h-8 px-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                      title="Duplicate Form"
                    >
                      <CopyCheck className="w-3.5 h-3.5" />
                    </Button>
                    <Link href={`/dashboard/routing/${form.id}/edit`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                        title="Edit Form"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${form.title}"?`)) {
                          deleteMutation.mutate(form.id);
                        }
                      }}
                      className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      title="Delete Form"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
