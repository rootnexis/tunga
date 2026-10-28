import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Heart,
  MapPin,
  Bell,
  MessageSquare,
  User,
  MoreVertical,
  X,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { cn } from '@/utils/formatters';
import { PageSeo } from '@/components/shared/PageSeo';

export default function AccountLayout() {
  const { profile, isAdmin, isStaff, signOut } = useAuth();
  const { t } = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const nav = [
    { to: '/account',               icon: LayoutDashboard, label: t.account.dashboard,     end: true },
    { to: '/account/orders',        icon: Package,         label: t.account.orders },
    { to: '/account/wishlist',      icon: Heart,           label: t.account.wishlist },
    { to: '/account/addresses',     icon: MapPin,          label: t.account.addresses },
    { to: '/account/notifications', icon: Bell,            label: t.account.notifications },
    { to: '/account/support',       icon: MessageSquare,   label: t.account.support },
    { to: '/account/profile',       icon: User,            label: t.account.profile },
  ];

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || t.nav.myDashboard
    : t.nav.myDashboard;

  // Find active navigation item
  const currentItem = nav.find(item => {
    if (item.end) return location.pathname === item.to || location.pathname === item.to + '/';
    return location.pathname.startsWith(item.to);
  }) || nav[0];

  const CurrentIcon = currentItem.icon;

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <>
      <PageSeo title={`${t.nav.myDashboard} — ${t.siteName}`} />
      <div className="account-page">
        <div className="container">
          {/* Mobile Top Bar with Three-Dot Action Button */}
          <div className="account-mobile-header">
            <div className="account-mobile-header-user">
              <div className="account-mobile-header-avatar">
                {(profile?.first_name?.[0] ?? 'U').toUpperCase()}
              </div>
              <div className="account-mobile-header-meta">
                <p className="account-mobile-header-name">{displayName}</p>
                <div className="account-mobile-active-tag">
                  <CurrentIcon size={13} />
                  <span>{currentItem.label}</span>
                </div>
              </div>
            </div>

            {/* Three Dot Action Button */}
            <button
              type="button"
              className={cn('account-three-dot-btn', mobileMenuOpen && 'active')}
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Account navigation options"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <MoreVertical size={20} />}
            </button>
          </div>

          {/* Mobile Menu Dropdown / Bottom Sheet Modal */}
          {mobileMenuOpen && (
            <div className="account-mobile-modal-overlay" onClick={() => setMobileMenuOpen(false)}>
              <div
                className="account-mobile-modal-sheet"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <div className="account-mobile-modal-header">
                  <div>
                    <h3 className="account-mobile-modal-title">{t.nav.myDashboard}</h3>
                    <p className="account-mobile-modal-subtitle">{profile?.email || displayName}</p>
                  </div>
                  <button
                    type="button"
                    className="account-mobile-modal-close"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="account-mobile-modal-links">
                  {nav.map(({ to, icon: Icon, label, end }) => {
                    const isCurrent = end
                      ? location.pathname === to || location.pathname === to + '/'
                      : location.pathname.startsWith(to);
                    return (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={cn('account-mobile-nav-link', isCurrent && 'active')}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="account-mobile-nav-icon">
                          <Icon size={18} />
                        </div>
                        <span className="account-mobile-nav-label">{label}</span>
                        {isCurrent ? (
                          <span className="account-mobile-active-indicator" />
                        ) : (
                          <ChevronRight size={16} className="account-mobile-nav-arrow" />
                        )}
                      </NavLink>
                    );
                  })}

                  {(isAdmin || isStaff) && (
                    <NavLink
                      to="/admin"
                      className="account-mobile-nav-link admin-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="account-mobile-nav-icon admin-icon">
                        <ShieldCheck size={18} />
                      </div>
                      <span className="account-mobile-nav-label">{t.nav.adminPanel}</span>
                      <span className="badge badge-primary badge-sm">{t.admin.nav.adminBadge}</span>
                    </NavLink>
                  )}
                </div>

                <div className="account-mobile-modal-footer">
                  <button
                    type="button"
                    className="account-mobile-signout-btn"
                    onClick={handleSignOut}
                  >
                    <LogOut size={16} />
                    <span>{t.nav.signOut}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="account-layout">
            {/* Desktop Sidebar (hidden on mobile) */}
            <aside className="account-sidebar">
              <div className="account-sidebar-user">
                <div className="account-sidebar-avatar">
                  {(profile?.first_name?.[0] ?? 'U').toUpperCase()}
                </div>
                <p className="account-sidebar-name">{displayName}</p>
                <p className="account-sidebar-role">
                  {isAdmin ? t.admin.customers.roles.admin : t.admin.customers.roles.customer}
                </p>
              </div>
              <nav className="account-nav" aria-label="Account navigation">
                {nav.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => cn('account-nav-item', isActive && 'active')}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </NavLink>
                ))}

                {(isAdmin || isStaff) && (
                  <NavLink
                    to="/admin"
                    className="account-nav-item"
                    style={{ marginTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}
                  >
                    <ShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{t.nav.adminPanel}</span>
                    <span className="badge badge-primary badge-sm" style={{ marginLeft: 'auto' }}>
                      {t.admin.nav.adminBadge}
                    </span>
                  </NavLink>
                )}
              </nav>
            </aside>

            {/* Content */}
            <div className="account-content">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
