
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/config/supabase';

type UserRole = 'customer' | 'agent' | 'admin';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, role, phone, is_active, created_at, updated_at'
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load users:', error);
      setError(error.message);
      setUsers([]);
      setLoading(false);
      return;
    }

    setUsers((data ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'agent':
        return 'Support Agent';
      case 'customer':
        return 'Customer';
      default:
        return role;
    }
  };

  const getRoleVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'purple';
      case 'agent':
        return 'indigo';
      case 'customer':
        return 'blue';
      default:
        return 'slate';
    }
  };

  const getDepartment = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Platform Operations';
      case 'agent':
        return 'Customer Support';
      case 'customer':
        return 'External Customer';
      default:
        return '—';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          User Management Module
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Manage system users, review roles, and monitor account status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Users & Role Assignments</CardTitle>

          <span className="text-xs text-slate-400 font-mono">
            Live Database Registry
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {loading && (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              Loading system users...
            </div>
          )}

          {!loading && error && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-semibold text-red-600">
                Failed to load users
              </p>

              <p className="text-xs text-red-500 mt-1">
                {error}
              </p>

              <button
                type="button"
                onClick={loadUsers}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && users.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No users found.
            </div>
          )}

          {!loading && !error && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3">Full Name</th>
                    <th className="px-6 py-3">Email Address</th>
                    <th className="px-6 py-3">Assigned Role</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {user.full_name || 'Unnamed User'}
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {user.email}
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant={getRoleVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {getDepartment(user.role)}
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            user.is_active
                              ? 'emerald'
                              : 'slate'
                          }
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
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
