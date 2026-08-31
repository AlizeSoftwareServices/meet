'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UsersRound, Plus, Trash2, UserPlus, Crown, Shield, User,
  Copy, ExternalLink, Settings, Mail, AlertCircle, CheckCircle2, Loader2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; email: string; profile?: { name?: string } };
}

interface Team {
  id: string;
  name: string;
  description?: string;
  slug: string;
  ownerId: string;
  isActive: boolean;
  members: TeamMember[];
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  OWNER: <Crown className="w-3.5 h-3.5 text-amber-500" />,
  ADMIN: <Shield className="w-3.5 h-3.5 text-blue-500" />,
  MEMBER: <User className="w-3.5 h-3.5 text-muted-foreground" />,
};

const ROLE_BADGE_STYLE: Record<string, string> = {
  OWNER: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  ADMIN: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  MEMBER: 'bg-secondary text-secondary-foreground border-transparent',
};

function CreateTeamModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; slug: string }) => {
      const res = await api.post('/teams', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Failed to create team');
    }
  });

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Create a New Team</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Team Name</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Sales Team"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Slug (URL)</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/team/</span>
              <input
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="sales-team"
                value={slug}
                onChange={e => setSlug(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              placeholder="What does this team do?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={!name || !slug || createMutation.isPending}
            onClick={() => createMutation.mutate({ name, description, slug })}
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Team
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InviteMemberModal({ team, onClose }: { team: Team; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await api.post(`/teams/${team.id}/invitations`, data);
      return res.data;
    },
    onSuccess: () => {
      setSuccess(`Invitation sent to ${email}`);
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Failed to send invitation');
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Invite Member</h2>
            <p className="text-sm text-muted-foreground">to <strong>{team.name}</strong></p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="colleague@company.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); setSuccess(''); }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          <Button
            className="flex-1"
            disabled={!email || inviteMutation.isPending}
            onClick={() => inviteMutation.mutate({ email, role })}
          >
            {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
            Send Invite
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TeamCard({ team, currentUserId }: { team: Team; currentUserId: string }) {
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOwner = team.ownerId === currentUserId;

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/teams/${team.id}/members/${userId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/teams/${team.id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/team/${team.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
        <Card className="border-border hover:border-primary/30 transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <UsersRound className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{team.name}</CardTitle>
                  {team.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{team.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">/{team.slug} &bull; {team.members.length} member{team.members.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isOwner && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Owner</Badge>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyLink} title="Copy team booking link">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Open team page" asChild>
                  <a href={`/team/${team.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Members list */}
            <div className="space-y-2 mb-4">
              {team.members.map(member => (
                <div key={member.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                      {(member.user.profile?.name || member.user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.user.profile?.name || member.user.email}</p>
                      {member.user.profile?.name && (
                        <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge className={`text-xs border ${ROLE_BADGE_STYLE[member.role] || ROLE_BADGE_STYLE.MEMBER}`}>
                      <span className="flex items-center gap-1">
                        {ROLE_ICONS[member.role]}
                        {member.role}
                      </span>
                    </Badge>
                    {isOwner && member.userId !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={removeMemberMutation.isPending}
                        onClick={() => {
                          if (confirm(`Remove ${member.user.profile?.name || member.user.email} from the team?`)) {
                            removeMemberMutation.mutate(member.userId);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {isOwner && (
                <Button variant="outline" size="sm" className="text-sm" onClick={() => setShowInvite(true)}>
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Invite Member
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm text-destructive hover:bg-destructive/10 border-destructive/30 ml-auto"
                  disabled={deleteTeamMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete team "${team.name}"? This cannot be undone.`)) {
                      deleteTeamMutation.mutate();
                    }
                  }}
                >
                  {deleteTeamMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                  Delete Team
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {showInvite && <InviteMemberModal team={team} onClose={() => setShowInvite(false)} />}
      </AnimatePresence>
    </>
  );
}

export default function TeamsPage() {
  const [showCreate, setShowCreate] = useState(false);

  const { data: teams, isLoading, error } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await api.get('/teams');
      return res.data;
    },
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
  });

  const currentUserId = me?.id;

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UsersRound className="w-6 h-6 text-primary" />
              Teams
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage your teams for round-robin and collective scheduling.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> New Team
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">Failed to load teams. Please try again.</p>
            </CardContent>
          </Card>
        ) : teams && teams.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {teams.map(team => (
                <TeamCard key={team.id} team={team} currentUserId={currentUserId || ''} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <UsersRound className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              Create a team to enable round-robin or collective scheduling across multiple hosts.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Your First Team
            </Button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && <CreateTeamModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}
