'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { Calendar, Video, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, Bell, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = searchParams.get('success');
    const e = searchParams.get('error');
    if (s) {
      setSuccess(s);
      const timer = setTimeout(() => {
        setSuccess(null);
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
    if (e) {
      setError(e);
      const timer = setTimeout(() => {
        setError(null);
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

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

  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

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

  const handleToggleAutoSync = async (provider: string, currentVal: boolean) => {
    setUpdatingProvider(provider);
    try {
      const nextVal = !currentVal;
      await api.patch(`/integrations/${provider}/auto-sync`, { autoSync: nextVal });
      setIntegrations(prev =>
        prev.map(item => (item.provider === provider ? { ...item, autoSync: nextVal } : item))
      );
    } catch (err) {
      console.error('Failed to toggle auto sync', err);
      alert('Failed to update auto-sync settings.');
    } finally {
      setUpdatingProvider(null);
    }
  };

  const handleManualSync = async () => {
    setSyncingGoogle(true);
    setSyncResult(null);
    try {
      const { data } = await api.post('/integrations/google/sync');
      setSyncResult(data.message || 'Synced successfully!');
      fetchIntegrations();
    } catch (err: any) {
      console.error('Manual sync failed', err);
      alert(err.response?.data?.message || 'Synchronization failed.');
    } finally {
      setSyncingGoogle(false);
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

  const handleConnectSlack = async () => {
    try {
      const redirectUri = typeof window !== 'undefined' ? window.location.origin : '';
      const { data } = await api.get(`/integrations/slack/auth?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Failed to get Slack OAuth URL', err);
      alert(err.response?.data?.message || 'Failed to connect to Slack. Please ensure SLACK_CLIENT_ID and SLACK_CLIENT_SECRET are configured in Render.');
    }
  };

  const handleDisconnectSlack = async () => {
    if (confirm('Are you sure you want to disconnect Slack? You will no longer receive meeting booking alerts in Slack.')) {
      try {
        await api.patch('/integrations/slack/disconnect');
        setIntegrations(prev => prev.filter(i => i.provider !== 'slack'));
      } catch (err) {
        console.error('Failed to disconnect Slack', err);
        alert('Failed to disconnect Slack.');
      }
    }
  };

  const googleIntegration = integrations.find(i => i.provider === 'google');
  const slackIntegration = integrations.find(i => i.provider === 'slack');

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">Integrations</h1>
        <p className="text-muted-foreground">Connect your Google Calendar and Meet for two-way synchronization.</p>
      </div>

      <AnimatePresence>
        {success === 'google_connected' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-500"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="font-medium">Google Calendar connected successfully!</p>
          </motion.div>
        )}

        {success === 'slack_connected' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-500"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="font-medium">Slack connected successfully! You will now receive instant booking alerts in Slack.</p>
          </motion.div>
        )}

        {error === 'auth_failed' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-medium">Failed to connect. Please try again.</p>
          </motion.div>
        )}
      </AnimatePresence>

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
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">Google Calendar & Meet</h3>
                  {googleIntegration?.connectedEmail && (
                    <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      {googleIntegration.connectedEmail}
                    </span>
                  )}
                </div>
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

          {/* Connected Google Controls */}
          {googleIntegration && (
            <div className="mt-6 pt-4 border-t border-border/50 space-y-3">
              {/* 1. Auto Sync Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-colors ${googleIntegration.autoSync !== false ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Auto-Sync Bookings</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition-all ${
                        googleIntegration.autoSync !== false 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {googleIntegration.autoSync !== false ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Automatically push newly booked meetings to your Google Calendar.</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={googleIntegration.autoSync !== false}
                  disabled={updatingProvider === 'google'}
                  onClick={() => handleToggleAutoSync('google', googleIntegration.autoSync !== false)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                    googleIntegration.autoSync !== false ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  } ${updatingProvider === 'google' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={`Click to turn ${googleIntegration.autoSync !== false ? 'OFF' : 'ON'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      googleIntegration.autoSync !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 2. Availability Conflict Check Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 transition-colors pt-3 border-t border-border/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-colors ${(googleIntegration.checkConflicts ?? true) ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Availability Synchronization</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition-all ${
                        (googleIntegration.checkConflicts ?? true)
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {(googleIntegration.checkConflicts ?? true) ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Block busy times on your public booking page when you add events to Google Calendar.</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={googleIntegration.checkConflicts ?? true}
                  disabled={updatingProvider === 'google'}
                  onClick={() => handleToggleConflicts('google', googleIntegration.checkConflicts ?? true)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                    (googleIntegration.checkConflicts ?? true) ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  } ${updatingProvider === 'google' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={`Click to turn ${(googleIntegration.checkConflicts ?? true) ? 'OFF' : 'ON'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      (googleIntegration.checkConflicts ?? true) ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 3. Manual Sync Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-border/30">
                <div>
                  <p className="text-sm font-semibold text-foreground">Two-Way Manual Sync</p>
                  <p className="text-xs text-muted-foreground">
                    {googleIntegration.lastSyncedAt
                      ? `Last synchronized: ${new Date(googleIntegration.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Reconcile changes made directly in Google Calendar (reschedules, cancellations).'}
                  </p>
                  {syncResult && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 animate-in fade-in">
                      ✓ {syncResult}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleManualSync}
                  disabled={syncingGoogle}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl border border-border shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingGoogle ? 'animate-spin' : ''}`} />
                  {syncingGoogle ? 'Synchronizing...' : 'Sync Now'}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Slack Workspace Integration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">Slack Notifications</h3>
                  {slackIntegration && (
                    <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm max-w-lg">
                  Get real-time alerts in your Slack channels or direct messages whenever someone books, reschedules, or cancels a meeting with you.
                </p>
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-secondary/50 px-2 py-1 rounded-md">
                    <Bell className="w-3.5 h-3.5" />
                    Instant Alerts
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-secondary/50 px-2 py-1 rounded-md">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Channel Updates
                  </div>
                </div>
              </div>
            </div>
            <div>
              {loading ? (
                <div className="w-24 h-10 bg-muted animate-pulse rounded-xl" />
              ) : slackIntegration ? (
                <div className="flex flex-col gap-2 items-center">
                  <div className="px-4 py-2 bg-green-500/10 text-green-600 font-medium rounded-xl flex items-center gap-2 border border-green-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    Connected
                  </div>
                  <button onClick={handleDisconnectSlack} className="text-xs font-semibold text-destructive hover:underline cursor-pointer">
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectSlack}
                  className="px-6 py-2.5 bg-[#4A154B] hover:bg-[#3D113E] text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
