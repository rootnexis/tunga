import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { EmptyState } from '@/components/shared/EmptyState';
import { Spinner } from '@/components/shared/Spinner';
import { Pagination } from '@/components/shared/Pagination';
import { formatCurrency, formatDateShort, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/utils/formatters';
import { useT } from '@/contexts/LanguageContext';
import type { Order } from '@/types';

const PAGE_SIZE = 10;

export default function AccountOrdersPage() {
  const { user } = useAuth();
  const { t } = useT();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    let q = supabase
      .from('orders')
      .select('id, order_number, status, total, currency, created_at, items:order_items(id)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (search) q = q.ilike('order_number', `%${search}%`);
    q.then(({ data, count }) => {
      setOrders((data as Order[]) ?? []);
      setTotal(count ?? 0);
      setIsLoading(false);
    });
  }, [user, page, search]);

  return (
    <>
      <PageSeo title={`${t.nav.myOrders} — ${t.siteName}`} />
      <div className="account-card">
        <div className="account-card-header">
          <h1 className="account-card-title">{t.nav.myOrders}</h1>
          <div className="input-group" style={{ width: 220 }}>
            <Search size={14} className="input-icon-left" />
            <input
              type="search"
              className="input input-sm"
              placeholder="Search order #…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 'var(--space-8)' }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-12)' }}><Spinner fullPage /></div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState
              icon={Package}
              title="No orders yet"
              description="When you place an order, it will appear here."
              action={<Link to="/shop" className="btn btn-primary">Start Shopping</Link>}
            />
          </div>
        ) : (
          <>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td><span style={{ fontWeight: 'var(--font-semibold)' }}>#{order.order_number}</span></td>
                      <td>{formatDateShort(order.created_at)}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{order.items?.length ?? 0} item(s)</td>
                      <td><span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span></td>
                      <td style={{ fontWeight: 'var(--font-semibold)' }}>{formatCurrency(order.total, order.currency)}</td>
                      <td><Link to={`/account/orders/${order.id}`} className="btn btn-secondary btn-sm">Details</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: 'var(--space-4) var(--space-6)' }}>
              <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
