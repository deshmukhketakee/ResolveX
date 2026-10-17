import React from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-xs transition-shadow hover:shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className, ...props }) => (
  <div className={cn('px-6 py-4 border-b border-slate-100 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<CardProps> = ({ children, className, ...props }) => (
  <h3 className={cn('text-base font-semibold text-slate-900', className)} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<CardProps> = ({ children, className, ...props }) => (
  <div className={cn('p-6', className)} {...props}>
    {children}
  </div>
);
