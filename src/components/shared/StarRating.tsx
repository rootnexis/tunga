import React from 'react';
import { Star } from 'lucide-react';

interface Props {
  rating: number;    // 1–5
  max?: number;
  size?: number;
  showValue?: boolean;
  count?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export function StarRating({
  rating,
  max = 5,
  size = 14,
  showValue = false,
  count,
  interactive = false,
  onRate,
}: Props) {
  return (
    <div className="star-rating" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= Math.round(rating);
        if (interactive && onRate) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onRate(starValue)}
              aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
              style={{
                background: 'none',
                border: 'none',
                padding: 2,
                cursor: 'pointer',
                display: 'inline-flex',
              }}
            >
              <Star
                size={size}
                fill={filled ? 'var(--amber-400)' : 'transparent'}
                stroke={filled ? 'var(--amber-400)' : 'var(--slate-300)'}
              />
            </button>
          );
        }
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
