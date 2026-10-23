import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Check, Eye } from 'lucide-react';
import { StarRating } from './StarRating';
import { QuickViewModal } from './QuickViewModal';
import { useCart } from '@/contexts/CartContext';
import { useT } from '@/contexts/LanguageContext';
import { formatCurrency, calculateDiscount, getEffectivePrice } from '@/utils/formatters';
import type { Product } from '@/types';

interface Props {
  product: Product;
  onWishlist?: (product: Product) => void;
  isWishlisted?: boolean;
}

const PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f1f5f9"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#94a3b8" font-size="14" font-family="system-ui">No image</text></svg>');

export function ProductCard({ product, onWishlist, isWishlisted = false }: Props) {
  const { addItem } = useCart();
  const { t } = useT();
  const navigate = useNavigate();
  const [justAdded, setJustAdded] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const primaryImage = product.images?.find(img => img.is_primary) ?? product.images?.[0];
  const effectivePrice = getEffectivePrice(product);
  const discount = calculateDiscount(product.base_price, product.sale_price);
  const inStock = (product.inventory?.quantity_available ?? 0) > 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // If the click happened on a button or action element, do not navigate
    const el = e.target as HTMLElement;
    if (
      el.closest('button') ||
      el.closest('.product-card-actions') ||
      el.closest('.product-card-wishlist') ||
      el.closest('.product-card-quickview-btn') ||
      el.closest('.quickview-backdrop') ||
      el.closest('.quickview-dialog')
    ) {
      return;
    }
    navigate(`/product/${product.slug}`);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    try {
      await addItem(product.id, 1, null);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1400);
    } catch {
      // handled in context
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlist?.(product);
  };

  return (
    <div
      className="product-card"
      onClick={handleCardClick}
      role="group"
      aria-label={product.name}
      style={{ cursor: 'pointer' }}
    >
      {/* Image & Badges */}
      <div className="product-card-image">
        <img
          src={primaryImage?.url ?? PLACEHOLDER}
          alt={primaryImage?.alt_text ?? product.name}
          loading="lazy"
        />

        {/* Badges */}
        <div className="product-card-badges">
          {product.is_featured && (
            <span className="badge badge-primary">{t.product.featured}</span>
          )}
          {discount > 0 && (
            <span className="badge badge-danger">-{discount}%</span>
          )}
          {!inStock && (
            <span className="badge badge-neutral">{t.product.outOfStock}</span>
          )}
        </div>

        {/* Top-right floating actions (Wishlist + Quick View) */}
        <div className="product-card-top-actions">
          {onWishlist && (
            <button
              type="button"
              data-no-route-loader="true"
              className={`product-card-icon-btn product-card-wishlist${isWishlisted ? ' active' : ''}`}
              onClick={handleWishlist}
              aria-label={isWishlisted ? t.product.wishlist : t.product.wishlist}
              title={t.product.wishlist}
            >
              <Heart size={14} fill={isWishlisted ? 'currentColor' : 'transparent'} />
            </button>
          )}

          <button
            type="button"
            data-no-route-loader="true"
            className="product-card-icon-btn product-card-quickview-btn"
            onClick={handleQuickView}
            aria-label={`${t.product.quickView || 'Quick View'}: ${product.name}`}
            title={t.product.quickView || 'Quick View'}
          >
            <Eye size={14} />
          </button>
        </div>

        {/* Action overlay (Quick View + Add to Cart) */}
        <div className="product-card-actions" data-no-route-loader="true">
          <button
            type="button"
            data-no-route-loader="true"
            className="btn btn-secondary btn-sm product-card-quickview-action-btn"
            onClick={handleQuickView}
            aria-label={`${t.product.quickView || 'Quick View'}: ${product.name}`}
            title={t.product.quickView || 'Quick View'}
          >
            <Eye size={13} />
            <span>{t.product.quickView || 'Quick View'}</span>
          </button>

          {inStock && (
            <button
              type="button"
              data-no-route-loader="true"
              className={`btn btn-primary btn-sm product-card-cart-action-btn${justAdded ? ' btn-success' : ''}`}
              onClick={handleAddToCart}
              aria-label={`${t.product.addToCart}: ${product.name}`}
              style={justAdded ? { background: '#10b981', borderColor: '#10b981', color: '#fff' } : undefined}
            >
              {justAdded ? (
                <>
                  <Check size={14} />
                  <span>{t.product.added}</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={14} />
                  <span>{t.product.addToCart}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="product-card-body">
        {product.category && (
          <p className="product-card-category">{product.category.name}</p>
        )}
        <h3 className="product-card-name">
          <Link
            to={`/product/${product.slug}`}
            className="product-card-name-link"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            {product.name}
          </Link>
        </h3>

        {(product.average_rating !== undefined && product.average_rating > 0) && (
          <div className="product-card-rating">
            <StarRating rating={product.average_rating} size={12} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              ({product.review_count ?? 0})
            </span>
          </div>
        )}

        <div className="product-card-price">
          <span className="product-price-current">
            {formatCurrency(effectivePrice, product.currency)}
          </span>
          {discount > 0 && (
            <span className="product-price-original">
              {formatCurrency(product.base_price, product.currency)}
            </span>
          )}
          {discount > 0 && (
            <span className="product-price-discount">{t.product.saveDiscount} {discount}%</span>
          )}
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        product={product}
      />
    </div>
  );
}
