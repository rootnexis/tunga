import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  SlidersHorizontal, X, Search, ChevronDown, Grid3X3, List,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ProductCard } from '@/components/shared/ProductCard';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSeo } from '@/components/shared/PageSeo';
import { useT } from '@/contexts/LanguageContext';
import type { Product, Category } from '@/types';

type SortOption = 'newest' | 'popular' | 'price_asc' | 'price_desc' | 'rating';
const ITEMS_PER_PAGE = 12;

async function fetchCategories(): Promise<Category[]> {
  const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
  return (data ?? []) as Category[];
}

export default function ShopPage() {
  const { slug: categorySlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { t } = useT();

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'newest',     label: t.shop.newestFirst },
    { value: 'popular',    label: t.shop.topRated },
    { value: 'price_asc',  label: t.shop.priceAsc },
    { value: 'price_desc', label: t.shop.priceDesc },
    { value: 'rating',     label: t.shop.topRated },
  ];

  const page = Number(searchParams.get('page') ?? 1);
  const sort = (searchParams.get('sort') ?? 'newest') as SortOption;
  const search = searchParams.get('q') ?? '';
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const inStockOnly = searchParams.get('inStock') === 'true';
  const featuredOnly = searchParams.get('featured') === 'true' || categorySlug === 'featured';

  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Prevent background body scroll when mobile filter drawer is open
  useEffect(() => {
    if (!showFilters) return;
    if (window.innerWidth <= 1024) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [showFilters]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const activeCategory = categories.find(c => c.slug === categorySlug);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { categorySlug, page, sort, search, minPrice, maxPrice, inStockOnly, featuredOnly, categoryId: activeCategory?.id }],
    queryFn: async () => {
      let q = supabase
        .from('products')
        .select('*, images:product_images(*), category:categories(id,name,slug), brand:brands(id,name,slug), inventory(quantity_available)', { count: 'exact' })
        .eq('status', 'active');

      if (activeCategory?.id) q = q.eq('category_id', activeCategory.id);
      if (categorySlug === 'featured' || featuredOnly) q = q.eq('is_featured', true);
      if (search) q = q.ilike('name', `%${search}%`);
      if (minPrice !== undefined) q = q.gte('base_price', minPrice);
      if (maxPrice !== undefined) q = q.lte('base_price', maxPrice);

      switch (sort) {
        case 'price_asc':  q = q.order('base_price', { ascending: true }); break;
        case 'price_desc': q = q.order('base_price', { ascending: false }); break;
        case 'rating':     q = q.order('average_rating', { ascending: false, nullsFirst: false }); break;
        case 'popular':    q = q.order('review_count', { ascending: false, nullsFirst: false }); break;
        default:           q = q.order('created_at', { ascending: false });
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      q = q.range(from, from + ITEMS_PER_PAGE - 1);

      const { data: rows, count } = await q;
      let products = (rows ?? []) as Product[];

      if (inStockOnly) {
        products = products.filter(p => {
          const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
          return !inv || (inv.quantity_available ?? 1) > 0;
        });
      }

      return { products, total: count ?? products.length };
    },
  });

  const products = data?.products ?? [];
  const totalCount = data?.total ?? 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const updateParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', localSearch.trim() || undefined);
  };

  const clearAllFilters = () => {
    setSearchParams({});
    setLocalSearch('');
  };

  const hasFilters = !!(search || minPrice || maxPrice || inStockOnly || searchParams.get('featured') === 'true');

  const pageTitle = activeCategory
    ? activeCategory.name
    : categorySlug === 'new-arrivals' ? t.nav.newArrivals
    : categorySlug === 'featured' ? t.home.featuredProducts
    : search ? `${t.shop.search}: "${search}"`
    : t.shop.allProducts;

  return (
    <>
      <PageSeo
        title={pageTitle}
        description={activeCategory?.description ?? `Browse our collection of ${pageTitle.toLowerCase()} products.`}
      />

      <div className="shop-page">
        {/* ── Page Header ── */}
        <div className="shop-header">
          <div className="container">
            <h1 className="shop-title">{pageTitle}</h1>
            {activeCategory?.description && (
              <p className="shop-subtitle">{activeCategory.description}</p>
            )}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="shop-toolbar">
          <div className="container shop-toolbar-inner">
            <div className="shop-toolbar-left">
              <button
                type="button"
                className={`btn btn-secondary btn-sm shop-filter-btn${showFilters ? ' active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal size={15} />
                {t.shop.filters}
                {hasFilters && <span className="badge badge-primary" style={{ marginLeft: 4 }}>!</span>}
              </button>

              {/* Inline search */}
              <form onSubmit={handleSearchSubmit} className="shop-search-form">
                <div className="input-group">
                  <Search size={15} className="input-icon-left" />
                  <input
                    type="search"
                    value={localSearch}
                    onChange={e => setLocalSearch(e.target.value)}
                    placeholder={t.shop.searchProducts}
                    className="input shop-search-input"
                    aria-label={t.shop.searchProducts}
                  />
                  {localSearch && (
                    <button
                      type="button"
                      className="input-icon-right"
                      onClick={() => { setLocalSearch(''); updateParam('q', undefined); }}
                      aria-label={t.shop.clearFilters}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </form>

              <p className="shop-results-count">
                {isLoading ? t.common.loading : `${totalCount} ${t.shop.products}`}
              </p>
            </div>

            <div className="shop-toolbar-right">
              {/* Sort */}
              <div className="shop-sort">
                <label htmlFor="sort-select" className="sr-only">{t.shop.filters}</label>
                <div className="select-wrap">
                  <select
                    id="sort-select"
                    value={sort}
                    onChange={e => updateParam('sort', e.target.value)}
                    className="input select shop-sort-select"
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="select-icon" />
                </div>
              </div>

              {/* View mode */}
              <div className="shop-view-toggle hide-mobile" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`btn btn-ghost btn-icon btn-sm${viewMode === 'grid' ? ' active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-icon btn-sm${viewMode === 'list' ? ' active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container shop-layout">
          {/* ── Mobile Backdrop Overlay ── */}
          {showFilters && (
            <div
              className="shop-filters-backdrop"
              onClick={() => setShowFilters(false)}
              aria-hidden="true"
            />
          )}

          {/* ── Sidebar Filters ── */}
          <aside className={`shop-filters-sidebar${showFilters ? ' mobile-open' : ''}`} aria-label={t.shop.filters}>
            <div
              className="filter-sidebar-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
                position: 'sticky',
                top: 0,
                background: '#ffffff',
                zIndex: 5,
              }}
            >
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <SlidersHorizontal size={16} color="var(--color-primary)" />
                <span>{t.shop.filters}</span>
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {hasFilters && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={clearAllFilters}>
                    {t.shop.clearFilters}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm hide-desktop"
                  onClick={() => setShowFilters(false)}
                  aria-label={t.nav.close || 'Close filters'}
                  style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="filter-section">
              <h3 className="filter-title">{t.shop.category}</h3>
              <div className="filter-options">
                <Link
                  to="/shop"
                  onClick={() => setShowFilters(false)}
                  className="checkbox-label"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: !categorySlug ? 600 : 400,
                    color: !categorySlug ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    background: !categorySlug ? 'var(--indigo-50)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  {t.shop.allProducts}
                </Link>
                {categories.map(cat => {
                  const isActiveCat = categorySlug === cat.slug;
                  return (
                    <Link
                      key={cat.id}
                      to={`/shop/category/${cat.slug}`}
                      onClick={() => setShowFilters(false)}
                      className="checkbox-label"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: isActiveCat ? 600 : 400,
                        color: isActiveCat ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        background: isActiveCat ? 'var(--indigo-50)' : 'transparent',
                        textDecoration: 'none',
                      }}
                    >
                      {cat.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Price Range */}
            <div className="filter-section">
              <h3 className="filter-title">{t.shop.priceRange}</h3>
              <div className="filter-price-row">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice ?? ''}
                  onChange={e => updateParam('minPrice', e.target.value || undefined)}
                  className="input"
                  min={0}
                  aria-label="Min price"
                />
                <span>—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice ?? ''}
                  onChange={e => updateParam('maxPrice', e.target.value || undefined)}
                  className="input"
                  min={0}
                  aria-label="Max price"
                />
              </div>
            </div>

            {/* Status checkboxes */}
            <div className="filter-section">
              <h3 className="filter-title">{t.shop.inStockOnly}</h3>
              <div className="filter-options">
                <label className="checkbox-label" style={{ cursor: 'pointer', padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={e => updateParam('inStock', e.target.checked ? 'true' : undefined)}
                  />
                  <span>{t.shop.inStockOnly}</span>
                </label>
                <label className="checkbox-label" style={{ cursor: 'pointer', padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    checked={featuredOnly}
                    onChange={e => updateParam('featured', e.target.checked ? 'true' : undefined)}
                  />
                  <span>{t.nav.featured}</span>
                </label>
              </div>
            </div>

            {/* Mobile Apply Button */}
            <div className="hide-desktop" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={() => setShowFilters(false)}
              >
                {t.common.confirm} ({totalCount})
              </button>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <div className="shop-content">
            {/* Active filter tags */}
            {hasFilters && (
              <div className="shop-active-filters">
                {search && (
                  <button type="button" className="shop-active-filter" onClick={() => { setLocalSearch(''); updateParam('q', undefined); }}>
                    {t.shop.search}: "{search}" <X size={12} />
                  </button>
                )}
                {minPrice && (
                  <button type="button" className="shop-active-filter" onClick={() => updateParam('minPrice', undefined)}>
                    Min: {minPrice} <X size={12} />
                  </button>
                )}
                {maxPrice && (
                  <button type="button" className="shop-active-filter" onClick={() => updateParam('maxPrice', undefined)}>
                    Max: {maxPrice} <X size={12} />
                  </button>
                )}
                {inStockOnly && (
                  <button type="button" className="shop-active-filter" onClick={() => updateParam('inStock', undefined)}>
                    {t.shop.inStockOnly} <X size={12} />
                  </button>
                )}
                {searchParams.get('featured') === 'true' && (
                  <button type="button" className="shop-active-filter" onClick={() => updateParam('featured', undefined)}>
                    {t.nav.featured} <X size={12} />
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearAllFilters}>{t.shop.clearFilters}</button>
              </div>
            )}

            {/* Grid */}
            {isLoading ? (
              <div className="products-grid">
                {Array.from({ length: ITEMS_PER_PAGE }, (_, i) => (
                  <div key={i} className="product-card">
                    <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--radius-xl)' }} />
                    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="skeleton" style={{ height: 14, width: '50%' }} />
                      <div className="skeleton" style={{ height: 18, width: '80%' }} />
                      <div className="skeleton" style={{ height: 22, width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={Search}
                title={t.shop.noProducts}
                description={hasFilters ? t.shop.noProductsDesc : t.shop.noProductsDesc}
                action={
                  hasFilters ? (
                    <button type="button" className="btn btn-primary" onClick={clearAllFilters}>
                      {t.shop.clearFilters}
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className={viewMode === 'grid' ? 'products-grid' : 'products-list'}>
                  {products.map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div style={{ marginTop: 'var(--space-10)' }}>
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onPageChange={p => updateParam('page', String(p))}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
