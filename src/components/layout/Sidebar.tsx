import React from 'react';
import { NavLink } from 'react-router-dom';
import type { UserRole } from '@/types/roles';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Inbox,
  Search,
  Users,
  FolderKanban,
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SidebarProps {
  currentRole: UserRole;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRole, isCollapsed, onToggleCollapse }) => {
  const getNavItems = (role: UserRole): NavItem[] => {
    switch (role) {
      case 'customer':
        return [
          { label: 'Customer Overview', path: '/customer/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Submit Complaint', path: '/customer/submit', icon: <PlusCircle className="w-4 h-4" /> },
          { label: 'My Complaints', path: '/customer/complaints', icon: <FileText className="w-4 h-4" /> },
        ];
      case 'agent':
        return [
          { label: 'Agent Workspace', path: '/agent/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Assigned Complaints', path: '/agent/assigned', icon: <Inbox className="w-4 h-4" /> },
          { label: 'Investigation View', path: '/agent/investigation', icon: <Search className="w-4 h-4" /> },
        ];
      case 'admin':
        return [
          { label: 'Admin Command Center', path: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'User Management', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
          { label: 'Category & SLA', path: '/admin/categories', icon: <FolderKanban className="w-4 h-4" /> },
          { label: 'Pending Monitoring', path: '/admin/pending', icon: <Clock className="w-4 h-4" /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems(currentRole);

  const roleLabels: Record<UserRole, { title: string; badge: string; badgeBg: string }> = {
    customer: { title: 'Customer Portal', badge: 'Customer', badgeBg: 'bg-blue-100 text-blue-800' },
    agent: { title: 'Agent Console', badge: 'Support Agent', badgeBg: 'bg-indigo-100 text-indigo-800' },
    admin: { title: 'Admin Suite', badge: 'Administrator', badgeBg: 'bg-purple-100 text-purple-800' },
  };

  const currentRoleMeta = roleLabels[currentRole];

  return (
    <aside
      className={cn(
        'bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 border-r border-slate-800 z-20 shrink-0 h-screen sticky top-0',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
        <div className={cn('flex items-center gap-3 overflow-hidden', isCollapsed && 'justify-center w-full')}>
          <div className="bg-indigo-600 text-white p-2 rounded-lg flex items-center justify-center font-bold shrink-0 shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-white text-base">ResolveX</span>
              <span className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">
                Resolution Platform
              </span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Role Badge Indicator */}
      {!isCollapsed && (
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Current Scope</span>
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', currentRoleMeta.badgeBg)}>
            {currentRoleMeta.badge}
          </span>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80',
                isCollapsed && 'justify-center px-0'
              )
            }
            title={isCollapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapsed Toggle Button at Bottom if Collapsed */}
      {isCollapsed && (
        <div className="p-3 border-t border-slate-800 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="text-slate-400 hover:text-white p-2 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
