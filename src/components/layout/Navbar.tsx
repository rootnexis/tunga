import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCart, Heart, Search, Menu, X, User, LogOut,
  Package, ChevronDown, Settings, LayoutDashboard, Bell,
  Shield, Zap, ShoppingBag, Sparkles, Flame, Info, PhoneCall,
  Home
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useT } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { cn } from '@/utils/formatters';

export function Navbar() {
  const { isAuthenticated, profile, isAdmin, isStaff, signOut } = useAuth();
  const { itemCount, openCart } = useCart();
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUserDropdownOpen(false);
    navigate('/');
  };

  const navLinks = [
    { to: '/shop', label: t.nav.shop, icon: ShoppingBag },
    { to: '/shop/category/new-arrivals', label: t.nav.newArrivals, icon: Sparkles },
    { to: '/shop/category/featured', label: t.nav.featured, icon: Flame },
    { to: '/about', label: t.nav.about, icon: Info },
    { to: '/contact', label: t.nav.contact, icon: PhoneCall },
  ];

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Account'
    : 'Account';

  return (
    <>
      <nav
        className={cn('navbar', scrolled && 'navbar-scrolled')}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container navbar-inner">
          {/* ── Logo ── */}
          <Link to="/" className="navbar-logo" aria-label="Go to homepage">
            <BrandLogo variant="light" size="md" />
          </Link>

          {/* ── Desktop Nav Links with Modern Icons ── */}
          <div className="navbar-links hide-mobile" role="menubar">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn('navbar-link', isActive && 'navbar-link-active')}
                role="menuitem"
              >
                <Icon size={15} className="navbar-link-icon" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          {/* ── Actions ── */}
          <div className="navbar-actions">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Search */}
            <button className="navbar-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search products">
              <Search size={20} />
            </button>

            {/* Wishlist */}
            {isAuthenticated && (
              <Link to="/account/wishlist" className="navbar-icon-btn" aria-label={t.account.wishlist}>
                <Heart size={20} />
              </Link>
            )}

            {/* Cart */}
            <button
              type="button"
              data-no-route-loader="true"
              className="navbar-icon-btn navbar-cart-btn"
              onClick={openCart}
              aria-label={`${t.cart.title}, ${itemCount}`}
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="navbar-cart-badge" aria-hidden="true">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            {/* User Dropdown */}
            {isAuthenticated ? (
              <div className="dropdown-wrapper" ref={userDropdownRef}>
                <button
                  className="navbar-user-btn"
                  onClick={() => setUserDropdownOpen(prev => !prev)}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="menu"
                >
                  <div className="navbar-user-avatar">
                    <User size={16} />
                  </div>
                  <span className="navbar-user-name hide-mobile">{displayName}</span>
                  <ChevronDown size={14} className={cn('navbar-chevron', userDropdownOpen && 'rotate-180')} />
                </button>

                {userDropdownOpen && (
                  <div className="dropdown-menu navbar-user-dropdown" role="menu">
                    <div className="dropdown-header">
                      <p className="dropdown-user-name">{displayName}</p>
                      <p className="dropdown-user-email">{profile?.email}</p>
                      {(isAdmin || isStaff) && (
                        <span className="badge badge-primary badge-sm" style={{ marginTop: 'var(--space-1)' }}>
                          {isAdmin ? 'Admin' : 'Staff'}
                        </span>
                      )}
                    </div>

                    <div className="dropdown-divider" />

                    <Link
                      to="/account"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <LayoutDashboard size={16} />
                      <span>{t.nav.myDashboard}</span>
                    </Link>

                    <Link
                      to="/account/orders"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <Package size={16} />
                      <span>{t.nav.myOrders}</span>
                    </Link>

                    <Link
                      to="/account/notifications"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <Bell size={16} />
                      <span>{t.nav.notifications}</span>
                    </Link>

                    <Link
                      to="/account/profile"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <Settings size={16} />
                      <span>{t.nav.accountSettings}</span>
                    </Link>

                    {(isAdmin || isStaff) && (
                      <>
                        <div className="dropdown-divider" />
                        <Link
                          to="/admin"
                          className="dropdown-item dropdown-item-admin"
                          role="menuitem"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          <Shield size={16} />
                          <span>{t.nav.adminPanel}</span>
                          <span className="badge badge-primary badge-sm" style={{ marginLeft: 'auto' }}>
                            {t.admin.nav.adminBadge}
                          </span>
                        </Link>
                      </>
                    )}

                    <div className="dropdown-divider" />

                    <button
                      className="dropdown-item dropdown-item-danger w-full text-left"
                      role="menuitem"
                      onClick={handleSignOut}
                    >
                      <LogOut size={16} />
                      <span>{t.nav.signOut}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="navbar-auth-btns hide-mobile">
                <Link to="/auth/login" className="btn btn-ghost btn-sm">{t.nav.signIn}</Link>
                <Link to="/auth/register" className="btn btn-primary btn-sm">{t.nav.getStarted}</Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              className="navbar-icon-btn hide-desktop"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label={mobileOpen ? t.nav.close : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* ── Mobile Menu ── */}
        {mobileOpen && (
          <div className="navbar-mobile-menu" role="menu">
            <div className="container">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => cn('navbar-mobile-link', isActive && 'navbar-mobile-link-active')}
                  role="menuitem"
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={18} className="navbar-mobile-link-icon" />
                  <span>{label}</span>
                </NavLink>
              ))}

              {/* Language switcher inline in mobile menu */}
              <div style={{ padding: 'var(--space-3) 0', borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-2)' }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>
                  Language
                </p>
                <LanguageSwitcher variant="inline" />
              </div>

              {/* Admin Panel Quick Access in Mobile Drawer — Strictly visible ONLY to authenticated Admins/Staff */}
              {isAuthenticated && (isAdmin || isStaff) && (
                <div style={{ padding: 'var(--space-2) 0' }}>
                  <Link
                    to="/admin"
                    className="btn btn-secondary w-full"
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2)',
                      background: 'rgba(99, 102, 241, 0.08)',
                      borderColor: 'rgba(99, 102, 241, 0.25)',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                    }}
                  >
                    <Shield size={16} />
                    <span>{t.nav.adminPanel}</span>
                  </Link>
                </div>
              )}

              {!isAuthenticated && (
                <div className="navbar-mobile-auth">
                  <Link to="/auth/login" className="btn btn-secondary w-full" onClick={() => setMobileOpen(false)}>
                    {t.nav.signIn}
                  </Link>
                  <Link to="/auth/register" className="btn btn-primary w-full" onClick={() => setMobileOpen(false)}>
                    {t.nav.createAccount}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Mobile Bottom Navigation Bar (Professional Mobile App Style) ── */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn('mobile-bottom-nav-item', isActive && 'mobile-bottom-nav-item-active')
          }
          end
        >
          <div className="mobile-bottom-nav-icon-wrap">
            <Home size={20} />
          </div>
          <span className="mobile-bottom-nav-label">{t.common.home || 'Home'}</span>
        </NavLink>

        <NavLink
          to="/shop"
          className={({ isActive }) =>
            cn(
              'mobile-bottom-nav-item',
              (isActive || location.pathname.startsWith('/shop') || location.pathname.startsWith('/product')) &&
                'mobile-bottom-nav-item-active'
            )
          }
        >
          <div className="mobile-bottom-nav-icon-wrap">
            <ShoppingBag size={20} />
          </div>
          <span className="mobile-bottom-nav-label">{t.nav.shop || 'Shop'}</span>
        </NavLink>

        <button
          type="button"
          data-no-route-loader="true"
          className={cn('mobile-bottom-nav-item', searchOpen && 'mobile-bottom-nav-item-active')}
          onClick={() => setSearchOpen(true)}
          aria-label="Search products"
        >
          <div className="mobile-bottom-nav-icon-wrap">
            <Search size={20} />
          </div>
          <span className="mobile-bottom-nav-label">{t.shop.search || 'Search'}</span>
        </button>

        <button
          type="button"
          data-no-route-loader="true"
          className="mobile-bottom-nav-item"
          onClick={openCart}
          aria-label={`Cart with ${itemCount} items`}
        >
          <div className="mobile-bottom-nav-icon-wrap">
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span className="mobile-bottom-nav-badge">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </div>
          <span className="mobile-bottom-nav-label">{t.cart.title || 'Cart'}</span>
        </button>

        <NavLink
          to={isAuthenticated ? '/account' : '/auth/login'}
          className={({ isActive }) =>
            cn(
              'mobile-bottom-nav-item',
              (isActive || location.pathname.startsWith('/account') || location.pathname.startsWith('/auth')) &&
                'mobile-bottom-nav-item-active'
            )
          }
        >
          <div className="mobile-bottom-nav-icon-wrap">
            <User size={20} />
          </div>
          <span className="mobile-bottom-nav-label">
            {isAuthenticated ? (t.account.profile || 'Account') : (t.nav.signIn || 'Sign In')}
          </span>
        </NavLink>
      </nav>

      {/* ── Search Overlay ── */}
      {searchOpen && (
        <div className="search-overlay" role="dialog" aria-label="Search" aria-modal="true">
          <div className="search-overlay-backdrop" onClick={() => setSearchOpen(false)} />
          <div className="search-overlay-content">
            <form onSubmit={handleSearch} className="search-overlay-form">
              <Search size={22} className="search-overlay-icon" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.nav.searchPlaceholder}
                className="search-overlay-input"
                aria-label="Search"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="search-overlay-clear" aria-label="Clear search">
                  <X size={18} />
                </button>
              )}
            </form>
            <button className="search-overlay-close" onClick={() => setSearchOpen(false)} aria-label="Close search">
              <X size={20} />
              <span>{t.nav.close}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
