import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Heart, MapPin, ArrowRight, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { formatCurrency, formatDateShort, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/utils/formatters';
import type { Order } from '@/types';

export default function AccountDashboardPage() {
  const { user, profile } = useAuth();
  const { t } = useT();
  const dp = t.account.dashboardPage;
  const [orders, setOrders]   = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select('id, order_number, status, total, currency, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setOrders((data as Order[]) ?? []);
        setIsLoading(false);
      });
  }, [user]);

  const displayName = profile?.first_name ?? 'there';

  const QUICK_LINKS = [
    { to: '/account/orders',    icon: Package,     label: dp.myOrders,     desc: dp.myOrdersDesc },
    { to: '/account/wishlist',  icon: Heart,       label: dp.wishlist,     desc: dp.wishlistDesc },
    { to: '/account/addresses', icon: MapPin,      label: dp.addresses,    desc: dp.addressesDesc },
    { to: '/shop',              icon: ShoppingBag, label: dp.keepShopping, desc: dp.keepShoppingDesc },
  ];

  return (
    <>
      <PageSeo title={`${dp.welcomeBack} — ${t.siteName}`} />
      <div className="account-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="account-card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--indigo-600), var(--violet-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', flexShrink: 0 }}>
            {(profile?.first_name?.[0] ?? 'U').toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>
              {dp.welcomeBack}, {displayName}!
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              {dp.welcomeDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        {QUICK_LINKS.map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to} className="card card-hover" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-xl)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} />
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{desc}</p>
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
            <div style={{ padding: 'var(--space-8)' }}><Spinner fullPage label={dp.loadingOrders} /></div>
          ) : orders.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td><span style={{ fontWeight: 'var(--font-semibold)' }}>#{order.order_number}</span></td>
                      <td>{formatDateShort(order.created_at)}</td>
                      <td><span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span></td>
                      <td><span style={{ fontWeight: 'var(--font-semibold)' }}>{formatCurrency(order.total, order.currency)}</span></td>
                      <td>
                        <Link to={`/account/orders/${order.id}`} className="btn btn-ghost btn-sm">
                          {dp.viewAll}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
