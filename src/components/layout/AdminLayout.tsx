import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag, Truck,
  Zap, Menu, X, LogOut, ChevronRight, Boxes, Star,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/formatters';

const NAV = [
  { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/admin/products',  icon: Package,         label: 'Products' },
  { to: '/admin/inventory', icon: Boxes,           label: 'Inventory' },
  { to: '/admin/orders',    icon: ShoppingBag,     label: 'Orders' },
  { to: '/admin/reviews',   icon: Star,            label: 'Reviews' },
  { to: '/admin/customers', icon: Users,           label: 'Customers' },
  { to: '/admin/coupons',   icon: Tag,             label: 'Coupons' },
  { to: '/admin/delivery',  icon: Truck,           label: 'Delivery' },
];

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            <div className="admin-logo-icon"><Zap size={18} /></div>
            <span className="admin-logo-text">Storefront</span>
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
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} className="admin-nav-arrow" />
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <div className="admin-user-avatar">
              {(profile?.first_name?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="admin-user-info">
              <p className="admin-user-name">{displayName}</p>
              <p className="admin-user-role">{profile?.role}</p>
            </div>
          </div>
          <button className="admin-signout-btn" onClick={handleSignOut} aria-label="Sign out">
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
            <Zap size={16} />
            <span>Storefront Admin</span>
          </div>
        </header>

        <main className="admin-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
