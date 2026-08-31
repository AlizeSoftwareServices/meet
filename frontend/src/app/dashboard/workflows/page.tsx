'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Clock, Mail } from 'lucide-react';

interface EventType {
  id: string;
  title: string;
  slug: string;
}

interface Workflow {
  id: string;
  eventTypeId: string;
  triggerType: string;
  timeOffset: number;
  actionType: string;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string>('');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  // New Workflow State
  const [isCreating, setIsCreating] = useState(false);
  const [newTrigger, setNewTrigger] = useState('BEFORE_EVENT');
  const [newOffset, setNewOffset] = useState(1440); // 24 hours
  const [newAction, setNewAction] = useState('EMAIL');

  useEffect(() => {
    fetchEventTypes();
  }, []);

  useEffect(() => {
    if (selectedEventTypeId) {
      fetchWorkflows(selectedEventTypeId);
    } else {
      setWorkflows([]);
    }
  }, [selectedEventTypeId]);

  const fetchEventTypes = async () => {
    try {
      const res = await fetch('/api/event-types', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) {
        if (res.status === 401) router.push('/login');
        return;
      }
      const data = await res.json();
      setEventTypes(data);
      if (data.length > 0 && !selectedEventTypeId) {
        setSelectedEventTypeId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflows = async (eventTypeId: string) => {
    try {
      const res = await fetch(`/api/workflows/event-type/${eventTypeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createWorkflow = async () => {
    if (!selectedEventTypeId) return;
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventTypeId: selectedEventTypeId,
          triggerType: newTrigger,
          timeOffset: Number(newOffset),
          actionType: newAction
        })
      });
      if (res.ok) {
        setIsCreating(false);
        fetchWorkflows(selectedEventTypeId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        setWorkflows(workflows.filter(w => w.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatOffset = (minutes: number) => {
    if (minutes >= 1440) return `${minutes / 1440} day(s)`;
    if (minutes >= 60) return `${minutes / 60} hour(s)`;
    return `${minutes} minute(s)`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-sm text-gray-500 mt-1">Automate communications around your events.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Event Type</label>
          <select
            value={selectedEventTypeId}
            onChange={(e) => setSelectedEventTypeId(e.target.value)}
            className="w-full md:w-1/2 rounded-md border border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
          >
            {eventTypes.map(et => (
              <option key={et.id} value={et.id}>{et.title}</option>
            ))}
          </select>
        </div>

        {selectedEventTypeId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Active Workflows</h2>
              <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
                <Plus className="h-4 w-4 mr-2" />
                New Workflow
              </Button>
            </div>

            {isCreating && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6 flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">When</label>
                  <select
                    value={newTrigger}
                    onChange={(e) => setNewTrigger(e.target.value)}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="BEFORE_EVENT">Before event starts</option>
                    <option value="AFTER_EVENT">After event ends</option>
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Time Offset</label>
                  <select
                    value={newOffset}
                    onChange={(e) => setNewOffset(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={1440}>1 day</option>
                    <option value={2880}>2 days</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
                  <select
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="EMAIL">Send Email</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 mt-4 md:mt-0">
                  <Button onClick={createWorkflow}>Save</Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {workflows.length === 0 && !isCreating ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No workflows</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new workflow.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workflows.map(workflow => (
                  <div key={workflow.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-50 p-2 rounded-full">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {workflow.actionType === 'EMAIL' ? 'Send Email' : workflow.actionType}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatOffset(workflow.timeOffset)} {workflow.triggerType === 'BEFORE_EVENT' ? 'before event starts' : 'after event ends'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteWorkflow(workflow.id)}
                      className="text-gray-400 hover:text-red-600 p-2"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
