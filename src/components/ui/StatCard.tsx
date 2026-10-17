import React from 'react';
import { Card, CardContent } from './Card';
import { cn } from '@/utils/cn';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-indigo-50 text-indigo-600',
  trend,
  className,
}) => {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          {icon && (
            <div className={cn('p-2.5 rounded-lg flex items-center justify-center', iconBg)}>
              {icon}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
          {trend && (
            <span
              className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};
