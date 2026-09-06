import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Package, Heart, MapPin, Bell, MessageSquare, User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { cn } from '@/utils/formatters';
import { PageSeo } from '@/components/shared/PageSeo';

export default function AccountLayout() {
  const { profile } = useAuth();
  const { t } = useT();

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

  return (
    <>
      <PageSeo title={`${t.nav.myDashboard} — ${t.siteName}`} />
      <div className="account-page">
        <div className="container">
          <div className="account-layout">
            {/* Sidebar */}
            <aside className="account-sidebar">
              <div className="account-sidebar-user">
                <div className="account-sidebar-avatar">
                  {(profile?.first_name?.[0] ?? 'U').toUpperCase()}
                </div>
                <p className="account-sidebar-name">{displayName}</p>
                <p className="account-sidebar-role">{profile?.role}</p>
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
                    {label}
                  </NavLink>
                ))}
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
