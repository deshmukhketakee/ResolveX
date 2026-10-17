
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/config/supabase';

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, description, is_active, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load categories:', error);
      setError(error.message);
      setCategories([]);
      setLoading(false);
      return;
    }

    setCategories((data ?? []) as Category[]);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Complaint Categorisation & SLA Module
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          View and manage the complaint categories configured in the system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Complaint Categories</CardTitle>

          <span className="text-xs text-slate-400 font-mono">
            Live Database Registry
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {loading && (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              Loading categories...
            </div>
          )}

          {!loading && error && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-semibold text-red-600">
                Failed to load categories
              </p>

              <p className="text-xs text-red-500 mt-1">
                {error}
              </p>

              <button
                type="button"
                onClick={loadCategories}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && categories.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No complaint categories found.
            </div>
          )}

          {!loading && !error && categories.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3">Category Name</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Created</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {category.name}
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {category.description || 'No description provided'}
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            category.is_active
                              ? 'emerald'
                              : 'slate'
                          }
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {new Date(
                          category.created_at
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
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
