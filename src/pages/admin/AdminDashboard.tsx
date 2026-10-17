
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Users,
  FolderKanban,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/config/supabase';

interface Complaint {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  assigned_agent_id: string | null;
}

interface DashboardStats {
  totalComplaints: number;
  pendingComplaints: number;
  activeUsers: number;
  resolutionRate: number;
  resolvedComplaints: number;
  closedComplaints: number;
  highPriority: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalComplaints: 0,
    pendingComplaints: 0,
    activeUsers: 0,
    resolutionRate: 0,
    resolvedComplaints: 0,
    closedComplaints: 0,
    highPriority: 0,
  });

  const [pendingComplaints, setPendingComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const { data: complaints, error: complaintsError } = await supabase
        .from('complaints')
        .select(`
          id,
          ticket_number,
          subject,
          status,
          priority,
          created_at,
          assigned_agent_id
        `)
        .order('created_at', { ascending: false });

      if (complaintsError) {
        throw complaintsError;
      }

      const complaintRows = (complaints ?? []) as Complaint[];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');

      if (profilesError) {
        throw profilesError;
      }

      const totalComplaints = complaintRows.length;

      const pendingRows = complaintRows.filter(
        (complaint) =>
          complaint.status === 'New' ||
          complaint.status === 'Assigned' ||
          complaint.status === 'In Progress' ||
          complaint.status === 'Waiting for Customer'
      );

      const resolvedComplaints = complaintRows.filter(
        (complaint) => complaint.status === 'Resolved'
      ).length;

      const closedComplaints = complaintRows.filter(
        (complaint) => complaint.status === 'Closed'
      ).length;

      const completedComplaints =
        resolvedComplaints + closedComplaints;

      const resolutionRate =
        totalComplaints > 0
          ? Math.round(
              (completedComplaints / totalComplaints) * 1000
            ) / 10
          : 0;

      const highPriority = complaintRows.filter(
        (complaint) =>
          complaint.priority === 'High' ||
          complaint.priority === 'Critical'
      ).length;

      const priorityRank: Record<string, number> = {
        Critical: 4,
        High: 3,
        Medium: 2,
        Low: 1,
      };

      const pendingMonitoring = complaintRows
        .filter(
          (complaint) =>
            complaint.status === 'New' ||
            complaint.status === 'Assigned' ||
            complaint.status === 'In Progress' ||
            complaint.status === 'Waiting for Customer'
        )
        .sort((a, b) => {
          const priorityDifference =
            (priorityRank[b.priority] ?? 0) -
            (priorityRank[a.priority] ?? 0);

          if (priorityDifference !== 0) {
            return priorityDifference;
          }

          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        })
        .slice(0, 5);

      setStats({
        totalComplaints,
        pendingComplaints: pendingRows.length,
        activeUsers: profiles?.length ?? 0,
        resolutionRate,
        resolvedComplaints,
        closedComplaints,
        highPriority,
      });

      setPendingComplaints(pendingMonitoring);
    } catch (dashboardError: any) {
      console.error(
        'Failed to load admin dashboard:',
        dashboardError
      );

      setError(
        dashboardError?.message ??
          'Failed to load administrative dashboard data.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatWaitingTime = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const now = Date.now();

    const hours = Math.max(
      0,
      (now - created) / (1000 * 60 * 60)
    );

    if (hours < 1) {
      return 'Waiting less than 1 hr';
    }

    if (hours < 24) {
      return (
        'Waiting ' +
        hours.toFixed(1) +
        ' hrs'
      );
    }

    const days = Math.floor(hours / 24);

    return (
      'Waiting ' +
      days +
      ' day' +
      (days === 1 ? '' : 's')
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            System Command Center
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Loading administrative dashboard...
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm text-slate-500">
            Loading system statistics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            System Command Center
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Monitor complaint activity, resolution progress,
            users, priorities, and pending bottlenecks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={
              refreshing
                ? 'w-4 h-4 animate-spin'
                : 'w-4 h-4'
            }
          />

          {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load dashboard: {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total System Complaints"
          value={String(stats.totalComplaints)}
          subtitle={
            String(stats.highPriority) +
            ' high/critical priority'
          }
          icon={<FolderKanban className="w-5 h-5" />}
          iconBg="bg-indigo-50 text-indigo-600"
        />

        <StatCard
          title="Pending Monitoring"
          value={String(stats.pendingComplaints)}
          subtitle="Requires agent action or customer response"
          icon={<Clock className="w-5 h-5" />}
          iconBg="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Active Users"
          value={String(stats.activeUsers)}
          subtitle="Registered customers, agents & admins"
          icon={<Users className="w-5 h-5" />}
          iconBg="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Resolution Rate"
          value={String(stats.resolutionRate) + '%'}
          subtitle={
            String(stats.resolvedComplaints) +
            ' resolved • ' +
            String(stats.closedComplaints) +
            ' closed'
          }
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBg="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resolved
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {stats.resolvedComplaints}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Awaiting customer review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Closed
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-700">
              {stats.closedComplaints}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Customer-reviewed complaints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              High Attention
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {stats.highPriority}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              High or Critical priority
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Complaints Monitor</CardTitle>

            <span className="text-xs text-slate-400">
              {pendingComplaints.length > 0
                ? 'High attention required'
                : 'No pending complaints'}
            </span>
          </CardHeader>

          <CardContent className="space-y-3">
            {pendingComplaints.length === 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                All complaints are currently resolved or closed.
              </div>
            )}

            {pendingComplaints.map((complaint) => (
              <div
                key={complaint.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <span className="font-mono font-bold text-indigo-600 text-xs">
                    {complaint.ticket_number}
                  </span>

                  <p className="font-medium text-slate-900 text-xs mt-1 truncate">
                    {complaint.subject}
                  </p>

                  <span className="text-[11px] text-slate-500">
                    {complaint.assigned_agent_id
                      ? 'Assigned to agent'
                      : 'Unassigned'}{' '}
                    • {formatWaitingTime(complaint.created_at)}
                  </span>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1">
                  <StatusBadge
                    status={complaint.status as any}
                  />

                  <span
                    className={
                      complaint.priority === 'Critical'
                        ? 'text-[10px] font-bold uppercase text-red-600'
                        : complaint.priority === 'High'
                          ? 'text-[10px] font-bold uppercase text-amber-600'
                          : 'text-[10px] font-bold uppercase text-slate-500'
                    }
                  >
                    {complaint.priority}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Administrative Overview</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="p-4 bg-indigo-50/60 rounded-lg border border-indigo-100">
              <h4 className="font-bold text-indigo-900">
                User Management
              </h4>

              <p className="text-slate-600 text-[11px] mt-1">
                Manage customers, support agents, and administrator
                accounts.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-900">
                Complaint Management
              </h4>

              <p className="text-slate-500 text-[11px] mt-1">
                Monitor assignments, statuses, priorities, and
                resolution progress.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <h4 className="font-bold text-emerald-900">
                Resolution Performance
              </h4>

              <p className="text-emerald-700 text-[11px] mt-1">
                {String(stats.resolutionRate)}% of complaints
                have reached Resolved or Closed status.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />

              <span>
                Use the administration modules to manage users,
                categories, and pending complaint monitoring.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
