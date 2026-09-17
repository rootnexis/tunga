import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Package, ShoppingCart, Users, Ticket,
  Truck, Store, Menu, X, LogOut, ChevronRight, Warehouse, Star,
  Globe,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useT, LANGUAGES } from '@/contexts/LanguageContext';
import { cn } from '@/utils/formatters';
import type { LangCode } from '@/i18n/types';

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const { t, lang, setLang, language } = useT();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const ta = t.admin.nav;

  const NAV = [
    { to: '/admin',           icon: LayoutGrid,   label: ta.dashboard,  end: true },
    { to: '/admin/products',  icon: Package,       label: ta.products },
    { to: '/admin/inventory', icon: Warehouse,     label: ta.inventory },
    { to: '/admin/orders',    icon: ShoppingCart,   label: ta.orders },
    { to: '/admin/reviews',   icon: Star,          label: ta.reviews },
    { to: '/admin/customers', icon: Users,         label: ta.customers },
    { to: '/admin/coupons',   icon: Ticket,        label: ta.coupons },
    { to: '/admin/delivery',  icon: Truck,         label: ta.delivery },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Admin'
    : 'Admin';

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn('admin-sidebar', sidebarOpen && 'admin-sidebar-open')}>
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <div className="admin-logo-icon"><Store size={18} /></div>
            <span className="admin-logo-text">Tunga</span>
          </div>
          <span className="admin-badge">Admin</span>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn('admin-nav-item', isActive && 'admin-nav-item-active')}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              <ChevronRight size={14} className="admin-nav-arrow" />
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {/* Language Switcher */}
          <div className="admin-lang-switcher" style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
            <button
              type="button"
              className="admin-lang-btn"
              onClick={() => setLangDropdownOpen(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                width: '100%', padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                background: 'var(--color-surface-raised)', cursor: 'pointer',
                fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <Globe size={14} />
              <span style={{ flex: 1, textAlign: 'left' }}>{language.flag} {language.label}</span>
              <ChevronRight size={12} style={{
                transform: langDropdownOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }} />
            </button>

            {langDropdownOpen && (
              <div
                className="admin-lang-dropdown"
                style={{
                  position: 'absolute', bottom: '100%', left: 0, right: 0,
                  marginBottom: 'var(--space-1)',
                  background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 100,
                }}
              >
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => { setLang(l.code as LangCode); setLangDropdownOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      width: '100%', padding: 'var(--space-2) var(--space-3)',
                      border: 'none', cursor: 'pointer',
                      fontSize: 'var(--text-sm)',
                      background: l.code === lang ? 'var(--color-primary-50, rgba(99, 102, 241, 0.1))' : 'transparent',
                      color: l.code === lang ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      fontWeight: l.code === lang ? 'var(--font-semibold)' : 'var(--font-normal)',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={e => {
                      if (l.code !== lang) (e.target as HTMLElement).style.background = 'var(--color-surface-raised)';
                    }}
                    onMouseLeave={e => {
                      if (l.code !== lang) (e.target as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="admin-user">
            <div className="admin-user-avatar">
              {(profile?.first_name?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="admin-user-info">
              <p className="admin-user-name">{displayName}</p>
              <p className="admin-user-role">{profile?.role}</p>
            </div>
          </div>
          <button className="admin-signout-btn" onClick={handleSignOut} aria-label={ta.signOut}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-menu-toggle"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="admin-topbar-logo">
            <Store size={16} />
            <span>Tunga Admin</span>
          </div>
        </header>

        <main className="admin-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
