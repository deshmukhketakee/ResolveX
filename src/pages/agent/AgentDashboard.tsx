
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import {
  Inbox,
  Clock,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';
import type { ComplaintStatus } from '@/types/status';

interface AgentComplaint {
  id: string;
  ticket_number: string;
  subject: string;
  priority: string;
  status: ComplaintStatus;
  created_at: string;
  customer: {
    full_name: string;
  } | null;
}

export const AgentDashboard: React.FC = () => {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState<AgentComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAssignedComplaints = async () => {
      if (!user) {
        setComplaints([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('complaints')
        .select(`
          id,
          ticket_number,
          subject,
          priority,
          status,
          created_at,
          customer:profiles!complaints_customer_id_fkey (
            full_name
          )
        `)
        .eq('assigned_agent_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load assigned complaints:', error);
        setError(error.message);
        setComplaints([]);
        setLoading(false);
        return;
      }

      const formattedComplaints: AgentComplaint[] = (data ?? []).map(
        (complaint: any) => ({
          id: complaint.id,
          ticket_number: complaint.ticket_number,
          subject: complaint.subject,
          priority: complaint.priority,
          status: complaint.status as ComplaintStatus,
          created_at: complaint.created_at,
          customer: Array.isArray(complaint.customer)
            ? complaint.customer[0] ?? null
            : complaint.customer ?? null,
        })
      );

      setComplaints(formattedComplaints);
      setLoading(false);
    };

    loadAssignedComplaints();
  }, [user]);

  const assignedCount = complaints.length;

  const investigationCount = complaints.filter(
    (complaint) => complaint.status === 'In Progress'
  ).length;

  const closedCount = complaints.filter(
    (complaint) => complaint.status === 'Closed'
  ).length;

  const highPriorityCount = complaints.filter(
    (complaint) =>
      complaint.priority === 'High' || complaint.priority === 'Critical'
  ).length;

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>

            <Badge variant="indigo">
              Agent Workspace
            </Badge>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Support Agent Console
          </h2>

          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Investigate assigned complaints, monitor priorities, and deliver
            timely resolutions.
          </p>
        </div>

        <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
          <span className="font-medium text-slate-700">
            Live Queue
          </span>
          <span className="mx-1.5">•</span>
          Database connected
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Queue"
          value={String(assignedCount)}
          subtitle="Tickets assigned to you"
          icon={<Inbox className="w-5 h-5" />}
          iconBg="bg-indigo-50 text-indigo-600"
        />

        <StatCard
          title="In Investigation"
          value={String(investigationCount)}
          subtitle="Active investigations"
          icon={<Clock className="w-5 h-5" />}
          iconBg="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Priority Alerts"
          value={String(highPriorityCount)}
          subtitle="High or critical priority"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBg="bg-red-50 text-red-600"
        />

        <StatCard
          title="Closed"
          value={String(closedCount)}
          subtitle="Customer-reviewed tickets"
          icon={<CheckCircle className="w-5 h-5" />}
          iconBg="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Assigned Tickets */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Assigned Work Queue</CardTitle>

              <p className="text-xs text-slate-500 mt-1">
                Complaints currently assigned to your support queue.
              </p>
            </div>

            <Badge variant="indigo">
              Agent Scope: Active
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">

          {/* Loading */}
          {loading && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
              <div className="w-7 h-7 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />

              <p className="text-sm font-medium text-slate-700">
                Loading assigned complaints...
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Please wait while your queue is retrieved.
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Unable to load assigned complaints
                  </p>

                  <p className="text-xs text-red-700 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && complaints.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-5 h-5" />
              </div>

              <p className="text-sm font-semibold text-slate-700">
                Your queue is clear
              </p>

              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No complaints are currently assigned to you. New assignments
                will appear here automatically.
              </p>
            </div>
          )}

          {/* Complaints */}
          {!loading && !error && complaints.length > 0 && (
            <div className="space-y-3">
              {complaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="group p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                    {/* Complaint information */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                          {complaint.ticket_number}
                        </span>

                        <Badge
                          variant={
                            complaint.priority === 'Critical'
                              ? 'red'
                              : complaint.priority === 'High'
                                ? 'amber'
                                : 'slate'
                          }
                        >
                          {complaint.priority}
                        </Badge>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-900 mt-2 truncate">
                        {complaint.subject}
                      </h4>

                      <p className="text-xs text-slate-500 mt-1">
                        Customer:{' '}
                        <span className="font-medium text-slate-600">
                          {complaint.customer?.full_name ?? 'Unknown Customer'}
                        </span>

                        <span className="mx-1.5 text-slate-300">•</span>

                        Submitted:{' '}
                        {new Date(complaint.created_at).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                        Status
                      </span>

                      <StatusBadge status={complaint.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};
