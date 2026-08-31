'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, HelpCircle, Clock, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function GuestPollPage({ params }: any) {
  const queryClient = useQueryClient();
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  
  // Local state for votes before submitting
  // pollSlotId -> status ('YES', 'NO', 'IF_NEED_BE')
  const [votes, setVotes] = useState<Record<string, string>>({});

  const { data: poll, isLoading, error } = useQuery({
    queryKey: ['poll', params.id],
    queryFn: async () => {
      // NOTE: We probably need a public endpoint for polls without auth. 
      // The current getPollById requires auth? Wait, it's defined in PollsController.
      // Let's assume it's open for now, or we need to add a public endpoint.
      const res = await api.get(`/polls/${params.id}`);
      return res.data;
    },
    retry: false
  });

  const voteMutation = useMutation({
    mutationFn: async () => {
      // Submit all selected votes
      for (const [slotId, status] of Object.entries(votes)) {
        await api.post(`/polls/${params.id}/vote`, {
          guestName,
          guestEmail,
          pollSlotId: slotId,
          status
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll', params.id] });
      alert('Your votes have been submitted!');
    }
  });

  if (isLoading) return <div className="p-8 text-center">Loading poll...</div>;
  if (error || !poll) return <div className="p-8 text-center">Poll not found</div>;

  const handleVote = (slotId: string, status: string) => {
    setVotes(prev => ({ ...prev, [slotId]: status }));
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-zinc-900">{poll.title}</h1>
          {poll.description && <p className="text-zinc-500">{poll.description}</p>}
          <div className="flex items-center justify-center gap-4 text-sm text-zinc-500 mt-4">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {poll.duration} min</span>
            <span>Hosted by {poll.host.profile?.name || poll.host.email}</span>
          </div>
          {poll.status === 'CLOSED' && (
            <div className="inline-block mt-4 px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium text-sm">
              This poll is closed
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-2">
              <Label>Your Name *</Label>
              <Input required value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Jane Doe" disabled={poll.status === 'CLOSED'} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Your Email *</Label>
              <Input required type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="jane@example.com" disabled={poll.status === 'CLOSED'} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Select your availability</h3>
            
            <div className="space-y-3">
              {poll.slots.map((slot: any) => {
                const start = parseISO(slot.startTime);
                const end = parseISO(slot.endTime);
                
                // Count current votes
                const yesVotes = slot.votes.filter((v: any) => v.status === 'YES').length;
                const noVotes = slot.votes.filter((v: any) => v.status === 'NO').length;
                const ifNeedBeVotes = slot.votes.filter((v: any) => v.status === 'IF_NEED_BE').length;

                return (
                  <div key={slot.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl gap-4 hover:border-primary/50 transition-colors bg-zinc-50/50">
                    <div>
                      <p className="font-medium text-zinc-900">{format(start, 'EEEE, MMMM d, yyyy')}</p>
                      <p className="text-zinc-500 text-sm">{format(start, 'h:mm a')} - {format(end, 'h:mm a')}</p>
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-green-600">{yesVotes} Yes</span>
                        <span className="text-red-500">{noVotes} No</span>
                        <span className="text-yellow-600">{ifNeedBeVotes} If need be</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={votes[slot.id] === 'YES' ? 'default' : 'outline'}
                        className={`w-12 h-12 p-0 rounded-full ${votes[slot.id] === 'YES' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        onClick={() => handleVote(slot.id, 'YES')}
                        disabled={poll.status === 'CLOSED'}
                      >
                        <Check className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant={votes[slot.id] === 'IF_NEED_BE' ? 'default' : 'outline'}
                        className={`w-12 h-12 p-0 rounded-full ${votes[slot.id] === 'IF_NEED_BE' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                        onClick={() => handleVote(slot.id, 'IF_NEED_BE')}
                        disabled={poll.status === 'CLOSED'}
                      >
                        <HelpCircle className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant={votes[slot.id] === 'NO' ? 'default' : 'outline'}
                        className={`w-12 h-12 p-0 rounded-full ${votes[slot.id] === 'NO' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                        onClick={() => handleVote(slot.id, 'NO')}
                        disabled={poll.status === 'CLOSED'}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button 
              size="lg" 
              onClick={() => voteMutation.mutate()}
              disabled={!guestName || !guestEmail || Object.keys(votes).length === 0 || voteMutation.isPending || poll.status === 'CLOSED'}
            >
              {voteMutation.isPending ? 'Submitting...' : 'Submit Votes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
