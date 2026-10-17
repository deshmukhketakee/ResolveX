import React from 'react';
import type { ComplaintStatus } from '@/types/status';
import { Badge } from '@/components/ui/Badge';

export interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const statusConfig: Record<ComplaintStatus, { variant: 'blue' | 'indigo' | 'amber' | 'purple' | 'emerald' | 'slate'; label: string }> = {
    'New': { variant: 'blue', label: 'New' },
    'Assigned': { variant: 'indigo', label: 'Assigned' },
    'In Progress': { variant: 'amber', label: 'In Progress' },
    'Waiting for Customer': { variant: 'purple', label: 'Waiting for Customer' },
    'Resolved': { variant: 'emerald', label: 'Resolved' },
    'Closed': { variant: 'slate', label: 'Closed' },
  };

  const config = statusConfig[status] || { variant: 'slate', label: status };

  return <Badge variant={config.variant} size={size}>{config.label}</Badge>;
};
