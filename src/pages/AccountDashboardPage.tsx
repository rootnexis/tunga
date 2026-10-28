import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Heart,
  MapPin,
  ArrowRight,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import {
  formatCurrency,
  formatDateShort,
  formatDateTime,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/utils/formatters';
import type { OrderStatus } from '@/types';

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

export default function AccountDashboardPage() {
  const { user, profile } = useAuth();
  const { t } = useT();
  const dp = t.account.dashboardPage;
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [trackQuery, setTrackQuery] = useState('');
  const [trackError, setTrackError] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }: any) => {
        const list = (data as any[]) ?? [];
        setOrders(list);
        if (list.length > 0) {
          // Default to first active/shipped order, or latest order
          const activeOrder = list.find((o) => o.status !== 'cancelled') || list[0];
          setSelectedOrder(activeOrder);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [user]);

  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    const cleaned = trackQuery.trim().replace(/^#/, '').toUpperCase();
    if (!cleaned) return;

    // First look in user's loaded orders
    const localMatch = orders.find(
      (o) =>
        o.order_number?.toUpperCase().includes(cleaned) ||
        o.tracking_number?.toUpperCase().includes(cleaned)
    );
    if (localMatch) {
      setSelectedOrder(localMatch);
      return;
    }

    // Otherwise query orders table by order_number
    const { data } = await supabase
      .from('orders')
      .select('*')
      .ilike('order_number', `%${cleaned}%`)
      .limit(1)
      .maybeSingle();

    if (data) {
      setSelectedOrder(data);
    } else {
      setTrackError(`No order found matching "${trackQuery.trim()}". Try #ORD-2026-8912.`);
    }
  };

  const handleCopyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const displayName = profile?.first_name ?? (user?.email ? user.email.split('@')[0] : 'there');

  const QUICK_LINKS = [
    { to: '/account/orders', icon: Package, label: dp.myOrders, desc: dp.myOrdersDesc },
    { to: '/account/wishlist', icon: Heart, label: dp.wishlist, desc: dp.wishlistDesc },
    { to: '/account/addresses', icon: MapPin, label: dp.addresses, desc: dp.addressesDesc },
    { to: '/shop', icon: ShoppingBag, label: dp.keepShopping, desc: dp.keepShoppingDesc },
  ];

  const activeStepIdx = selectedOrder ? getStepIndex(selectedOrder.status) : 0;
  const trackingNumber =
    selectedOrder?.tracking_number ||
    (selectedOrder?.order_number
      ? `ITZ-EXP-${selectedOrder.order_number.replace(/\D/g, '').slice(-6).padStart(6, '8')}`
      : 'ITZ-EXP-891204');
  const carrierName = selectedOrder?.carrier || 'Ituze Express Priority';
  const estimatedDelivery =
    selectedOrder?.estimated_delivery ||
    new Date(
      new Date(selectedOrder?.created_at || '2026-10-28T00:00:00Z').getTime() + 4 * 86400000
    ).toISOString();

  return (
    <>
      <PageSeo title={`${dp.welcomeBack} — ${t.siteName}`} />

      {/* Welcome Header Card */}
      <div className="account-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div
          className="account-card-body"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--indigo-600), var(--violet-600))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-bold)',
                flexShrink: 0,
              }}
            >
              {(displayName?.[0] ?? 'U').toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>
                {dp.welcomeBack}, {displayName}!
              </h1>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                <span>{user?.email}</span>
                <span aria-hidden="true">·</span>
                <span
                  style={{
                    color: '#10b981',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontWeight: 600,
                    fontSize: '0.76rem',
                  }}
                >
                  <ShieldCheck size={13} /> Verified Account
                </span>
              </p>
            </div>
          </div>
          <div
            style={{
              fontSize: '0.74rem',
              color: 'var(--slate-500)',
              background: 'var(--slate-50)',
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--slate-200)',
            }}
          >
            <span>
              Member ID:{' '}
              <code style={{ fontFamily: 'monospace', color: 'var(--slate-700)' }}>
                {user?.id?.slice(0, 16)}…
              </code>
            </span>
          </div>
        </div>
      </div>

      {/* ── Live Order Tracking Center ── */}
      <div
        className="account-card"
        style={{
          marginBottom: 'var(--space-6)',
          border: '1px solid var(--indigo-100)',
          overflow: 'hidden',
        }}
      >
        <div
          className="account-card-header"
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
            borderBottom: '1px solid var(--indigo-100)',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--indigo-600)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={18} />
            </div>
            <div>
              <h2 className="account-card-title" style={{ marginBottom: 0 }}>
                Live Order Tracking
              </h2>
              <p style={{ fontSize: '0.76rem', color: 'var(--slate-500)', margin: 0 }}>
                Track your shipment progress in real time by order or tracking number
              </p>
            </div>
          </div>

          {/* Search / Lookup Bar */}
          <form
            onSubmit={handleTrackSearch}
            style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}
          >
            <div className="input-group" style={{ width: 220 }}>
              <Search size={14} className="input-icon-left" />
              <input
                type="text"
                className="input input-sm"
                placeholder="Order # (e.g. ORD-2026-8912)"
                value={trackQuery}
                onChange={(e) => {
                  setTrackQuery(e.target.value);
                  if (trackError) setTrackError(null);
                }}
                style={{ paddingLeft: 'var(--space-8)', background: '#fff' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Track Order
            </button>
          </form>
        </div>

        <div className="account-card-body">
          {trackError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'var(--red-50)',
                color: 'var(--red-700)',
                borderRadius: 10,
                fontSize: '0.82rem',
                marginBottom: 'var(--space-4)',
                border: '1px solid var(--red-100)',
              }}
            >
              <AlertCircle size={16} />
              <span>{trackError}</span>
            </div>
          )}

          {isLoading ? (
            <div style={{ padding: 'var(--space-6)' }}>
              <Spinner label={dp.loadingOrders} />
            </div>
          ) : !selectedOrder ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--slate-500)' }}>
              <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.45 }} />
              <p style={{ fontSize: 'var(--text-sm)' }}>
                Enter an order number above or place an order to see live shipment tracking.
              </p>
            </div>
          ) : (
            <div>
              {/* Order Selector Pills if user has multiple orders */}
              {orders.length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 'var(--space-4)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)' }}>
                    Select Order:
                  </span>
                  {orders.slice(0, 5).map((ord) => {
                    const isSelected = selectedOrder?.id === ord.id;
                    return (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => {
                          setSelectedOrder(ord);
                          setTrackError(null);
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 999,
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          border: isSelected ? '1px solid var(--indigo-600)' : '1px solid var(--slate-200)',
                          background: isSelected ? 'var(--indigo-600)' : '#fff',
                          color: isSelected ? '#fff' : 'var(--slate-700)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        #{ord.order_number}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Top Summary Bar */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: '14px 16px',
                  background: 'var(--slate-50)',
                  borderRadius: 12,
                  border: '1px solid var(--slate-200)',
                  marginBottom: 'var(--space-5)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--slate-900)' }}>
                      Order #{selectedOrder.order_number}
                    </span>
                    <span
                      className={`badge ${
                        ORDER_STATUS_COLORS[selectedOrder.status as OrderStatus] || 'badge-primary'
                      }`}
                    >
                      {ORDER_STATUS_LABELS[selectedOrder.status as OrderStatus] || selectedOrder.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 4 }}>
                    Placed on {formatDateShort(selectedOrder.created_at)} · Total:{' '}
                    <strong style={{ color: 'var(--slate-800)' }}>
                      {formatCurrency(selectedOrder.total, selectedOrder.currency)}
                    </strong>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#fff',
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--slate-200)',
                      fontSize: '0.76rem',
                    }}
                  >
                    <span style={{ color: 'var(--slate-500)' }}>Tracking #:</span>
                    <code style={{ fontWeight: 700, color: 'var(--indigo-600)' }}>{trackingNumber}</code>
                    <button
                      type="button"
                      onClick={() => handleCopyTracking(trackingNumber)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: copiedTracking ? '#10b981' : 'var(--slate-400)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: 2,
                      }}
                      title="Copy tracking number"
                    >
                      {copiedTracking ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>

                  <Link
                    to={`/account/orders/${selectedOrder.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <span>Full Details</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              </div>

              {/* 5-Stage Visual Stepper */}
              {selectedOrder.status === 'cancelled' ? (
                <div
                  style={{
                    padding: '16px',
                    background: 'var(--red-50)',
                    border: '1px solid var(--red-100)',
                    borderRadius: 12,
                    color: 'var(--red-700)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  This order was cancelled. If you have questions, please contact Ituze Support.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-5)',
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
                          position: 'relative',
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
                              Current
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

              {/* Shipment Metadata & Latest Activity Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 'var(--space-3)',
                  paddingTop: 'var(--space-3)',
                  borderTop: '1px solid var(--slate-200)',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Truck size={16} style={{ color: 'var(--indigo-600)', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>
                      Carrier & Service
                    </span>
                    <strong style={{ color: 'var(--slate-800)' }}>{carrierName}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Clock size={16} style={{ color: 'var(--emerald-600)', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>
                      {selectedOrder.status === 'delivered' ? 'Delivered On' : 'Estimated Delivery'}
                    </span>
                    <strong style={{ color: 'var(--slate-800)' }}>
                      {formatDateShort(estimatedDelivery)}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <MapPin size={16} style={{ color: 'var(--violet-600)', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.72rem' }}>
                      Delivery Destination
                    </span>
                    <strong style={{ color: 'var(--slate-800)' }}>
                      {selectedOrder.shipping_address
                        ? `${selectedOrder.shipping_address.address_line1}, ${selectedOrder.shipping_address.city}`
                        : 'Kigali Heights, Kigali'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Latest Status Log Note */}
              {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
                <div
                  style={{
                    marginTop: 'var(--space-3)',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'var(--slate-50)',
                    borderLeft: '3px solid var(--indigo-600)',
                    fontSize: '0.78rem',
                    color: 'var(--slate-700)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <span>
                    <strong>Latest Update:</strong>{' '}
                    {selectedOrder.status_history[selectedOrder.status_history.length - 1].note ||
                      `Order status is ${
                        ORDER_STATUS_LABELS[selectedOrder.status as OrderStatus] || selectedOrder.status
                      }.`}
                  </span>
                  <span style={{ color: 'var(--slate-500)' }}>
                    {formatDateTime(
                      selectedOrder.status_history[selectedOrder.status_history.length - 1].created_at
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {QUICK_LINKS.map(({ to, icon: Icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="card card-hover"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-4)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={20} />
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                  marginBottom: 2,
                }}
              >
                {label}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                {desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="account-card">
        <div className="account-card-header">
          <h2 className="account-card-title">{dp.recentOrders}</h2>
          <Link to="/account/orders" className="btn btn-ghost btn-sm">
            {dp.viewAll} <ArrowRight size={14} />
          </Link>
        </div>
        <div>
          {isLoading ? (
            <div style={{ padding: 'var(--space-8)' }}>
              <Spinner fullPage label={dp.loadingOrders} />
            </div>
          ) : orders.length === 0 ? (
            <div
              style={{
                padding: 'var(--space-8)',
                textAlign: 'center',
                color: 'var(--color-text-tertiary)',
              }}
            >
              <Package size={32} style={{ margin: '0 auto var(--space-3)', opacity: 0.4 }} />
              <p style={{ fontSize: 'var(--text-sm)' }}>
                {dp.noOrders}{' '}
                <Link to="/shop" style={{ color: 'var(--color-primary)' }}>
                  {dp.startShopping}
                </Link>
              </p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{dp.order}</th>
                    <th>{dp.date}</th>
                    <th>{dp.status}</th>
                    <th>{dp.total}</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const isCurrentlyTracked = selectedOrder?.id === order.id;
                    return (
                      <tr
                        key={order.id}
                        style={
                          isCurrentlyTracked
                            ? { background: 'var(--indigo-50)' }
                            : undefined
                        }
                      >
                        <td>
                          <span style={{ fontWeight: 'var(--font-semibold)' }}>
                            #{order.order_number}
                          </span>
                        </td>
                        <td>{formatDateShort(order.created_at)}</td>
                        <td>
                          <span className={`badge ${ORDER_STATUS_COLORS[order.status as OrderStatus]}`}>
                            {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 'var(--font-semibold)' }}>
                            {formatCurrency(order.total, order.currency)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              justifyContent: 'flex-end',
                            }}
                          >
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                isCurrentlyTracked ? 'btn-primary' : 'btn-secondary'
                              }`}
                              onClick={() => {
                                setSelectedOrder(order);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              <Truck size={13} />
                              <span>{isCurrentlyTracked ? 'Tracking' : 'Track'}</span>
                            </button>
                            <Link
                              to={`/account/orders/${order.id}`}
                              className="btn btn-ghost btn-sm"
                            >
                              Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
