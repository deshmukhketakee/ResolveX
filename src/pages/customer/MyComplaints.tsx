
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ComplaintStatus } from '@/types/status';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';

interface ComplaintRow {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: string;
  status: ComplaintStatus;
  created_at: string;
  category: {
    name: string;
  } | null;
}

interface Resolution {
  id: string;
  resolution_text: string;
  resolved_at: string;
  customer_reviewed: boolean;
  customer_review_comment: string | null;
  resolved_by: {
    full_name: string;
  } | null;
}

export const MyComplaints: React.FC = () => {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [selectedComplaint, setSelectedComplaint] =
    useState<ComplaintRow | null>(null);

  const [resolution, setResolution] =
    useState<Resolution | null>(null);

  const [reviewComment, setReviewComment] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingResolution, setLoadingResolution] =
    useState(false);
  const [savingReview, setSavingReview] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const ticketNumber =
    new URLSearchParams(window.location.search).get('ticket') || '';

  /*
   * ---------------------------------------------------------
   * FORMAT COMPLAINT DATA
   * ---------------------------------------------------------
   */

  const formatComplaints = (
    data: any[]
  ): ComplaintRow[] => {
    return data.map((complaint: any) => ({
      id: complaint.id,
      ticket_number: complaint.ticket_number,
      subject: complaint.subject,
      description: complaint.description,
      priority: complaint.priority,
      status: complaint.status as ComplaintStatus,
      created_at: complaint.created_at,

      category: Array.isArray(complaint.categories)
        ? complaint.categories[0] ?? null
        : complaint.categories ?? null,
    }));
  };

  /*
   * ---------------------------------------------------------
   * LOAD COMPLAINTS
   * ---------------------------------------------------------
   */

  const loadComplaints = async () => {
    if (!user) {
      setComplaints([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const {
      data,
      error: complaintsError,
    } = await supabase
      .from('complaints')
      .select(`
        id,
        ticket_number,
        subject,
        description,
        priority,
        status,
        created_at,
        categories (
          name
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', {
        ascending: false,
      });

    if (complaintsError) {
      console.error(
        'Failed to load complaints:',
        complaintsError
      );

      setError(complaintsError.message);
      setComplaints([]);
      setLoading(false);
      return;
    }

    setComplaints(
      formatComplaints(data ?? [])
    );

    setLoading(false);
  };

  /*
   * ---------------------------------------------------------
   * RELOAD COMPLAINTS
   * ---------------------------------------------------------
   */

  const reloadComplaints = async () => {
    if (!user) {
      return;
    }

    const {
      data,
      error: complaintsError,
    } = await supabase
      .from('complaints')
      .select(`
        id,
        ticket_number,
        subject,
        description,
        priority,
        status,
        created_at,
        categories (
          name
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', {
        ascending: false,
      });

    if (complaintsError) {
      console.error(
        'Failed to reload complaints:',
        complaintsError
      );

      setError(complaintsError.message);
      return;
    }

    const updatedComplaints =
      formatComplaints(data ?? []);

    setComplaints(updatedComplaints);

    /*
     * Synchronize currently selected complaint
     * with the actual database status.
     */

    if (selectedComplaint) {
      const updatedSelected =
        updatedComplaints.find(
          (item) =>
            item.id === selectedComplaint.id
        );

      if (updatedSelected) {
        setSelectedComplaint(
          updatedSelected
        );
      }
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD RESOLUTION
   * ---------------------------------------------------------
   */

  const loadResolution = async (
    complaint: ComplaintRow
  ) => {
    setResolution(null);
    setLoadingResolution(false);

    if (
      complaint.status !== 'Resolved' &&
      complaint.status !== 'Closed'
    ) {
      return;
    }

    setLoadingResolution(true);
    setError('');

    const {
      data,
      error: resolutionError,
    } = await supabase
      .from('resolutions')
      .select(`
        id,
        resolution_text,
        resolved_at,
        customer_reviewed,
        customer_review_comment,
        resolved_by:profiles!resolutions_resolved_by_fkey (
          full_name
        )
      `)
      .eq(
        'complaint_id',
        complaint.id
      )
      .order('resolved_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (resolutionError) {
      console.error(
        'Failed to load resolution:',
        resolutionError
      );

      setError(resolutionError.message);
      setResolution(null);
      setLoadingResolution(false);
      return;
    }

    if (!data) {
      setResolution(null);
      setLoadingResolution(false);
      return;
    }

    const rawData = data as any;

    const resolvedBy = Array.isArray(
      rawData.resolved_by
    )
      ? rawData.resolved_by[0] ?? null
      : rawData.resolved_by ?? null;

    setResolution({
      id: rawData.id,
      resolution_text:
        rawData.resolution_text ?? '',
      resolved_at:
        rawData.resolved_at ?? '',
      customer_reviewed:
        rawData.customer_reviewed ?? false,
      customer_review_comment:
        rawData.customer_review_comment ?? null,
      resolved_by: resolvedBy,
    });

    setLoadingResolution(false);
  };

  /*
   * ---------------------------------------------------------
   * OPEN COMPLAINT
   * ---------------------------------------------------------
   */

  const openComplaint = async (
    complaint: ComplaintRow
  ) => {
    setSelectedComplaint(complaint);
    setResolution(null);
    setReviewComment('');
    setMessage('');
    setError('');

    await loadResolution(complaint);
  };

  /*
   * ---------------------------------------------------------
   * CLOSE DETAILS VIEW
   * ---------------------------------------------------------
   *
   * NOTE:
   * This only closes the UI panel.
   *
   * It does NOT change complaint.status.
   *
   * Database closing happens only through
   * accept_complaint_resolution().
   * ---------------------------------------------------------
   */

  const closeComplaint = () => {
    setSelectedComplaint(null);
    setResolution(null);
    setReviewComment('');
    setMessage('');
    setError('');

    if (window.history.replaceState) {
      window.history.replaceState(
        {},
        '',
        '/customer/complaints'
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    loadComplaints();
  }, [user]);

  /*
   * ---------------------------------------------------------
   * OPEN TICKET FROM URL
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      !ticketNumber ||
      complaints.length === 0
    ) {
      return;
    }

    const matchingComplaint =
      complaints.find(
        (complaint) =>
          complaint.ticket_number.toLowerCase() ===
          ticketNumber.toLowerCase()
      );

    if (matchingComplaint) {
      openComplaint(matchingComplaint);
    } else {
      setSelectedComplaint(null);

      setError(
        `Ticket ${ticketNumber} was not found in your complaints.`
      );
    }
  }, [ticketNumber, complaints]);

  /*
   * ---------------------------------------------------------
   * CUSTOMER REVIEW
   * ---------------------------------------------------------
   *
   * ACCEPT:
   *
   * Resolved -> Closed
   *
   * This MUST happen through:
   *
   * accept_complaint_resolution()
   *
   * because the database trigger protects complaint.status.
   *
   * REJECT:
   *
   * Saves customer feedback but does not close.
   * ---------------------------------------------------------
   */

  const submitReview = async (
    accepted: boolean
  ) => {
    if (
      !selectedComplaint ||
      !resolution ||
      !user
    ) {
      return;
    }

    setSavingReview(true);
    setError('');
    setMessage('');

    const comment =
      reviewComment.trim() || null;

    /*
     * -------------------------------------------------------
     * ACCEPT RESOLUTION
     * -------------------------------------------------------
     *
     * IMPORTANT:
     *
     * We DO NOT directly update complaints.status here.
     *
     * The database function performs:
     *
     * Resolved -> Closed
     *
     * and saves the customer review.
     * -------------------------------------------------------
     */

    if (accepted) {
      const {
        data: closedComplaint,
        error: closeError,
      } = await supabase.rpc(
        'accept_complaint_resolution',
        {
          p_complaint_id:
            selectedComplaint.id,
          p_review_comment:
            comment,
        }
      );

      if (closeError) {
        console.error(
          'Failed to accept resolution:',
          closeError
        );

        setError(
          `The complaint could not be closed: ${closeError.message}`
        );

        setSavingReview(false);
        return;
      }

      /*
       * RPC returned the updated complaint.
       *
       * Set local complaint status to Closed
       * immediately so the UI changes without
       * waiting for another page refresh.
       */

      const rpcComplaint =
        Array.isArray(closedComplaint)
          ? closedComplaint[0]
          : closedComplaint;

      const updatedComplaint: ComplaintRow = {
        ...selectedComplaint,
        status: 'Closed',
      };

      /*
       * If RPC returned the complaint,
       * preserve its database values.
       */

      if (rpcComplaint) {
        updatedComplaint.status =
          rpcComplaint.status as ComplaintStatus;
      }

      /*
       * Update selected complaint.
       */

      setSelectedComplaint(
        updatedComplaint
      );

      /*
       * Update ticket registry.
       */

      setComplaints((previous) =>
        previous.map((item) =>
          item.id === selectedComplaint.id
            ? {
                ...item,
                status: 'Closed',
              }
            : item
        )
      );

      /*
       * Update resolution locally.
       */

      setResolution((previous) =>
        previous
          ? {
              ...previous,
              customer_reviewed: true,
              customer_review_comment:
                comment,
            }
          : null
      );

      setReviewComment('');

      setMessage(
        'Resolution accepted successfully. Your complaint has been closed.'
      );

      setSavingReview(false);

      /*
       * Reload from database.
       *
       * This confirms the actual stored status.
       */

      await reloadComplaints();

      return;
    }

    /*
     * -------------------------------------------------------
     * ISSUE NOT RESOLVED
     * -------------------------------------------------------
     *
     * Save review only.
     *
     * Do NOT close complaint.
     * -------------------------------------------------------
     */

    const {
      error: reviewError,
    } = await supabase
      .from('resolutions')
      .update({
        customer_reviewed: true,
        customer_review_comment:
          comment,
      })
      .eq(
        'id',
        resolution.id
      )
      .eq(
        'complaint_id',
        selectedComplaint.id
      );

    if (reviewError) {
      console.error(
        'Failed to save customer feedback:',
        reviewError
      );

      setError(reviewError.message);
      setSavingReview(false);
      return;
    }

    /*
     * Update resolution locally.
     */

    setResolution((previous) =>
      previous
        ? {
            ...previous,
            customer_reviewed: true,
            customer_review_comment:
              comment,
          }
        : null
    );

    setReviewComment('');

    setMessage(
      'Your feedback has been recorded. The complaint remains Resolved for further investigation.'
    );

    setSavingReview(false);

    await reloadComplaints();
  };

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}

      <div>
        <h2 className="text-xl font-bold text-slate-900">
          My Complaints
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          View your submitted complaints and review
          their resolution progress.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SUCCESS */}

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* TICKET REGISTRY */}

      <Card>

        <CardHeader>

          <div className="flex items-center justify-between gap-3">

            <CardTitle>
              Ticket Registry
            </CardTitle>

            <Badge variant="indigo">
              Total: {complaints.length} tickets
            </Badge>

          </div>

        </CardHeader>

        <CardContent>

          {loading && (
            <div className="py-8 text-center text-sm text-slate-500">
              Loading your complaints...
            </div>
          )}

          {!loading &&
            complaints.length === 0 && (
              <div className="py-8 text-center">

                <p className="text-sm font-medium text-slate-700">
                  You have not submitted any complaints yet.
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Submitted complaints will appear here.
                </p>

              </div>
            )}

          {!loading &&
            complaints.length > 0 && (
              <div className="overflow-x-auto">

                <table className="w-full text-left">

                  <thead>

                    <tr className="border-b border-slate-200">

                      <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                        Ticket ID
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                        Subject
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                        Category
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                        Priority
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                        Status
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                        Created
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                        View
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {complaints.map(
                      (complaint) => (
                        <tr
                          key={complaint.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >

                          {/* TICKET */}

                          <td className="px-4 py-4">

                            <span className="font-mono text-xs font-bold text-indigo-600">
                              {
                                complaint.ticket_number
                              }
                            </span>

                          </td>

                          {/* SUBJECT */}

                          <td className="px-4 py-4">

                            <div className="text-sm font-semibold text-slate-900">
                              {
                                complaint.subject
                              }
                            </div>

                          </td>

                          {/* CATEGORY */}

                          <td className="px-4 py-4">

                            <span className="text-xs text-slate-600">
                              {
                                complaint.category?.name ??
                                'Uncategorized'
                              }
                            </span>

                          </td>

                          {/* PRIORITY */}

                          <td className="px-4 py-4">

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
                            >
                              {
                                complaint.priority
                              }
                            </Badge>

                          </td>

                          {/* STATUS */}

                          <td className="px-4 py-4">

                            <StatusBadge
                              status={
                                complaint.status
                              }
                            />

                          </td>

                          {/* CREATED */}

                          <td className="px-4 py-4">

                            <span className="text-xs text-slate-500">

                              {new Date(
                                complaint.created_at
                              ).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              )}

                            </span>

                          </td>

                          {/* VIEW */}

                          <td className="px-4 py-4">

                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                selectedComplaint?.id ===
                                complaint.id
                                  ? closeComplaint()
                                  : openComplaint(
                                      complaint
                                    )
                              }
                            >

                              {selectedComplaint?.id ===
                              complaint.id ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  Close
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  View
                                </>
                              )}

                            </Button>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

        </CardContent>

      </Card>

      {/* SELECTED COMPLAINT */}

      {selectedComplaint && (
        <Card>

          <CardHeader>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

              <div>

                <CardTitle>

                  {
                    selectedComplaint.ticket_number
                  }

                  {' — '}

                  {
                    selectedComplaint.subject
                  }

                </CardTitle>

                <p className="text-xs text-slate-500 mt-1">
                  Complaint details and resolution information
                </p>

              </div>

              <StatusBadge
                status={
                  selectedComplaint.status
                }
              />

            </div>

          </CardHeader>

          <CardContent className="space-y-6">

            {/* DESCRIPTION */}

            <div>

              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Description
              </h3>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">

                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {
                    selectedComplaint.description
                  }
                </p>

              </div>

            </div>

            {/* RESOLUTION */}

            {(selectedComplaint.status ===
              'Resolved' ||
              selectedComplaint.status ===
                'Closed') && (

              <div>

                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  Resolution
                </h3>

                {loadingResolution && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Loading resolution details...
                  </div>
                )}

                {!loadingResolution &&
                  !resolution && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">

                      <p className="text-sm text-slate-500">
                        No resolution details are available yet.
                      </p>

                    </div>
                  )}

                {!loadingResolution &&
                  resolution && (

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 space-y-4">

                    {/* RESOLUTION HEADER */}

                    <div className="flex items-start gap-3">

                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">

                        <CheckCircle2 className="w-5 h-5" />

                      </div>

                      <div>

                        <h4 className="text-sm font-semibold text-emerald-900">
                          Resolution Provided
                        </h4>

                        {resolution.resolved_at && (
                          <p className="text-xs text-emerald-700 mt-0.5">

                            Resolved on{' '}

                            {new Date(
                              resolution.resolved_at
                            ).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}

                          </p>
                        )}

                      </div>

                    </div>

                    {/* RESOLUTION TEXT */}

                    <div className="rounded-lg border border-emerald-200 bg-white p-4">

                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {
                          resolution.resolution_text ||
                          'No resolution text was provided.'
                        }
                      </p>

                    </div>

                    {/* RESOLVED BY */}

                    {resolution.resolved_by && (
                      <div className="text-xs text-slate-600">

                        Resolved by:{' '}

                        <span className="font-semibold">
                          {
                            resolution.resolved_by
                              .full_name
                          }
                        </span>

                      </div>
                    )}

                    {/* EXISTING CUSTOMER REVIEW */}

                    {resolution.customer_reviewed && (

                      <div className="rounded-lg border border-slate-200 bg-white p-4">

                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Customer Review
                        </p>

                        <p className="text-sm text-slate-700 mt-1">

                          {
                            resolution.customer_review_comment ||
                            'No review comment provided.'
                          }

                        </p>

                        <div className="mt-2 text-xs text-emerald-700 font-medium">
                          Your review has been recorded.
                        </div>

                      </div>

                    )}

                    {/* REVIEW FORM */}

                    {!resolution.customer_reviewed &&
                      selectedComplaint.status ===
                        'Resolved' && (

                      <div className="space-y-4 pt-2">

                        <div>

                          <label className="block text-sm font-semibold text-slate-800 mb-2">
                            Review Comment
                          </label>

                          <textarea
                            value={
                              reviewComment
                            }
                            onChange={(event) =>
                              setReviewComment(
                                event.target.value
                              )
                            }
                            rows={4}
                            disabled={
                              savingReview
                            }
                            placeholder="Tell us whether the issue has been resolved..."
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60"
                          />

                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">

                          {/* ACCEPT = CLOSE */}

                          <Button
                            onClick={() =>
                              submitReview(
                                true
                              )
                            }
                            disabled={
                              savingReview
                            }
                          >

                            <CheckCircle2 className="w-4 h-4" />

                            {savingReview
                              ? 'Saving...'
                              : 'Accept Resolution'}

                          </Button>

                          {/* REJECT = REMAIN RESOLVED */}

                          <Button
                            variant="secondary"
                            onClick={() =>
                              submitReview(
                                false
                              )
                            }
                            disabled={
                              savingReview
                            }
                          >
                            Issue Not Resolved
                          </Button>

                        </div>

                      </div>

                    )}

                  </div>

                )}

              </div>

            )}

          </CardContent>

        </Card>
      )}

    </div>
  );
};