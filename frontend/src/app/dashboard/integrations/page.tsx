'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { Calendar, Video, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const error = searchParams.get('error');

  const fetchIntegrations = async () => {
    try {
      const { data } = await api.get('/integrations');
      setIntegrations(data);
    } catch (err) {
      console.error('Failed to fetch integrations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const redirectUri = typeof window !== 'undefined' ? window.location.origin : '';
      const { data } = await api.get(`/integrations/google/auth?redirect_uri=${encodeURIComponent(redirectUri)}`);
      window.location.href = data.url;
    } catch (err) {
      console.error('Failed to get auth URL', err);
      alert('Failed to connect to Google');
    }
  };

  const handleToggleConflicts = async (provider: string, currentVal: boolean) => {
    setUpdatingProvider(provider);
    try {
      const nextVal = !currentVal;
      await api.patch(`/integrations/${provider}/conflicts`, { checkConflicts: nextVal });
      setIntegrations(prev =>
        prev.map(item => (item.provider === provider ? { ...item, checkConflicts: nextVal } : item))
      );
    } catch (err) {
      console.error('Failed to toggle conflicts', err);
      alert('Failed to update calendar sync settings.');
    } finally {
      setUpdatingProvider(null);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (confirm('Are you sure you want to disconnect Google Calendar?')) {
      try {
        await api.patch('/integrations/google/disconnect');
        setIntegrations(prev => prev.filter(i => i.provider !== 'google'));
      } catch (err) {
        console.error('Failed to disconnect', err);
        alert('Failed to disconnect Google Calendar.');
      }
    }
  };

  const googleIntegration = integrations.find(i => i.provider === 'google');
  const microsoftIntegration = integrations.find(i => i.provider === 'microsoft');
  const slackIntegration = integrations.find(i => i.provider === 'slack');

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">Integrations</h1>
        <p className="text-muted-foreground">Connect your calendars and conferencing tools for two-way synchronization.</p>
      </div>

      {success === 'google_connected' && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-500">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-medium">Google Calendar connected successfully!</p>
        </div>
      )}

      {error === 'auth_failed' && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium">Failed to connect. Please try again.</p>
        </div>
      )}

      <div className="grid gap-6">
        {/* Google Workspace Integration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-zinc-100 flex-shrink-0">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Google Calendar & Meet</h3>
                <p className="text-muted-foreground text-sm max-w-lg">
                  Automatically sync your events, check for conflicts in real-time, and generate Google Meet video links when someone books a meeting.
                </p>
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-secondary/50 px-2 py-1 rounded-md">
                    <Calendar className="w-3.5 h-3.5" />
                    Two-Way Sync
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-secondary/50 px-2 py-1 rounded-md">
                    <Video className="w-3.5 h-3.5" />
                    Video Conferencing
                  </div>
                </div>
              </div>
            </div>
            <div>
              {loading ? (
                <div className="w-24 h-10 bg-muted animate-pulse rounded-xl" />
              ) : googleIntegration?.status === 'EXPIRED' ? (
                <div className="flex flex-col gap-2 items-center">
                  <div className="px-4 py-2 bg-destructive/10 text-destructive font-medium rounded-xl flex items-center gap-2 border border-destructive/20">
                    <AlertCircle className="w-4 h-4" />
                    Expired
                  </div>
                  <button onClick={handleConnectGoogle} className="text-xs font-semibold text-primary hover:underline">
                    Reconnect
                  </button>
                </div>
              ) : googleIntegration ? (
                <div className="flex flex-col gap-2 items-center">
                  <div className="px-4 py-2 bg-green-500/10 text-green-600 font-medium rounded-xl flex items-center gap-2 border border-green-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    Connected
                  </div>
                  <button onClick={handleDisconnectGoogle} className="text-xs font-semibold text-destructive hover:underline">
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* Two-Way Conflict Check Toggle */}
          {googleIntegration && (
            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Check Google Calendar for conflicts</p>
                  <p className="text-xs text-muted-foreground">Block busy times on your public booking page when you add events to Google Calendar.</p>
                </div>
              </div>
              <Switch
                checked={googleIntegration.checkConflicts ?? true}
                disabled={updatingProvider === 'google'}
                onCheckedChange={() => handleToggleConflicts('google', googleIntegration.checkConflicts ?? true)}
              />
            </div>
          )}
        </motion.div>

        {/* Microsoft Integration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-zinc-100 flex-shrink-0 grid grid-cols-2 gap-0.5 p-3">
                <div className="bg-[#F25022] w-full h-full rounded-sm" />
                <div className="bg-[#7FBA00] w-full h-full rounded-sm" />
                <div className="bg-[#00A4EF] w-full h-full rounded-sm" />
                <div className="bg-[#FFB900] w-full h-full rounded-sm" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Microsoft Outlook & Teams</h3>
                <p className="text-muted-foreground text-sm max-w-lg">
                  Sync your availability with Outlook Calendar and generate Microsoft Teams Meet links.
                </p>
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-secondary/50 px-2 py-1 rounded-md">
                    <Calendar className="w-3.5 h-3.5" />
                    Calendar Sync
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-secondary/50 px-2 py-1 rounded-md">
                    <Video className="w-3.5 h-3.5" />
                    Video Conferencing
                  </div>
                </div>
              </div>
            </div>
            <div>
              {loading ? (
                <div className="w-24 h-10 bg-muted animate-pulse rounded-xl" />
              ) : microsoftIntegration?.status === 'EXPIRED' ? (
                <div className="flex flex-col gap-2 items-center">
                  <div className="px-4 py-2 bg-destructive/10 text-destructive font-medium rounded-xl flex items-center gap-2 border border-destructive/20">
                    <AlertCircle className="w-4 h-4" />
                    Expired
                  </div>
                  <button
                    onClick={async () => {
                      const redirectUri = typeof window !== 'undefined' ? window.location.origin : '';
                      const { data } = await api.get(`/integrations/microsoft/auth?redirect_uri=${encodeURIComponent(redirectUri)}`);
                      window.location.href = data.url;
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Reconnect
                  </button>
                </div>
              ) : microsoftIntegration ? (
                <div className="flex flex-col gap-2 items-center">
                  <div className="px-4 py-2 bg-green-500/10 text-green-600 font-medium rounded-xl flex items-center gap-2 border border-green-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    Connected
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to disconnect Microsoft?')) {
                        await api.patch('/integrations/microsoft/disconnect');
                        setIntegrations(prev => prev.filter(i => i.provider !== 'microsoft'));
                      }
                    }}
                    className="text-xs font-semibold text-destructive hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    const redirectUri = typeof window !== 'undefined' ? window.location.origin : '';
                    const { data } = await api.get(`/integrations/microsoft/auth?redirect_uri=${encodeURIComponent(redirectUri)}`);
                    window.location.href = data.url;
                  }}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          {microsoftIntegration && (
            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Check Outlook Calendar for conflicts</p>
                  <p className="text-xs text-muted-foreground">Block busy times on your public booking page when you have events on Outlook.</p>
                </div>
              </div>
              <Switch
                checked={microsoftIntegration.checkConflicts ?? true}
                disabled={updatingProvider === 'microsoft'}
                onCheckedChange={() => handleToggleConflicts('microsoft', microsoftIntegration.checkConflicts ?? true)}
              />
            </div>
          )}
        </motion.div>

        {/* Slack Integration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-[#4A154B] rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                  <path d="M5.04 15.21c-1.35 0-2.45-1.1-2.45-2.45s1.1-2.45 2.45-2.45 2.45 1.1 2.45 2.45v2.45H5.04zm1.23 0c0 1.35 1.1 2.45 2.45 2.45s2.45-1.1 2.45-2.45V8.29C11.17 6.94 10.07 5.84 8.72 5.84s-2.45 1.1-2.45 2.45v6.92z" fill="#36C5F0"/>
                  <path d="M8.79 5.04c0-1.35 1.1-2.45 2.45-2.45s2.45 1.1 2.45 2.45-1.1 2.45-2.45 2.45H8.79V5.04zm0 1.23c-1.35 0-2.45 1.1-2.45 2.45s1.1 2.45 2.45 2.45h6.92c1.35 0 2.45-1.1 2.45-2.45s-1.1-2.45-2.45-2.45H8.79z" fill="#2EB67D"/>
                  <path d="M18.96 8.79c1.35 0 2.45 1.1 2.45 2.45s-1.1 2.45-2.45 2.45-2.45-1.1-2.45-2.45V8.79h2.45zm-1.23 0c0-1.35-1.1-2.45-2.45-2.45s-2.45 1.1-2.45 2.45v6.92c0 1.35 1.1 2.45 2.45 2.45s2.45-1.1 2.45-2.45V8.79z" fill="#E01E5A"/>
                  <path d="M15.21 18.96c0 1.35-1.1 2.45-2.45 2.45s-2.45-1.1-2.45-2.45 1.1-2.45 2.45-2.45h2.45v2.45zm0-1.23c1.35 0 2.45-1.1 2.45-2.45s-1.1-2.45-2.45-2.45H8.29c-1.35 0-2.45 1.1-2.45 2.45s1.1 2.45 2.45 2.45h6.92z" fill="#ECB22E"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Slack</h3>
                <p className="text-muted-foreground text-sm max-w-lg">
                  Get instant notifications in your Slack channels whenever a new Meet is booked, rescheduled, or canceled.
                </p>
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-secondary/50 px-2 py-1 rounded-md">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Notifications
                  </div>
                </div>
              </div>
            </div>
            <div>
              {loading ? (
                <div className="w-24 h-10 bg-muted animate-pulse rounded-xl" />
              ) : slackIntegration ? (
                <div className="px-4 py-2 bg-green-500/10 text-green-600 font-medium rounded-xl flex items-center gap-2 border border-green-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected
                </div>
              ) : (
                <button
                  onClick={async () => {
                    const redirectUri = typeof window !== 'undefined' ? window.location.origin : '';
                    const { data } = await api.get(`/integrations/slack/auth?redirect_uri=${encodeURIComponent(redirectUri)}`);
                    window.location.href = data.url;
                  }}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Developer Webhooks */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-violet-600/10 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/>
                  <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06l1.97 3.65"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Developer Webhooks</h3>
                <p className="text-muted-foreground text-sm max-w-lg">
                  Send real-time HMAC-SHA256 signed event payloads directly to your HTTP endpoints whenever meetings are created, canceled, or rescheduled.
                </p>
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 dark:bg-violet-900/30 px-2 py-1 rounded-md">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    HMAC-SHA256 Signed
                  </div>
                </div>
              </div>
            </div>
            <div>
              <a
                href="/dashboard/integrations/webhooks"
                className="inline-flex items-center px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 text-sm"
              >
                Manage Webhooks
              </a>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
