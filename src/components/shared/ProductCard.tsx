import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { StarRating } from './StarRating';
import { useCart } from '@/contexts/CartContext';
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
  const primaryImage = product.images?.find(img => img.is_primary) ?? product.images?.[0];
  const effectivePrice = getEffectivePrice(product);
  const discount = calculateDiscount(product.base_price, product.sale_price);
  const inStock = (product.inventory?.quantity_available ?? 0) > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product.id);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlist?.(product);
  };

  return (
    <Link to={`/product/${product.slug}`} className="product-card" aria-label={product.name}>
      {/* Image */}
      <div className="product-card-image">
        <img
          src={primaryImage?.url ?? PLACEHOLDER}
          alt={primaryImage?.alt_text ?? product.name}
          loading="lazy"
        />

        {/* Badges */}
        <div className="product-card-badges">
          {product.is_featured && (
            <span className="badge badge-primary">Featured</span>
          )}
          {discount > 0 && (
            <span className="badge badge-danger">-{discount}%</span>
          )}
          {!inStock && (
            <span className="badge badge-neutral">Out of stock</span>
          )}
        </div>

        {/* Wishlist btn */}
        {onWishlist && (
          <button
            className={`product-card-wishlist${isWishlisted ? ' active' : ''}`}
            onClick={handleWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={14} fill={isWishlisted ? 'currentColor' : 'transparent'} />
          </button>
        )}

        {/* Add to cart overlay */}
        {inStock && (
          <div className="product-card-actions">
            <button
              className="btn btn-primary btn-sm w-full"
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingCart size={14} />
              Add to Cart
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="product-card-body">
        {product.category && (
          <p className="product-card-category">{product.category.name}</p>
        )}
        <h3 className="product-card-name">{product.name}</h3>

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
            <span className="product-price-discount">Save {discount}%</span>
          )}
        </div>
      </div>
    </Link>
  );
}
