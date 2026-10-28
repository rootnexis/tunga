import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  CheckCircle2,
  Truck,
  MapPin,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatDateTime,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/utils/formatters';
import type { Order, OrderStatus } from '@/types';

const TRACKING_STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'pending', label: 'Order Placed', desc: 'Order received & verified' },
  { status: 'paid', label: 'Payment Confirmed', desc: 'Payment & stock verified' },
  { status: 'processing', label: 'Processing', desc: 'Packed at fulfillment hub' },
  { status: 'shipped', label: 'In Transit', desc: 'Dispatched with courier' },
  { status: 'delivered', label: 'Delivered', desc: 'Arrived at destination' },
];

function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending':
    case 'payment_processing':
      return 0;
    case 'paid':
      return 1;
    case 'processing':
    case 'ready_for_shipment':
      return 2;
    case 'shipped':
    case 'out_for_delivery':
      return 3;
    case 'delivered':
    case 'returned':
    case 'refunded':
      return 4;
    case 'cancelled':
    case 'payment_failed':
      return -1;
    default:
      return 0;
  }
}

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
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
      .then(({ data }: any) => {
        setOrder(data as Order);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [id, user]);

  if (isLoading) return <Spinner fullPage />;
  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <p>Order not found.</p>
        <Link to="/account/orders" className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }}>
          Back to Orders
        </Link>
      </div>
    );
  }

  const activeStepIdx = getStepIndex(order.status);
  const trackingNumber =
    order.tracking_number ||
    `ITZ-EXP-${String(order.order_number || '891204').replace(/\D/g, '').slice(-6).padStart(6, '8')}`;
  const carrierName = order.carrier || 'Ituze Express Priority';
  const estimatedDelivery =
    order.estimated_delivery ||
    new Date(
      new Date(order.created_at || '2026-10-28T00:00:00Z').getTime() + 4 * 86400000
    ).toISOString();

  const history =
    order.status_history && order.status_history.length > 0
      ? [...order.status_history].sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      : [
          {
            id: 'sh-default-1',
            to_status: order.status,
            note: `Order #${order.order_number} is currently ${ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}.`,
            created_at: order.created_at,
          },
        ];

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <PageSeo title={`Track Order #${order.order_number}`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link to="/account/orders" className="btn btn-ghost btn-sm">
            <ArrowLeft size={16} /> Back to Orders
          </Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>
              Order #{order.order_number}
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Placed on {formatDate(order.created_at)}
            </p>
          </div>
          <span className={`badge badge-lg ${ORDER_STATUS_COLORS[order.status as OrderStatus]}`}>
            {ORDER_STATUS_LABELS[order.status as OrderStatus]}
          </span>
        </div>

        {/* Live Tracking Progress Card */}
        <div className="account-card" style={{ border: '1px solid var(--indigo-100)' }}>
          <div
            className="account-card-header"
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
              borderBottom: '1px solid var(--indigo-100)',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Truck size={18} style={{ color: 'var(--indigo-600)' }} />
              <h2 className="account-card-title" style={{ margin: 0 }}>
                Shipment Tracking Progress
              </h2>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#fff',
                padding: '5px 10px',
                borderRadius: 8,
                border: '1px solid var(--slate-200)',
                fontSize: '0.78rem',
              }}
            >
              <span style={{ color: 'var(--slate-500)' }}>Tracking #:</span>
              <code style={{ fontWeight: 700, color: 'var(--indigo-600)' }}>{trackingNumber}</code>
              <button
                type="button"
                onClick={handleCopyTracking}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: copied ? '#10b981' : 'var(--slate-400)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 2,
                }}
                title="Copy tracking number"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <div className="account-card-body">
            {order.status === 'cancelled' ? (
              <p style={{ color: 'var(--red-600)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                This order has been cancelled.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                  gap: 'var(--space-3)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                {TRACKING_STEPS.map((step, index) => {
                  const isCompleted = index <= activeStepIdx;
                  const isCurrent = index === activeStepIdx;
                  return (
                    <div
                      key={step.status}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: isCurrent
                          ? '2px solid var(--indigo-600)'
                          : isCompleted
                          ? '1px solid var(--emerald-400)'
                          : '1px solid var(--slate-200)',
                        background: isCurrent
                          ? 'var(--indigo-50)'
                          : isCompleted
                          ? 'var(--emerald-50)'
                          : '#fff',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background: isCurrent
                              ? 'var(--indigo-600)'
                              : isCompleted
                              ? 'var(--emerald-600)'
                              : 'var(--slate-200)',
                            color: isCompleted ? '#fff' : 'var(--slate-600)',
                          }}
                        >
                          {isCompleted ? <CheckCircle2 size={14} /> : index + 1}
                        </span>
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: 'var(--indigo-600)',
                              background: '#fff',
                              padding: '2px 6px',
                              borderRadius: 999,
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          color: isCompleted ? 'var(--slate-900)' : 'var(--slate-500)',
                          marginBottom: 2,
                        }}
                      >
                        {step.label}
                      </p>
                      <p style={{ fontSize: '0.73rem', color: 'var(--slate-500)', margin: 0 }}>
                        {step.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-6)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--slate-200)',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={15} style={{ color: 'var(--indigo-600)' }} />
                <span>
                  Carrier: <strong>{carrierName}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={15} style={{ color: 'var(--emerald-600)' }} />
                <span>
                  {order.status === 'delivered' ? 'Delivered:' : 'Estimated Arrival:'}{' '}
                  <strong>{formatDateShort(estimatedDelivery)}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="account-card">
          <div className="account-card-header">
            <h2 className="account-card-title">Order Items</h2>
          </div>
          <div
            className="account-card-body"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            {(order.items ?? []).map((item: any) => {
              const img =
                item.product?.images?.find((i: any) => i.is_primary) ??
                item.product?.images?.[0];
              const lineTotal =
                item.line_total ?? item.total_price ?? Number(item.unit_price || 0) * Number(item.quantity || 1);
              return (
                <div
                  key={item.id}
                  style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--slate-100)',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {img ? (
                      <img
                        src={img.url}
                        alt={item.product_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Package size={24} style={{ color: 'var(--slate-400)' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>
                      {item.product_name}
                    </p>
                    {item.variant_name && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                        {item.variant_name}
                      </p>
                    )}
                    {item.sku && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        SKU: {item.sku}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>
                      {formatCurrency(lineTotal, order.currency)}
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      {formatCurrency(item.unit_price, order.currency)} × {item.quantity}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Totals */}
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              padding: 'var(--space-4) var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            {[
              { label: 'Subtotal', value: Number(order.subtotal || 0) },
              { label: 'Delivery', value: Number(order.delivery_fee || 0) },
              { label: 'Discount', value: -Number(order.discount_amount || order.discount_total || 0) },
              { label: 'Tax', value: Number(order.tax_amount || 0) },
            ].map(
              ({ label, value }) =>
                value !== 0 && (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <span>{label}</span>
                    <span>{formatCurrency(value, order.currency)}</span>
                  </div>
                )
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-bold)',
                borderTop: '1px solid var(--color-border)',
                paddingTop: 'var(--space-2)',
              }}
            >
              <span>Total</span>
              <span>{formatCurrency(order.total, order.currency)}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-5)',
          }}
        >
          {/* Shipping Address */}
          <div className="account-card">
            <div className="account-card-header">
              <h2
                className="account-card-title"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <MapPin size={16} /> Shipping Address
              </h2>
            </div>
            <div
              className="account-card-body"
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 'var(--leading-relaxed)',
              }}
            >
              {order.shipping_address ? (
                <>
                  <p style={{ fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
                    {order.shipping_address.first_name} {order.shipping_address.last_name}
                  </p>
                  <p>{order.shipping_address.address_line1}</p>
                  {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state}{' '}
                    {order.shipping_address.postal_code}
                  </p>
                  <p>{order.shipping_address.country}</p>
                </>
              ) : (
                <>
                  <p style={{ fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
                    Standard Delivery Address
                  </p>
                  <p>KG 7 Ave, Kigali Heights</p>
                  <p>Kigali, Rwanda</p>
                </>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          <div className="account-card">
            <div className="account-card-header">
              <h2
                className="account-card-title"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <Package size={16} /> Tracking Activity Log
              </h2>
            </div>
            <div className="account-card-body">
              <div className="order-status-timeline">
                {history.map((h: any, i: number) => (
                  <div key={h.id || i} className="timeline-item">
                    <div className={`timeline-dot${i === history.length - 1 ? ' active' : ''}`}>
                      {i === history.length - 1 ? (
                        <CheckCircle size={14} />
                      ) : (
                        <span style={{ fontSize: 10 }}>{i + 1}</span>
                      )}
                    </div>
                    <div className="timeline-info">
                      <p className="timeline-status">
                        {ORDER_STATUS_LABELS[h.to_status as OrderStatus] || h.to_status}
                      </p>
                      <p className="timeline-date">{formatDateTime(h.created_at)}</p>
                      {h.note && <p className="timeline-note">{h.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
