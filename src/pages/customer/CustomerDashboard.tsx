
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/Button';
import {
  PlusCircle,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/config/supabase';
import type { ComplaintStatus } from '@/types/status';

interface CustomerComplaint {
  id: string;
  ticket_number: string;
  subject: string;
  status: ComplaintStatus;
  created_at: string;
  category: {
    name: string;
  } | null;
}

export const CustomerDashboard: React.FC = () => {
  const { profile, user } = useAuth();

  const displayName =
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'Customer';

  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCustomerComplaints = async () => {
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
          status,
          created_at,
          category:categories!complaints_category_id_fkey (
            name
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(
          'Failed to load customer complaints:',
          error
        );

        setError(error.message);
        setComplaints([]);
        setLoading(false);
        return;
      }

      const formattedComplaints: CustomerComplaint[] =
        (data ?? []).map((complaint: any) => ({
          id: complaint.id,
          ticket_number: complaint.ticket_number,
          subject: complaint.subject,
          status: complaint.status as ComplaintStatus,
          created_at: complaint.created_at,
          category: Array.isArray(complaint.category)
            ? complaint.category[0] ?? null
            : complaint.category ?? null,
        }));

      setComplaints(formattedComplaints);
      setLoading(false);
    };

    loadCustomerComplaints();
  }, [user]);

  const totalComplaints = complaints.length;

  const inProgressCount = complaints.filter(
    (complaint) => complaint.status === 'In Progress'
  ).length;

  const resolvedCount = complaints.filter(
    (complaint) => complaint.status === 'Resolved'
  ).length;

  const pendingActionCount = complaints.filter(
    (complaint) => complaint.status === 'Waiting for Customer'
  ).length;

  const recentComplaints = complaints.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Welcome back, {displayName}!
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Track your submitted issues, check resolution progress,
            or register a new ticket.
          </p>
        </div>

        <Link to="/customer/submit">
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
          >
            New Complaint
          </Button>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load your complaints: {error}
        </div>
      )}

      {/* KPI Metric Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Complaints"
          value={loading ? '—' : String(totalComplaints)}
          subtitle="Your registered tickets"
          icon={<FileText className="w-5 h-5" />}
          iconBg="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="In Progress"
          value={loading ? '—' : String(inProgressCount)}
          subtitle="Currently under investigation"
          icon={<Clock className="w-5 h-5" />}
          iconBg="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Resolved"
          value={loading ? '—' : String(resolvedCount)}
          subtitle="Awaiting customer review"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBg="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Pending Action"
          value={loading ? '—' : String(pendingActionCount)}
          subtitle="Requires your response"
          icon={<Clock className="w-5 h-5" />}
          iconBg="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Recent Complaints */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Complaint Workflow Statuses</CardTitle>

          <span className="text-xs text-slate-400 font-mono">
            Live Database Data
          </span>
        </CardHeader>

        <CardContent>
          {loading && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Loading your complaints...
            </div>
          )}

          {!loading && !error && recentComplaints.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                You have not submitted any complaints yet.
              </p>

              <Link
                to="/customer/submit"
                className="inline-block mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Submit your first complaint
              </Link>
            </div>
          )}

          {!loading && !error && recentComplaints.length > 0 && (
            <div className="space-y-3">
              {recentComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-mono font-bold text-indigo-600">
                      {complaint.ticket_number}
                    </span>

                    <h4 className="text-sm font-semibold text-slate-900 mt-1">
                      {complaint.subject}
                    </h4>

                    <p className="text-xs text-slate-500 mt-1">
                      Submitted{' '}
                      {new Date(
                        complaint.created_at
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      • Category:{' '}
                      {complaint.category?.name ?? 'Uncategorized'}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <StatusBadge status={complaint.status} />
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
