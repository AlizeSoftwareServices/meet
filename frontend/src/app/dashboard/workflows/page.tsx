'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Clock, Mail, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { triggerHaptic } from '@/lib/haptics';

interface EventType {
  id: string;
  title: string;
  slug: string;
}

interface Workflow {
  id: string;
  eventTypeId: string;
  triggerType: string;
  timeOffset: number;
  actionType: string;
  emailSubject?: string;
  emailBody?: string;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string>('');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  // New Workflow State
  const [isCreating, setIsCreating] = useState(false);
  const [newTrigger, setNewTrigger] = useState('BEFORE_EVENT');
  const [newOffset, setNewOffset] = useState(1440); // 24 hours
  const [newAction, setNewAction] = useState('EMAIL');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEventTypes();
  }, []);

  useEffect(() => {
    if (selectedEventTypeId) {
      fetchWorkflows(selectedEventTypeId);
    } else {
      setWorkflows([]);
    }
  }, [selectedEventTypeId]);

  const fetchEventTypes = async () => {
    try {
      const res = await api.get('/event-types');
      const data = res.data;
      setEventTypes(data);
      if (data.length > 0 && !selectedEventTypeId) {
        setSelectedEventTypeId(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflows = async (eventTypeId: string) => {
    try {
      const res = await api.get(`/workflows/event-type/${eventTypeId}`);
      setWorkflows(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const createWorkflow = async () => {
    if (!selectedEventTypeId) return;
    setIsSubmitting(true);
    try {
      await api.post('/workflows', {
        eventTypeId: selectedEventTypeId,
        triggerType: newTrigger,
        timeOffset: Number(newOffset),
        actionType: newAction,
        emailSubject: emailSubject.trim() || undefined,
        emailBody: emailBody.trim() || undefined,
      });
      triggerHaptic('success');
      setIsCreating(false);
      setEmailSubject('');
      setEmailBody('');
      fetchWorkflows(selectedEventTypeId);
    } catch (err) {
      console.error(err);
      triggerHaptic('error');
      alert('Failed to save workflow automation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow automation?')) return;
    try {
      await api.delete(`/workflows/${id}`);
      triggerHaptic('light');
      setWorkflows(workflows.filter(w => w.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete workflow.');
    }
  };

  const formatOffset = (minutes: number) => {
    if (minutes >= 1440) return `${minutes / 1440} day(s)`;
    if (minutes >= 60) return `${minutes / 60} hour(s)`;
    return `${minutes} minute(s)`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-extrabold tracking-tight text-foreground">Workflows & Automations</h1>
          <p className="text-sm text-muted-foreground mt-1">Automate email reminders and follow-up communications around your scheduled events.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="mb-6">
          <Label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Select Event Type</Label>
          <select
            value={selectedEventTypeId}
            onChange={(e) => setSelectedEventTypeId(e.target.value)}
            className="w-full md:w-1/2 rounded-xl border border-input bg-background py-2.5 px-3.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
          >
            {eventTypes.map(et => (
              <option key={et.id} value={et.id}>{et.title}</option>
            ))}
          </select>
        </div>

        {selectedEventTypeId && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-heading font-bold text-foreground">Configured Workflows</h2>
                <p className="text-xs text-muted-foreground">These automated messages trigger based on the meeting time.</p>
              </div>
              <Button onClick={() => setIsCreating(true)} disabled={isCreating} className="rounded-xl font-bold text-xs gap-1.5">
                <Plus className="h-4 w-4" />
                Add Automation
              </Button>
            </div>

            {isCreating && (
              <div className="bg-muted/30 rounded-2xl p-5 border border-border mb-6 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>New Event Automation</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Trigger When</Label>
                    <select
                      value={newTrigger}
                      onChange={(e) => setNewTrigger(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background py-2 px-3 text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="BEFORE_EVENT">Before event starts</option>
                      <option value="AFTER_EVENT">After event ends</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Time Offset</Label>
                    <select
                      value={newOffset}
                      onChange={(e) => setNewOffset(Number(e.target.value))}
                      className="w-full rounded-xl border border-input bg-background py-2 px-3 text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value={15}>15 minutes before/after</option>
                      <option value={30}>30 minutes before/after</option>
                      <option value={60}>1 hour before/after</option>
                      <option value={120}>2 hours before/after</option>
                      <option value={1440}>24 hours (1 day)</option>
                      <option value={2880}>48 hours (2 days)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Channel Action</Label>
                    <select
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background py-2 px-3 text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="EMAIL">Send Email to Invitee</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-border/40">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Custom Subject (Optional)</Label>
                    <Input 
                      placeholder="e.g. Reminder: Our upcoming meeting tomorrow"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Custom Body Note (Optional)</Label>
                    <Textarea 
                      placeholder="e.g. Please bring your project notes and review the agenda before our call."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="text-xs min-h-[70px]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setIsCreating(false)} className="rounded-xl text-xs">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={createWorkflow} disabled={isSubmitting} className="rounded-xl font-bold text-xs bg-primary text-primary-foreground">
                    {isSubmitting ? 'Saving...' : 'Save Workflow'}
                  </Button>
                </div>
              </div>
            )}

            {workflows.length === 0 && !isCreating ? (
              <div className="text-center py-12 border-2 border-dashed border-border/60 rounded-2xl bg-muted/10">
                <Clock className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <h3 className="mt-3 text-sm font-bold text-foreground">No custom workflows yet</h3>
                <p className="mt-1 text-xs text-muted-foreground">Default booking confirmation emails are automatically sent. Click "Add Automation" to schedule custom reminders.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workflows.map(workflow => (
                  <div key={workflow.id} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl shadow-xs hover:border-primary/40 transition-colors">
                    <div className="flex items-center space-x-3.5">
                      <div className="bg-primary/10 p-2.5 rounded-xl text-primary flex-shrink-0">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">
                            {workflow.emailSubject || (workflow.triggerType === 'BEFORE_EVENT' ? 'Meeting Reminder Email' : 'Post-Meeting Follow-up Email')}
                          </p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Sends automatically <strong>{formatOffset(workflow.timeOffset)}</strong> {workflow.triggerType === 'BEFORE_EVENT' ? 'before meeting starts' : 'after meeting concludes'}.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteWorkflow(workflow.id)}
                      className="text-muted-foreground hover:text-destructive p-2 transition-colors rounded-lg hover:bg-destructive/10"
                      title="Delete workflow"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
