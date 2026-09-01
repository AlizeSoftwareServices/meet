'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Plus, 
  Trash2, 
  CalendarDays, 
  Clock, 
  Settings2, 
  CheckCircle2, 
  Zap, 
  Globe, 
  Sparkles,
  RotateCcw,
  Pencil,
  X,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type TimeSlot = { id: string; startTime: string; endTime: string };
type DaySchedule = { enabled: boolean; slots: TimeSlot[] };
type WeeklySchedule = Record<number, DaySchedule>;
type DateOverride = { id: string; date: string; isAvailable: boolean; startTime?: string; endTime?: string };

// Generate 30-minute intervals for custom TimeSelect
const generateTimeOptions = () => {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      const value = `${hh}:${mm}`;
      const ampm = h >= 12 ? 'PM' : 'AM';
      let displayH = h % 12;
      if (displayH === 0) displayH = 12;
      const label = `${displayH}:${mm} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

function TimeSelect({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  disabled?: boolean; 
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-[130px] items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed shadow-xs cursor-pointer"
    >
      {TIME_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

const createDefaultSchedule = (): WeeklySchedule => {
  return DAYS.reduce((acc, _, index) => {
    const isWeekday = index >= 1 && index <= 5;
    acc[index] = {
      enabled: isWeekday,
      slots: isWeekday ? [{ id: Math.random().toString(), startTime: '09:00', endTime: '17:00' }] : [],
    };
    return acc;
  }, {} as WeeklySchedule);
};

const formatTime12h = (time24: string): string => {
  if (!time24) return '';
  const match = TIME_OPTIONS.find((t) => t.value === time24);
  if (match) return match.label;
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr || '00'} ${ampm}`;
};

const calculateDurationHours = (start: string, end: string): string => {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const diffMin = endMin - startMin;
  if (diffMin <= 0) return '';
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) return `${hrs} hrs`;
  return `${hrs}h ${mins}m`;
};

