import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';
import type { ComplaintStatus } from '@/types/status';

interface AssignedComplaint {
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

export const AssignedComplaints: React.FC = () => {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState<AssignedComplaint[]>([]);
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

      const formattedComplaints: AssignedComplaint[] = (data ?? []).map(
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

  const getPriorityVariant = (
    priority: string
  ): 'red' | 'amber' | 'slate' => {
    if (priority === 'Critical') {
      return 'red';
    }

    if (priority === 'High') {
      return 'amber';
    }

    return 'slate';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Assigned Complaints Queue
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Review complaints assigned to your responsibility and update
          investigation milestones.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Workload</CardTitle>

          <span className="text-xs text-slate-400 font-mono">
            {complaints.length} assigned ticket
            {complaints.length === 1 ? '' : 's'}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {loading && (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              Loading assigned complaints...
            </div>
          )}

          {!loading && error && (
            <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load assigned complaints: {error}
            </div>
          )}

          {!loading && !error && complaints.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                No complaints are currently assigned to you.
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Complaints assigned to your agent account will appear here.
              </p>
            </div>
          )}

          {!loading && !error && complaints.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3">Ticket</th>
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Priority</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Created Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {complaints.map((complaint) => (
                    <tr
                      key={complaint.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                        {complaint.ticket_number}
                      </td>

                      <td className="px-6 py-4 text-slate-900 font-semibold">
                        {complaint.subject}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {complaint.customer?.full_name ?? 'Unknown Customer'}
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant={getPriorityVariant(complaint.priority)}>
                          {complaint.priority}
                        </Badge>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={complaint.status} />
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {new Date(
                          complaint.created_at
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};