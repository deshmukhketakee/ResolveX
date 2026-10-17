
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  MessageSquare,
  Save,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';
import type { ComplaintStatus } from '@/types/status';

interface ComplaintDetails {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: string;
  status: ComplaintStatus;
  created_at: string;

  customer: {
    full_name: string;
    email: string;
  } | null;

  category: {
    name: string;
  } | null;
}

export const InvestigationView: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const ticketNumber = searchParams.get('ticket');

  const [complaint, setComplaint] =
    useState<ComplaintDetails | null>(null);

  const [status, setStatus] =
    useState<ComplaintStatus>('New');

  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  /*
   * LOAD COMPLAINT
   */
  const loadComplaint = async () => {
    if (!user) {
      setComplaint(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    let query = supabase
      .from('complaints')
      .select(`
        id,
        ticket_number,
        subject,
        description,
        priority,
        status,
        created_at,
        customer:profiles!complaints_customer_id_fkey (
          full_name,
          email
        ),
        category:categories (
          name
        )
      `)
      .eq('assigned_agent_id', user.id);

    if (ticketNumber) {
      query = query.eq(
        'ticket_number',
        ticketNumber
      );
    } else {
      query = query
        .order('created_at', {
          ascending: false,
        })
        .limit(1);
    }

    const {
      data,
      error: loadError,
    } = await query.maybeSingle();

    if (loadError) {
      console.error(
        'Failed to load investigation:',
        loadError
      );

      setError(loadError.message);
      setComplaint(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setComplaint(null);
      setLoading(false);
      return;
    }

    const rawData = data as any;

    const customer = Array.isArray(
      rawData.customer
    )
      ? rawData.customer[0] ?? null
      : rawData.customer ?? null;

    const category = Array.isArray(
      rawData.category
    )
      ? rawData.category[0] ?? null
      : rawData.category ?? null;

    const formattedComplaint: ComplaintDetails = {
      id: rawData.id,
      ticket_number: rawData.ticket_number,
      subject: rawData.subject,
      description: rawData.description,
      priority: rawData.priority,
      status:
        rawData.status as ComplaintStatus,
      created_at: rawData.created_at,
      customer,
      category,
    };

    setComplaint(formattedComplaint);
    setStatus(formattedComplaint.status);

    setLoading(false);
  };

  useEffect(() => {
    loadComplaint();
  }, [user, ticketNumber]);

  /*
   * SAVE UPDATE
   */
  const saveUpdate = async () => {
    if (!complaint || !user) {
      return;
    }

    if (!note.trim()) {
      setError(
        'Please enter an investigation or resolution note.'
      );
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const now = new Date().toISOString();
    const trimmedNote = note.trim();
    const previousStatus = complaint.status;

    /*
     * STEP 1
     * Update complaint status.
     */
    const {
      error: complaintError,
    } = await supabase
      .from('complaints')
      .update({
        status: status,
        updated_at: now,

        /*
         * Only Resolved gets resolved_at.
         * Moving back to In Progress clears it.
         */
        resolved_at:
          status === 'Resolved'
            ? now
            : null,
      })
      .eq('id', complaint.id)
      .eq('assigned_agent_id', user.id);

    if (complaintError) {
      console.error(
        'Failed to update complaint:',
        complaintError
      );

      setError(complaintError.message);
      setSaving(false);
      return;
    }

    /*
     * STEP 2
     * Save status history.
     */
    const {
      error: historyError,
    } = await supabase
      .from('complaint_status_history')
      .insert({
        complaint_id: complaint.id,
        old_status: previousStatus,
        new_status: status,
        changed_by: user.id,
        comment: trimmedNote,
      });

    if (historyError) {
      console.error(
        'Failed to save status history:',
        historyError
      );

      setError(historyError.message);
      setSaving(false);
      return;
    }

    /*
     * STEP 3
     *
     * If status is Resolved:
     *
     * IMPORTANT:
     * Reset customer review.
     *
     * This fixes the problem where a previous
     * customer review remains attached after
     * the agent resolves the complaint again.
     */
    if (status === 'Resolved') {
      const {
        data: existingResolution,
        error: resolutionCheckError,
      } = await supabase
        .from('resolutions')
        .select('id')
        .eq(
          'complaint_id',
          complaint.id
        )
        .order('resolved_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (resolutionCheckError) {
        console.error(
          'Failed to check existing resolution:',
          resolutionCheckError
        );

        setError(
          resolutionCheckError.message
        );
        setSaving(false);
        return;
      }

      /*
       * EXISTING RESOLUTION
       */
      if (existingResolution) {
        const {
          error: resolutionUpdateError,
        } = await supabase
          .from('resolutions')
          .update({
            resolution_text: trimmedNote,
            resolved_by: user.id,
            resolved_at: now,

            /*
             * VERY IMPORTANT
             *
             * Reset old customer feedback
             * whenever agent resolves again.
             */
            customer_reviewed: false,
            customer_review_comment: null,
          })
          .eq(
            'id',
            existingResolution.id
          )
          .eq(
            'complaint_id',
            complaint.id
          );

        if (resolutionUpdateError) {
          console.error(
            'Failed to update resolution:',
            resolutionUpdateError
          );

          setError(
            resolutionUpdateError.message
          );
          setSaving(false);
          return;
        }
      }

      /*
       * NO EXISTING RESOLUTION
       */
      else {
        const {
          error: resolutionError,
        } = await supabase
          .from('resolutions')
          .insert({
            complaint_id: complaint.id,
            resolved_by: user.id,
            resolution_text: trimmedNote,
            resolved_at: now,

            /*
             * New resolution must wait
             * for customer review.
             */
            customer_reviewed: false,
            customer_review_comment: null,
          });

        if (resolutionError) {
          console.error(
            'Failed to create resolution:',
            resolutionError
          );

          setError(
            resolutionError.message
          );
          setSaving(false);
          return;
        }
      }
    }

    /*
     * STEP 4
     *
     * For normal investigation updates,
     * save a comment.
     */
    else {
      const {
        error: commentError,
      } = await supabase
        .from('complaint_comments')
        .insert({
          complaint_id: complaint.id,
          author_id: user.id,
          message: trimmedNote,
        });

      if (commentError) {
        console.error(
          'Failed to save investigation note:',
          commentError
        );

        setError(
          commentError.message
        );
        setSaving(false);
        return;
      }
    }

    /*
     * STEP 5
     * Update local UI.
     */
    setComplaint((previous) =>
      previous
        ? {
            ...previous,
            status: status,
          }
        : previous
    );

    setStatus(status);
    setNote('');

    /*
     * Clear old customer-feedback-related
     * messages from this screen.
     */
    setMessage('');

    if (status === 'Resolved') {
      setMessage(
        'Complaint resolved successfully. A new resolution has been sent to the customer for review.'
      );
    } else {
      setMessage(
        'Complaint status and investigation update saved successfully.'
      );
    }

    setSaving(false);
  };

  /*
   * REQUEST CUSTOMER INFORMATION
   */
  const requestCustomerInfo = async () => {
    if (!complaint || !user) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const now = new Date().toISOString();
    const previousStatus =
      complaint.status;

    const requestMessage =
      'Additional information requested from customer.';

    /*
     * STEP 1
     * Change status.
     */
    const {
      error: complaintError,
    } = await supabase
      .from('complaints')
      .update({
        status: 'Waiting for Customer',
        updated_at: now,
        resolved_at: null,
      })
      .eq('id', complaint.id)
      .eq(
        'assigned_agent_id',
        user.id
      );

    if (complaintError) {
      console.error(
        'Failed to request customer information:',
        complaintError
      );

      setError(
        complaintError.message
      );
      setSaving(false);
      return;
    }

    /*
     * STEP 2
     * Status history.
     */
    const {
      error: historyError,
    } = await supabase
      .from('complaint_status_history')
      .insert({
        complaint_id: complaint.id,
        old_status: previousStatus,
        new_status:
          'Waiting for Customer',
        changed_by: user.id,
        comment: requestMessage,
      });

    if (historyError) {
      console.error(
        'Failed to save customer request history:',
        historyError
      );

      setError(
        historyError.message
      );
      setSaving(false);
      return;
    }

    /*
     * STEP 3
     * Save comment.
     */
    const {
      error: commentError,
    } = await supabase
      .from('complaint_comments')
      .insert({
        complaint_id: complaint.id,
        author_id: user.id,
        message: requestMessage,
      });

    if (commentError) {
      console.error(
        'Failed to save customer request comment:',
        commentError
      );

      setError(
        commentError.message
      );
      setSaving(false);
      return;
    }

    /*
     * STEP 4
     * Local UI update.
     */
    setStatus(
      'Waiting for Customer'
    );

    setComplaint((previous) =>
      previous
        ? {
            ...previous,
            status:
              'Waiting for Customer',
          }
        : previous
    );

    setMessage(
      'Customer information has been requested successfully.'
    );

    setSaving(false);
  };

  /*
   * MARK RESOLVED
   *
   * This only changes the dropdown.
   * Save Update actually writes to Supabase.
   */
  const markResolved = () => {
    setError('');
    setMessage('');

    if (!note.trim()) {
      setError(
        'Please enter the resolution note before marking the complaint as resolved.'
      );
      return;
    }

    setStatus('Resolved');
  };

  /*
   * LOADING
   */
  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        Loading investigation workspace...
      </div>
    );
  }

  /*
   * ERROR
   */
  if (error && !complaint) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load investigation:{' '}
        {error}
      </div>
    );
  }

  /*
   * NO COMPLAINT
   */
  if (!complaint) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center">
        <p className="font-medium text-slate-700">
          No complaint is currently assigned
          to you.
        </p>
      </div>
    );
  }

  /*
   * UI
   */
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <div className="flex items-center gap-3">

            <h2 className="text-xl font-bold text-slate-900">
              Investigation Workspace
            </h2>

            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
              {complaint.ticket_number}
            </span>

          </div>

          <p className="text-sm text-slate-500 mt-1">
            Subject: {complaint.subject}
          </p>
        </div>

        <div className="flex items-center gap-2">

          <StatusBadge
            status={complaint.status}
            size="md"
          />

          <Badge
            variant={
              complaint.priority ===
              'Critical'
                ? 'red'
                : complaint.priority ===
                  'High'
                ? 'amber'
                : 'slate'
            }
            size="md"
          >
            {complaint.priority}
          </Badge>

        </div>

      </div>

      {/* SUCCESS MESSAGE */}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* DESCRIPTION */}
      <Card>

        <CardHeader>
          <CardTitle>
            Complaint Description
          </CardTitle>
        </CardHeader>

        <CardContent>

          <p className="text-sm leading-6 text-slate-700">
            {complaint.description}
          </p>

        </CardContent>

      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">

          <Card>

            <CardHeader>
              <CardTitle>
                Investigation Notes & Resolution
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">

              {/* STATUS */}
              <div>

                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Update Status
                </label>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target
                        .value as ComplaintStatus
                    )
                  }
                  disabled={saving}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-60"
                >

                  <option value="New">
                    New
                  </option>

                  <option value="Assigned">
                    Assigned
                  </option>

                  <option value="In Progress">
                    In Progress
                  </option>

                  <option value="Waiting for Customer">
                    Waiting for Customer
                  </option>

                  <option value="Resolved">
                    Resolved
                  </option>

                  <option value="Closed">
                    Closed
                  </option>

                </select>

              </div>

              {/* NOTE */}
              <div>

                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Investigation / Resolution Note
                </label>

                <textarea
                  rows={5}
                  value={note}
                  onChange={(event) =>
                    setNote(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  placeholder={
                    status === 'Resolved'
                      ? 'Describe the root cause and resolution provided to the customer...'
                      : 'Document investigation findings, actions taken, or information requested...'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-60"
                />

              </div>

              {/* BUTTONS */}
              <div className="flex flex-wrap justify-end gap-3 pt-2">

                <Button
                  variant="outline"
                  icon={
                    <MessageSquare className="w-4 h-4" />
                  }
                  onClick={
                    requestCustomerInfo
                  }
                  disabled={saving}
                >
                  Request Customer Info
                </Button>

                <Button
                  variant="outline"
                  icon={
                    <Save className="w-4 h-4" />
                  }
                  onClick={saveUpdate}
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : 'Save Update'}
                </Button>

                <Button
                  variant="primary"
                  icon={
                    <CheckCircle2 className="w-4 h-4" />
                  }
                  onClick={markResolved}
                  disabled={saving}
                >
                  Mark Resolved
                </Button>

              </div>

            </CardContent>

          </Card>

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          <Card>

            <CardHeader>
              <CardTitle>
                Ticket Context
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-xs">

              {/* CUSTOMER */}
              <div>

                <span className="text-slate-500">
                  Customer:
                </span>

                <p className="font-semibold text-slate-900">
                  {complaint.customer
                    ?.full_name ??
                    'Unknown Customer'}
                </p>

                <p className="text-slate-500">
                  {complaint.customer
                    ?.email ??
                    'No email available'}
                </p>

              </div>

              {/* CATEGORY */}
              <div>

                <span className="text-slate-500">
                  Category:
                </span>

                <p className="font-semibold text-slate-900">
                  {complaint.category
                    ?.name ??
                    'Uncategorized'}
                </p>

              </div>

              {/* PRIORITY */}
              <div>

                <span className="text-slate-500">
                  Priority:
                </span>

                <p className="font-semibold text-slate-900">
                  {complaint.priority}
                </p>

              </div>

              {/* SUBMITTED */}
              <div>

                <span className="text-slate-500">
                  Submitted:
                </span>

                <p className="font-semibold text-slate-900">
                  {new Date(
                    complaint.created_at
                  ).toLocaleString()}
                </p>

              </div>

              {/* INFO */}
              <div className="pt-2 border-t border-slate-100 bg-amber-50 p-2.5 rounded border border-amber-200 text-amber-800 flex items-start gap-2">

                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />

                <span>
                  When an agent resolves a complaint,
                  any previous customer review is reset.
                  The customer will receive a fresh review
                  option for the new resolution.
                </span>

              </div>

            </CardContent>

          </Card>

        </div>

      </div>

    </div>
  );
};