export default function AvailabilityPage() {
  const queryClient = useQueryClient();
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  
  // View vs Edit Mode State
  const [isEditing, setIsEditing] = useState(false);

  // Local editor state
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [timezone, setTimezone] = useState('UTC');
  const [schedule, setSchedule] = useState<WeeklySchedule>(createDefaultSchedule());
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [originalTimezone, setOriginalTimezone] = useState('UTC');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };
  
  const timezones = typeof Intl !== 'undefined' && Intl.supportedValuesOf 
    ? Intl.supportedValuesOf('timeZone') 
    : ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Tokyo'];

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

        const newSchedule = createDefaultSchedule();
        Object.keys(newSchedule).forEach((k) => {
          newSchedule[Number(k)].enabled = false;
          newSchedule[Number(k)].slots = [];
        });

        if (active.slots && active.slots.length > 0) {
          active.slots.forEach((slot: any) => {
            newSchedule[slot.dayOfWeek].enabled = true;
            newSchedule[slot.dayOfWeek].slots.push({
              id: slot.id || Math.random().toString(),
              startTime: slot.startTime,
              endTime: slot.endTime,
            });
          });
        } else {
          // Default fallback: Enable Mon-Fri 9 AM - 5 PM
          [1, 2, 3, 4, 5].forEach((d) => {
            newSchedule[d].enabled = true;
            newSchedule[d].slots = [{ id: Math.random().toString(), startTime: '09:00', endTime: '17:00' }];
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
      queryClient.invalidateQueries({ queryKey: ['public-slots'] });
      setActiveScheduleId(data.id);
      setIsEditing(true);
      showToast('Created new schedule! Configure hours below.');
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
      queryClient.invalidateQueries({ queryKey: ['public-slots'] });
      setIsSaving(false);
      setIsEditing(false);
      showToast('Schedule saved to DB! Updated live for guests on your booking link.');
    },
    onError: () => {
      setIsSaving(false);
      showToast('Failed to save availability.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/availability/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['public-slots'] });
      setActiveScheduleId(null);
      setIsEditing(false);
      showToast('Schedule deleted.');
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

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reload active schedule from query client
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    showToast('Cancelled schedule edits.');
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
    if (!isEditing) return;
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

  const applyPreset = (preset: 'MON_FRI_9_5' | 'EVERYDAY_9_9' | 'CLEAR') => {
    setSchedule(prev => {
      const newSch = { ...prev };
      if (preset === 'MON_FRI_9_5') {
        [0, 6].forEach(day => {
          newSch[day] = { enabled: false, slots: [] };
        });
        [1, 2, 3, 4, 5].forEach(day => {
          newSch[day] = {
            enabled: true,
            slots: [{ id: Math.random().toString(), startTime: '09:00', endTime: '17:00' }]
          };
        });
      } else if (preset === 'EVERYDAY_9_9') {
        [0, 1, 2, 3, 4, 5, 6].forEach(day => {
          newSch[day] = {
            enabled: true,
            slots: [{ id: Math.random().toString(), startTime: '09:00', endTime: '21:00' }]
          };
        });
      } else if (preset === 'CLEAR') {
        [0, 1, 2, 3, 4, 5, 6].forEach(day => {
          newSch[day] = { enabled: false, slots: [] };
        });
      }
      return newSch;
    });
    showToast(
      preset === 'MON_FRI_9_5' ? 'Applied Mon-Fri (9:00 AM – 5:00 PM)' : 
      preset === 'EVERYDAY_9_9' ? 'Applied Everyday (9:00 AM – 9:00 PM)' : 
      'Cleared schedule hours'
    );
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
    showToast('Copied hours to Monday – Friday');
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

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading working schedules...</div>;

  // Active summary calculation
  const enabledDays = DAYS.filter((_, idx) => schedule[idx]?.enabled);
  const weekdaysEnabled = [1, 2, 3, 4, 5].every(d => schedule[d]?.enabled);
  const weekendEnabled = [0, 6].some(d => schedule[d]?.enabled);

  let summaryText = 'Custom Schedule';
  if (weekdaysEnabled && !weekendEnabled) {
    summaryText = 'Monday – Friday (9:00 AM – 5:00 PM)';
  } else if (enabledDays.length === 7) {
    summaryText = 'Everyday (7 Days a week)';
  } else if (enabledDays.length === 0) {
    summaryText = 'No active hours configured';
  } else {
    summaryText = `${enabledDays.join(', ')}`;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 font-medium text-sm border border-blue-400/30"
          >
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Availability & Working Hours
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Set your weekly business hours, timezone, and date overrides for guest bookings.
          </p>
        </div>
      </div>

      {/* Live Summary & Mode Toggle Banner */}
      <Card className="bg-gradient-to-r from-blue-600/10 via-indigo-500/10 to-transparent border-blue-500/20 shadow-sm overflow-hidden">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {isEditing ? 'Editing Schedule' : 'Active Schedule'}
                </span>
                {isDefault && (
                  <Badge className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                    Default Schedule
                  </Badge>
                )}
                {isEditing && (
                  <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-amber-500/30">
                    Unsaved Edits
                  </Badge>
                )}
              </div>
              <p className="font-bold text-lg text-foreground mt-0.5">{name || 'Working Hours'}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                Timezone: <span className="font-semibold text-foreground">{timezone}</span> | Hours: <span className="font-semibold text-foreground">{summaryText}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button 
                onClick={() => setIsEditing(true)} 
                className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-xs gap-2 shadow-md shadow-blue-500/20"
              >
                <Pencil className="w-4 h-4" />
                Edit Schedule
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
                  className="h-10 px-4 rounded-xl text-xs font-medium gap-1.5"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving} 
                  className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs gap-2 shadow-md shadow-emerald-500/20"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving to DB...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Schedule List */}
        <div className="w-full md:w-64 shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base">My Schedules</h3>
            <Button variant="outline" size="sm" onClick={handleCreate} className="h-8 px-2.5 text-xs gap-1">
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {schedules?.map((s: any) => (
              <button
                key={s.id}
                onClick={() => {
                  if (isEditing && !confirm('You have unsaved edits. Switch schedule anyway?')) return;
                  setIsEditing(false);
                  setActiveScheduleId(s.id);
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl text-left text-sm transition-all ${
                  activeScheduleId === s.id 
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20' 
                    : 'bg-card hover:bg-muted/80 border border-border/50 text-foreground'
                }`}
              >
                <span className="truncate">{s.name}</span>
                {s.isDefault && <CheckCircle2 className="w-4 h-4 shrink-0 opacity-80" />}
              </button>
            ))}
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 space-y-6">
          <Card className="border-border/50 shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 w-full max-w-xs">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Schedule Name</Label>
                  <Input 
                    value={name} 
                    disabled={!isEditing}
                    onChange={e => setName(e.target.value)} 
                    className="font-bold text-lg h-10 disabled:bg-muted/40 disabled:cursor-not-allowed" 
                  />
                </div>
                {isEditing && (
                  <div className="flex items-center gap-2">
                    {!isDefault && (
                      <Button variant="outline" size="sm" onClick={() => setIsDefault(true)} className="h-9 text-xs">
                        Set as Default
                      </Button>
                    )}
                    {!isDefault && (
                      <Button variant="destructive" size="icon" onClick={handleDelete} className="h-9 w-9">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {isEditing && timezone !== originalTimezone && (
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                  <Settings2 className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-amber-600 dark:text-amber-400 font-semibold text-sm">Timezone Change Detected</h4>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                      Changing timezone from {originalTimezone} to {timezone} automatically adjusts how your booking slots are calculated for guests.
                    </p>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-6 space-y-8">
              
              {/* Timezone Settings */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border/50">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <div>
                    <h4 className="font-semibold text-sm">Schedule Timezone</h4>
                    <p className="text-xs text-muted-foreground">Times below will be rendered in this timezone.</p>
                  </div>
                </div>
                <select 
                  disabled={!isEditing}
                  className="flex h-10 w-full sm:w-64 items-center rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  value={timezone} 
                  onChange={e => setTimezone(e.target.value)}
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              {/* 1-Click Quick Presets Toolbar (Edit Mode Only) */}
              {isEditing && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/50 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                      1-Click Quick Presets
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => applyPreset('MON_FRI_9_5')}
                      className="h-8 text-xs font-semibold rounded-lg bg-background hover:bg-blue-50 hover:text-blue-600 transition-colors border-blue-200 dark:border-blue-800"
                    >
                      💼 Mon – Fri (9:00 AM – 5:00 PM)
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => applyPreset('EVERYDAY_9_9')}
                      className="h-8 text-xs font-semibold rounded-lg bg-background hover:bg-blue-50 hover:text-blue-600 transition-colors border-blue-200 dark:border-blue-800"
                    >
                      🏪 Everyday (9:00 AM – 9:00 PM)
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => applyPreset('CLEAR')}
                      className="h-8 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Clear All
                    </Button>
                  </div>
                </motion.div>
              )}
              
              {/* Weekly Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" /> Weekly Hours
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {isEditing ? 'Select AM/PM times or toggle checkboxes' : 'Read-only mode (Click Edit Schedule to modify)'}
                  </span>
                </div>

                <div className="divide-y divide-border/50 border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm">
                  {DAYS.map((day, index) => {
                    const dayData = schedule[index];
                    return (
                      <div 
                        key={day} 
                        className={`p-4 sm:p-5 flex flex-col xl:flex-row xl:items-start gap-4 transition-colors ${
                          dayData.enabled ? 'bg-card' : 'bg-muted/30 opacity-70'
                        }`}
                      >
                        <div className="w-full xl:w-44 flex items-center gap-3 shrink-0 pt-1">
                          <input 
                            type="checkbox" 
                            disabled={!isEditing}
                            checked={dayData.enabled} 
                            onChange={() => toggleDay(index)} 
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <Label 
                            className={`font-bold text-base ${isEditing ? 'cursor-pointer' : 'cursor-default'} ${dayData.enabled ? 'text-foreground' : 'text-muted-foreground line-through'}`} 
                            onClick={() => toggleDay(index)}
                          >
                            {day}
                          </Label>
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-3 min-w-0">
                          {dayData.enabled ? (
                            <>
                              {dayData.slots.map((slot, slotIdx) => (
                                <motion.div 
                                  initial={{ opacity: 0, x: -10 }} 
                                  animate={{ opacity: 1, x: 0 }}
                                  key={slot.id} 
                                  className="flex flex-wrap items-center gap-2 sm:gap-3"
                                >
                                  {/* Custom AM/PM TimeSelect Dropdowns */}
                                  <TimeSelect
                                    value={slot.startTime}
                                    disabled={!isEditing}
                                    onChange={(newVal) => updateSlot(index, slot.id, 'startTime', newVal)}
                                  />
                                  <span className="text-muted-foreground font-semibold">-</span>
                                  <TimeSelect
                                    value={slot.endTime}
                                    disabled={!isEditing}
                                    onChange={(newVal) => updateSlot(index, slot.id, 'endTime', newVal)}
                                  />
                                  
                                  {/* Live 12-Hour AM/PM Helper Badge */}
                                  <Badge variant="outline" className="bg-blue-50/50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-xs font-mono px-2.5 py-1.5 gap-1 shadow-xs">
                                    <Clock className="w-3 h-3" />
                                    {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                                    {calculateDurationHours(slot.startTime, slot.endTime) && (
                                      <span className="opacity-70 font-sans ml-1">({calculateDurationHours(slot.startTime, slot.endTime)})</span>
                                    )}
                                  </Badge>

                                  {isEditing && (
                                    <div className="flex items-center gap-1 ml-auto sm:ml-2">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeSlot(index, slot.id)} 
                                        className="h-9 w-9 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                                        title="Remove slot"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                      {slotIdx === dayData.slots.length - 1 && (
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => addSlot(index)} 
                                          className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                          title="Add split slot"
                                        >
                                          <Plus className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </motion.div>
                              ))}

                              {isEditing && index === 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => copyToAll(1)} 
                                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 self-start mt-1"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Copy Monday's hours to Tuesday – Friday
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground py-2 italic">
                              Unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date Overrides */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-blue-600" /> Date Overrides
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Add specific dates where your availability differs from the weekly hours.</p>
                  </div>
                  {isEditing && (
                    <Button variant="outline" size="sm" onClick={addOverride} className="h-9 text-xs gap-1.5 rounded-xl">
                      <Plus className="w-4 h-4" />
                      Add Date Override
                    </Button>
                  )}
                </div>

                {overrides.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10">
                    <p className="text-xs text-muted-foreground">No date overrides configured. Your regular weekly hours will apply.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overrides.map((override) => (
                      <div key={override.id} className="p-4 rounded-xl border border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Input 
                            type="date" 
                            disabled={!isEditing}
                            value={override.date} 
                            onChange={(e) => updateOverride(override.id, 'date', e.target.value)} 
                            className="w-40 h-9 text-xs"
                          />
                          <select 
                            disabled={!isEditing}
                            value={override.isAvailable ? 'true' : 'false'} 
                            onChange={(e) => updateOverride(override.id, 'isAvailable', e.target.value === 'true')}
                            className="h-9 rounded-lg border border-input bg-background px-3 text-xs disabled:opacity-75"
                          >
                            <option value="false">Unavailable / Blocked</option>
                            <option value="true">Custom Available Hours</option>
                          </select>
                        </div>

                        {override.isAvailable && (
                          <div className="flex items-center gap-2">
                            <TimeSelect 
                              value={override.startTime || '09:00'} 
                              disabled={!isEditing}
                              onChange={(val) => updateOverride(override.id, 'startTime', val)} 
                            />
                            <span>-</span>
                            <TimeSelect 
                              value={override.endTime || '17:00'} 
                              disabled={!isEditing}
                              onChange={(val) => updateOverride(override.id, 'endTime', val)} 
                            />
                          </div>
                        )}

                        {isEditing && (
                          <Button variant="ghost" size="icon" onClick={() => removeOverride(override.id)} className="h-8 w-8 text-rose-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
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
