import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { Pagination } from '@/components/shared/Pagination';
import { formatCurrency, formatDateShort, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/utils/formatters';
import type { Order, OrderStatus } from '@/types';

const PAGE_SIZE = 15;
const STATUS_FILTERS: { label: string; value: OrderStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Refunded', value: 'refunded' },
];

export default function AdminOrdersPage() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    let q = supabase
      .from('orders')
      .select('id, order_number, status, total, currency, created_at, user_id', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (search) q = q.ilike('order_number', `%${search}%`);
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data, count } = await q;
    setOrders((data as Order[]) ?? []);
    setTotal(count ?? 0);
    setIsLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageSeo title="Orders — Admin" />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Orders</h1>
          <p className="admin-page-desc">{total.toLocaleString()} total orders</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-table-toolbar">
          <div className="admin-table-toolbar-left">
            <div className="input-group" style={{ width: 260 }}>
              <Search size={14} className="input-icon-left" />
              <input type="search" className="input input-sm" placeholder="Search order #…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 'var(--space-9)' }} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.value}
                  className={`shop-filter-btn${statusFilter === f.value ? ' active' : ''}`}
                  style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
                  onClick={() => { setStatusFilter(f.value); setPage(1); }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-12)' }}><Spinner fullPage /></div>
        ) : (
          <>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr><th>Order #</th><th>Date</th><th>Status</th><th>Total</th><th></th></tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td><span style={{ fontWeight: 'var(--font-semibold)' }}>#{order.order_number}</span></td>
                      <td>{formatDateShort(order.created_at)}</td>
                      <td><span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span></td>
                      <td style={{ fontWeight: 'var(--font-semibold)' }}>{formatCurrency(order.total, order.currency)}</td>
                      <td><Link to={`/admin/orders/${order.id}`} className="btn btn-ghost btn-sm">Manage</Link></td>
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
    </>
  );
}
