import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, Archive, Eye, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { formatCurrency } from '@/utils/formatters';
import type { Product } from '@/types';

const PAGE_SIZE = 15;

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const { success } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [archiving, setArchiving] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    let q = supabase
      .from('products')
      .select(`
        id, name, slug, sku, base_price, sale_price, currency, is_active, is_featured, is_archived, created_at,
        images:product_images(url, is_primary),
        inventory(quantity_available),
        category:categories(name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (search) q = q.ilike('name', `%${search}%`);
    const { data, count } = await q;
    setProducts((data as unknown as Product[]) ?? []);
    setTotal(count ?? 0);
    setIsLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleArchive = async () => {
    if (!archiving) return;
    await supabase.from('products').update({ is_archived: !archiving.is_archived }).eq('id', archiving.id);
    success(archiving.is_archived ? 'Product restored' : 'Product archived');
    setArchiving(null);
    load();
  };

  const PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="#f1f5f9"/></svg>');

  return (
    <>
      <PageSeo title="Products — Admin" />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Products</h1>
          <p className="admin-page-desc">{total.toLocaleString()} total products</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/products/new')}><Plus size={16} /> Add Product</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-table-toolbar">
          <div className="admin-table-toolbar-left">
            <div className="input-group" style={{ width: 280 }}>
              <Search size={14} className="input-icon-left" />
              <input type="search" className="input input-sm" placeholder="Search products…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 'var(--space-9)' }} />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-12)' }}><Spinner fullPage /></div>
        ) : products.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState title="No products found" description="Add your first product to get started." />
          </div>
        ) : (
          <>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => {
                    const img = product.images?.find(i => i.is_primary) ?? product.images?.[0];
                    const stock = product.inventory?.quantity_available ?? 0;
                    return (
                      <tr key={product.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <img src={img?.url ?? PLACEHOLDER} alt="" style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', objectFit: 'cover', background: 'var(--slate-100)', flexShrink: 0 }} />
                            <div>
                              <p style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{product.name}</p>
                              {product.is_featured && <span className="badge badge-primary badge-sm">Featured</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{product.sku}</td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{product.category?.name ?? '—'}</td>
                        <td>
                          <div>
                            <p style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>{formatCurrency(product.sale_price ?? product.base_price, product.currency)}</p>
                            {product.sale_price && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textDecoration: 'line-through' }}>{formatCurrency(product.base_price, product.currency)}</p>}
                          </div>
                        </td>
                        <td>
                          <span className={`badge${stock <= 0 ? ' badge-danger' : stock <= 5 ? ' badge-warning' : ' badge-success'}`}>
                            {stock <= 0 ? 'Out' : stock <= 5 ? `Low (${stock})` : stock}
                          </span>
                        </td>
                        <td>
                          {product.is_archived
                            ? <span className="badge badge-neutral">Archived</span>
                            : product.is_active ? <span className="badge badge-success">Active</span>
                            : <span className="badge badge-warning">Draft</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                            <Link to={`/product/${product.slug}`} target="_blank" className="btn btn-ghost btn-sm btn-icon" aria-label="View"><Eye size={14} /></Link>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(`/admin/products/${product.id}/edit`)} aria-label="Edit"><Pencil size={14} /></button>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setArchiving(product)} aria-label="Archive">
                              <Archive size={14} />
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

      <ConfirmModal
        isOpen={!!archiving}
        onClose={() => setArchiving(null)}
        onConfirm={handleArchive}
        title={archiving?.is_archived ? 'Restore Product' : 'Archive Product'}
        message={archiving?.is_archived
          ? `Restore "${archiving?.name}" and make it visible again?`
          : `Archive "${archiving?.name}"? It will be hidden from the store.`}
        confirmLabel={archiving?.is_archived ? 'Restore' : 'Archive'}
        variant="warning"
      />
    </>
  );
}
