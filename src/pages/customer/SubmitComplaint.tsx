import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';

interface Category {
id: string;
name: string;
description: string | null;
}

export const SubmitComplaint: React.FC = () => {
const navigate = useNavigate();
const { user, profile } = useAuth();

const [categories, setCategories] = useState<Category[]>([]);
const [categoryId, setCategoryId] = useState('');
const [subject, setSubject] = useState('');
const [priority, setPriority] = useState('Medium');
const [description, setDescription] = useState('');

const [loadingCategories, setLoadingCategories] = useState(true);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');

useEffect(() => {
const loadCategories = async () => {
setLoadingCategories(true);
setError('');


  const { data, error: categoryError } = await supabase
    .from('categories')
    .select('id, name, description')
    .eq('is_active', true)
    .order('name');

  if (categoryError) {
    console.error('Failed to load categories:', categoryError);
    setError('Unable to load complaint categories.');
    setLoadingCategories(false);
    return;
  }

  setCategories(data ?? []);
  setLoadingCategories(false);
};

loadCategories();


}, []);

const generateTicketNumber = () => {
const randomNumber = Math.floor(1000 + Math.random() * 9000);
return `TKT-${randomNumber}`;
};

const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault();


setError('');
setSuccess('');

if (!user) {
  setError('You must be signed in to submit a complaint.');
  return;
}

if (!profile) {
  setError('Your user profile could not be loaded. Please sign in again.');
  return;
}

if (profile.role !== 'customer') {
  setError('Only customer accounts can submit complaints.');
  return;
}

if (!categoryId) {
  setError('Please select a complaint category.');
  return;
}

if (!subject.trim()) {
  setError('Please enter a complaint subject.');
  return;
}

if (!description.trim()) {
  setError('Please provide a detailed description.');
  return;
}

setSubmitting(true);

const ticketNumber = generateTicketNumber();

const { data, error: insertError } = await supabase
  .from('complaints')
  .insert({
    ticket_number: ticketNumber,
    customer_id: user.id,
    category_id: categoryId,
    subject: subject.trim(),
    description: description.trim(),
    priority,
    status: 'New',
  })
  .select('id, ticket_number')
  .single();

setSubmitting(false);

if (insertError) {
  console.error('Complaint submission failed:', insertError);
  setError(insertError.message);
  return;
}

setSuccess(
  `Complaint submitted successfully. Ticket number: ${data.ticket_number}`
);

setSubject('');
setCategoryId('');
setPriority('Medium');
setDescription('');

setTimeout(() => {
  navigate('/customer/complaints');
}, 1500);


};

return ( <div className="max-w-3xl mx-auto space-y-6"> <div> <h2 className="text-xl font-bold text-slate-900">
Submit a New Complaint </h2>


    <p className="text-sm text-slate-500 mt-1">
      Provide detailed information to help our support team investigate and
      resolve your issue quickly.
    </p>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Complaint Details</CardTitle>
    </CardHeader>

    <CardContent>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Complaint Subject / Title
          </label>

          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Unable to process invoice payment"
            required
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Category
            </label>

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loadingCategories || submitting}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="">
                {loadingCategories
                  ? 'Loading categories...'
                  : 'Select Category...'}
              </option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Priority Severity
            </label>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Detailed Description
          </label>

          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, error codes, and steps to reproduce..."
            required
            disabled={submitting}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />

          <span>
            Your complaint will initially be submitted with{' '}
            <strong>New</strong> status and can then be reviewed by a
            support agent.
          </span>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        <div className="pt-2 flex justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            disabled={submitting}
            onClick={() => navigate('/customer/dashboard')}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            type="submit"
            disabled={submitting || loadingCategories}
            icon={<Send className="w-4 h-4" />}
          >
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</div>


);
};
