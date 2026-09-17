import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatRelativeTime, TICKET_STATUS_COLORS, TICKET_STATUS_LABELS } from '@/utils/formatters';
import type { SupportTicket } from '@/types';

export default function AccountSupportPage() {
  const { user } = useAuth();
  const { t } = useT();
  const sp = t.account.supportPage;
  const { success, error: toastError } = useToast();
  const [tickets, setTickets]   = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ subject: '', category: 'Order Issue', body: '' });
  const [submitting, setSubmitting] = useState(false);

  const categoriesList = [
    { value: 'Order Issue', label: sp.categories.orderIssue },
    { value: 'Product Question', label: sp.categories.productQuestion },
    { value: 'Return/Refund', label: sp.categories.returnRefund },
    { value: 'Payment', label: sp.categories.payment },
    { value: 'Shipping', label: sp.categories.shipping },
    { value: 'Other', label: sp.categories.other },
  ];

  const getCategoryLabel = (cat: string) => {
    const found = categoriesList.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('support_tickets')
      .select('id, subject, category, status, priority, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTickets((data as SupportTicket[]) ?? []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.subject.trim() || !form.body.trim()) return;
    setSubmitting(true);
    const { data: ticket, error: tErr } = await supabase.from('support_tickets').insert({
      user_id: user.id, subject: form.subject, category: form.category, status: 'open', priority: 'normal',
    }).select('id').single();
    if (tErr || !ticket) {
      toastError((sp as any).couldNotSave || (t.account as any)?.addressesPage?.couldNotSave || 'Could not create ticket', tErr?.message);
      setSubmitting(false);
      return;
    }
    await supabase.from('support_messages').insert({
      ticket_id: ticket.id, sender_id: user.id, body: form.body, is_staff_reply: false,
    });
    setSubmitting(false);
    setShowForm(false);
    setForm({ subject: '', category: 'Order Issue', body: '' });
    success(sp.ticketSubmitted, sp.ticketSubmittedDesc);
    load();
  };

  return (
    <>
      <PageSeo title={`${sp.title} — ${t.siteName}`} />
      <div className="account-card">
        <div className="account-card-header">
          <h1 className="account-card-title">{sp.title}</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(p => !p)}>
            <Plus size={14} /> {sp.newTicket}
          </button>
        </div>

        {showForm && (
          <div style={{ padding: 'var(--space-6)', borderBottom: '1px solid var(--color-border)', background: 'var(--slate-50)' }}>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-5)' }}>
              {sp.newTicket}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="auth-row">
                <div className="form-group">
                  <label className="form-label">{sp.subject}</label>
                  <input
                    type="text"
                    className="input"
                    value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    placeholder={sp.subjectPlaceholder}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{sp.category}</label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  >
                    {categoriesList.map(c => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{sp.message}</label>
                <textarea
                  className="input"
                  value={form.body}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  placeholder={sp.messagePlaceholder}
                  rows={5}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Send size={14} /> {submitting ? sp.submitting : sp.submitTicket}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                  {sp.cancel}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            {sp.loading}
          </div>
        ) : tickets.length === 0 && !showForm ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState
              icon={MessageSquare}
              title={sp.noTickets}
              description={sp.noTicketsDesc}
              action={
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                  <Plus size={14} /> {sp.openTicket}
                </button>
              }
            />
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{sp.colSubject}</th>
                  <th>{sp.colCategory}</th>
                  <th>{sp.colStatus}</th>
                  <th>{sp.colLastUpdated}</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td style={{ fontWeight: 'var(--font-medium)' }}>{ticket.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{getCategoryLabel(ticket.category)}</td>
                    <td>
                      <span className={`badge ${TICKET_STATUS_COLORS[ticket.status]}`}>
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{formatRelativeTime(ticket.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
