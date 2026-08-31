'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Webhook, 
  Plus, 
  ArrowLeft, 
  Check, 
  Copy, 
  Trash2, 
  Play, 
  Activity, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Code,
  Lock,
  X,
  Loader2,
  RefreshCw,
  Power
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AVAILABLE_EVENTS = [
  { id: 'booking.created', label: 'Booking Created', desc: 'Triggered when an invitee successfully books a meeting' },
  { id: 'booking.canceled', label: 'Booking Canceled', desc: 'Triggered when a booking is canceled by host or guest' },
  { id: 'booking.rescheduled', label: 'Booking Rescheduled', desc: 'Triggered when a meeting is rescheduled to a new time' },
  { id: 'booking.confirmed', label: 'Booking Confirmed', desc: 'Triggered when a booking status changes to confirmed' },
];

export default function WebhooksPage() {
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [selectedWebhookDeliveries, setSelectedWebhookDeliveries] = useState<any | null>(null);
  const [inspectDelivery, setInspectDelivery] = useState<any | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // New webhook state
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'booking.created',
    'booking.canceled',
    'booking.rescheduled',
  ]);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const res = await api.get('/webhooks');
      return res.data;
    },
  });

  const { data: deliveries = [], isLoading: isDeliveriesLoading, refetch: refetchDeliveries } = useQuery({
    queryKey: ['webhook-deliveries', selectedWebhookDeliveries?.id],
    queryFn: async () => {
      if (!selectedWebhookDeliveries?.id) return [];
      const res = await api.get(`/webhooks/${selectedWebhookDeliveries.id}/deliveries`);
      return res.data;
    },
    enabled: !!selectedWebhookDeliveries?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      setFormError('');
      if (!url.trim()) throw new Error('Endpoint URL is required');
      if (selectedEvents.length === 0) throw new Error('Select at least one event');

      const res = await api.post('/webhooks', {
        url,
        events: selectedEvents,
        isActive,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setCreatedSecret(data.secret);
      setUrl('');
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || err.message || 'Failed to create webhook');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, currentActive }: { id: string; currentActive: boolean }) => {
      const res = await api.patch(`/webhooks/${id}`, { isActive: !currentActive });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/webhooks/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestResult(null);
      const res = await api.post(`/webhooks/${id}/test`);
      return { id, ...res.data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setTestResult({
        id: data.id,
        success: data.success,
        message: data.success 
          ? `Test succeeded! Status code: ${data.delivery?.statusCode || 200}` 
          : `Test delivery failed (Status: ${data.delivery?.statusCode || 'Error'}). Check deliveries log for details.`,
      });
    },
    onError: (err: any, id: string) => {
      setTestResult({
        id,
        success: false,
        message: err.response?.data?.message || err.message || 'Test request failed to send',
      });
    },
  });

  const toggleEvent = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter(e => e !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/integrations">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Webhook className="w-6 h-6" />
              </div>
              Developer Webhooks
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Receive cryptographically signed real-time HTTP POST notifications whenever bookings are created, canceled, or rescheduled.
            </p>
          </div>
        </div>

        <Button
          onClick={() => { setIsCreateOpen(true); setFormError(''); }}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </Button>
      </div>

      {/* Secret Display Banner (shown once after creation) */}
      {createdSecret && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Webhook Signing Secret Generated
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreatedSecret(null)}
              className="text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            Please copy your signing secret now. For security, it will not be displayed again. Use this secret to verify the <code className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">X-Webhook-Signature</code> HMAC-SHA256 header.
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={createdSecret}
              className="font-mono text-xs bg-white dark:bg-zinc-900 border-emerald-200 text-emerald-900 dark:text-emerald-100"
            />
            <Button
              onClick={() => copyToClipboard(createdSecret)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              {copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSecret ? 'Copied' : 'Copy Secret'}
            </Button>
          </div>
        </div>
      )}

      {/* Test Result Toast */}
      {testResult && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
          testResult.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{testResult.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTestResult(null)}
            className="h-6 w-6 p-0"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Webhook List / Empty State */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse border border-zinc-200 dark:border-zinc-800" />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <Card className="border-dashed border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-4">
            <Webhook className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            No webhooks configured
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
            Connect external services, CRMs, or custom microservices by registering your HTTP webhook endpoint.
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Add your first Webhook
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh: any) => (
            <Card key={wh.id} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                      {wh.url}
                    </code>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      wh.isActive 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {wh.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  {/* Subscribed Events */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {wh.events?.map((ev: string) => (
                      <span key={ev} className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono">
                        {ev}
                      </span>
                    ))}
                  </div>

                  {/* Last Delivery Status */}
                  <div className="text-xs text-zinc-500 flex items-center gap-3 pt-1">
                    <span>Added: {new Date(wh.createdAt).toLocaleDateString()}</span>
                    {wh.lastDelivery ? (
                      <span className="flex items-center gap-1">
                        Last delivery: 
                        <span className={`font-semibold ${wh.lastDelivery.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {wh.lastDelivery.statusCode || 'Failed'}
                        </span>
                        ({new Date(wh.lastDelivery.createdAt).toLocaleTimeString()})
                      </span>
                    ) : (
                      <span>No deliveries yet</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate(wh.id)}
                    disabled={testMutation.isPending && testMutation.variables === wh.id}
                    className="text-xs gap-1.5"
                    title="Send Test Webhook"
                  >
                    {testMutation.isPending && testMutation.variables === wh.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-violet-600" />
                    )}
                    Test
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWebhookDeliveries(wh)}
                    className="text-xs gap-1.5"
                    title="View Delivery History"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Deliveries
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActiveMutation.mutate({ id: wh.id, currentActive: wh.isActive })}
                    className={`h-8 px-2 text-xs ${
                      wh.isActive ? 'text-emerald-600 hover:text-amber-600' : 'text-zinc-400 hover:text-emerald-600'
                    }`}
                    title={wh.isActive ? 'Pause Webhook' : 'Activate Webhook'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this webhook endpoint?')) {
                        deleteMutation.mutate(wh.id);
                      }
                    }}
                    className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    title="Delete Webhook"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE WEBHOOK MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Add Webhook Endpoint</CardTitle>
                <CardDescription className="text-xs">Configure real-time event notifications</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Endpoint URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/webhooks"
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-zinc-500">
                  Must be an HTTPS endpoint accessible via public network.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Subscribed Events</Label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {AVAILABLE_EVENTS.map((ev) => (
                    <label
                      key={ev.id}
                      onClick={() => toggleEvent(ev.id)}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        selectedEvents.includes(ev.id)
                          ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(ev.id)}
                        onChange={() => toggleEvent(ev.id)}
                        className="mt-0.5 rounded text-violet-600 focus:ring-violet-500"
                      />
                      <div className="space-y-0.5 text-xs">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{ev.id}</p>
                        <p className="text-zinc-500">{ev.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-violet-600"
                  />
                  Enable immediately
                </label>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5"
                  >
                    {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Create Webhook
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DELIVERIES LOG MODAL */}
      {selectedWebhookDeliveries && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-3xl w-full max-h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="min-w-0 flex-1 mr-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-600" />
                  Delivery History
                </CardTitle>
                <CardDescription className="text-xs font-mono truncate">
                  {selectedWebhookDeliveries.url}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchDeliveries()}
                  className="h-8 px-2 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedWebhookDeliveries(null); setInspectDelivery(null); }}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-zinc-100 dark:divide-zinc-800">
              {isDeliveriesLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 text-violet-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">Loading delivery logs...</p>
                </div>
              ) : deliveries.length === 0 ? (
                <div className="p-12 text-center text-xs text-zinc-500">
                  No delivery attempts recorded yet for this webhook.
                </div>
              ) : (
                deliveries.map((del: any) => (
                  <div key={del.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                          del.success 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                        }`}>
                          {del.statusCode || 'ERR'}
                        </span>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {del.event}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>{new Date(del.createdAt).toLocaleString()}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectDelivery(inspectDelivery?.id === del.id ? null : del)}
                          className="h-7 px-2 text-xs text-violet-600 hover:text-violet-700"
                        >
                          <Code className="w-3.5 h-3.5 mr-1" />
                          {inspectDelivery?.id === del.id ? 'Hide Details' : 'View Payload'}
                        </Button>
                      </div>
                    </div>

                    {/* Inspected Payload / Response */}
                    {inspectDelivery?.id === del.id && (
                      <div className="mt-3 p-3 rounded-xl bg-zinc-950 text-zinc-100 text-xs font-mono space-y-3 overflow-x-auto">
                        <div>
                          <p className="text-zinc-400 font-semibold mb-1 text-[11px]">Request Payload:</p>
                          <pre className="text-emerald-400 whitespace-pre-wrap">
                            {JSON.stringify(JSON.parse(del.payload || '{}'), null, 2)}
                          </pre>
                        </div>
                        {del.response && (
                          <div className="pt-2 border-t border-zinc-800">
                            <p className="text-zinc-400 font-semibold mb-1 text-[11px]">Response Body:</p>
                            <pre className="text-zinc-300 whitespace-pre-wrap">
                              {del.response}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
