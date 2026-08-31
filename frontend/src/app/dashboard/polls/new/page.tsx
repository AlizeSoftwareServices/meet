'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewPollPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [slots, setSlots] = useState([{ date: '', startTime: '', endTime: '' }]);

  const addSlot = () => setSlots([...slots, { date: '', startTime: '', endTime: '' }]);
  const removeSlot = (index: number) => setSlots(slots.filter((_, i) => i !== index));

  const createMutation = useMutation({
    mutationFn: async () => {
      // Convert slots to ISO strings
      const formattedSlots = slots.map(s => {
        // Just simple conversion assuming local timezone
        const start = new Date(`${s.date}T${s.startTime}`);
        const end = new Date(`${s.date}T${s.endTime}`);
        return {
          startTime: start.toISOString(),
          endTime: end.toISOString()
        };
      });

      const res = await api.post('/polls', {
        title,
        description,
        duration,
        slots: formattedSlots
      });
      return res.data;
    },
    onSuccess: () => {
      router.push('/dashboard/polls');
    }
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/polls" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Create Meeting Poll</h1>
      </div>

      <div className="bg-card border border-border p-8 rounded-2xl shadow-sm space-y-6">
        <div className="space-y-2">
          <Label>Poll Title *</Label>
          <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Project Kickoff Meeting" />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this meeting about?" />
        </div>

        <div className="space-y-2">
          <Label>Duration (minutes) *</Label>
          <select 
            value={duration} 
            onChange={e => setDuration(Number(e.target.value))}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </select>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Propose Times *</Label>
          {slots.map((slot, idx) => (
            <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <Input type="date" required value={slot.date} onChange={e => {
                const newSlots = [...slots];
                newSlots[idx].date = e.target.value;
                setSlots(newSlots);
              }} />
              <Input type="time" required value={slot.startTime} onChange={e => {
                const newSlots = [...slots];
                newSlots[idx].startTime = e.target.value;
                setSlots(newSlots);
              }} />
              <span>to</span>
              <Input type="time" required value={slot.endTime} onChange={e => {
                const newSlots = [...slots];
                newSlots[idx].endTime = e.target.value;
                setSlots(newSlots);
              }} />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(idx)} disabled={slots.length === 1} className="shrink-0 text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addSlot} className="gap-2">
            <Plus className="w-4 h-4" /> Add Time Option
          </Button>
        </div>

        <div className="pt-6 border-t flex justify-end">
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={createMutation.isPending || !title || slots.some(s => !s.date || !s.startTime || !s.endTime)}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Poll'}
          </Button>
        </div>
      </div>
    </div>
  );
}
