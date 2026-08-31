'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Users, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function PollsDashboardPage() {
  const { data: polls, isLoading } = useQuery({
    queryKey: ['polls'],
    queryFn: async () => {
      const res = await api.get('/polls');
      return res.data;
    },
  });

  if (isLoading) {
    return <div className="p-8">Loading polls...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-foreground">Meeting Polls</h1>
          <p className="text-muted-foreground mt-2">Create polls to find the best time to meet with multiple people.</p>
        </div>
        <Link href="/dashboard/polls/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Poll
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {polls?.length === 0 ? (
          <div className="col-span-full p-12 text-center border rounded-2xl bg-card text-muted-foreground">
            No polls created yet. Click "New Poll" to get started.
          </div>
        ) : (
          polls?.map((poll: any) => (
            <Card key={poll.id} className="relative overflow-hidden group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{poll.title}</CardTitle>
                  <span className={`text-xs px-2 py-1 rounded-full ${poll.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {poll.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{poll.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {poll.duration} min
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {poll.slots.reduce((acc: number, slot: any) => acc + slot.votes.length, 0)} votes
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/polls/${poll.id}`} target="_blank" className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                      <ExternalLink className="w-4 h-4" />
                      View Poll Page
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
