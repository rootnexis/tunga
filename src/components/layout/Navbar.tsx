import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Heart, Search, Menu, X, User, LogOut,
  Package, ChevronDown, Settings, LayoutDashboard, Bell,
  Shield, Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useT } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { cn } from '@/utils/formatters';

export function Navbar() {
  const { isAuthenticated, profile, isAdmin, isStaff, signOut } = useAuth();
  const { itemCount, openCart } = useCart();
  const { t } = useT();
  const navigate = useNavigate();
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
    { to: '/shop', label: t.nav.shop },
    { to: '/shop/category/new-arrivals', label: t.nav.newArrivals },
    { to: '/shop/category/featured', label: t.nav.featured },
    { to: '/about', label: t.nav.about },
    { to: '/contact', label: t.nav.contact },
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
            <div className="navbar-logo-icon"><Zap size={20} /></div>
            <span className="navbar-logo-text">{t.siteName}</span>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="navbar-links hide-mobile" role="menubar">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => cn('navbar-link', isActive && 'navbar-link-active')}
                role="menuitem"
              >
                {link.label}
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
                  <div className="navbar-avatar">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={displayName} />
                    ) : (
                      <span>{(profile?.first_name?.[0] ?? 'U').toUpperCase()}</span>
                    )}
                  </div>
                  <span className="navbar-user-name hide-mobile">{displayName}</span>
                  <ChevronDown size={14} className={cn('navbar-chevron', userDropdownOpen && 'rotated')} />
                </button>

                {userDropdownOpen && (
                  <div className="dropdown-menu" role="menu">
                    <div className="navbar-dropdown-header">
                      <p className="navbar-dropdown-name">{displayName}</p>
                      <p className="navbar-dropdown-email">{profile?.role}</p>
                    </div>
                    <div className="dropdown-separator" />

                    <Link to="/account" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                      <LayoutDashboard size={16} />{t.nav.myDashboard}
                    </Link>
                    <Link to="/account/orders" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                      <Package size={16} />{t.nav.myOrders}
                    </Link>
                    <Link to="/account/notifications" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                      <Bell size={16} />{t.nav.notifications}
                    </Link>
                    <Link to="/account/profile" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                      <Settings size={16} />{t.nav.accountSettings}
                    </Link>

                    {(isAdmin || isStaff) && (
                      <>
                        <div className="dropdown-separator" />
                        <Link to="/admin" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <Shield size={16} />{t.nav.adminPanel}
                        </Link>
                      </>
                    )}

                    <div className="dropdown-separator" />
                    <button className="dropdown-item danger" role="menuitem" onClick={handleSignOut}>
                      <LogOut size={16} />{t.nav.signOut}
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
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => cn('navbar-mobile-link', isActive && 'navbar-mobile-link-active')}
                  role="menuitem"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}

              {/* Language switcher inline in mobile menu */}
              <div style={{ padding: 'var(--space-3) 0', borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-2)' }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>
                  Language
                </p>
                <LanguageSwitcher variant="inline" />
              </div>

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
