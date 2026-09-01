'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, ArrowLeft, BarChart, CalendarDays, Clock, AlignLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
      const formattedSlots = slots.map(s => {
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/polls" className="p-2.5 bg-background border border-border/50 hover:bg-muted rounded-full transition-all hover:scale-105 shadow-sm">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Create Meeting Poll</h1>
          <p className="text-muted-foreground mt-1">Let your invitees vote on the best time to meet.</p>
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-3xl shadow-xl overflow-hidden relative">
        {/* Top gradient strip */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-purple via-brand-blue to-brand-green" />
        
        <div className="p-8 sm:p-10 space-y-10">
          
          {/* Section 1: Details */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border/50 pb-4">
              <span className="bg-brand-purple/10 text-brand-purple p-2 rounded-xl">
                <BarChart className="w-5 h-5" />
              </span>
              Poll Details
            </h2>
            
            <div className="grid gap-6">
              <div className="space-y-2.5">
                <Label className="text-base font-semibold">Poll Title <span className="text-brand-red">*</span></Label>
                <Input 
                  required 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Q3 Roadmap Planning" 
                  className="h-12 text-lg px-4 border-gray-300 focus:border-brand-purple focus:ring-brand-purple shadow-sm transition-all rounded-xl"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-muted-foreground" /> Description
                </Label>
                <Textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Share context, agenda, or anything else attendees should know..." 
                  className="min-h-[120px] resize-y border-gray-300 focus:border-brand-purple focus:ring-brand-purple shadow-sm transition-all rounded-xl p-4 text-base"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Duration */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border/50 pb-4">
              <span className="bg-brand-blue/10 text-brand-blue p-2 rounded-xl">
                <Clock className="w-5 h-5" />
              </span>
              Duration <span className="text-brand-red font-normal text-base ml-1">*</span>
            </h2>
            
            <div className="flex flex-wrap gap-3">
              {[15, 30, 45, 60, 90].map((min) => (
                <button
                  key={min}
                  onClick={() => setDuration(min)}
                  className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 border-2 ${
                    duration === min 
                      ? 'border-brand-blue bg-brand-blue/10 text-brand-blue shadow-sm' 
                      : 'border-border/60 text-muted-foreground hover:border-brand-blue/50 hover:bg-muted'
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Time Slots */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="bg-brand-green/10 text-brand-green p-2 rounded-xl">
                  <CalendarDays className="w-5 h-5" />
                </span>
                Propose Times <span className="text-brand-red font-normal text-base ml-1">*</span>
              </h2>
              <Button type="button" onClick={addSlot} className="bg-brand-green/10 text-brand-green hover:bg-brand-green/20 hover:text-brand-green rounded-full font-bold shadow-none">
                <Plus className="w-4 h-4 mr-2" /> Add Option
              </Button>
            </div>
            
            <div className="space-y-4">
              {slots.map((slot, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx} 
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-muted/20 border border-border/60 rounded-2xl shadow-sm hover:border-brand-green/30 transition-all"
                >
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">Date</Label>
                    <Input 
                      type="date" 
                      required 
                      value={slot.date} 
                      onChange={e => {
                        const newSlots = [...slots];
                        newSlots[idx].date = e.target.value;
                        setSlots(newSlots);
                      }} 
                      className="bg-background border-gray-300 focus:border-brand-green h-11" 
                    />
                  </div>
                  
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">Start Time</Label>
                    <Input 
                      type="time" 
                      required 
                      value={slot.startTime} 
                      onChange={e => {
                        const newSlots = [...slots];
                        newSlots[idx].startTime = e.target.value;
                        setSlots(newSlots);
                      }} 
                      className="bg-background border-gray-300 focus:border-brand-green h-11" 
                    />
                  </div>
                  
                  <div className="hidden sm:flex self-end h-11 items-center px-1 text-muted-foreground font-medium">to</div>
                  
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">End Time</Label>
                    <Input 
                      type="time" 
                      required 
                      value={slot.endTime} 
                      onChange={e => {
                        const newSlots = [...slots];
                        newSlots[idx].endTime = e.target.value;
                        setSlots(newSlots);
                      }} 
                      className="bg-background border-gray-300 focus:border-brand-green h-11" 
                    />
                  </div>
                  
                  <div className="self-end pb-1 sm:pb-0">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeSlot(idx)} 
                      disabled={slots.length === 1} 
                      className="h-11 w-11 text-muted-foreground hover:bg-red-50 hover:text-brand-red rounded-xl transition-colors shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer / Actions */}
        <div className="bg-muted/30 p-8 border-t border-border/60 flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-medium max-w-[60%]">
            Once created, you will get a link to share with participants to collect their votes.
          </p>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={createMutation.isPending || !title || slots.some(s => !s.date || !s.startTime || !s.endTime)}
            className="h-12 px-8 rounded-full font-bold text-base bg-brand-purple hover:bg-brand-purple/90 text-white shadow-lg shadow-brand-purple/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            {createMutation.isPending ? 'Creating...' : (
              <>
                Create Poll <Send className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
