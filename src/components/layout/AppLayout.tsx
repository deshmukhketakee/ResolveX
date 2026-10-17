import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import type { UserRole } from '@/types/roles';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useAuth } from '@/context/AuthContext';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  /*
   * The authenticated profile is the source of truth for the user's role.
   * The URL is only used as a fallback while the profile is loading.
   */
  const currentRole: UserRole =
    profile?.role === 'admin'
      ? 'admin'
      : profile?.role === 'agent'
      ? 'agent'
      : profile?.role === 'customer'
      ? 'customer'
      : location.pathname.startsWith('/admin')
      ? 'admin'
      : location.pathname.startsWith('/agent')
      ? 'agent'
      : 'customer';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="flex flex-1">

        {/* Sidebar */}
        <Sidebar
          currentRole={currentRole}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">

          <TopNav
            currentRole={currentRole}
            onRoleChange={() => {}}
            onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="py-4 px-6 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">

            <div>
              <span className="font-semibold text-slate-700">
                ResolveX Platform
              </span>
              {' — '}
              Smart Customer Complaint & Resolution Platform
            </div>

            <div className="flex items-center gap-4 text-[11px]">

              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                System Status: Ready
              </span>

              <span>v1.0.0</span>

            </div>

          </footer>
        </div>
      </div>
    </div>
  );
};