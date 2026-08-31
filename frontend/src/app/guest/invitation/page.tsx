'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, UsersRound, LogIn } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

function InvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'confirming' | 'success' | 'error' | 'unauthenticated'>('loading');
  const [teamName, setTeamName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No invitation token found in the URL.');
      return;
    }
    // Check if user is logged in
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      setStatus('unauthenticated');
    } else {
      setStatus('confirming');
    }
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setStatus('loading');
    const authToken = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiBaseUrl()}/teams/invitations/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeamName(data.team?.name || '');
        setStatus('success');
      } else {
        const data = await res.json();
        setStatus('error');
        setErrorMsg(data.message || 'Failed to accept invitation. The link may have expired or already been used.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please check your connection and try again.');
    }
  };

  const handleLoginRedirect = () => {
    // Store token in sessionStorage so after login they come back
    if (token) sessionStorage.setItem('pendingInviteToken', token);
    window.location.href = `/login?redirect=/guest/invitation?token=${encodeURIComponent(token || '')}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <UsersRound className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Team Invitation</h1>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 text-center">
          {status === 'loading' && (
            <div className="py-8">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Processing your invitation…</p>
            </div>
          )}

          {status === 'unauthenticated' && (
            <div>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <LogIn className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground mb-8">
                You need to be signed in to accept this team invitation.
                Please log in with the email address the invitation was sent to.
              </p>
              <button
                onClick={handleLoginRedirect}
                className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98] mb-3"
              >
                Sign In to Accept
              </button>
              <a
                href="/register"
                className="w-full inline-flex items-center justify-center py-3 px-6 rounded-xl border border-border text-foreground font-medium text-base transition-all hover:bg-secondary"
              >
                Create an Account
              </a>
            </div>
          )}

          {status === 'confirming' && (
            <div>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <UsersRound className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">You're Invited!</h2>
              <p className="text-muted-foreground mb-8">
                You've been invited to join a team on <strong>Meet</strong>. Click below to accept.
              </p>
              <button
                onClick={handleAccept}
                className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Accept Invitation
              </button>
              <p className="text-xs text-muted-foreground mt-4">
                By accepting, you agree to be added as a member of this team.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to the Team!</h2>
              <p className="text-muted-foreground mb-6">
                You've successfully joined{teamName ? ` ${teamName}` : ' the team'} on Meet.
              </p>
              <a
                href="/dashboard/teams"
                className="inline-flex items-center justify-center w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Go to Teams Dashboard
              </a>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-destructive">Invitation Error</h2>
              <p className="text-muted-foreground mb-6">{errorMsg}</p>
              <a
                href="/"
                className="inline-flex items-center justify-center w-full py-3 px-6 rounded-xl border border-border text-foreground font-semibold text-base transition-all hover:bg-secondary"
              >
                Go Home
              </a>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <span className="font-semibold text-primary">Meet</span>
        </p>
      </div>
    </div>
  );
}

export default function InvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <InvitationContent />
    </Suspense>
  );
}
