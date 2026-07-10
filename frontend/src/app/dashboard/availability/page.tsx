'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Plus, Trash2, CalendarDays, Clock, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

type TimeSlot = { id: string; startTime: string; endTime: string };
type DaySchedule = { enabled: boolean; slots: TimeSlot[] };
type WeeklySchedule = Record<number, DaySchedule>;
type DateOverride = { id: string; date: string; isAvailable: boolean; startTime?: string; endTime?: string };

const defaultSchedule: WeeklySchedule = DAYS.reduce((acc, _, index) => {
  acc[index] = {
    enabled: index >= 1 && index <= 5, // Mon-Fri default enabled
    slots: index >= 1 && index <= 5 ? [{ id: Math.random().toString(), startTime: '09:00', endTime: '17:00' }] : [],
  };
  return acc;
}, {} as WeeklySchedule);

export default function AvailabilityPage() {
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState<WeeklySchedule>(defaultSchedule);
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: availability, isLoading } = useQuery({
    queryKey: ['availability'],
    queryFn: async () => {
      const res = await api.get('/availability');
      return res.data;
    },
  });

  useEffect(() => {
    if (availability) {
      const newSchedule = { ...defaultSchedule };
      Object.keys(newSchedule).forEach((k) => {
        newSchedule[Number(k)].enabled = false;
        newSchedule[Number(k)].slots = [];
      });

      if (availability.slots) {
        availability.slots.forEach((slot: any) => {
          newSchedule[slot.dayOfWeek].enabled = true;
          newSchedule[slot.dayOfWeek].slots.push({
            id: slot.id || Math.random().toString(),
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        });
      }
      setSchedule(newSchedule);

      if (availability.overrides) {
        setOverrides(availability.overrides.map((o: any) => ({
          ...o,
          id: o.id || Math.random().toString()
        })));
      }
    }
  }, [availability]);

  const updateMutation = useMutation({
    mutationFn: async ({ slots, overridesData }: { slots: any[], overridesData: any[] }) => {
      const response = await api.put('/availability', { slots, overrides: overridesData });
      return response.data;
    },
    onMutate: () => setIsSaving(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setIsSaving(false);
      alert('Availability schedule saved successfully!');
    },
    onError: () => {
      setIsSaving(false);
      alert('Failed to save availability.');
    }
  });

  const handleSave = () => {
    const flatSlots: any[] = [];
    Object.entries(schedule).forEach(([dayStr, data]) => {
      if (data.enabled) {
        data.slots.forEach(slot => {
          flatSlots.push({
            dayOfWeek: parseInt(dayStr),
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        });
      }
    });

    const mappedOverrides = overrides.map(o => ({
      date: o.date,
      isAvailable: o.isAvailable,
      startTime: o.isAvailable ? o.startTime : null,
      endTime: o.isAvailable ? o.endTime : null,
    }));

    updateMutation.mutate({ slots: flatSlots, overridesData: mappedOverrides });
  };

  const toggleDay = (dayIndex: number, checked: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        enabled: checked,
        slots: checked && prev[dayIndex].slots.length === 0 
          ? [{ id: Math.random().toString(), startTime: '09:00', endTime: '17:00' }] 
          : prev[dayIndex].slots
      }
    }));
  };

  const addSlot = (dayIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        slots: [...prev[dayIndex].slots, { id: Math.random().toString(), startTime: '09:00', endTime: '17:00' }]
      }
    }));
  };

  const removeSlot = (dayIndex: number, slotId: string) => {
    setSchedule(prev => {
      const newSlots = prev[dayIndex].slots.filter(s => s.id !== slotId);
      return {
        ...prev,
        [dayIndex]: {
          ...prev[dayIndex],
          enabled: newSlots.length > 0,
          slots: newSlots,
        }
      };
    });
  };

  const updateSlot = (dayIndex: number, slotId: string, field: 'startTime'|'endTime', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        slots: prev[dayIndex].slots.map(s => s.id === slotId ? { ...s, [field]: value } : s)
      }
    }));
  };

  const addOverride = () => {
    setOverrides([...overrides, { 
      id: Math.random().toString(), 
      date: new Date().toISOString().split('T')[0], 
      isAvailable: false,
      startTime: '09:00',
      endTime: '17:00'
    }]);
  };

  const updateOverride = (id: string, field: keyof DateOverride, value: any) => {
    setOverrides(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const removeOverride = (id: string) => {
    setOverrides(prev => prev.filter(o => o.id !== id));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Availability
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Configure your weekly working hours and date-specific exceptions.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="rounded-full px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40">
          <Save className="w-5 h-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        <motion.div 
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-lg border-l-4 border-l-primary">
            <CardHeader className="p-8 pb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <CardTitle className="text-2xl">Weekly Hours</CardTitle>
              </div>
              <CardDescription>Set your general availability for regular meetings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0 p-8 pt-0">
              {isLoading ? (
                <div className="p-6 space-y-4 animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {DAYS.map((day, index) => {
                    const dayData = schedule[index];
                    const dayAbbr = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'][index];
                    
                    return (
                      <div key={day} className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 hover:bg-muted/10 transition-colors group">
                        <div className="w-20 pt-1">
                          <button 
                            onClick={() => toggleDay(index, !dayData.enabled)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                              dayData.enabled 
                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {dayAbbr}
                          </button>
                        </div>
                        
                        <div className="flex-1 pt-1">
                          {dayData.enabled ? (
                            <div className="space-y-3">
                              {dayData.slots.map((slot, slotIndex) => (
                                <div key={slot.id} className="flex flex-wrap items-center gap-3">
                                  <div className="flex items-center bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-xl p-2 w-fit transition-all focus-within:ring-2 focus-within:ring-brand-blue/30 focus-within:border-brand-blue/50">
                                    <Input 
                                      type="time" 
                                      className="w-[120px] text-base font-medium h-10 px-3 border-0 focus-visible:ring-0 bg-transparent shadow-none" 
                                      value={slot.startTime} 
                                      onChange={(e) => updateSlot(index, slot.id, 'startTime', e.target.value)}
                                    />
                                    <span className="text-muted-foreground font-semibold px-2">-</span>
                                    <Input 
                                      type="time" 
                                      className="w-[120px] text-base font-medium h-10 px-3 border-0 focus-visible:ring-0 bg-transparent shadow-none" 
                                      value={slot.endTime} 
                                      onChange={(e) => updateSlot(index, slot.id, 'endTime', e.target.value)}
                                    />
                                  </div>
                                  
                                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => removeSlot(index, slot.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                    {slotIndex === dayData.slots.length - 1 && (
                                      <Button variant="ghost" size="icon" onClick={() => addSlot(index)} className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-9 w-9">
                                        <Plus className="w-5 h-5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-sm font-medium py-2.5">Unavailable</div>
                          )}
                        </div>
                        
                        {!dayData.enabled && (
                          <div className="pt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => toggleDay(index, true)} className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-9 w-9">
                              <Plus className="w-5 h-5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-lg border-t-4 border-t-amber-500">
            <CardHeader className="p-8 pb-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-xl">Date Overrides</CardTitle>
              </div>
              <CardDescription>Add specific dates when your availability changes from the weekly schedule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-8 pt-0">
              {overrides.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-xl bg-muted/20">
                  <Settings2 className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No date overrides added yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {overrides.map((override) => (
                    <div key={override.id} className="p-4 bg-muted/30 border border-border/50 rounded-xl space-y-3 relative group">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeOverride(override.id)} 
                        className="absolute -top-2 -right-2 w-7 h-7 bg-background border border-border shadow-sm text-muted-foreground hover:text-destructive hover:border-destructive transition-opacity opacity-0 group-hover:opacity-100 rounded-full"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      
                      <div>
                        <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 block ml-1">Select Date</Label>
                        <Input 
                          type="date" 
                          value={override.date} 
                          onChange={(e) => updateOverride(override.id, 'date', e.target.value)}
                          className="bg-zinc-50/50 dark:bg-zinc-900 h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 shadow-sm focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue/50"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm font-medium">Available?</span>
                        <Switch 
                          checked={override.isAvailable} 
                          onCheckedChange={(checked) => updateOverride(override.id, 'isAvailable', checked)}
                        />
                      </div>

                      {override.isAvailable && (
                        <div className="flex items-center gap-3 pt-3">
                          <Input 
                            type="time" 
                            className="bg-zinc-50/50 dark:bg-zinc-900 h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 shadow-sm focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue/50 flex-1 text-center font-medium" 
                            value={override.startTime} 
                            onChange={(e) => updateOverride(override.id, 'startTime', e.target.value)}
                          />
                          <span className="text-muted-foreground font-semibold">-</span>
                          <Input 
                            type="time" 
                            className="bg-zinc-50/50 dark:bg-zinc-900 h-12 px-4 rounded-xl border-zinc-200/80 dark:border-zinc-800 shadow-sm focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue/50 flex-1 text-center font-medium" 
                            value={override.endTime} 
                            onChange={(e) => updateOverride(override.id, 'endTime', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <Button variant="outline" className="w-full border-dashed border-2 hover:bg-primary/5 hover:text-primary hover:border-primary/50" onClick={addOverride}>
                <Plus className="w-4 h-4 mr-2" />
                Add Date Override
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
