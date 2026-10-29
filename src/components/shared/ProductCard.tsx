import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingCart,
  Eye,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Images,
  Check,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useT } from '@/contexts/LanguageContext';
import { StarRating } from '@/components/shared/StarRating';
import { QuickViewModal } from '@/components/shared/QuickViewModal';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { supabase } from '@/lib/supabase';
import { formatCurrency, calculateDiscount, getEffectivePrice, getStockStatus } from '@/utils/formatters';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  wishlistedIds?: string[];
  onWishlistToggle?: (productId: string, added: boolean) => void;
}

const PLACEHOLDER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f1f5f9"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#94a3b8" font-size="14" font-family="system-ui">No image</text></svg>'
  );

export function ProductCard({ product, wishlistedIds = [], onWishlistToggle }: ProductCardProps) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();
  const { t } = useT();

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isTogglingWish, setIsTogglingWish] = useState(false);
  const [optimisticWish, setOptimisticWish] = useState<boolean | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isWishlisted = optimisticWish !== null ? optimisticWish : wishlistedIds.includes(product.id);

  const sortedImages = useMemo(() => {
    if (!product.images || product.images.length === 0) {
      return [
        {
          id: `placeholder-${product.id}`,
          url: PLACEHOLDER,
          alt_text: product.name,
          is_primary: true,
          sort_order: 0,
        },
      ];
    }
    return [...product.images].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }, [product.images, product.id, product.name]);

  const currentImage = sortedImages[activeImageIndex] ?? sortedImages[0];
  const effectivePrice = getEffectivePrice(product);
  const discount = calculateDiscount(product.base_price, product.sale_price);
  const availableStock = product.inventory?.quantity_available ?? 25;
  const lowStockThreshold = product.inventory?.low_stock_threshold ?? 5;
  const stockStatus = getStockStatus(availableStock, lowStockThreshold);
  const inStock = stockStatus !== 'out_of_stock' && availableStock > 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || isAddingToCart) return;
    setIsAddingToCart(true);
    try {
      await addItem(product.id, 1);
      setJustAdded(true);
      success(t.product.added, product.name);
      setTimeout(() => setJustAdded(false), 1800);
    } catch {
      // CartContext already surfaces a toast
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      info(t.auth.signInContinue, t.product.wishlist);
      return;
    }
    if (isTogglingWish) return;
    setIsTogglingWish(true);
    const nextState = !isWishlisted;
    setOptimisticWish(nextState);
    try {
      if (nextState) {
        const { error } = await supabase
          .from('wishlists')
          .insert({ user_id: user.id, product_id: product.id });
        if (error) throw error;
        success(t.product.wishlist, product.name);
      } else {
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);
        if (error) throw error;
      }
      onWishlistToggle?.(product.id, nextState);
    } catch {
      setOptimisticWish(!nextState);
      toastError('Could not update wishlist');
    } finally {
      setIsTogglingWish(false);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleOpenFullscreen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLightboxOpen(true);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % sortedImages.length);
  };

  return (
    <>
      <article className="product-card">
        <div className="product-card-media-wrapper">
          <Link
            to={`/product/${product.slug}`}
            className="product-card-image-link"
            aria-label={product.name}
          >
            <div className="product-card-image">
              <img
                src={currentImage?.url ?? PLACEHOLDER}
                alt={currentImage?.alt_text ?? product.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== PLACEHOLDER) {
                    target.src = PLACEHOLDER;
                  }
                }}
              />

              {/* Badges (Single clean status/discount indicator) */}
              <div className="product-card-badges">
                {!inStock ? (
                  <span className="badge badge-neutral">{t.product.outOfStock}</span>
                ) : discount > 0 ? (
                  <span className="badge badge-danger">-{discount}%</span>
                ) : stockStatus === 'low_stock' ? (
                  <span className="badge badge-warning">
                    {t.product.onlyLeft.replace('{count}', String(availableStock))}
                  </span>
                ) : product.is_featured ? (
                  <span className="badge badge-primary">{t.product.featured}</span>
                ) : null}
              </div>

              {/* Multi-photo counter pill — clicking opens full screen */}
              {sortedImages.length > 1 && (
                <button
                  type="button"
                  className="product-card-photo-count"
                  onClick={handleOpenFullscreen}
                  title="Click to view all photos in full screen"
                  aria-label={`View ${sortedImages.length} photos in full screen`}
                >
                  <Images size={11} />
                  <span>
                    {activeImageIndex + 1}/{sortedImages.length}
                  </span>
                </button>
              )}

              {/* Prev / Next arrows on image when multiple photos exist */}
              {sortedImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="product-card-img-nav product-card-img-nav-prev"
                    onClick={handlePrevImage}
                    aria-label="Previous product photo"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    className="product-card-img-nav product-card-img-nav-next"
                    onClick={handleNextImage}
                    aria-label="Next product photo"
                  >
                    <ChevronRight size={15} />
                  </button>
                </>
              )}

              {/* Top-Right Action Icons: Wishlist, Full Screen, Quick View */}
              <div className="product-card-top-actions">
                <button
                  type="button"
                  className={`product-card-icon-btn product-card-wishlist${
                    isWishlisted ? ' active' : ''
                  }`}
                  onClick={handleWishlist}
                  aria-label={t.product.wishlist}
                  title={t.product.wishlist}
                >
                  <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
                </button>

                <button
                  type="button"
                  className="product-card-icon-btn product-card-fullscreen-btn"
                  onClick={handleOpenFullscreen}
                  aria-label="View full screen image"
                  title="View full screen"
                >
                  <Maximize2 size={14} />
                </button>

                <button
                  type="button"
                  className="product-card-icon-btn product-card-quickview-btn"
                  onClick={handleQuickView}
                  aria-label={t.product.quickView || 'Quick View'}
                  title={t.product.quickView || 'Quick View'}
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          </Link>

          {/* Arranged Multi-Image Thumbnail Strip */}
          {sortedImages.length > 1 && (
            <div
              className="product-card-thumbs-bar"
              role="tablist"
              aria-label={`${product.name} image gallery`}
            >
              {sortedImages.slice(0, 4).map((img, idx) => {
                const isCurrent = idx === activeImageIndex;
                const extraCount = idx === 3 && sortedImages.length > 4 ? sortedImages.length - 4 : 0;
                return (
                  <button
                    key={img.id || idx}
                    type="button"
                    role="tab"
                    aria-selected={isCurrent}
                    className={`product-card-thumb-item${isCurrent ? ' active' : ''}`}
                    onMouseEnter={() => setActiveImageIndex(idx)}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (extraCount > 0) {
                        setActiveImageIndex(idx);
                        setIsLightboxOpen(true);
                      } else {
                        setActiveImageIndex(idx);
                      }
                    }}
                    title={`Photo ${idx + 1} of ${sortedImages.length}`}
                    aria-label={`Preview photo ${idx + 1}`}
                  >
                    <img
                      src={img.url || PLACEHOLDER}
                      alt={img.alt_text || `${product.name} view ${idx + 1}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== PLACEHOLDER) {
                          target.src = PLACEHOLDER;
                        }
                      }}
                    />
                    {extraCount > 0 && (
                      <span className="product-card-thumb-more">+{extraCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Card Body ── */}
        <div className="product-card-body">
          <div className="product-card-meta-row">
            {product.category && (
              <span className="product-card-category">{product.category.name}</span>
            )}
            {product.brand?.name && (
              <span className="product-card-brand">{product.brand.name}</span>
            )}
          </div>

          <Link to={`/product/${product.slug}`} className="product-card-title-link">
            <h3 className="product-card-name" title={product.name}>
              {product.name}
            </h3>
          </Link>

          <div className="product-card-rating">
            <StarRating rating={product.average_rating ?? 4.9} size={12} />
            <span className="product-card-review-count">
              ({product.review_count ?? 12})
            </span>
            <span className={`product-card-stock-dot-wrap ${inStock ? 'in' : 'out'}`}>
              <span className="product-card-stock-dot" />
              {inStock ? t.product.inStock : t.product.outOfStock}
            </span>
          </div>

          <div className="product-card-price-footer">
            <div className="product-card-price">
              <span className="product-price-current">
                {formatCurrency(effectivePrice, product.currency)}
              </span>
              {discount > 0 && (
                <span className="product-price-original">
                  {formatCurrency(product.base_price, product.currency)}
                </span>
              )}
            </div>

            <div className="product-card-cta-row">
              <button
                type="button"
                className="btn btn-sm product-card-quickview-cta"
                onClick={handleQuickView}
                title={t.product.quickView || 'Quick View'}
              >
                <Eye size={13} />
                <span>{t.product.quickView || 'Quick View'}</span>
              </button>
              <button
                type="button"
                className={`btn btn-primary btn-sm product-card-add-cta${
                  justAdded ? ' is-added' : ''
                }`}
                onClick={handleAddToCart}
                disabled={!inStock || isAddingToCart}
              >
                {justAdded ? (
                  <>
                    <Check size={13} />
                    <span>{t.product.added}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={13} />
                    <span>
                      {!inStock
                        ? t.product.outOfStock
                        : isAddingToCart
                        ? '…'
                        : t.product.addToCart}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </article>

      <QuickViewModal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        product={product}
      />

      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={sortedImages}
        initialIndex={activeImageIndex}
        productName={product.name}
        productCategory={product.category?.name}
      />
    </>
  );
}
