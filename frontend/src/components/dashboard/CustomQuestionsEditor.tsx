'use client';

import { useState } from 'react';
import { useFieldArray, Control, UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash, Plus, GripVertical, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUESTION_TYPES = [
  { value: 'TEXT', label: 'Short Text' },
  { value: 'LONG_TEXT', label: 'Long Text' },
  { value: 'PHONE', label: 'Phone Number' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DROPDOWN', label: 'Dropdown' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice (Radio)' },
  { value: 'CHECKBOX', label: 'Checkbox' },
];

export function CustomQuestionsEditor({
  control,
  register,
  watch,
  setValue
}: {
  control: any;
  register?: any;
  watch?: any;
  setValue?: any;
}) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'customQuestions',
  });

  const addQuestion = () => {
    append({
      type: 'TEXT',
      label: '',
      required: false,
      options: [],
      order: fields.length
    });
  };

  const updateOptions = (index: number, optionsString: string) => {
    const opts = optionsString.split('\n').map(o => o.trim()).filter(o => o);
    setValue(`customQuestions.${index}.options`, opts);
  };

  return (
    <div className="space-y-6 border border-border/50 rounded-2xl p-5 bg-card/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <Label className="text-base font-semibold">Custom Booking Questions</Label>
            <p className="text-sm text-muted-foreground mt-0.5">Collect additional information when guests book.</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={addQuestion} className="rounded-full shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Add Question
        </Button>
      </div>

      <div className="space-y-4 pt-4">
        <AnimatePresence initial={false}>
          {fields.map((field, index) => {
            const qType = watch(`customQuestions.${index}.type`);
            const needsOptions = ['DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOX'].includes(qType);

            return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-background rounded-xl border border-border p-4 shadow-sm relative group"
              >
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 pr-12">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Question Label</Label>
                    <Input
                      placeholder="e.g. What is your company name?"
                      className="bg-background h-10"
                      {...register(`customQuestions.${index}.label` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={qType}
                      onChange={(e) => setValue(`customQuestions.${index}.type`, e.target.value)}
                    >
                      {QUESTION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {needsOptions && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Options (One per line)</Label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                        defaultValue={(watch(`customQuestions.${index}.options`) || []).join('\n')}
                        onChange={(e) => updateOptions(index, e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={watch(`customQuestions.${index}.required`)}
                        onCheckedChange={(val) => setValue(`customQuestions.${index}.required`, val)}
                      />
                      <Label className="text-sm">Required field</Label>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {fields.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-border rounded-xl bg-muted/20">
            <p className="text-sm text-muted-foreground">No custom questions added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
