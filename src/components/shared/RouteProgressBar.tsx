import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';

export function RouteProgressBar() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Intercept internal link clicks ONLY for real page-to-page navigation
  // STRICT: Never trigger on cart additions, buttons, forms, wishlist, or non-navigation interactions
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const clickedEl = e.target as HTMLElement | null;
      if (!clickedEl) return;

      // Ignore all buttons, forms, cart actions, wishlist toggles, and elements marked with data-no-route-loader
      if (
        clickedEl.closest('button') ||
        clickedEl.closest('input') ||
        clickedEl.closest('select') ||
        clickedEl.closest('textarea') ||
        clickedEl.closest('form') ||
        clickedEl.closest('.product-card-actions') ||
        clickedEl.closest('.product-card-wishlist') ||
        clickedEl.closest('.cart-drawer') ||
        clickedEl.closest('.drawer-backdrop') ||
        clickedEl.closest('.navbar-cart-btn') ||
        clickedEl.closest('[data-no-route-loader]')
      ) {
        return;
      }

      const target = clickedEl.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Ignore external, hash, javascript, mailto, tel, or same-page targets
      if (
        target.getAttribute('target') === '_blank' ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        href.startsWith('#') ||
        href === window.location.pathname ||
        href === window.location.pathname + window.location.search
      ) {
        return;
      }

      // Valid internal page navigation — activate modern minimalist loader
      setFading(false);
      setLoading(true);
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, []);

  // 2. React to actual route/page changes (including navigating to/from login)
  useEffect(() => {
    setLoading(true);
    setFading(false);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    // Keep visible briefly for smooth transition, then fade out
    timerRef.current = setTimeout(() => {
      setFading(true);
      fadeTimerRef.current = setTimeout(() => {
        setLoading(false);
        setFading(false);
      }, 200);
    }, 380);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [location.pathname, location.search]);

  if (!loading) return null;

  return (
    <>
      {/* Top Laser Progress Line */}
      <div className="route-progress-bar-wrap" aria-hidden="true">
        <div className="route-progress-bar-fill" />
        <div className="route-progress-bar-glow" />
      </div>

      {/* Global Minimalist Luxury Loader: Logo and Outer Ring ONLY, No Box */}
      <div
        className={`page-transition-overlay ${fading ? 'fading-out' : ''}`}
        role="status"
        aria-label="Loading page"
      >
        <div className="modern-loader-orb-wrap">
          <div className="modern-loader-orbit-ring" />
          <div className="modern-loader-orbit-ring-reverse" />
          <div className="modern-loader-logo-core">
            <Zap size={24} className="modern-loader-zap" />
          </div>
        </div>
      </div>
    </>
  );
}
