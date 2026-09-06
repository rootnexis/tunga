import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/contexts/LanguageContext';
import { ProductCard } from '@/components/shared/ProductCard';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { Spinner } from '@/components/shared/Spinner';
import { PageSeo } from '@/components/shared/PageSeo';
import type { Product } from '@/types';

const PAGE_SIZE = 12;

export default function ShopPage() {
  const { t } = useT();
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const q       = searchParams.get('q') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1', 10);
  const sort    = searchParams.get('sort') ?? 'newest';
  const minP    = searchParams.get('minPrice') ?? '';
  const maxP    = searchParams.get('maxPrice') ?? '';

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal]       = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch]     = useState(q);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const sortOptions = [
    { value: 'newest',     label: t.shop.newestFirst },
    { value: 'price_asc',  label: t.shop.priceAsc },
    { value: 'price_desc', label: t.shop.priceDesc },
    { value: 'popularity', label: t.shop.topRated },
  ];

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    let query = supabase
      .from('products')
      .select(`
        id, name, slug, base_price, sale_price, currency, is_active, is_featured, is_archived,
        images:product_images(id, url, alt_text, is_primary, sort_order),
        inventory(quantity_available, low_stock_threshold),
        category:categories(id, name, slug)
      `, { count: 'exact' })
      .eq('is_active', true)
      .eq('is_archived', false)
      .range(from, to);

    if (q)    query = query.ilike('name', `%${q}%`);
    if (slug && slug !== 'new-arrivals' && slug !== 'featured' && slug !== 'sale') {
      query = query.eq('categories.slug', slug);
    }
    if (slug === 'featured') query = query.eq('is_featured', true);
    if (minP) query = query.gte('base_price', parseFloat(minP));
    if (maxP) query = query.lte('base_price', parseFloat(maxP));

    switch (sort) {
      case 'price_asc':  query = query.order('base_price', { ascending: true }); break;
      case 'price_desc': query = query.order('base_price', { ascending: false }); break;
      default:           query = query.order('created_at', { ascending: false }); break;
    }

    const { data, count } = await query;
    setProducts((data as unknown as Product[]) ?? []);
    setTotal(count ?? 0);
    setIsLoading(false);
  }, [q, slug, page, sort, minP, maxP]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const setParam = (key: string, value: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParam('q', search || null);
  };

  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => setParam('sort', e.target.value);

  const getCategoryTitle = (categorySlug: string): string => {
    switch (categorySlug.toLowerCase()) {
      case 'new-arrivals':
        return t.home.catNewArrivals || t.nav.newArrivals;
      case 'featured':
        return t.nav.featured;
      case 'electronics':
        return t.home.catElectronics;
      case 'clothing':
        return t.home.catClothing;
      case 'home-garden':
        return t.home.catHomeGarden;
      case 'sports':
        return t.home.catSports;
      case 'beauty':
        return t.home.catBeauty;
      case 'books':
        return t.home.catBooks;
      case 'toys':
        return t.home.catToys;
      case 'sale':
        return t.home.shopTheSale;
      default:
        return categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const pageTitle = slug
    ? getCategoryTitle(slug)
    : q ? `${t.shop.search}: "${q}"` : t.shop.allProducts;

  return (
    <>
      <PageSeo title={`${pageTitle} — ${t.nav.shop}`} description={`Browse ${pageTitle.toLowerCase()} at Storefront.`} />

      {/* Header */}
      <div className="shop-header">
        <div className="container">
          <div className="shop-toolbar">
            <div className="shop-toolbar-left">
              <form onSubmit={handleSearch} className="shop-search-form">
                <div className="shop-search-input-wrap">
                  <Search size={16} className="shop-search-icon" />
                  <input
                    type="search"
                    className="shop-search-input"
                    placeholder={t.shop.searchProducts}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      className="shop-search-clear"
                      onClick={() => { setSearch(''); setParam('q', null); }}
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button type="submit" className="btn btn-primary shop-search-btn">
                  <Search size={14} />
                  <span>{t.shop.search}</span>
                </button>
              </form>
              {!isLoading && (
                <span className="shop-results-count">{total.toLocaleString()} {t.shop.products}</span>
              )}
            </div>
            <div className="shop-toolbar-right">
              <button
                className={`shop-filter-btn${showFilters ? ' active' : ''}`}
                onClick={() => setShowFilters(p => !p)}
              >
                <SlidersHorizontal size={14} />
                {t.shop.filters}
              </button>
              <div className="shop-sort-wrap">
                <ArrowUpDown size={14} className="shop-sort-icon" />
                <select className="shop-sort" value={sort} onChange={handleSort} aria-label="Sort by">
                  {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
            <Link to="/" style={{ color: 'var(--color-text-tertiary)' }}>{t.common.home}</Link>
            {' / '}
            {slug ? (
              <>
                <Link to="/shop" style={{ color: 'var(--color-text-tertiary)' }}>{t.nav.shop}</Link>
                {' / '}<span style={{ color: 'var(--color-text-primary)' }}>{pageTitle}</span>
              </>
            ) : (
              <span style={{ color: 'var(--color-text-primary)' }}>{t.nav.shop}</span>
            )}
          </nav>
        </div>
      </div>

      <div className="container">
        <div className="shop-layout">
          {/* Filters Sidebar */}
          <aside className={`shop-filters-sidebar${showFilters ? ' mobile-open' : ''}`}>
            {showFilters && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowFilters(false)}
                style={{ marginBottom: 'var(--space-4)' }}
              >
                <X size={16} /> {t.nav.close}
              </button>
            )}

            <div className="filter-section">
              <p className="filter-title">{t.shop.priceRange}</p>
              <div className="filter-price-row">
                <input
                  type="number"
                  className="input input-sm"
                  placeholder="Min"
                  value={minP}
                  onChange={e => setParam('minPrice', e.target.value || null)}
                  min={0}
                />
                <span>–</span>
                <input
                  type="number"
                  className="input input-sm"
                  placeholder="Max"
                  value={maxP}
                  onChange={e => setParam('maxPrice', e.target.value || null)}
                  min={0}
                />
              </div>
            </div>

            <div className="filter-section">
              <p className="filter-title">{t.shop.category}</p>
              <div className="filter-options">
                {[
                  { slug: 'new-arrivals', label: t.home.catNewArrivals },
                  { slug: 'electronics',  label: t.home.catElectronics },
                  { slug: 'clothing',     label: t.home.catClothing },
                  { slug: 'home-garden',  label: t.home.catHomeGarden },
                  { slug: 'sports',       label: t.home.catSports },
                  { slug: 'beauty',       label: t.home.catBeauty },
                  { slug: 'books',        label: t.home.catBooks },
                  { slug: 'toys',         label: t.home.catToys },
                ].map(cat => (
                  <Link
                    key={cat.slug}
                    to={`/shop/category/${cat.slug}`}
                    className={`checkbox-group${slug === cat.slug ? ' active-cat' : ''}`}
                    style={{
                      textDecoration: 'none',
                      color: slug === cat.slug ? 'var(--color-primary)' : 'inherit',
                      fontWeight: slug === cat.slug ? 'var(--font-semibold)' : 'normal',
                    }}
                  >
                    <span>{cat.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <p className="filter-title">{t.common.status}</p>
              <div className="filter-options">
                <label className="checkbox-group">
                  <input type="checkbox" />
                  <span>{t.shop.inStockOnly}</span>
                </label>
                <label className="checkbox-group">
                  <input type="checkbox" />
                  <span>{t.nav.featured}</span>
                </label>
              </div>
            </div>

            {(minP || maxP || q) && (
              <button
                className="btn btn-ghost btn-sm w-full"
                onClick={() => { setSearchParams(new URLSearchParams()); setSearch(''); }}
              >
                <X size={14} /> {t.shop.clearFilters}
              </button>
            )}
          </aside>

          {/* Products */}
          <div className="shop-content">
            <h1 style={{ fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-display)', fontWeight: 'var(--font-extrabold)', marginBottom: 'var(--space-6)' }}>
              {pageTitle}
            </h1>

            {isLoading ? (
              <Spinner fullPage label={t.common.loading} />
            ) : products.length === 0 ? (
              <EmptyState
                title={t.shop.noProducts}
                description={t.shop.noProductsDesc}
                action={
                  <Link to="/shop" className="btn btn-primary">
                    {t.shop.browseAll}
                  </Link>
                }
              />
            ) : (
              <>
                <div className="grid-products">
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={p => setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    next.set('page', String(p));
                    return next;
                  })}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
