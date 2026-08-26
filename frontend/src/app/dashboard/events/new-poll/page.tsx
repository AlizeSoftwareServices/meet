'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Globe, Users, Clock, Plus } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function NewMeetingPollPage() {
  const router = useRouter();
  
  // Dummy state for selected timeslots
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  
  const toggleTime = (timeId: string) => {
    setSelectedTimes(prev => 
      prev.includes(timeId) ? prev.filter(t => t !== timeId) : [...prev, timeId]
    );
  };

  const handleNext = () => {
    alert("In the full version, this would generate your unique Meeting Poll link with these times!");
    router.push('/dashboard/events');
  };

  // Generate simple grid for a week
  const days = ['SUN 12', 'MON 13', 'TUE 14', 'WED 15', 'THU 16', 'FRI 17', 'SAT 18'];
  const hours = [9, 10, 11, 12, 1, 2, 3, 4, 5];

  return (
    <div className="h-[calc(100vh-4rem)] -mt-6 -mx-6 bg-background flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-border/50 flex items-center justify-between px-6 bg-background shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/events">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">New meeting poll</h1>
        </div>
        
        {/* Fake progress bar */}
        <div className="flex-1 max-w-md mx-8 hidden sm:block">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-brand-blue w-1/3" />
          </div>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => router.push('/dashboard/events')}>
          <ArrowLeft className="w-4 h-4 rotate-45" /> {/* Close icon lookalike */}
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[320px] border-r border-border/50 bg-background/50 overflow-y-auto hidden md:block shrink-0">
          <div className="p-6 space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                Time zone
              </label>
              <button className="flex items-center justify-between w-full px-3 py-2 border border-border/50 rounded-lg bg-background text-sm font-medium hover:bg-muted transition-colors text-left text-brand-blue">
                <span className="flex items-center gap-2 truncate">
                  <Globe className="w-4 h-4 shrink-0" />
                  India Standard Time
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90 shrink-0" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground">Duration</label>
              <select defaultValue="30 minutes" className="w-full px-3 py-2 border border-border/50 rounded-lg bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-brand-blue/50 appearance-none cursor-pointer hover:bg-muted transition-colors">
                <option value="15 minutes">15 minutes</option>
                <option value="30 minutes">30 minutes</option>
                <option value="45 minutes">45 minutes</option>
                <option value="60 minutes">60 minutes</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground">Host</label>
              <div className="flex items-center gap-3 p-3 border border-border/50 rounded-lg bg-background">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  J
                </div>
                <div>
                  <p className="text-sm font-bold leading-none mb-1">Jayanth (you)</p>
                  <p className="text-xs text-muted-foreground">Weekdays, 9 am - 5 pm</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                You are the only one in your organization. Add users to include them as hosts.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Calendar Area */}
        <main className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative">
          
          <div className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-background shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><ChevronRight className="w-4 h-4" /></Button>
              </div>
              <span className="font-bold text-lg">Jul 2026</span>
            </div>
          </div>

          {/* Calendar Grid Container */}
          <div className="flex-1 overflow-auto bg-background relative">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="flex border-b border-border/50 sticky top-0 bg-background z-10 shadow-sm">
                <div className="w-16 shrink-0 border-r border-border/50 bg-background" /> {/* Time column header */}
                {days.map((day, idx) => (
                  <div key={day} className="flex-1 min-w-[120px] py-3 text-center border-r border-border/50 last:border-r-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{day.split(' ')[0]}</p>
                    <p className="text-2xl font-light text-foreground">{day.split(' ')[1]}</p>
                    
                    {/* Add times button */}
                    <div className="mt-2 h-6 flex justify-center">
                      <button className="text-xs font-bold text-brand-blue hover:text-brand-purple transition-colors flex items-center opacity-0 hover:opacity-100 group-hover:opacity-100">
                        <Plus className="w-3 h-3 mr-1" /> Add times
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid Body */}
              <div className="relative">
                {hours.map((hour, idx) => (
                  <div key={hour} className="flex border-b border-border/50 relative h-[60px] group">
                    <div className="w-16 shrink-0 border-r border-border/50 flex justify-center pt-2 relative bg-background z-10">
                      <span className="text-[10px] font-bold text-muted-foreground -translate-y-4 bg-background px-1">
                        {hour}{idx < 3 ? 'AM' : 'PM'}
                      </span>
                    </div>
                    {days.map((day, dIdx) => {
                      const timeId = `${day}-${hour}`;
                      const isSelected = selectedTimes.includes(timeId);
                      const isUnavailable = (dIdx === 3 && hour === 1); // Mock unavailable slot

                      return (
                        <div 
                          key={timeId} 
                          onClick={() => !isUnavailable && toggleTime(timeId)}
                          className={`flex-1 min-w-[120px] border-r border-border/50 last:border-r-0 relative cursor-pointer transition-colors ${isUnavailable ? 'bg-muted/30 cursor-not-allowed' : 'hover:bg-brand-blue/5'}`}
                        >
                          {/* Grid line divisions for half hours */}
                          <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/30 h-px" />
                          
                          {isUnavailable && (
                            <div className="absolute top-2 left-2 right-2 bottom-2 bg-muted/50 rounded flex items-center justify-center border border-border/50">
                              <span className="text-[10px] font-bold text-muted-foreground">Unavailable</span>
                            </div>
                          )}

                          <AnimatePresence>
                            {isSelected && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute top-1 left-1 right-1 bottom-1 bg-brand-blue text-white rounded-md shadow-sm border border-brand-blue/20 flex flex-col justify-center items-center z-10"
                              >
                                <span className="text-[10px] font-bold leading-none">{hour}:00 - {hour}:30</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Footer CTA */}
      <footer className="h-20 border-t border-border/50 bg-background shrink-0 flex items-center justify-between px-6 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4">
           {selectedTimes.length > 0 && (
             <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center">
                 <span className="text-xs font-bold text-brand-blue">{selectedTimes.length}</span>
               </div>
               <span className="text-sm font-bold text-foreground">times selected</span>
             </motion.div>
           )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">Select times to share</span>
          <Button 
            onClick={handleNext}
            disabled={selectedTimes.length === 0}
            className="rounded-full px-10 h-12 font-bold bg-brand-blue hover:bg-brand-blue/90 text-white shadow-lg shadow-brand-blue/20 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
          >
            Next
          </Button>
        </div>
      </footer>
    </div>
  );
}
