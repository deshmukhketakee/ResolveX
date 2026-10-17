import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <span className="text-6xl font-extrabold text-indigo-600 font-mono">404</span>
      <h2 className="text-2xl font-bold text-slate-900">Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-md">
        The route you are trying to access does not exist or has been moved in the ResolveX application map.
      </p>
      <Link to="/customer/dashboard">
        <Button variant="primary" icon={<Home className="w-4 h-4" />}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};
