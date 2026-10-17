import React from 'react';
import type { UserRole } from '@/types/roles';
import { UserCheck, Shield, Headset, User } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface DevRoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const DevRoleSwitcher: React.FC<DevRoleSwitcherProps> = ({ currentRole, onRoleChange }) => {
  const roles: { role: UserRole; label: string; icon: React.ReactNode }[] = [
    { role: 'customer', label: 'Customer', icon: <User className="w-3.5 h-3.5" /> },
    { role: 'agent', label: 'Support Agent', icon: <Headset className="w-3.5 h-3.5" /> },
    { role: 'admin', label: 'Admin', icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-200/80 px-3 py-1.5 rounded-lg text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-amber-800 shrink-0">
        <UserCheck className="w-3.5 h-3.5" />
        <span className="uppercase tracking-wider text-[10px] bg-amber-200/60 px-1.5 py-0.5 rounded text-amber-900 font-bold">
          DEV PREVIEW
        </span>
      </div>

      <div className="h-3.5 w-px bg-amber-300 mx-0.5" />

      <div className="flex items-center gap-1">
        {roles.map((r) => {
          const isActive = currentRole === r.role;
          return (
            <button
              key={r.role}
              type="button"
              onClick={() => onRoleChange(r.role)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                isActive
                  ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                  : 'text-amber-900 hover:bg-amber-100/80'
              )}
              title={`Switch UI layout preview to ${r.label} role`}
            >
              {r.icon}
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
