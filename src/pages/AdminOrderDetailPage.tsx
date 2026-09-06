import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { formatCurrency, formatDate, formatDateTime, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/utils/formatters';
import type { Order, OrderStatus } from '@/types';

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending:             ['payment_processing', 'cancelled'],
  payment_processing:  ['paid', 'payment_failed'],
  paid:                ['processing', 'cancelled'],
  processing:          ['ready_for_shipment', 'cancelled'],
  ready_for_shipment:  ['shipped'],
  shipped:             ['out_for_delivery'],
  out_for_delivery:    ['delivered'],
  delivered:           ['return_requested', 'refunded'],
  return_requested:    ['returned'],
  returned:            ['refunded'],
};

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [order, setOrder]     = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote]         = useState('');

  const load = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('orders')
      .select(`*, items:order_items(*), status_history:order_status_history(*), customer:profiles(first_name, last_name, phone)`)
      .eq('id', id).single();
    setOrder(data as Order);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!order || !user) return;
    setUpdating(true);
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    await supabase.from('order_status_history').insert({
      order_id: order.id, from_status: order.status, to_status: newStatus, actor_id: user.id, note: note || null,
    });
    success('Status updated', ORDER_STATUS_LABELS[newStatus]);
    setNote('');
    setUpdating(false);
    load();
  };

  if (isLoading) return <Spinner fullPage />;
  if (!order) return <div style={{ padding: 'var(--space-8)' }}>Order not found. <Link to="/admin/orders">Back</Link></div>;

  const history = order.status_history?.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) ?? [];
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  return (
    <>
      <PageSeo title={`Order #${order.order_number} — Admin`} />
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/admin/orders" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></Link>
          <div>
            <h1 className="admin-page-title">Order #{order.order_number}</h1>
            <p className="admin-page-desc">Placed {formatDate(order.created_at)}</p>
          </div>
        </div>
        <span className={`badge badge-lg ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
        {/* Status Control */}
        <div className="card">
          <h2 style={{ fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-4)' }}>Update Status</h2>
          {nextStatuses.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>No further status transitions available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Note <span className="form-label-optional">(optional)</span></label>
                <input type="text" className="input input-sm" value={note} onChange={e => setNote(e.target.value)} placeholder="Internal note for this transition…" />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {nextStatuses.map(s => (
                  <button key={s} className="btn btn-secondary btn-sm" onClick={() => updateStatus(s)} disabled={updating}>
                    → {ORDER_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Customer */}
        <div className="card">
          <h2 style={{ fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-4)' }}>Customer</h2>
          {order.customer ? (
            <div style={{ fontSize: 'var(--text-sm)' }}>
              <p style={{ fontWeight: 'var(--font-semibold)' }}>{order.customer.first_name} {order.customer.last_name}</p>
              {order.customer.phone && <p style={{ color: 'var(--color-text-secondary)' }}>{order.customer.phone}</p>}
            </div>
          ) : <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>—</p>}
        </div>

        {/* Items */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-4)' }}>Items</h2>
          <div className="table-wrapper" style={{ border: 'none', padding: 0 }}>
            <table className="table">
              <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
              <tbody>
                {(order.items ?? []).map(item => (
                  <tr key={item.id}>
                    <td>
                      <p style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{item.product_name}</p>
                      {item.variant_name && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{item.variant_name}</p>}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{item.sku}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price, order.currency)}</td>
                    <td style={{ fontWeight: 'var(--font-semibold)' }}>{formatCurrency(item.line_total, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', padding: 'var(--space-4) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-1-5)', alignItems: 'flex-end' }}>
            {[
              { l: 'Subtotal', v: order.subtotal },
              { l: 'Delivery', v: order.delivery_fee },
              ...(order.discount_amount ? [{ l: 'Discount', v: -order.discount_amount }] : []),
              { l: 'Tax', v: order.tax_amount },
            ].map(({ l, v }) => (
              <div key={l} style={{ display: 'flex', gap: 'var(--space-8)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                <span>{l}</span><span>{formatCurrency(v, order.currency)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 'var(--space-8)', fontWeight: 'var(--font-bold)', fontSize: 'var(--text-base)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
              <span>Total</span><span>{formatCurrency(order.total, order.currency)}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-4)' }}>Status History</h2>
          <div className="order-status-timeline">
            {history.map((h, i) => (
              <div key={h.id} className="timeline-item">
                <div className={`timeline-dot${i === history.length - 1 ? ' active' : ''}`}>
                  {i === history.length - 1 ? <CheckCircle size={14} /> : <span style={{ fontSize: 10 }}>{i + 1}</span>}
                </div>
                <div className="timeline-info">
                  <p className="timeline-status">{ORDER_STATUS_LABELS[h.to_status]}</p>
                  <p className="timeline-date">{formatDateTime(h.created_at)}</p>
                  {h.note && <p className="timeline-note">{h.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
