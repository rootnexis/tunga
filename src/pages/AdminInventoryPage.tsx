import React, { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, TrendingDown, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';

interface InventoryRow {
  id: string;
  quantity_available: number;
  quantity_reserved: number;
  low_stock_threshold: number;
  updated_at: string;
  variant_id: string | null;
  product_id: string;
  product: { name: string; sku: string } | null;
  variant: { name: string; sku: string } | null;
}

const PAGE_SIZE = 20;

type StockFilter = 'all' | 'low' | 'out';

export default function AdminInventoryPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { t } = useT();
  const ti = t.admin.inventory;

  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Per-row restock state
  const [restocking, setRestocking] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const from = (page - 1) * PAGE_SIZE;

    let q = supabase
      .from('inventory')
      .select(`
        id, product_id, variant_id, quantity_available, quantity_reserved, low_stock_threshold, updated_at,
        product:products(name, sku),
        variant:product_variants(name, sku)
      `, { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (stockFilter === 'out') q = q.eq('quantity_available', 0);
    if (stockFilter === 'low') q = q.gt('quantity_available', 0).lte('quantity_available', 5);

    const { data, count } = await q;
    let filtered = (data as unknown as InventoryRow[]) ?? [];

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.product?.name?.toLowerCase().includes(s) ||
        r.product?.sku?.toLowerCase().includes(s) ||
        r.variant?.sku?.toLowerCase().includes(s)
      );
    }

    setRows(filtered);
    setTotal(count ?? 0);
    setIsLoading(false);
  }, [page, stockFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleRestock = async (row: InventoryRow) => {
    const addQty = parseInt(restocking[row.id] ?? '0');
    if (isNaN(addQty) || addQty <= 0) { toastError(ti.invalidQty); return; }

    setSavingId(row.id);
    const newQty = row.quantity_available + addQty;

    const { error } = await supabase
      .from('inventory')
      .update({ quantity_available: newQty })
      .eq('id', row.id);

    if (error) { toastError(ti.restockFailed, error.message); }
    else {
      await supabase.from('inventory_movements').insert({
        inventory_id: row.id,
        actor_id: user?.id ?? null,
        movement_type: 'restock',
        quantity_change: addQty,
        quantity_after: newQty,
        reference_type: 'manual_adjustment',
        note: 'Manual restock from admin panel',
      });
      success(ti.restockedTitle, ti.restockedDesc.replace('{qty}', String(addQty)));
      setRestocking(prev => ({ ...prev, [row.id]: '' }));
      load();
    }
    setSavingId(null);
  };

  const getStockBadge = (row: InventoryRow) => {
    if (row.quantity_available <= 0) return <span className="badge badge-danger">{ti.outOfStock}</span>;
    if (row.quantity_available <= row.low_stock_threshold) return <span className="badge badge-warning">{ti.lowStock}</span>;
    return <span className="badge badge-success">{ti.inStock}</span>;
  };

  const outCount = rows.filter(r => r.quantity_available <= 0).length;
  const lowCount = rows.filter(r => r.quantity_available > 0 && r.quantity_available <= r.low_stock_threshold).length;

  return (
    <>
      <PageSeo title={`${ti.title} — ${t.admin.nav.adminBadge}`} />

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{ti.title}</h1>
          <p className="admin-page-desc">{total.toLocaleString()} {ti.skusTracked}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={14} /> {ti.refresh}
        </button>
      </div>

      {/* Quick KPI cards */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--space-5)' }}>
        {[
          { icon: Package, label: ti.totalSkus, value: total.toLocaleString(), color: 'var(--color-primary)' },
          { icon: AlertTriangle, label: ti.lowStock, value: String(lowCount), color: 'var(--color-warning)' },
          { icon: TrendingDown, label: ti.outOfStock, value: String(outCount), color: 'var(--color-danger)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <p className="kpi-label">{label}</p>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} />
              </div>
            </div>
            <p className="kpi-value" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div className="admin-table-toolbar">
          <div className="admin-table-toolbar-left" style={{ width: '100%' }}>
            <div className="input-group" style={{ width: '100%', maxWidth: 280 }}>
              <Search size={14} className="input-icon-left" />
              <input
                type="search" className="input input-sm"
                placeholder={ti.searchPlaceholder}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: 'var(--space-9)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {(['all', 'low', 'out'] as StockFilter[]).map(f => (
                <button
                  key={f}
                  className={`shop-filter-btn${stockFilter === f ? ' active' : ''}`}
                  style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
                  onClick={() => { setStockFilter(f); setPage(1); }}
                >
                  {f === 'all' ? ti.filterAll : f === 'low' ? ti.filterLow : ti.filterOut}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-12)' }}><Spinner fullPage /></div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState title={ti.noRecords} description={ti.noRecordsDesc} />
          </div>
        ) : (
          <>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{ti.colProductSku}</th>
                    <th>{ti.colAvailable}</th>
                    <th>{ti.colReserved}</th>
                    <th>{ti.colThreshold}</th>
                    <th>{ti.colStatus}</th>
                    <th>{ti.colRestock}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const name = row.variant
                      ? `${row.product?.name} — ${row.variant.name}`
                      : row.product?.name ?? '—';
                    const sku = row.variant?.sku ?? row.product?.sku ?? '—';

                    return (
                      <tr key={row.id}>
                        <td>
                          <p style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{name}</p>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{sku}</p>
                        </td>
                        <td style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>
                          {row.quantity_available.toLocaleString()}
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                          {row.quantity_reserved.toLocaleString()}
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                          {row.low_stock_threshold}
                        </td>
                        <td>{getStockBadge(row)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                            <input
                              type="number"
                              className="input input-sm"
                              style={{ width: 72 }}
                              placeholder={ti.qtyPlaceholder}
                              min="1"
                              value={restocking[row.id] ?? ''}
                              onChange={e => setRestocking(prev => ({ ...prev, [row.id]: e.target.value }))}
                            />
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={savingId === row.id}
                              onClick={() => handleRestock(row)}
                            >
                              {savingId === row.id ? '…' : ti.addBtn}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
