import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle, Truck, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { formatCurrency, formatDate, formatDateTime, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/utils/formatters';
import type { Order } from '@/types';

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*, product:products(id,name,slug,images:product_images(url,is_primary))),
        status_history:order_status_history(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setOrder(data as Order);
        setIsLoading(false);
      });
  }, [id, user]);

  if (isLoading) return <Spinner fullPage />;
  if (!order) return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
      <p>Order not found.</p>
      <Link to="/account/orders" className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }}>Back to Orders</Link>
    </div>
  );

  const history = order.status_history?.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) ?? [];

  return (
    <>
      <PageSeo title={`Order #${order.order_number}`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link to="/account/orders" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /> Back</Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>Order #{order.order_number}</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Placed on {formatDate(order.created_at)}
            </p>
          </div>
          <span className={`badge badge-lg ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
        </div>

        {/* Items */}
        <div className="account-card">
          <div className="account-card-header"><h2 className="account-card-title">Items</h2></div>
          <div className="account-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {(order.items ?? []).map(item => {
              const img = item.product?.images?.find(i => i.is_primary) ?? item.product?.images?.[0];
              return (
                <div key={item.id} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--slate-100)', overflow: 'hidden', flexShrink: 0 }}>
                    {img && <img src={img.url} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>{item.product_name}</p>
                    {item.variant_name && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{item.variant_name}</p>}
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>SKU: {item.sku}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>{formatCurrency(item.line_total, order.currency)}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      {formatCurrency(item.unit_price, order.currency)} × {item.quantity}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Totals */}
          <div style={{ borderTop: '1px solid var(--color-border)', padding: 'var(--space-4) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              { label: 'Subtotal', value: order.subtotal },
              { label: 'Delivery', value: order.delivery_fee },
              { label: 'Discount', value: -order.discount_amount },
              { label: 'Tax', value: order.tax_amount },
            ].map(({ label, value }) => value !== 0 && (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                <span>{label}</span><span>{formatCurrency(value, order.currency)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
              <span>Total</span><span>{formatCurrency(order.total, order.currency)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-5)' }}>
          {/* Shipping Address */}
          <div className="account-card">
            <div className="account-card-header">
              <h2 className="account-card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <MapPin size={16} /> Shipping Address
              </h2>
            </div>
            <div className="account-card-body" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
              {order.shipping_address ? (
                <>
                  <p style={{ fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
                    {order.shipping_address.first_name} {order.shipping_address.last_name}
                  </p>
                  <p>{order.shipping_address.address_line1}</p>
                  {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                  <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                  <p>{order.shipping_address.country}</p>
                </>
              ) : <p>—</p>}
            </div>
          </div>

          {/* Status Timeline */}
          <div className="account-card">
            <div className="account-card-header">
              <h2 className="account-card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Package size={16} /> Status History
              </h2>
            </div>
            <div className="account-card-body">
              {history.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>No history yet.</p>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
