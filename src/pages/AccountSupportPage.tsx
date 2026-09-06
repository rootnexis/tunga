import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatRelativeTime, TICKET_STATUS_COLORS, TICKET_STATUS_LABELS } from '@/utils/formatters';
import type { SupportTicket } from '@/types';

const CATEGORIES = ['Order Issue', 'Product Question', 'Return/Refund', 'Payment', 'Shipping', 'Other'];

export default function AccountSupportPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [tickets, setTickets]   = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ subject: '', category: CATEGORIES[0], body: '' });
  const [submitting, setSubmitting] = useState(false);

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
    if (tErr || !ticket) { toastError('Could not create ticket', tErr?.message); setSubmitting(false); return; }
    await supabase.from('support_messages').insert({
      ticket_id: ticket.id, sender_id: user.id, body: form.body, is_staff_reply: false,
    });
    setSubmitting(false);
    setShowForm(false);
    setForm({ subject: '', category: CATEGORIES[0], body: '' });
    success('Ticket submitted', "We'll respond within 24 hours.");
    load();
  };

  return (
    <>
      <PageSeo title="Support" />
      <div className="account-card">
        <div className="account-card-header">
          <h1 className="account-card-title">Support</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(p => !p)}>
            <Plus size={14} /> New Ticket
          </button>
        </div>

        {showForm && (
          <div style={{ padding: 'var(--space-6)', borderBottom: '1px solid var(--color-border)', background: 'var(--slate-50)' }}>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-5)' }}>New Support Ticket</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="auth-row">
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input type="text" className="input" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Briefly describe your issue" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="input" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Describe your issue in detail…" rows={5} required />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Send size={14} /> {submitting ? 'Submitting…' : 'Submit Ticket'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Loading…</div>
        ) : tickets.length === 0 && !showForm ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState icon={MessageSquare} title="No support tickets" description="Having an issue? Open a ticket and we'll help you out." action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Open a Ticket</button>} />
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr><th>Subject</th><th>Category</th><th>Status</th><th>Last Updated</th></tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td style={{ fontWeight: 'var(--font-medium)' }}>{ticket.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{ticket.category}</td>
                    <td><span className={`badge ${TICKET_STATUS_COLORS[ticket.status]}`}>{TICKET_STATUS_LABELS[ticket.status]}</span></td>
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
