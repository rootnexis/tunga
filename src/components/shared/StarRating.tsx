import React from 'react';
import { Star } from 'lucide-react';

interface Props {
  rating: number;    // 1–5
  max?: number;
  size?: number;
  showValue?: boolean;
  count?: number;
}

export function StarRating({ rating, max = 5, size = 14, showValue = false, count }: Props) {
  return (
    <div className="star-rating" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= Math.round(rating);
        return (
          <Star
            key={i}
            size={size}
            fill={filled ? 'var(--amber-400)' : 'transparent'}
            stroke={filled ? 'var(--amber-400)' : 'var(--slate-300)'}
          />
        );
      })}
      {showValue && (
        <span className="star-rating-value">
          {rating.toFixed(1)}
          {count !== undefined && (
            <span className="star-rating-count"> ({count.toLocaleString()})</span>
          )}
        </span>
      )}
    </div>
  );
}
