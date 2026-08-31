'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, getApiBaseUrl } from '@/lib/api';
import { Split, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PublicRoutingFormPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const slug = params.slug as string;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['public-routing-form', username, slug],
    queryFn: async () => {
      const res = await api.get(`/public/routing/${username}/${slug}`);
      return res.data;
    },
    retry: false,
    enabled: !!username && !!slug,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      if (!form) return;

      // Validate required answers
      for (const q of form.questions || []) {
        const val = answers[q.id];
        if (q.required && (!val || val.trim() === '')) {
          throw new Error(`Please answer "${q.label}"`);
        }
      }

      const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value,
      }));

      const res = await api.post(`/public/routing/${username}/${slug}/submit`, {
        answers: formattedAnswers,
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.isExternal) {
        window.location.href = data.destination;
      } else {
        const targetUsername = data.username || username;
        router.push(`/book/${targetUsername}/${data.destination}`);
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to submit form');
    },
  });

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-2" />
        <p className="text-xs text-zinc-500">Loading form...</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
        <Card className="max-w-md w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center p-8">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Form Not Available</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            This routing form does not exist or is currently inactive.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Host Profile Header */}
        <div className="text-center space-y-3">
          <Avatar className="w-16 h-16 mx-auto border-2 border-white shadow-md">
            <AvatarImage src={form.avatar ? `${getApiBaseUrl()}${form.avatar}` : ''} alt={form.hostName} />
            <AvatarFallback className="bg-violet-100 text-violet-700 font-semibold text-xl">
              {form.hostName?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {form.hostName}
            </p>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                {form.description}
              </p>
            )}
          </div>
        </div>

        {/* Form Card */}
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-2xl">
          <CardContent className="p-6 md:p-8 space-y-6">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(); }} className="space-y-5">
              {form.questions?.map((q: any, idx: number) => (
                <div key={q.id} className="space-y-2">
                  <Label className="text-sm font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                    <span>{q.label}</span>
                    {q.required && <span className="text-rose-500">*</span>}
                  </Label>

                  {/* TEXT Question */}
                  {q.type === 'TEXT' && (
                    <Input
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Your answer"
                      required={q.required}
                      className="h-11"
                    />
                  )}

                  {/* DROPDOWN Question */}
                  {q.type === 'DROPDOWN' && (
                    <select
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      required={q.required}
                      className="w-full h-11 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">Select an option...</option>
                      {q.options?.map((opt: string, optIdx: number) => (
                        <option key={optIdx} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* RADIO Question */}
                  {q.type === 'RADIO' && (
                    <div className="space-y-2 pt-1">
                      {q.options?.map((opt: string, optIdx: number) => (
                        <label
                          key={optIdx}
                          onClick={() => handleAnswerChange(q.id, opt)}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            answers[q.id] === opt
                              ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-100'
                              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => handleAnswerChange(q.id, opt)}
                            className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-zinc-300"
                          />
                          <span className="text-sm font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-medium gap-2 shadow-sm rounded-xl mt-4"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Finding best meeting for you...
                  </>
                ) : (
                  <>
                    Continue to Schedule
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-400">
          Powered by <span className="font-semibold text-zinc-600 dark:text-zinc-300">Meet</span>
        </p>
      </div>
    </div>
  );
}
