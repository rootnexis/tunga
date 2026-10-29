import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Images,
} from 'lucide-react';

export interface LightboxImageItem {
  id?: string;
  url: string;
  alt_text?: string | null;
  is_primary?: boolean;
}

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: LightboxImageItem[];
  initialIndex?: number;
  productName?: string;
  productCategory?: string;
}

const FALLBACK_IMAGE =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="#1e293b"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#94a3b8" font-size="22" font-family="system-ui">No image available</text></svg>'
  );

export function ImageLightbox({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  productName,
  productCategory,
}: ImageLightboxProps) {
  const safeImages: LightboxImageItem[] =
    images && images.length > 0
      ? images
      : [{ id: 'fallback', url: FALLBACK_IMAGE, alt_text: productName || 'Product image' }];

  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      const validIdx = Math.min(Math.max(0, initialIndex), safeImages.length - 1);
      setCurrentIndex(validIdx);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, safeImages.length]);

  const resetTransform = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const goPrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      resetTransform();
      setCurrentIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
    },
    [safeImages.length, resetTransform]
  );

  const goNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      resetTransform();
      setCurrentIndex((prev) => (prev + 1) % safeImages.length);
    },
    [safeImages.length, resetTransform]
  );

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((z) => Math.min(z + 0.5, 3));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((z) => {
      const next = Math.max(z - 0.5, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleToggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1) {
      resetTransform();
    } else {
      setZoom(2);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowLeft' && safeImages.length > 1) {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight' && safeImages.length > 1) {
        e.preventDefault();
        goNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goPrev, goNext, safeImages.length]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeImage = safeImages[currentIndex] ?? safeImages[0];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return createPortal(
    <div
      className="lightbox-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={productName ? `${productName} full screen gallery` : 'Full screen image viewer'}
    >
      {/* ── Top Header Bar ── */}
      <div className="lightbox-topbar" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-topbar-left">
          <div className="lightbox-counter-badge">
            <Images size={14} />
            <span>
              {currentIndex + 1} / {safeImages.length}
            </span>
          </div>
          {productName && (
            <div className="lightbox-title-wrap">
              {productCategory && (
                <span className="lightbox-category-tag">{productCategory}</span>
              )}
              <h3 className="lightbox-product-title">{productName}</h3>
            </div>
          )}
        </div>

        <div className="lightbox-topbar-controls">
          <button
            type="button"
            className="lightbox-control-btn"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            title="Zoom out (-)"
            aria-label="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="lightbox-zoom-indicator">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="lightbox-control-btn"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            title="Zoom in (+)"
            aria-label="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
          {zoom > 1 && (
            <button
              type="button"
              className="lightbox-control-btn"
              onClick={(e) => {
                e.stopPropagation();
                resetTransform();
              }}
              title="Reset zoom"
              aria-label="Reset zoom"
            >
              <RotateCcw size={17} />
            </button>
          )}
          <div className="lightbox-control-divider" />
          <button
            type="button"
            className="lightbox-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close full screen (Esc)"
            aria-label="Close full screen"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Main Image Stage ── */}
      <div
        className="lightbox-stage"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {safeImages.length > 1 && (
          <button
            type="button"
            className="lightbox-nav-btn lightbox-nav-prev"
            onClick={goPrev}
            aria-label="Previous image"
            title="Previous image (←)"
          >
            <ChevronLeft size={26} />
          </button>
        )}

        <div
          className={`lightbox-image-container${zoom > 1 ? ' is-zoomed' : ''}${
            isDragging ? ' is-dragging' : ''
          }`}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={handleToggleZoom}
        >
          <img
            src={activeImage.url || FALLBACK_IMAGE}
            alt={activeImage.alt_text || productName || `Image ${currentIndex + 1}`}
            className="lightbox-main-img"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== FALLBACK_IMAGE) {
                target.src = FALLBACK_IMAGE;
              }
            }}
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            }}
            draggable={false}
          />
          <button
            type="button"
            className="lightbox-zoom-hint-pill"
            onClick={handleToggleZoom}
          >
            <Maximize2 size={12} />
            <span>{zoom > 1 ? 'Click to reset zoom' : 'Click to zoom 200%'}</span>
          </button>
        </div>

        {safeImages.length > 1 && (
          <button
            type="button"
            className="lightbox-nav-btn lightbox-nav-next"
            onClick={goNext}
            aria-label="Next image"
            title="Next image (→)"
          >
            <ChevronRight size={26} />
          </button>
        )}
      </div>

      {/* ── Bottom Thumbnail Filmstrip & Caption ── */}
      <div className="lightbox-bottombar" onClick={(e) => e.stopPropagation()}>
        {activeImage.alt_text && (
          <p className="lightbox-caption">{activeImage.alt_text}</p>
        )}
        {safeImages.length > 1 && (
          <div className="lightbox-thumbs-strip" role="tablist" aria-label="Product photos">
            {safeImages.map((img, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={img.id || idx}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`lightbox-thumb-item${isSelected ? ' active' : ''}`}
                  onClick={() => {
                    resetTransform();
                    setCurrentIndex(idx);
                  }}
                  aria-label={`View photo ${idx + 1} of ${safeImages.length}`}
                >
                  <img
                    src={img.url || FALLBACK_IMAGE}
                    alt={img.alt_text || `Thumbnail ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== FALLBACK_IMAGE) {
                        target.src = FALLBACK_IMAGE;
                      }
                    }}
                  />
                  <span className="lightbox-thumb-index">{idx + 1}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
