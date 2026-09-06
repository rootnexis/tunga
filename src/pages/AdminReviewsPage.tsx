import React, { useEffect, useState, useCallback } from 'react';
import { Search, CheckCircle, XCircle, Flag, MessageSquare, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { formatDateShort } from '@/utils/formatters';
import type { Review } from '@/types';

const PAGE_SIZE = 15;

type ReviewFilter = 'all' | 'pending' | 'approved' | 'flagged';

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={13}
          fill={s <= rating ? 'var(--color-warning)' : 'none'}
          stroke={s <= rating ? 'var(--color-warning)' : 'var(--color-border)'}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const { success, error: toastError } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReviewFilter>('pending');
  const [isLoading, setIsLoading] = useState(true);

  // Admin response
  const [responding, setResponding] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState('');
  const [savingResponse, setSavingResponse] = useState(false);

  // Confirm reject/delete
  const [deleting, setDeleting] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    let q = supabase
      .from('reviews')
      .select(`
        *,
        profile:profiles(first_name, last_name),
        product:products(name, slug)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (filter === 'pending')  q = q.eq('is_approved', false).eq('is_flagged', false);
    if (filter === 'approved') q = q.eq('is_approved', true);
    if (filter === 'flagged')  q = q.eq('is_flagged', true);

    if (search) q = q.ilike('title', `%${search}%`);

    const { data, count } = await q;
    setReviews((data as Review[]) ?? []);
    setTotal(count ?? 0);
    setIsLoading(false);
  }, [page, filter, search]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (review: Review) => {
    const { error } = await supabase
      .from('reviews')
      .update({ is_approved: true, is_flagged: false })
      .eq('id', review.id);
    if (error) toastError('Failed to approve review');
    else { success('Review approved'); load(); }
  };

  const handleFlag = async (review: Review) => {
    const { error } = await supabase
      .from('reviews')
      .update({ is_flagged: !review.is_flagged })
      .eq('id', review.id);
    if (error) toastError('Failed to update review');
    else { success(review.is_flagged ? 'Flag removed' : 'Review flagged'); load(); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('reviews').delete().eq('id', deleting.id);
    if (error) toastError('Failed to delete review');
    else { success('Review deleted'); setDeleting(null); load(); }
  };

  const handleSaveResponse = async () => {
    if (!responding) return;
    setSavingResponse(true);
    const { error } = await supabase
      .from('reviews')
      .update({ admin_response: responseText.trim() || null })
      .eq('id', responding.id);
    if (error) toastError('Failed to save response');
    else { success('Response saved'); setResponding(null); setResponseText(''); load(); }
    setSavingResponse(false);
  };

  const FILTERS: { label: string; value: ReviewFilter }[] = [
    { label: 'Pending',  value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Flagged',  value: 'flagged' },
    { label: 'All',      value: 'all' },
  ];

  return (
    <>
      <PageSeo title="Reviews — Admin" />

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reviews</h1>
          <p className="admin-page-desc">{total.toLocaleString()} reviews</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div className="admin-table-toolbar">
          <div className="admin-table-toolbar-left">
            <div className="input-group" style={{ width: 260 }}>
              <Search size={14} className="input-icon-left" />
              <input
                type="search" className="input input-sm"
                placeholder="Search review title…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: 'var(--space-9)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  className={`shop-filter-btn${filter === f.value ? ' active' : ''}`}
                  style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
                  onClick={() => { setFilter(f.value); setPage(1); }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-12)' }}><Spinner fullPage /></div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState title="No reviews" description="No reviews match your current filter." />
          </div>
        ) : (
          <>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Rating</th>
                    <th>Review</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map(review => (
                    <tr key={review.id}>
                      <td>
                        <p style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {review.product?.name ?? '—'}
                        </p>
                      </td>
                      <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {review.profile?.first_name} {review.profile?.last_name}
                      </td>
                      <td><StarDisplay rating={review.rating} /></td>
                      <td style={{ maxWidth: 260 }}>
                        {review.title && (
                          <p style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{review.title}</p>
                        )}
                        {review.body && (
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {review.body}
                          </p>
                        )}
                        {review.admin_response && (
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', marginTop: 2 }}>
                            ↳ Admin responded
                          </p>
                        )}
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                        {formatDateShort(review.created_at)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                          {review.is_approved && <span className="badge badge-success badge-sm">Approved</span>}
                          {review.is_flagged && <span className="badge badge-danger badge-sm">Flagged</span>}
                          {!review.is_approved && !review.is_flagged && <span className="badge badge-neutral badge-sm">Pending</span>}
                          {review.is_verified_purchase && <span className="badge badge-primary badge-sm">Verified</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                          {!review.is_approved && (
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => handleApprove(review)}
                              title="Approve"
                              aria-label="Approve review"
                            >
                              <CheckCircle size={15} style={{ color: 'var(--color-success)' }} />
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleFlag(review)}
                            title={review.is_flagged ? 'Unflag' : 'Flag'}
                            aria-label={review.is_flagged ? 'Remove flag' : 'Flag review'}
                          >
                            <Flag size={15} style={{ color: review.is_flagged ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => { setResponding(review); setResponseText(review.admin_response ?? ''); }}
                            title="Respond"
                            aria-label="Add admin response"
                          >
                            <MessageSquare size={15} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => setDeleting(review)}
                            title="Delete"
                            aria-label="Delete review"
                          >
                            <XCircle size={15} style={{ color: 'var(--color-danger)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
              <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Admin Response Modal */}
      {responding && (
        <div className="modal-backdrop" onClick={() => setResponding(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Admin Response</h3>
              <button className="modal-close" onClick={() => setResponding(null)} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                Responding to: <strong>{responding.profile?.first_name}'s</strong> review of <strong>{responding.product?.name}</strong>
              </p>
              {responding.body && (
                <blockquote style={{ borderLeft: '3px solid var(--color-border)', paddingLeft: 'var(--space-3)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', fontStyle: 'italic' }}>
                  "{responding.body}"
                </blockquote>
              )}
              <textarea
                className="input"
                rows={4}
                style={{ resize: 'vertical' }}
                placeholder="Write your public response…"
                value={responseText}
                onChange={e => setResponseText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setResponding(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveResponse} disabled={savingResponse}>
                {savingResponse ? 'Saving…' : 'Save Response'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Review"
        message={`Permanently delete this review by ${deleting?.profile?.first_name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
