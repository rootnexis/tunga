import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight, Package } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useT } from '@/contexts/LanguageContext';
import { formatCurrency, getEffectivePrice, cn } from '@/utils/formatters';

export function CartDrawer() {
  const { items, itemCount, isOpen, closeCart, removeItem, updateQuantity } = useCart();
  const { t } = useT();
  const navigate = useNavigate();

  const subtotal = items.reduce((sum, item) => {
    const product = item.product;
    if (!product) return sum;
    const price = getEffectivePrice(product) + (item.variant?.price_modifier ?? 0);
    return sum + price * item.quantity;
  }, 0);

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={closeCart} aria-hidden="true" />
      <div
        className="drawer"
        role="dialog"
        aria-label={t.cart.title}
        aria-modal="true"
      >
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ShoppingCart size={20} color="var(--color-primary)" />
            <span className="drawer-title">
              {t.cart.title} {itemCount > 0 && <span className="badge badge-primary badge-sm">{itemCount}</span>}
            </span>
          </div>
          <button
            onClick={closeCart}
            className="btn btn-ghost btn-icon"
            aria-label={t.nav.close}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-16) var(--space-4)' }}>
              <div className="empty-state-icon">
                <Package size={28} color="var(--color-text-tertiary)" />
              </div>
              <h3 className="empty-state-title">{t.cart.empty}</h3>
              <p className="empty-state-description">
                {t.cart.emptyDesc}
              </p>
              <Link
                to="/shop"
                className="btn btn-primary"
                onClick={closeCart}
              >
                {t.home.shopNow}
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {items.map(item => {
                const product = item.product;
                if (!product) return null;
                const primaryImage = product.images?.find(img => img.is_primary) ?? product.images?.[0];
                const price = getEffectivePrice(product) + (item.variant?.price_modifier ?? 0);
                const isOutOfStock = (product.inventory?.quantity_available ?? 0) <= 0;
                const isArchived = product.is_archived;

                return (
                  <div
                    key={item.id}
                    className={cn('cart-item', (isOutOfStock || isArchived) && 'cart-item-unavailable')}
                  >
                    {/* Image */}
                    <Link to={`/product/${product.slug}`} onClick={closeCart}>
                      <div className="cart-item-image">
                        {primaryImage ? (
                          <img src={primaryImage.url} alt={primaryImage.alt_text ?? product.name} />
                        ) : (
                          <div className="cart-item-image-placeholder">
                            <Package size={20} color="var(--color-text-tertiary)" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Details */}
                    <div className="cart-item-details">
                      <Link
                        to={`/product/${product.slug}`}
                        className="cart-item-name"
                        onClick={closeCart}
                      >
                        {product.name}
                      </Link>
                      {item.variant && (
                        <p className="cart-item-variant">
                          {Object.values(item.variant.attributes).join(' / ')}
                        </p>
                      )}

                      {(isOutOfStock || isArchived) && (
                        <span className="badge badge-danger badge-sm" style={{ marginTop: '4px' }}>
                          {isArchived ? t.common.inactive : t.shop.noProducts}
                        </span>
                      )}

                      <div className="cart-item-bottom">
                        {/* Quantity */}
                        <div className="qty-selector">
                          <button
                            className="qty-btn"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="qty-value" aria-label={`Quantity: ${item.quantity}`}>
                            {item.quantity}
                          </span>
                          <button
                            className="qty-btn"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= (product.inventory?.quantity_available ?? 999)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Price + Remove */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <span className="cart-item-price">
                            {formatCurrency(price * item.quantity, product.currency)}
                          </span>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => removeItem(item.id)}
                            aria-label={`${t.cart.remove} ${product.name}`}
                            style={{ color: 'var(--color-danger)' }}
                            title={t.cart.remove}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="drawer-footer">
            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>{t.cart.subtotal} ({itemCount} {t.shop.products})</span>
                <span className="cart-summary-value">{formatCurrency(subtotal)}</span>
              </div>
            </div>
            <button
              className="btn btn-primary btn-lg w-full"
              onClick={handleCheckout}
              style={{ marginTop: 'var(--space-3)' }}
            >
              {t.cart.checkout}
              <ArrowRight size={18} />
            </button>
            <button
              className="btn btn-ghost btn-sm w-full"
              onClick={closeCart}
              style={{ marginTop: 'var(--space-2)' }}
            >
              {t.cart.continueShopping}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
