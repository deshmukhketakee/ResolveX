import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Clock, AlertTriangle, UserCheck } from 'lucide-react';
import { supabase } from '@/config/supabase';
import type { ComplaintStatus } from '@/types/status';

interface ComplaintRow {
id: string;
ticket_number: string;
subject: string;
status: ComplaintStatus;
priority: string;
created_at: string;
assigned_agent_id: string | null;
assigned_agent: {
full_name: string;
email: string;
} | null;
}

interface Agent {
id: string;
full_name: string;
email: string;
}

export const PendingMonitoring: React.FC = () => {
const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
const [agents, setAgents] = useState<Agent[]>([]);
const [loading, setLoading] = useState(true);
const [assigningId, setAssigningId] = useState<string | null>(null);
const [selectedAgent, setSelectedAgent] = useState<Record<string, string>>(
{}
);
const [message, setMessage] = useState('');
const [error, setError] = useState('');

const loadData = async () => {
setLoading(true);
setError('');


const { data: complaintData, error: complaintError } = await supabase
  .from('complaints')
  .select(`
    id,
    ticket_number,
    subject,
    status,
    priority,
    created_at,
    assigned_agent_id,
    assigned_agent:profiles!complaints_assigned_agent_id_fkey (
      full_name,
      email
    )
  `)
  .in('status', [
    'New',
    'Assigned',
    'In Progress',
    'Waiting for Customer',
  ])
  .order('created_at', { ascending: true });

if (complaintError) {
  console.error('Failed to load pending complaints:', complaintError);
  setError(complaintError.message);
  setLoading(false);
  return;
}

const formattedComplaints: ComplaintRow[] = (complaintData ?? []).map(
  (item: any) => {
    const assignedAgent = Array.isArray(item.assigned_agent)
      ? item.assigned_agent[0] ?? null
      : item.assigned_agent ?? null;

    return {
      id: item.id,
      ticket_number: item.ticket_number,
      subject: item.subject,
      status: item.status as ComplaintStatus,
      priority: item.priority,
      created_at: item.created_at,
      assigned_agent_id: item.assigned_agent_id,
      assigned_agent: assignedAgent,
    };
  }
);

const { data: agentData, error: agentError } = await supabase
  .from('profiles')
  .select('id, full_name, email')
  .eq('role', 'agent')
  .eq('is_active', true)
  .order('full_name');

if (agentError) {
  console.error('Failed to load agents:', agentError);
  setError(agentError.message);
  setLoading(false);
  return;
}

setComplaints(formattedComplaints);
setAgents(agentData ?? []);
setLoading(false);


};

useEffect(() => {
loadData();
}, []);

const assignComplaint = async (complaintId: string) => {
const agentId = selectedAgent[complaintId];


if (!agentId) {
  setError('Please select a Support Agent before assigning the complaint.');
  return;
}

setAssigningId(complaintId);
setError('');
setMessage('');

const { error: updateError } = await supabase
  .from('complaints')
  .update({
    assigned_agent_id: agentId,
    status: 'Assigned',
    updated_at: new Date().toISOString(),
  })
  .eq('id', complaintId);

if (updateError) {
  console.error('Failed to assign complaint:', updateError);
  setError(updateError.message);
  setAssigningId(null);
  return;
}

const complaint = complaints.find((item) => item.id === complaintId);
const agent = agents.find((item) => item.id === agentId);

if (complaint) {
  const { error: historyError } = await supabase
    .from('complaint_status_history')
    .insert({
      complaint_id: complaintId,
      old_status: complaint.status,
      new_status: 'Assigned',
      changed_by: agentId,
      comment: `Complaint assigned to ${agent?.full_name ?? 'Support Agent'} by administrator.`,
    });

  if (historyError) {
    console.error(
      'Failed to save assignment history:',
      historyError
    );
  }
}

setMessage(
  `${complaint?.ticket_number ?? 'Complaint'} has been assigned to ${
    agent?.full_name ?? 'the Support Agent'
  }.`
);

setAssigningId(null);

await loadData();


};

const getPendingDuration = (createdAt: string) => {
const created = new Date(createdAt).getTime();
const now = Date.now();


const differenceInHours = Math.max(
  0,
  (now - created) / (1000 * 60 * 60)
);

if (differenceInHours < 1) {
  return 'Less than 1 hr';
}

if (differenceInHours < 24) {
  return `${differenceInHours.toFixed(1)} hrs`;
}

const days = Math.floor(differenceInHours / 24);

return `${days} day${days === 1 ? '' : 's'}`;


};

const unassignedCount = complaints.filter(
(complaint) => !complaint.assigned_agent_id
).length;

const awaitingCustomerCount = complaints.filter(
(complaint) => complaint.status === 'Waiting for Customer'
).length;

const atRiskCount = complaints.filter((complaint) => {
const hours =
(Date.now() - new Date(complaint.created_at).getTime()) /
(1000 * 60 * 60);


return hours >= 24;


}).length;

return ( <div className="space-y-6"> <div> <h2 className="text-xl font-bold text-slate-900">
Pending Complaint Monitoring Module </h2>
```
    <p className="text-sm text-slate-500 mt-1">
      Oversee unassigned, stagnant, or SLA-breached complaints across all
      support agent queues.
    </p>
  </div>

  {message && (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      {message}
    </div>
  )}

  {error && (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </div>
  )}

  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
      <div>
        <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
          Unassigned Complaints
        </span>

        <p className="text-2xl font-bold text-amber-900 mt-1">
          {unassignedCount}
        </p>
      </div>

      <Clock className="w-6 h-6 text-amber-600" />
    </div>

    <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between">
      <div>
        <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
          At-Risk SLAs
        </span>

        <p className="text-2xl font-bold text-rose-900 mt-1">
          {atRiskCount}
        </p>
      </div>

      <AlertTriangle className="w-6 h-6 text-rose-600" />
    </div>

    <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex items-center justify-between">
      <div>
        <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">
          Awaiting Customer Response
        </span>

        <p className="text-2xl font-bold text-purple-900 mt-1">
          {awaitingCustomerCount}
        </p>
      </div>

      <Clock className="w-6 h-6 text-purple-600" />
    </div>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Stagnant & Pending Tickets Queue</CardTitle>

      <span className="text-xs text-slate-400 font-mono">
        Live Database Monitor
      </span>
    </CardHeader>

    <CardContent className="p-0">
      {loading ? (
        <div className="px-6 py-10 text-center text-sm text-slate-500">
          Loading pending complaints...
        </div>
      ) : complaints.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="font-medium text-slate-700">
            No pending complaints found.
          </p>

          <p className="text-xs text-slate-500 mt-1">
            All current complaints have been resolved or closed.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Ticket ID</th>
                <th className="px-6 py-3">Subject</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Assigned Agent</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Pending Duration</th>
                <th className="px-6 py-3 text-right">
                  Admin Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {complaints.map((complaint) => {
                const isAssigning =
                  assigningId === complaint.id;

                return (
                  <tr
                    key={complaint.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                      {complaint.ticket_number}
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {complaint.subject}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`font-semibold ${
                          complaint.priority === 'Critical'
                            ? 'text-red-700'
                            : complaint.priority === 'High'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                        }`}
                      >
                        {complaint.priority}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {complaint.assigned_agent ? (
                        <div>
                          <p className="font-semibold text-slate-900">
                            {complaint.assigned_agent.full_name}
                          </p>

                          <p className="text-[11px] text-slate-500">
                            {complaint.assigned_agent.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={complaint.status} />
                    </td>

                  <td className="px-6 py-4 text-amber-700 font-semibold">
                      {getPendingDuration(complaint.created_at)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {!complaint.assigned_agent_id ? (
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={
                              selectedAgent[complaint.id] ?? ''
                            }
                            onChange={(event) =>
                              setSelectedAgent((previous) => ({
                                ...previous,
                                [complaint.id]:
                                  event.target.value,
                              }))
                            }
                            className="px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900"
                          >
                            <option value="">
                              Select Agent
                            </option>

                            {agents.map((agent) => (
                              <option
                                key={agent.id}
                                value={agent.id}
                              >
                                {agent.full_name}
                              </option>
                            ))}
                          </select>

                          <Button
                            variant="primary"
                            icon={
                              <UserCheck className="w-4 h-4" />
                            }
                            onClick={() =>
                              assignComplaint(complaint.id)
                            }
                            disabled={isAssigning}
                          >
                            {isAssigning
                              ? 'Assigning...'
                              : 'Assign'}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700">
                          Assigned
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
</div>


);
};
