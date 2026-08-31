'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Split, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Layers, 
  HelpCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface QuestionItem {
  id?: string;
  tempId: string;
  label: string;
  type: 'TEXT' | 'DROPDOWN' | 'RADIO';
  options: string[];
  required: boolean;
  order: number;
}

interface RuleItem {
  id?: string;
  questionTempId: string;
  operator: 'EQUALS' | 'CONTAINS' | 'NOT_EQUALS';
  value: string;
  destination: string;
}

export default function EditRoutingFormPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fallbackDestination, setFallbackDestination] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: eventTypes = [] } = useQuery({
    queryKey: ['event-types'],
    queryFn: async () => {
      const res = await api.get('/event-types');
      return res.data;
    },
  });

  const { data: formData, isLoading } = useQuery({
    queryKey: ['routing-form', formId],
    queryFn: async () => {
      const res = await api.get(`/routing/${formId}`);
      return res.data;
    },
    enabled: !!formId,
  });

  useEffect(() => {
    if (formData && !initialized) {
      setTitle(formData.title || '');
      setSlug(formData.slug || '');
      setDescription(formData.description || '');
      setIsActive(formData.isActive ?? true);
      setFallbackDestination(formData.fallbackDestination || '');

      const qList: QuestionItem[] = (formData.questions || []).map((q: any, idx: number) => ({
        id: q.id,
        tempId: q.id || `q_${idx}`,
        label: q.label,
        type: q.type,
        options: q.options || [],
        required: q.required,
        order: q.order || idx + 1,
      }));
      setQuestions(qList);

      const rList: RuleItem[] = (formData.rules || []).map((r: any) => ({
        id: r.id,
        questionTempId: r.questionId,
        operator: r.operator,
        value: r.value,
        destination: r.destination,
      }));
      setRules(rList);
      setInitialized(true);
    }
  }, [formData, initialized]);

  // Question helpers
  const addQuestion = () => {
    const newId = `q_${Date.now()}`;
    setQuestions([
      ...questions,
      {
        tempId: newId,
        label: 'New Question',
        type: 'DROPDOWN',
        options: ['Option 1', 'Option 2'],
        required: true,
        order: questions.length + 1,
      }
    ]);
  };

  const updateQuestion = (tempId: string, updates: Partial<QuestionItem>) => {
    setQuestions(questions.map(q => q.tempId === tempId ? { ...q, ...updates } : q));
  };

  const removeQuestion = (tempId: string) => {
    setQuestions(questions.filter(q => q.tempId !== tempId));
    setRules(rules.filter(r => r.questionTempId !== tempId));
  };

  const addOption = (tempId: string) => {
    const q = questions.find(item => item.tempId === tempId);
    if (q) {
      updateQuestion(tempId, { options: [...q.options, `Option ${q.options.length + 1}`] });
    }
  };

  const updateOption = (tempId: string, optIdx: number, val: string) => {
    const q = questions.find(item => item.tempId === tempId);
    if (q) {
      const newOpts = [...q.options];
      newOpts[optIdx] = val;
      updateQuestion(tempId, { options: newOpts });
    }
  };

  const removeOption = (tempId: string, optIdx: number) => {
    const q = questions.find(item => item.tempId === tempId);
    if (q && q.options.length > 1) {
      updateQuestion(tempId, { options: q.options.filter((_, idx) => idx !== optIdx) });
    }
  };

  // Rule helpers
  const addRule = () => {
    setRules([
      ...rules,
      {
        questionTempId: questions[0]?.tempId || '',
        operator: 'EQUALS',
        value: '',
        destination: eventTypes[0]?.slug || '',
      }
    ]);
  };

  const updateRule = (idx: number, updates: Partial<RuleItem>) => {
    setRules(rules.map((r, i) => i === idx ? { ...r, ...updates } : r));
  };

  const removeRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      if (!title.trim()) throw new Error('Form title is required');
      if (!slug.trim()) throw new Error('URL slug is required');
      if (questions.length === 0) throw new Error('At least one question is required');
      if (!fallbackDestination) throw new Error('Fallback destination is required');

      const formattedQuestions = questions.map((q, idx) => ({
        label: q.label,
        type: q.type,
        options: q.type === 'TEXT' ? [] : q.options,
        required: q.required,
        order: idx + 1,
      }));

      const payload = {
        title,
        slug,
        description,
        isActive,
        fallbackDestination,
        questions: formattedQuestions,
        rules: rules.map((r) => {
          const qIdx = questions.findIndex(q => q.tempId === r.questionTempId || q.id === r.questionTempId);
          return {
            questionId: qIdx >= 0 ? `idx_${qIdx}` : '',
            operator: r.operator,
            value: r.value,
            destination: r.destination,
          };
        }),
      };

      const res = await api.put(`/routing/${formId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-forms'] });
      queryClient.invalidateQueries({ queryKey: ['routing-form', formId] });
      router.push('/dashboard/routing');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update routing form');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/routing">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Edit Routing Form
            </h1>
            <p className="text-xs text-zinc-500">
              Update questions, logic, and destinations.
            </p>
          </div>
        </div>

        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-sm"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Form Details Card */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Form Details</CardTitle>
          <CardDescription className="text-xs">Basic information and fallback destination</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Form Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sales Qualification Form"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">URL Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. sales-qualification"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context or instructions for respondents..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Fallback Destination (When no rules match)</Label>
              <select
                value={fallbackDestination}
                onChange={(e) => setFallbackDestination(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select fallback event type...</option>
                {eventTypes.map((et: any) => (
                  <option key={et.id} value={et.slug}>
                    {et.title} ({et.duration} min) · /{et.slug}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="activeToggleEdit"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
              />
              <Label htmlFor="activeToggleEdit" className="text-sm font-medium cursor-pointer">
                Form is Active and Accepting Submissions
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Builder */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-violet-600" />
              Intake Questions
            </CardTitle>
            <CardDescription className="text-xs">Define questions respondents answer before booking</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addQuestion}
            className="text-xs gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Question
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.tempId} className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
                  Question {idx + 1}
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.tempId, { required: e.target.checked })}
                      className="rounded text-violet-600"
                    />
                    Required
                  </label>
                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(q.tempId)}
                      className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs font-medium">Question Label</Label>
                  <Input
                    value={q.label}
                    onChange={(e) => updateQuestion(q.tempId, { label: e.target.value })}
                    placeholder="e.g. What is your team size?"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Answer Type</Label>
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(q.tempId, { type: e.target.value as any })}
                    className="w-full h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="DROPDOWN">Dropdown</option>
                    <option value="RADIO">Radio Buttons</option>
                    <option value="TEXT">Short Text</option>
                  </select>
                </div>
              </div>

              {/* Options for dropdown / radio */}
              {q.type !== 'TEXT' && (
                <div className="pt-2 pl-4 border-l-2 border-violet-200 dark:border-violet-800/50 space-y-2">
                  <Label className="text-xs text-zinc-500">Choices / Options</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-1.5">
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(q.tempId, optIdx, e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-zinc-900"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(q.tempId, optIdx)}
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addOption(q.tempId)}
                    className="text-xs text-violet-600 hover:text-violet-700 h-7 px-2"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Option
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rules Builder */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-600" />
              Routing Rules
            </CardTitle>
            <CardDescription className="text-xs">Rules are evaluated sequentially from top to bottom</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addRule}
            className="text-xs gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-4 text-center">
              No custom rules added. All submissions will be routed to the fallback destination.
            </p>
          ) : (
            rules.map((rule, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col md:flex-row md:items-center gap-3">
                <span className="text-xs font-semibold text-zinc-400">
                  IF
                </span>
                
                {/* Question selector */}
                <select
                  value={rule.questionTempId}
                  onChange={(e) => updateRule(idx, { questionTempId: e.target.value })}
                  className="h-8 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-violet-500"
                >
                  {questions.map((q) => (
                    <option key={q.tempId} value={q.tempId}>
                      {q.label}
                    </option>
                  ))}
                </select>

                {/* Operator selector */}
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(idx, { operator: e.target.value as any })}
                  className="h-8 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-violet-500"
                >
                  <option value="EQUALS">Equals</option>
                  <option value="CONTAINS">Contains</option>
                  <option value="NOT_EQUALS">Does Not Equal</option>
                </select>

                {/* Value input */}
                <Input
                  value={rule.value}
                  onChange={(e) => updateRule(idx, { value: e.target.value })}
                  placeholder="Value to match"
                  className="h-8 text-xs bg-white dark:bg-zinc-900 md:w-36"
                />

                <span className="text-xs font-semibold text-zinc-400">
                  THEN ROUTE TO
                </span>

                {/* Destination selector */}
                <select
                  value={rule.destination}
                  onChange={(e) => updateRule(idx, { destination: e.target.value })}
                  className="h-8 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-violet-500 flex-1"
                >
                  <option value="">Select destination...</option>
                  {eventTypes.map((et: any) => (
                    <option key={et.id} value={et.slug}>
                      {et.title} · /{et.slug}
                    </option>
                  ))}
                </select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRule(idx)}
                  className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 self-end md:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
