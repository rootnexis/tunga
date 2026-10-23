import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ShoppingCart, Check, Star, ArrowRight, Minus, Plus, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { useT } from '@/contexts/LanguageContext';
import { StarRating } from '@/components/shared/StarRating';
import { formatCurrency, calculateDiscount, getEffectivePrice, getStockStatus } from '@/utils/formatters';
import type { Product, ProductVariant } from '@/types';

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><rect width="500" height="500" fill="#f1f5f9"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#94a3b8" font-size="16" font-family="system-ui">No image</text></svg>');

export function QuickViewModal({ isOpen, onClose, product }: QuickViewModalProps) {
  const { addItem } = useCart();
  const { success } = useToast();
  const { t } = useT();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Reset state when product changes or modal opens
  useEffect(() => {
    if (isOpen && product) {
      setSelectedImageIndex(0);
      setSelectedVariant(product.variants?.[0] ?? null);
      setQty(1);
      setJustAdded(false);
    }
  }, [isOpen, product]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const images = product.images && product.images.length > 0
    ? [...product.images].sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const currentImage = images[selectedImageIndex] ?? images[0];
  const effectivePrice = getEffectivePrice(product);
  const discount = calculateDiscount(product.base_price, product.sale_price);
  const availableStock = product.inventory?.quantity_available ?? 0;
  const lowStockThreshold = product.inventory?.low_stock_threshold ?? 5;
  const stockStatus = getStockStatus(availableStock, lowStockThreshold);
  const inStock = stockStatus !== 'out_of_stock' && availableStock > 0;

  const handleAddToCart = async () => {
    if (!inStock || isAdding) return;
    setIsAdding(true);
    try {
      await addItem(product.id, qty, selectedVariant?.id ?? null);
      setJustAdded(true);
      success(t.product.added, `${product.name} × ${qty}`);
      setTimeout(() => {
        setJustAdded(false);
      }, 2000);
    } catch {
      // Handled in CartContext toast
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className="quickview-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickview-title"
    >
      <div
        className="quickview-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          className="quickview-close-btn"
          onClick={onClose}
          aria-label={t.nav.close || 'Close'}
        >
          <X size={18} />
        </button>

        <div className="quickview-content-grid">
          {/* ── Left Column: Media Gallery ── */}
          <div className="quickview-gallery">
            <div className="quickview-main-image-wrap">
              <img
                src={currentImage?.url ?? PLACEHOLDER}
                alt={currentImage?.alt_text ?? product.name}
                className="quickview-main-image"
              />
              {discount > 0 && (
                <span className="badge badge-danger quickview-badge-discount">
                  -{discount}%
                </span>
              )}
              {!inStock && (
                <span className="badge badge-neutral quickview-badge-stock">
                  {t.product.outOfStock}
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="quickview-thumbnails-row">
                {images.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    className={`quickview-thumb-btn${selectedImageIndex === idx ? ' active' : ''}`}
                    onClick={() => setSelectedImageIndex(idx)}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img src={img.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right Column: Product Info & Actions ── */}
          <div className="quickview-info-column">
            {/* Category & Brand Header */}
            <div className="quickview-meta-header">
              {product.category?.name && (
                <span className="quickview-category-badge">
                  {product.category.name}
                </span>
              )}
              {product.brand?.name && (
                <span className="quickview-brand-badge">
                  {product.brand.name}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 id="quickview-title" className="quickview-title">
              {product.name}
            </h2>

            {/* Rating & Reviews */}
            <div className="quickview-rating-row">
              <StarRating rating={product.average_rating ?? 5} size={14} />
              <span className="quickview-rating-count">
                {product.average_rating ? Number(product.average_rating).toFixed(1) : '5.0'}
                {' '}({product.review_count ?? 1} {t.product.reviews})
              </span>
              <span className="quickview-stock-indicator">
                {inStock ? (
                  <span className="quickview-in-stock">
                    <span className="quickview-stock-dot" />
                    {stockStatus === 'low_stock'
                      ? (t.product.onlyLeft?.replace('{count}', String(availableStock)) || `${availableStock} left`)
                      : t.product.inStock}
                  </span>
                ) : (
                  <span className="quickview-out-stock">
                    {t.product.outOfStock}
                  </span>
                )}
              </span>
            </div>

            {/* Price Row */}
            <div className="quickview-price-row">
              <span className="quickview-price-current">
                {formatCurrency(effectivePrice, product.currency)}
              </span>
              {discount > 0 && (
                <>
                  <span className="quickview-price-original">
                    {formatCurrency(product.base_price, product.currency)}
                  </span>
                  <span className="badge badge-success badge-sm">
                    {t.product.saveDiscount || 'Save'} {formatCurrency(product.base_price - effectivePrice, product.currency)}
                  </span>
                </>
              )}
            </div>

            {/* Description Excerpt */}
            <p className="quickview-description">
              {product.short_description || product.description || 'Experience premium craftsmanship and luxury everyday styling curated by Ituze.'}
            </p>

            {/* Variant Options (if any) */}
            {product.variants && product.variants.length > 0 && (
              <div className="quickview-variants-section">
                <label className="quickview-section-label">
                  Options: <span className="quickview-variant-selected-name">{selectedVariant?.name}</span>
                </label>
                <div className="quickview-variant-chips">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`quickview-variant-chip${selectedVariant?.id === v.id ? ' active' : ''}`}
                      onClick={() => setSelectedVariant(v)}
                    >
                      <span>{v.name}</span>
                      {v.price_modifier !== 0 && (
                        <span className="quickview-modifier">
                          {v.price_modifier > 0 ? `+${formatCurrency(v.price_modifier, product.currency)}` : formatCurrency(v.price_modifier, product.currency)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart Controls */}
            <div className="quickview-action-row">
              <div className="quickview-qty-stepper">
                <button
                  type="button"
                  className="quickview-qty-btn"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1 || !inStock}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="quickview-qty-display">{qty}</span>
                <button
                  type="button"
                  className="quickview-qty-btn"
                  onClick={() => setQty((q) => Math.min(availableStock || 99, q + 1))}
                  disabled={!inStock || qty >= (availableStock || 99)}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                type="button"
                className={`btn btn-primary quickview-add-btn${justAdded ? ' btn-success' : ''}`}
                onClick={handleAddToCart}
                disabled={!inStock || isAdding}
              >
                {justAdded ? (
                  <>
                    <Check size={16} />
                    <span>{t.product.added}</span>
                  </>
                ) : isAdding ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>{t.product.addingToCart || 'Adding…'}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} />
                    <span>{t.product.addToCart}</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Benefits / Assurance */}
            <div className="quickview-assurances">
              <div className="quickview-assurance-item">
                <Truck size={14} />
                <span>Fast & Reliable Shipping</span>
              </div>
              <div className="quickview-assurance-item">
                <RotateCcw size={14} />
                <span>30-Day Hassle-Free Returns</span>
              </div>
              <div className="quickview-assurance-item">
                <ShieldCheck size={14} />
                <span>100% Genuine Guarantee</span>
              </div>
            </div>

            {/* Link to Full Product Page */}
            <div className="quickview-footer-link">
              <Link
                to={`/product/${product.slug}`}
                onClick={onClose}
                className="quickview-view-details-link"
              >
                <span>{t.product.viewDetails}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
