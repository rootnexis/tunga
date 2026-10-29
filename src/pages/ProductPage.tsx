import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  Minus,
  Plus,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Images,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { StarRating } from '@/components/shared/StarRating';
import { Spinner } from '@/components/shared/Spinner';
import { ProductCard } from '@/components/shared/ProductCard';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import {
  formatCurrency,
  calculateDiscount,
  getEffectivePrice,
  getStockStatus,
  formatDate,
} from '@/utils/formatters';
import type { Product, ProductVariant, Review } from '@/types';

const PLACEHOLDER_IMG =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#f1f5f9"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#94a3b8" font-size="18" font-family="system-ui">No image available</text></svg>'
  );

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();
  const { t } = useT();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setSelectedImageIdx(0);
    setSelectedVariant(null);
    setQty(1);
    setIsLightboxOpen(false);

    (async () => {
      const { data: prod, error } = await supabase
        .from('products')
        .select(
          `
          *,
          category:categories(id, name, slug),
          brand:brands(id, name, slug),
          images:product_images(id, url, alt_text, is_primary, sort_order),
          variants:product_variants(*),
          inventory(quantity_available, low_stock_threshold)
        `
        )
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error || !prod) {
        setIsLoading(false);
        return;
      }

      const raw = prod as unknown as Product & { inventory: Product['inventory'][] };
      const normalized: Product = {
        ...raw,
        inventory: Array.isArray(raw.inventory) ? raw.inventory[0] : raw.inventory,
        images: (raw.images ?? []).sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        }),
      };
      setProduct(normalized);

      // Load reviews + related in parallel
      const [revRes, relRes] = await Promise.all([
        supabase
          .from('reviews')
          .select('*, profile:profiles(first_name, last_name, avatar_url)')
          .eq('product_id', normalized.id)
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(20),
        normalized.category_id
          ? supabase
              .from('products')
              .select(
                `id, name, slug, base_price, sale_price, currency, is_featured, is_active,
                 category:categories(id, name, slug),
                 brand:brands(id, name, slug),
                 images:product_images(id, url, alt_text, is_primary, sort_order),
                 inventory(quantity_available, low_stock_threshold)`
              )
              .eq('category_id', normalized.category_id)
              .eq('is_active', true)
              .neq('id', normalized.id)
              .limit(4)
          : Promise.resolve({ data: [] }),
      ]);

      setReviews((revRes.data as unknown as Review[]) ?? []);
      const relRaw = (relRes.data ?? []) as unknown as Array<
        Product & { inventory: Product['inventory'][] }
      >;
      setRelatedProducts(
        relRaw.map((p) => ({
          ...p,
          inventory: Array.isArray(p.inventory) ? p.inventory[0] : p.inventory,
        }))
      );

      // Check wishlist
      if (user) {
        const { data: wl } = await supabase
          .from('wishlists')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', normalized.id)
          .maybeSingle();
        setIsWishlisted(!!wl);
      }

      setIsLoading(false);
    })();
  }, [slug, user]);

  if (isLoading) return <Spinner fullPage label="Loading product…" />;

  if (!product) {
    return (
      <div className="not-found-page">
        <div className="not-found-code">404</div>
        <h1 className="not-found-title">Product Not Found</h1>
        <p className="not-found-desc">The product you are looking for may have been moved or removed.</p>
        <Link to="/shop" className="btn btn-primary">
          {t.nav.shop}
        </Link>
      </div>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [
          {
            id: 'placeholder',
            product_id: product.id,
            variant_id: null,
            storage_path: '',
            url: PLACEHOLDER_IMG,
            alt_text: product.name,
            sort_order: 0,
            is_primary: true,
            created_at: '',
          },
        ];
  const currentImg = images[selectedImageIdx] ?? images[0];
  const effectivePrice = getEffectivePrice(product) + (selectedVariant?.price_modifier ?? 0);
  const discount = calculateDiscount(product.base_price, product.sale_price);
  const availableStock = product.inventory?.quantity_available ?? 25;
  const lowThreshold = product.inventory?.low_stock_threshold ?? 5;
  const stockStatus = getStockStatus(availableStock, lowThreshold);
  const inStock = stockStatus !== 'out_of_stock' && availableStock > 0;

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : product.average_rating ?? 4.9;

  const handleAddToCart = async () => {
    if (!inStock || isAddingToCart) return;
    setIsAddingToCart(true);
    try {
      await addItem(product.id, qty, selectedVariant?.id ?? null);
      setAddedToCart(true);
      success(t.product.added, `${qty}× ${product.name}`);
      setTimeout(() => setAddedToCart(false), 2500);
    } catch {
      // handled in CartContext
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) {
      info(t.auth.signInContinue, t.product.wishlist);
      navigate('/login');
      return;
    }
    const next = !isWishlisted;
    setIsWishlisted(next);
    if (next) {
      await supabase.from('wishlists').insert({ user_id: user.id, product_id: product.id });
      success(t.product.wishlist, product.name);
    } else {
      await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', product.id);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setIsSubmittingReview(true);
    const { error } = await supabase.from('reviews').insert({
      product_id: product.id,
      user_id: user.id,
      rating: reviewRating,
      title: reviewTitle.trim() || null,
      body: reviewBody.trim() || null,
      is_verified_purchase: false,
      is_approved: false,
    });
    setIsSubmittingReview(false);
    if (error) {
      toastError('Error', error.message);
    } else {
      success('Review submitted', 'Thank you for your feedback!');
      setReviewTitle('');
      setReviewBody('');
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIdx((prev) => (prev + 1) % images.length);
  };

  return (
    <>
      <PageSeo
        title={product.name}
        description={product.short_description ?? product.description ?? undefined}
      />

      <div className="container product-page">
        {/* Breadcrumb */}
        <nav className="breadcrumb" style={{ marginBottom: 'var(--space-8)' }}>
          <Link to="/">{t.common.home}</Link>
          <ChevronRight size={14} className="breadcrumb-separator" />
          <Link to="/shop">{t.nav.shop}</Link>
          {product.category && (
            <>
              <ChevronRight size={14} className="breadcrumb-separator" />
              <Link to={`/shop?category=${product.category.slug}`}>
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight size={14} className="breadcrumb-separator" />
          <span className="breadcrumb-current">{product.name}</span>
        </nav>

        {/* Main product layout */}
        <div className="product-layout">
          {/* ── Gallery with Full-Screen Viewer & Arranged Multi-Image Grid ── */}
          <div className="product-gallery">
            <div
              className="product-gallery-main"
              onClick={() => setIsLightboxOpen(true)}
              title="Click to view image in full screen"
            >
              <img
                src={currentImg?.url || PLACEHOLDER_IMG}
                alt={currentImg?.alt_text ?? product.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== PLACEHOLDER_IMG) {
                    target.src = PLACEHOLDER_IMG;
                  }
                }}
              />

              {/* Full Screen Trigger Button */}
              <button
                type="button"
                className="product-gallery-fullscreen-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                aria-label="View image in full screen"
                title="View full screen"
              >
                <Maximize2 size={16} />
                <span>Full Screen</span>
              </button>

              {/* Image Counter Badge */}
              <div className="product-gallery-counter">
                <Images size={13} />
                <span>
                  {selectedImageIdx + 1} / {images.length}
                </span>
              </div>

              {/* Prev / Next Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="product-gallery-nav product-gallery-nav-prev"
                    onClick={handlePrevImage}
                    aria-label="Previous product image"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    className="product-gallery-nav product-gallery-nav-next"
                    onClick={handleNextImage}
                    aria-label="Next product image"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Well-Arranged Multi-Image Thumbnail Strip / Grid */}
            {images.length > 1 && (
              <div className="product-gallery-thumbs-section">
                <div className="product-gallery-thumbs-header">
                  <span className="product-gallery-thumbs-title">
                    Product Angles ({images.length} Photos)
                  </span>
                  <button
                    type="button"
                    className="product-gallery-viewall-btn"
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <Maximize2 size={12} />
                    <span>View All in Full Screen</span>
                  </button>
                </div>

                <div className="product-gallery-thumbs-grid">
                  {images.map((img, i) => (
                    <button
                      key={img.id || i}
                      type="button"
                      className={`product-thumb${i === selectedImageIdx ? ' active' : ''}`}
                      onClick={() => setSelectedImageIdx(i)}
                      onMouseEnter={() => setSelectedImageIdx(i)}
                      aria-label={`Select angle ${i + 1}`}
                    >
                      <img
                        src={img.url || PLACEHOLDER_IMG}
                        alt={img.alt_text ?? `${product.name} angle ${i + 1}`}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== PLACEHOLDER_IMG) {
                            target.src = PLACEHOLDER_IMG;
                          }
                        }}
                      />
                      <span className="product-thumb-num">{i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="product-info">
            {product.brand && (
              <p className="product-info-brand">{product.brand.name}</p>
            )}
            <h1 className="product-info-name">{product.name}</h1>

            {/* Rating */}
            {avgRating !== undefined && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <StarRating rating={avgRating} showValue count={reviews.length || product.review_count || 12} />
                <button
                  type="button"
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveTab('reviews')}
                >
                  {reviews.length || product.review_count || 12} {t.product.reviews}
                </button>
              </div>
            )}

            {/* Price */}
            <div className="product-info-price">
              <span className="product-info-price-current">
                {formatCurrency(effectivePrice, product.currency)}
              </span>
              {discount > 0 && (
                <>
                  <span className="product-info-price-original">
                    {formatCurrency(product.base_price, product.currency)}
                  </span>
                  <span className="badge badge-danger">
                    {t.product.saveDiscount.replace('{percent}', String(discount))}
                  </span>
                </>
              )}
            </div>

            {/* Stock badge */}
            <div className={`product-stock-badge ${stockStatus.replace('_', '-')}`}>
              <span className="product-stock-dot" />
              {stockStatus === 'in_stock'
                ? t.product.inStock
                : stockStatus === 'low_stock'
                ? t.product.onlyLeft.replace('{count}', String(availableStock))
                : t.product.outOfStock}
            </div>

            {/* Short description */}
            {product.short_description && (
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  lineHeight: 'var(--leading-relaxed)',
                  marginBottom: 'var(--space-6)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {product.short_description}
              </p>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="product-variant-group">
                <p className="product-variant-label">
                  Option:{' '}
                  <span style={{ fontWeight: 'var(--font-normal)' }}>
                    {selectedVariant?.name ?? 'Select an option'}
                  </span>
                </p>
                <div className="product-variant-options">
                  {product.variants
                    .filter((v) => v.is_active)
                    .map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={`product-variant-btn${
                          selectedVariant?.id === v.id ? ' active' : ''
                        }`}
                        onClick={() =>
                          setSelectedVariant(selectedVariant?.id === v.id ? null : v)
                        }
                      >
                        {v.name}
                        {v.price_modifier !== 0 && (
                          <span style={{ marginLeft: 4, opacity: 0.75 }}>
                            ({v.price_modifier > 0 ? '+' : ''}
                            {formatCurrency(v.price_modifier, product.currency)})
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Quantity + Actions */}
            {inStock && (
              <div className="product-qty-row">
                <div className="product-qty-control">
                  <button
                    type="button"
                    className="product-qty-btn"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="product-qty-value">{qty}</span>
                  <button
                    type="button"
                    className="product-qty-btn"
                    onClick={() => setQty((q) => Math.min(availableStock, q + 1))}
                    disabled={qty >= availableStock}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  {availableStock} {t.product.available}
                </span>
              </div>
            )}

            <div className="product-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleAddToCart}
                disabled={!inStock || isAddingToCart}
              >
                {addedToCart ? (
                  <>
                    <Check size={18} /> {t.product.added}
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />{' '}
                    {isAddingToCart ? t.product.addingToCart : t.product.addToCart}
                  </>
                )}
              </button>
              <button
                type="button"
                className={`btn btn-secondary btn-lg btn-icon${
                  isWishlisted ? ' active' : ''
                }`}
                onClick={handleWishlist}
                title={t.product.wishlist}
                style={{
                  flex: '0 0 auto',
                  minWidth: 'unset',
                  color: isWishlisted ? 'var(--red-500)' : undefined,
                }}
              >
                <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-lg btn-icon"
                style={{ flex: '0 0 auto', minWidth: 'unset' }}
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  success('Link copied', 'Product link copied to clipboard');
                }}
                title={t.product.share}
              >
                <Share2 size={18} />
              </button>
            </div>

            {/* Trust badges */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2-5)',
                padding: 'var(--space-4)',
                background: 'var(--slate-50)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border)',
              }}
            >
              {[
                { icon: Truck, text: `${t.home.freeShipping} — ${t.home.freeShippingDesc}` },
                { icon: RotateCcw, text: t.home.returnsDesc },
                { icon: ShieldCheck, text: t.home.securePayments },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2-5)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <Icon
                    size={15}
                    style={{ color: 'var(--color-primary)', flexShrink: 0 }}
                  />
                  {text}
                </div>
              ))}
            </div>

            {/* SKU & tags */}
            <div
              style={{
                marginTop: 'var(--space-4)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-tertiary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
              }}
            >
              <span>
                {t.product.sku}: {product.sku}
              </span>
              {product.tags?.length > 0 && (
                <span>
                  Tags: {product.tags.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs: Description / Specs / Reviews ── */}
        <div>
          <div className="product-tabs">
            {(
              [
                ['description', t.product.description],
                ['specs', t.product.specifications],
                ['reviews', `${t.product.reviews} (${reviews.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`product-tab${activeTab === key ? ' active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'description' && (
            <div style={{ maxWidth: 720, lineHeight: 'var(--leading-relaxed)', color: 'var(--color-text-secondary)' }}>
              {product.description ? (
                <p style={{ whiteSpace: 'pre-line' }}>{product.description}</p>
              ) : (
                <p style={{ color: 'var(--color-text-tertiary)' }}>No detailed description provided.</p>
              )}
            </div>
          )}

          {activeTab === 'specs' && (
            <div style={{ maxWidth: 560 }}>
              {Object.keys(product.specifications ?? {}).length === 0 && !product.weight_kg ? (
                <p style={{ color: 'var(--color-text-tertiary)' }}>No technical specifications listed.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <tbody>
                      {product.weight_kg && (
                        <tr>
                          <td style={{ fontWeight: 'var(--font-medium)', width: '40%' }}>Weight</td>
                          <td>{product.weight_kg} kg</td>
                        </tr>
                      )}
                      {product.dimensions_cm && (
                        <tr>
                          <td style={{ fontWeight: 'var(--font-medium)' }}>Dimensions</td>
                          <td>
                            {product.dimensions_cm.l} × {product.dimensions_cm.w} × {product.dimensions_cm.h} cm
                          </td>
                        </tr>
                      )}
                      {Object.entries(product.specifications ?? {}).map(([k, v]) => (
                        <tr key={k}>
                          <td style={{ fontWeight: 'var(--font-medium)' }}>{k}</td>
                          <td>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div style={{ maxWidth: 720 }}>
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-8)' }}>
                  No customer reviews yet. Be the first to share your thoughts!
                </p>
              ) : (
                <div style={{ marginBottom: 'var(--space-10)' }}>
                  {reviews.map((rev) => (
                    <div key={rev.id} className="review-card">
                      <div className="review-header">
                        <div>
                          <span className="review-author">
                            {rev.profile
                              ? `${rev.profile.first_name ?? ''} ${rev.profile.last_name ?? ''}`.trim() ||
                                'Customer'
                              : 'Customer'}
                          </span>
                          {rev.is_verified_purchase && (
                            <span className="badge badge-success badge-sm" style={{ marginLeft: 'var(--space-2)' }}>
                              Verified
                            </span>
                          )}
                          <div style={{ marginTop: 'var(--space-1)' }}>
                            <StarRating rating={rev.rating} size={13} />
                          </div>
                        </div>
                        <span className="review-date">{formatDate(rev.created_at)}</span>
                      </div>
                      {rev.title && <p className="review-title">{rev.title}</p>}
                      {rev.body && <p className="review-body">{rev.body}</p>}
                      {rev.admin_response && (
                        <div
                          style={{
                            marginTop: 'var(--space-3)',
                            padding: 'var(--space-3)',
                            background: 'var(--slate-50)',
                            borderRadius: 'var(--radius-lg)',
                            borderLeft: '3px solid var(--color-primary)',
                            fontSize: 'var(--text-xs)',
                          }}
                        >
                          <strong>Store Response:</strong> {rev.admin_response}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Write a review */}
              <div className="card">
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-5)' }}>
                  Write a Review
                </h3>
                {!user ? (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-medium)' }}>
                      {t.nav.signIn}
                    </Link>{' '}
                    to leave a review for this product.
                  </p>
                ) : (
                  <form
                    onSubmit={handleSubmitReview}
                    style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
                  >
                    <div className="form-group">
                      <label className="form-label">Your Rating</label>
                      <StarRating rating={reviewRating} size={24} interactive onRate={setReviewRating} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Review Title</label>
                      <input
                        className="input"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        placeholder="Summarize your experience"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Review</label>
                      <textarea
                        className="input"
                        rows={4}
                        value={reviewBody}
                        onChange={(e) => setReviewBody(e.target.value)}
                        placeholder="What did you like or dislike about this product?"
                      />
                    </div>
                    <div>
                      <button type="submit" className="btn btn-primary" disabled={isSubmittingReview}>
                        {isSubmittingReview ? 'Submitting…' : 'Submit Review'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Related products (4 per row) ── */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: 'var(--space-16)' }}>
            <h2 className="section-title" style={{ marginBottom: 'var(--space-8)' }}>
              {t.product.relatedProducts}
            </h2>
            <div className="products-grid">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full Screen Image Lightbox */}
      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={images}
        initialIndex={selectedImageIdx}
        productName={product.name}
        productCategory={product.category?.name}
      />
    </>
  );
}
