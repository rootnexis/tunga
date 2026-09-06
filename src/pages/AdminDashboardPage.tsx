import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ShoppingBag, Users, DollarSign, ArrowRight, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { formatCurrency, formatDateShort, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/utils/formatters';
import type { Order } from '@/types';

interface Stats { revenue: number; orders: number; customers: number; products: number; }

export default function AdminDashboardPage() {
  const [stats, setStats]       = useState<Stats>({ revenue: 0, orders: 0, customers: 0, products: 0 });
  const [recentOrders, setRecent] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('total', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'customer'),
      supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('orders').select('id, order_number, status, total, currency, created_at').order('created_at', { ascending: false }).limit(8),
    ]).then(([ordersRes, customersRes, productsRes, recentRes]) => {
      const revenue = (ordersRes.data ?? []).reduce((s: number, o: { total: number }) => s + (o.total ?? 0), 0);
      setStats({
        revenue,
        orders: ordersRes.count ?? 0,
        customers: customersRes.count ?? 0,
        products: productsRes.count ?? 0,
      });
      setRecent((recentRes.data as Order[]) ?? []);
      setIsLoading(false);
    });
  }, []);

  const KPIS = [
    { icon: DollarSign, label: 'Total Revenue',  value: formatCurrency(stats.revenue), change: '+12.5%', positive: true },
    { icon: ShoppingBag, label: 'Total Orders',  value: stats.orders.toLocaleString(), change: '+8.2%', positive: true },
    { icon: Users,       label: 'Customers',     value: stats.customers.toLocaleString(), change: '+5.1%', positive: true },
    { icon: Package,     label: 'Active Products', value: stats.products.toLocaleString(), change: '+3', positive: true },
  ];

  if (isLoading) return <Spinner fullPage />;

  return (
    <>
      <PageSeo title="Admin Dashboard" />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-desc">Welcome back — here's what's happening today.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        {KPIS.map(({ icon: Icon, label, value, change, positive }) => (
          <div key={label} className="kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <p className="kpi-label">{label}</p>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} />
              </div>
            </div>
            <p className="kpi-value">{value}</p>
            <p className={`kpi-change ${positive ? 'positive' : 'negative'}`}>
              {change} vs last month
            </p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-5) var(--space-5) 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)' }}>Recent Orders</h2>
          <Link to="/admin/orders" className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>
        </div>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, marginTop: 'var(--space-4)' }}>
          <table className="table">
            <thead>
              <tr><th>Order #</th><th>Date</th><th>Status</th><th>Total</th><th></th></tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id}>
                  <td><span style={{ fontWeight: 'var(--font-semibold)' }}>#{order.order_number}</span></td>
                  <td>{formatDateShort(order.created_at)}</td>
                  <td><span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span></td>
                  <td style={{ fontWeight: 'var(--font-semibold)' }}>{formatCurrency(order.total, order.currency)}</td>
                  <td><Link to={`/admin/orders/${order.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
