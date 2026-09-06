import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Share2, ChevronRight, Minus, Plus, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useT } from '@/contexts/LanguageContext';
import { ProductCard } from '@/components/shared/ProductCard';
import { StarRating } from '@/components/shared/StarRating';
import { Spinner } from '@/components/shared/Spinner';
import { PageSeo } from '@/components/shared/PageSeo';
import { formatCurrency, calculateDiscount, getEffectivePrice, getStockStatus, formatDate } from '@/utils/formatters';
import type { Product, ProductVariant, Review } from '@/types';

export default function ProductPage() {
  const { t } = useT();
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated]   = useState<Product[]>([]);
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      supabase.from('products').select(`
        *,
        images:product_images(*),
        variants:product_variants(*, inventory(*)),
        inventory(*),
        category:categories(id, name, slug),
        brand:brands(id, name)
      `).eq('slug', slug).single(),
      supabase.from('reviews').select(`*, profile:profiles(first_name, last_name)`)
        .eq('product_slug', slug).eq('is_approved', true).order('created_at', { ascending: false }).limit(10),
    ]).then(([{ data: p }, { data: r }]) => {
      if (!p) { navigate('/404'); return; }
      const prod = p as unknown as Product;
      setProduct(prod);
      setReviews((r as Review[]) ?? []);
      // Load related products
      if (prod.category_id) {
        supabase.from('products').select(`
          id, name, slug, base_price, sale_price, currency,
          images:product_images(id, url, alt_text, is_primary, sort_order),
          inventory(quantity_available, low_stock_threshold),
          category:categories(id, name, slug)
        `).eq('category_id', prod.category_id).neq('id', prod.id).eq('is_active', true).limit(4).then(({ data: rel }) => {
          setRelated((rel as unknown as Product[]) ?? []);
        });
      }
      setIsLoading(false);
    });
  }, [slug, navigate]);

  if (isLoading) return <Spinner fullPage />;
  if (!product) return null;

  const images = product.images?.sort((a, b) => a.sort_order - b.sort_order) ?? [];
  const currentImage = images[selectedImage];
  const effectivePrice = getEffectivePrice(product);
  const discount = calculateDiscount(product.base_price, product.sale_price);
  const stockStatus = getStockStatus(product.inventory?.quantity_available ?? 0, product.inventory?.low_stock_threshold ?? 5);
  const inStock = stockStatus !== 'out_of_stock';

  // Group variants by attribute key
  const attributeKeys = product.variants
    ? [...new Set(product.variants.flatMap(v => Object.keys(v.attributes)))]
    : [];

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/auth/login'); return; }
    setAdding(true);
    await addItem(product.id, qty, selectedVariant?.id ?? null);
    setAdding(false);
    success('Added to cart', `${product.name} × ${qty}`);
  };

  const PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#f1f5f9"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#94a3b8" font-size="18" font-family="system-ui">No image</text></svg>');

  return (
    <>
      <PageSeo
        title={product.name}
        description={product.short_description ?? product.description ?? `Buy ${product.name} at Storefront.`}
      />

      <div className="product-page">
        <div className="container">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-6)' }}>
            <Link to="/" style={{ color: 'inherit' }}>{t.common.home}</Link>
            <ChevronRight size={14} />
            <Link to="/shop" style={{ color: 'inherit' }}>{t.nav.shop}</Link>
            {product.category && <>
              <ChevronRight size={14} />
              <Link to={`/shop/category/${product.category.slug}`} style={{ color: 'inherit' }}>{product.category.name}</Link>
            </>}
            <ChevronRight size={14} />
            <span style={{ color: 'var(--color-text-primary)' }}>{product.name}</span>
          </nav>

          <div className="product-layout">
            {/* Gallery */}
            <div className="product-gallery">
              <div className="product-gallery-main">
                <img src={currentImage?.url ?? PLACEHOLDER} alt={currentImage?.alt_text ?? product.name} />
              </div>
              {images.length > 1 && (
                <div className="product-gallery-thumbs">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      className={`product-thumb${i === selectedImage ? ' active' : ''}`}
                      onClick={() => setSelectedImage(i)}
                      aria-label={`Image ${i + 1}`}
                    >
                      <img src={img.url} alt={img.alt_text ?? ''} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="product-info">
              {product.brand && <p className="product-info-brand">{product.brand.name}</p>}
              <h1 className="product-info-name">{product.name}</h1>

              {(product.average_rating !== undefined && product.average_rating > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <StarRating rating={product.average_rating} showValue count={product.review_count} />
                </div>
              )}

              <div className="product-info-price">
                <span className="product-info-price-current">
                  {formatCurrency(effectivePrice, product.currency)}
                </span>
                {discount > 0 && (
                  <>
                    <span className="product-info-price-original">
                      {formatCurrency(product.base_price, product.currency)}
                    </span>
                    <span className="badge badge-danger">-{discount}%</span>
                  </>
                )}
              </div>

              <div className={`product-stock-badge ${stockStatus.replace('_', '-')}`}>
                <div className="product-stock-dot" />
                {stockStatus === 'in_stock' ? 'In Stock' : stockStatus === 'low_stock'
                  ? `Only ${product.inventory?.quantity_available} left`
                  : 'Out of Stock'}
              </div>

              {/* Variants */}
              {attributeKeys.map(key => (
                <div key={key} className="product-variant-group">
                  <p className="product-variant-label">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    {selectedVariant && (
                      <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                        {selectedVariant.attributes[key]}
                      </span>
                    )}
                  </p>
                  <div className="product-variant-options">
                    {product.variants
                      ?.filter(v => key in v.attributes)
                      .map(v => (
                        <button
                          key={v.id}
                          className={`product-variant-btn${selectedVariant?.id === v.id ? ' active' : ''}`}
                          onClick={() => setSelectedVariant(v)}
                        >
                          {v.attributes[key]}
                        </button>
                      ))}
                  </div>
                </div>
              ))}

              {/* Quantity */}
              {inStock && (
                <div className="product-qty-row">
                  <div className="product-qty-control">
                    <button className="product-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease">
                      <Minus size={16} />
                    </button>
                    <span className="product-qty-value">{qty}</span>
                    <button className="product-qty-btn" onClick={() => setQty(q => q + 1)} aria-label="Increase">
                      <Plus size={16} />
                    </button>
                  </div>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                    {product.inventory?.quantity_available} available
                  </span>
                </div>
              )}

              <div className="product-actions">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleAddToCart}
                  disabled={!inStock || adding}
                  style={{ flex: 2 }}
                >
                  {adding ? <Check size={18} /> : <ShoppingCart size={18} />}
                  {!inStock ? 'Out of Stock' : adding ? 'Added!' : 'Add to Cart'}
                </button>
                <button className="btn btn-secondary btn-lg btn-icon" aria-label="Add to wishlist">
                  <Heart size={18} />
                </button>
                <button className="btn btn-secondary btn-lg btn-icon" aria-label="Share" onClick={() => navigator.share?.({ title: product.name, url: location.href })}>
                  <Share2 size={18} />
                </button>
              </div>

              {/* Meta */}
              {product.sku && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>SKU: {product.sku}</p>
              )}
              {product.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
                  {product.tags.map(t => (
                    <Link key={t} to={`/shop?q=${t}`} className="badge badge-neutral">{t}</Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="product-tabs">
            {(['description', 'specs', 'reviews'] as const).map(tab => (
              <button key={tab} className={`product-tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'reviews' && reviews.length > 0 && ` (${reviews.length})`}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 'var(--space-12)' }}>
            {activeTab === 'description' && (
              <div style={{ maxWidth: 720, color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)', fontSize: 'var(--text-base)' }}>
                {product.description ?? <em>No description available.</em>}
              </div>
            )}
            {activeTab === 'specs' && (
              <div style={{ maxWidth: 560 }}>
                {product.specifications ? (
                  <div className="table-wrapper">
                    <table className="table">
                      <tbody>
                        {Object.entries(product.specifications).map(([k, v]) => (
                          <tr key={k}><td style={{ fontWeight: 'var(--font-medium)', width: '40%' }}>{k}</td><td>{v}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p style={{ color: 'var(--color-text-tertiary)' }}>No specifications listed.</p>}
              </div>
            )}
            {activeTab === 'reviews' && (
              <div style={{ maxWidth: 720 }}>
                {reviews.length === 0 ? (
                  <p style={{ color: 'var(--color-text-tertiary)' }}>No reviews yet. Be the first!</p>
                ) : (
                  reviews.map(rev => (
                    <div key={rev.id} className="review-card">
                      <div className="review-header">
                        <div>
                          <StarRating rating={rev.rating} size={13} />
                          <p className="review-author" style={{ marginTop: 4 }}>
                            {rev.profile?.first_name} {rev.profile?.last_name}
                            {rev.is_verified_purchase && <span className="badge badge-success badge-sm" style={{ marginLeft: 8 }}>Verified</span>}
                          </p>
                        </div>
                        <span className="review-date">{formatDate(rev.created_at)}</span>
                      </div>
                      {rev.title && <p className="review-title">{rev.title}</p>}
                      {rev.body  && <p className="review-body">{rev.body}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Related */}
          {related.length > 0 && (
            <section style={{ marginBottom: 'var(--space-8)' }}>
              <h2 className="section-title" style={{ marginBottom: 'var(--space-6)' }}>You might also like</h2>
              <div className="grid-products">
                {related.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
