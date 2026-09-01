'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Plus, Trash2, CalendarDays, Clock, Settings2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type TimeSlot = { id: string; startTime: string; endTime: string };
type DaySchedule = { enabled: boolean; slots: TimeSlot[] };
type WeeklySchedule = Record<number, DaySchedule>;
type DateOverride = { id: string; date: string; isAvailable: boolean; startTime?: string; endTime?: string };

const createEmptySchedule = (): WeeklySchedule => {
  return DAYS.reduce((acc, _, index) => {
    acc[index] = {
      enabled: index >= 1 && index <= 5,
      slots: index >= 1 && index <= 5 ? [{ id: Math.random().toString(), startTime: '09:00', endTime: '17:00' }] : [],
    };
    return acc;
  }, {} as WeeklySchedule);
};

export default function AvailabilityPage() {
  const queryClient = useQueryClient();
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  
  // Local editor state
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [timezone, setTimezone] = useState('UTC');
  const [schedule, setSchedule] = useState<WeeklySchedule>(createEmptySchedule());
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [originalTimezone, setOriginalTimezone] = useState('UTC');
  
  const timezones = typeof Intl !== 'undefined' && Intl.supportedValuesOf 
    ? Intl.supportedValuesOf('timeZone') 
    : ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const res = await api.get('/availability/schedules');
      return res.data;
    },
  });

  useEffect(() => {
    if (schedules && schedules.length > 0 && !activeScheduleId) {
      const defaultSch = schedules.find((s: any) => s.isDefault) || schedules[0];
      setActiveScheduleId(defaultSch.id);
    }
  }, [schedules, activeScheduleId]);

  useEffect(() => {
    if (schedules && activeScheduleId) {
      const active = schedules.find((s: any) => s.id === activeScheduleId);
      if (active) {
        setName(active.name);
        setIsDefault(active.isDefault);
        setTimezone(active.timezone || 'UTC');
        setOriginalTimezone(active.timezone || 'UTC');

        const newSchedule = createEmptySchedule();
        Object.keys(newSchedule).forEach((k) => {
          newSchedule[Number(k)].enabled = false;
          newSchedule[Number(k)].slots = [];
        });

        if (active.slots) {
          active.slots.forEach((slot: any) => {
            newSchedule[slot.dayOfWeek].enabled = true;
            newSchedule[slot.dayOfWeek].slots.push({
              id: slot.id || Math.random().toString(),
              startTime: slot.startTime,
              endTime: slot.endTime,
            });
          });
        }
        setSchedule(newSchedule);

        if (active.overrides) {
          setOverrides(active.overrides.map((o: any) => ({
            ...o,
            id: o.id || Math.random().toString()
          })));
        } else {
          setOverrides([]);
        }
      }
    }
  }, [schedules, activeScheduleId]);

  const createMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await api.post('/availability/schedules', { name: newName });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setActiveScheduleId(data.id);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await api.put(`/availability/schedules/${id}`, data);
      return response.data;
    },
    onMutate: () => setIsSaving(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setIsSaving(false);
      alert('Schedule saved successfully!');
    },
    onError: () => {
      setIsSaving(false);
      alert('Failed to save availability.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/availability/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setActiveScheduleId(null);
    }
  });

  const handleSave = () => {
    if (!activeScheduleId) return;
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

    updateMutation.mutate({
      id: activeScheduleId,
      data: {
        name,
        isDefault,
        timezone,
        slots: flatSlots,
        overrides: overrides.map(o => ({
          date: o.date,
          isAvailable: o.isAvailable,
          startTime: o.isAvailable ? o.startTime : null,
          endTime: o.isAvailable ? o.endTime : null
        }))
      }
    });
  };

  const handleCreate = () => {
    const newName = prompt('Enter new schedule name:');
    if (newName) {
      createMutation.mutate(newName);
    }
  };

  const handleDelete = () => {
    if (!activeScheduleId || isDefault) return;
    if (confirm('Are you sure you want to delete this schedule? Event Types using this schedule will fallback to your default.')) {
      deleteMutation.mutate(activeScheduleId);
    }
  };

  const addSlot = (dayIndex: number) => {
    setSchedule(prev => {
      const day = prev[dayIndex];
      return {
        ...prev,
        [dayIndex]: {
          ...day,
          slots: [...day.slots, { id: Math.random().toString(), startTime: '09:00', endTime: '17:00' }]
        }
      };
    });
  };

  const removeSlot = (dayIndex: number, slotId: string) => {
    setSchedule(prev => {
      const day = prev[dayIndex];
      return {
        ...prev,
        [dayIndex]: {
          ...day,
          slots: day.slots.filter(s => s.id !== slotId)
        }
      };
    });
  };

  const updateSlot = (dayIndex: number, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => {
      const day = prev[dayIndex];
      return {
        ...prev,
        [dayIndex]: {
          ...day,
          slots: day.slots.map(s => s.id === slotId ? { ...s, [field]: value } : s)
        }
      };
    });
  };

  const toggleDay = (dayIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        enabled: !prev[dayIndex].enabled,
        slots: prev[dayIndex].slots.length === 0 && !prev[dayIndex].enabled 
          ? [{ id: Math.random().toString(), startTime: '09:00', endTime: '17:00' }] 
          : prev[dayIndex].slots
      }
    }));
  };

  const copyToAll = (sourceDayIndex: number) => {
    setSchedule(prev => {
      const sourceSlots = prev[sourceDayIndex].slots.map(s => ({ ...s, id: Math.random().toString() }));
      const newSchedule = { ...prev };
      
      [1, 2, 3, 4, 5].forEach(day => {
        newSchedule[day] = {
          enabled: true,
          slots: sourceSlots.map(s => ({ ...s, id: Math.random().toString() }))
        };
      });
      return newSchedule;
    });
    alert('Copied to Monday - Friday');
  };

  const addOverride = () => {
    setOverrides(prev => [...prev, {
      id: Math.random().toString(),
      date: new Date().toISOString().split('T')[0],
      isAvailable: false
    }]);
  };

  const removeOverride = (id: string) => {
    setOverrides(prev => prev.filter(o => o.id !== id));
  };

  const updateOverride = (id: string, field: keyof DateOverride, value: any) => {
    setOverrides(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  if (isLoading) return <div>Loading schedules...</div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Availability
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage your working hours and schedules.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Schedules</h3>
            <Button variant="ghost" size="icon" onClick={handleCreate}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-col gap-2">
            {schedules?.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setActiveScheduleId(s.id)}
                className={`flex items-center justify-between p-3 rounded-lg text-left transition-colors ${activeScheduleId === s.id ? 'bg-primary text-primary-foreground font-medium shadow-md' : 'bg-card hover:bg-muted border border-border/50'}`}
              >
                <span className="truncate">{s.name}</span>
                {s.isDefault && <CheckCircle2 className="w-4 h-4 shrink-0 opacity-70" />}
              </button>
            ))}
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 space-y-6">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-brand-blue to-brand-blue/50 w-full" />
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 w-full max-w-xs">
                  <Label>Schedule Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="font-bold text-lg" />
                </div>
                <div className="flex items-center gap-3">
                  {!isDefault && (
                    <Button variant="outline" size="sm" onClick={() => setIsDefault(true)}>Set as Default</Button>
                  )}
                  {!isDefault && (
                    <Button variant="destructive" size="icon" onClick={handleDelete}><Trash2 className="w-4 h-4" /></Button>
                  )}
                  <Button onClick={handleSave} disabled={isSaving} className="shadow-md">
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Schedule'}
                  </Button>
                </div>
              </div>
              
              {timezone !== originalTimezone && (
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                  <Settings2 className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="text-amber-600 dark:text-amber-400 font-medium">Timezone Change Detected</h4>
                    <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                      You are changing the schedule timezone from {originalTimezone} to {timezone}. 
                      This changes how your existing available hours are interpreted for future bookings.
                    </p>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              
              <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <h3 className="text-lg font-semibold flex items-center"><Settings2 className="w-5 h-5 mr-2 text-brand-blue" /> Schedule Settings</h3>
                   <div className="flex items-center gap-3">
                     <Label>Timezone</Label>
                     <select 
                       className="flex h-10 w-full md:w-64 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                       value={timezone} 
                       onChange={e => setTimezone(e.target.value)}
                     >
                       {timezones.map(tz => (
                         <option key={tz} value={tz}>{tz}</option>
                       ))}
                     </select>
                   </div>
                 </div>
              </div>
              
              {/* Weekly Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center"><Clock className="w-5 h-5 mr-2 text-brand-blue" /> Weekly hours</h3>
                  <p className="text-sm text-muted-foreground">Check the box to enable a day.</p>
                </div>
                <div className="divide-y divide-border/50 border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
                  {DAYS.map((day, index) => {
                    const dayData = schedule[index];
                    return (
                      <div key={day} className={`p-4 sm:p-5 flex flex-col xl:flex-row xl:items-start gap-4 transition-colors hover:bg-muted/10 ${dayData.enabled ? 'bg-card' : 'bg-muted/20 opacity-80'}`}>
                        <div className="w-full xl:w-40 flex items-center gap-3 shrink-0 pt-1">
                          <input 
                            type="checkbox" 
                            checked={dayData.enabled} 
                            onChange={() => toggleDay(index)} 
                            className="w-5 h-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
                          />
                          <Label className={`font-semibold text-base cursor-pointer ${dayData.enabled ? 'text-foreground' : 'text-muted-foreground line-through'}`} onClick={() => toggleDay(index)}>
                            {day}
                          </Label>
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-3 min-w-0">
                          {dayData.enabled ? (
                            <>
                              {dayData.slots.map((slot, slotIdx) => (
                                <motion.div 
                                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                  key={slot.id} className="flex flex-wrap items-center gap-2 sm:gap-3"
                                >
                                  <Input type="time" value={slot.startTime} onChange={(e) => updateSlot(index, slot.id, 'startTime', e.target.value)} className="w-[120px] bg-background shadow-sm border-gray-300 focus:border-brand-blue focus:ring-brand-blue" />
                                  <span className="text-muted-foreground font-medium">-</span>
                                  <Input type="time" value={slot.endTime} onChange={(e) => updateSlot(index, slot.id, 'endTime', e.target.value)} className="w-[120px] bg-background shadow-sm border-gray-300 focus:border-brand-blue focus:ring-brand-blue" />
                                  
                                  <div className="flex items-center gap-1 ml-auto sm:ml-2">
                                    <Button variant="ghost" size="icon" onClick={() => removeSlot(index, slot.id)} className="h-10 w-10 text-muted-foreground hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></Button>
                                    {slotIdx === dayData.slots.length - 1 && (
                                      <Button variant="ghost" size="icon" onClick={() => addSlot(index)} className="h-10 w-10 text-brand-blue hover:bg-brand-blue/10 rounded-full transition-colors"><Plus className="w-5 h-5" /></Button>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                              {dayData.slots.length === 0 && (
                                <Button variant="outline" size="sm" onClick={() => addSlot(index)} className="w-fit self-start"><Plus className="w-4 h-4 mr-2" /> Add slot</Button>
                              )}
                            </>
                          ) : (
                            <div className="text-muted-foreground text-sm pt-1.5 font-medium">Unavailable</div>
                          )}
                        </div>
                        {dayData.enabled && index >= 1 && index <= 5 && (
                          <div className="pt-2 xl:pt-0">
                            <Button variant="link" size="sm" onClick={() => copyToAll(index)} className="text-brand-blue p-0 h-auto hover:no-underline hover:text-brand-purple text-xs">
                              Copy to Mon-Fri
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date Overrides */}
              <div className="space-y-4 pt-6 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-semibold flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-brand-blue" /> Date overrides</h3>
                    <p className="text-sm text-muted-foreground">Add specific dates where your availability differs from the regular weekly schedule.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addOverride}><Plus className="w-4 h-4 mr-2" /> Add Override</Button>
                </div>

                {overrides.length > 0 ? (
                  <div className="space-y-3">
                    {overrides.map(override => (
                      <Card key={override.id} className="p-4 border-border/50 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
                        <Input type="date" value={override.date} onChange={e => updateOverride(override.id, 'date', e.target.value)} className="w-fit bg-background" />
                        
                        <div className="flex items-center gap-2">
                          <Switch checked={override.isAvailable} onCheckedChange={c => updateOverride(override.id, 'isAvailable', c)} />
                          <Label className="text-sm whitespace-nowrap">{override.isAvailable ? 'Available' : 'Unavailable'}</Label>
                        </div>

                        {override.isAvailable && (
                          <div className="flex items-center gap-2 flex-1">
                            <Input type="time" value={override.startTime || '09:00'} onChange={e => updateOverride(override.id, 'startTime', e.target.value)} className="w-[110px]" />
                            <span className="text-muted-foreground">-</span>
                            <Input type="time" value={override.endTime || '17:00'} onChange={e => updateOverride(override.id, 'endTime', e.target.value)} className="w-[110px]" />
                          </div>
                        )}
                        
                        <Button variant="ghost" size="icon" onClick={() => removeOverride(override.id)} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted/30 border border-border/50 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm max-w-sm">No overrides configured. Your regular weekly hours will be applied every day.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
