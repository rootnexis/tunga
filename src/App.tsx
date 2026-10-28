import React, { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  ScrollRestoration,
  Outlet,
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import AccountLayout from '@/pages/AccountLayout';
import { RequireAuth } from '@/components/shared/RequireAuth';
import { RequireAdmin } from '@/components/shared/RequireAdmin';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';
import { ModernPageLoader } from '@/components/shared/ModernPageLoader';
import { RouteProgressBar } from '@/components/shared/RouteProgressBar';

// ── Resilient Lazy Loading with Auto-Recovery ──────────────────────────────
function safeLazy<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      console.warn('Dynamic import failed, retrying module load...', err);
      try {
        await new Promise((resolve) => setTimeout(resolve, 350));
        return await factory();
      } catch (retryErr) {
        const reloadKey = `vite_retry_${window.location.pathname}`;
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, '1');
          window.location.reload();
          return new Promise(() => {});
        }
        throw retryErr;
      }
    }
  });
}

// ── Lazy-loaded pages with automatic retry ──────────────────────────────────
const HomePage                = safeLazy(() => import('@/pages/HomePage'));
const ShopPage                = safeLazy(() => import('@/pages/ShopPage'));
const ProductPage             = safeLazy(() => import('@/pages/ProductPage'));
const AboutPage               = safeLazy(() => import('@/pages/AboutPage'));
const ContactPage             = safeLazy(() => import('@/pages/ContactPage'));
const FaqPage                 = safeLazy(() => import('@/pages/FaqPage'));
const TermsPage               = safeLazy(() => import('@/pages/TermsPage'));
const PrivacyPage             = safeLazy(() => import('@/pages/PrivacyPage'));
const ShippingPolicyPage      = safeLazy(() => import('@/pages/ShippingPolicyPage'));
const ReturnsPolicyPage       = safeLazy(() => import('@/pages/ReturnsPolicyPage'));
const NotFoundPage            = safeLazy(() => import('@/pages/NotFoundPage'));

const LoginPage               = safeLazy(() => import('@/pages/LoginPage'));
const RegisterPage            = safeLazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage      = safeLazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage       = safeLazy(() => import('@/pages/ResetPasswordPage'));
const VerifyEmailPage         = safeLazy(() => import('@/pages/VerifyEmailPage'));
const AuthCallbackPage        = safeLazy(() => import('@/pages/AuthCallbackPage'));

const AccountDashboardPage    = safeLazy(() => import('@/pages/AccountDashboardPage'));
const AccountOrdersPage       = safeLazy(() => import('@/pages/AccountOrdersPage'));
const AccountOrderDetailPage  = safeLazy(() => import('@/pages/AccountOrderDetailPage'));
const AccountWishlistPage     = safeLazy(() => import('@/pages/AccountWishlistPage'));
const AccountAddressesPage    = safeLazy(() => import('@/pages/AccountAddressesPage'));
const AccountNotificationsPage = safeLazy(() => import('@/pages/AccountNotificationsPage'));
const AccountSupportPage      = safeLazy(() => import('@/pages/AccountSupportPage'));
const AccountProfilePage      = safeLazy(() => import('@/pages/AccountProfilePage'));

const CheckoutPage            = safeLazy(() => import('@/pages/CheckoutPage'));

const AdminDashboardPage      = safeLazy(() => import('@/pages/AdminDashboardPage'));
const AdminProductsPage       = safeLazy(() => import('@/pages/AdminProductsPage'));
const AdminProductFormPage    = safeLazy(() => import('@/pages/AdminProductFormPage'));
const AdminOrdersPage         = safeLazy(() => import('@/pages/AdminOrdersPage'));
const AdminOrderDetailPage    = safeLazy(() => import('@/pages/AdminOrderDetailPage'));
const AdminCustomersPage      = safeLazy(() => import('@/pages/AdminCustomersPage'));
const AdminCouponsPage        = safeLazy(() => import('@/pages/AdminCouponsPage'));
const AdminDeliveryPage       = safeLazy(() => import('@/pages/AdminDeliveryPage'));
const AdminInventoryPage      = safeLazy(() => import('@/pages/AdminInventoryPage'));
const AdminReviewsPage        = safeLazy(() => import('@/pages/AdminReviewsPage'));

// ── Fallback ───────────────────────────────────────────────────────────────
const PageLoader = () => <ModernPageLoader fullPage label="Preparing Ituze…" />;

// ── Providers root — lives INSIDE the router so hooks work everywhere ──────
function AppProviders() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <ScrollRestoration />
              <RouteProgressBar />
              <Outlet />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

// ── Router ─────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    // Root element — all providers live here so router hooks are available
    element: <AppProviders />,
    errorElement: <RouteErrorBoundary />,
    children: [
      // ── Public routes with CustomerLayout ──────────────────────────────
      {
        element: <CustomerLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true,                element: <Suspense fallback={<PageLoader />}><HomePage /></Suspense> },
          { path: 'shop',               element: <Suspense fallback={<PageLoader />}><ShopPage /></Suspense> },
          { path: 'shop/category/:slug', element: <Suspense fallback={<PageLoader />}><ShopPage /></Suspense> },
          { path: 'product/:slug',      element: <Suspense fallback={<PageLoader />}><ProductPage /></Suspense> },
          { path: 'about',              element: <Suspense fallback={<PageLoader />}><AboutPage /></Suspense> },
          { path: 'contact',            element: <Suspense fallback={<PageLoader />}><ContactPage /></Suspense> },
          { path: 'faq',                element: <Suspense fallback={<PageLoader />}><FaqPage /></Suspense> },
          { path: 'terms',              element: <Suspense fallback={<PageLoader />}><TermsPage /></Suspense> },
          { path: 'privacy',            element: <Suspense fallback={<PageLoader />}><PrivacyPage /></Suspense> },
          { path: 'shipping-policy',    element: <Suspense fallback={<PageLoader />}><ShippingPolicyPage /></Suspense> },
          { path: 'returns-policy',     element: <Suspense fallback={<PageLoader />}><ReturnsPolicyPage /></Suspense> },

          // ── Account ───────────────────────────────────────────────────
          {
            path: 'account',
            errorElement: <RouteErrorBoundary />,
            element: (
              <RequireAuth>
                <AccountLayout />
              </RequireAuth>
            ),
            children: [
              { index: true,           element: <Suspense fallback={<PageLoader />}><AccountDashboardPage /></Suspense> },
              { path: 'orders',        element: <Suspense fallback={<PageLoader />}><AccountOrdersPage /></Suspense> },
              { path: 'orders/:id',    element: <Suspense fallback={<PageLoader />}><AccountOrderDetailPage /></Suspense> },
              { path: 'wishlist',      element: <Suspense fallback={<PageLoader />}><AccountWishlistPage /></Suspense> },
              { path: 'addresses',     element: <Suspense fallback={<PageLoader />}><AccountAddressesPage /></Suspense> },
              { path: 'notifications', element: <Suspense fallback={<PageLoader />}><AccountNotificationsPage /></Suspense> },
              { path: 'support',       element: <Suspense fallback={<PageLoader />}><AccountSupportPage /></Suspense> },
              { path: 'profile',       element: <Suspense fallback={<PageLoader />}><AccountProfilePage /></Suspense> },
            ],
          },

          // ── Checkout ──────────────────────────────────────────────────
          {
            path: 'checkout',
            errorElement: <RouteErrorBoundary />,
            element: (
              <RequireAuth>
                <Suspense fallback={<PageLoader />}><CheckoutPage /></Suspense>
              </RequireAuth>
            ),
          },

          // ── 404 ───────────────────────────────────────────────────────
          { path: '404', element: <Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense> },
          { path: '*',   element: <Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense> },
        ],
      },

      // ── Auth routes (no layout) ─────────────────────────────────────
      { path: 'auth/login',           errorElement: <RouteErrorBoundary />, element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense> },
      { path: 'auth/register',        errorElement: <RouteErrorBoundary />, element: <Suspense fallback={<PageLoader />}><RegisterPage /></Suspense> },
      { path: 'auth/forgot-password', errorElement: <RouteErrorBoundary />, element: <Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense> },
      { path: 'auth/reset-password',  errorElement: <RouteErrorBoundary />, element: <Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense> },
      { path: 'auth/verify-email',    errorElement: <RouteErrorBoundary />, element: <Suspense fallback={<PageLoader />}><VerifyEmailPage /></Suspense> },
      { path: 'auth/callback',        errorElement: <RouteErrorBoundary />, element: <Suspense fallback={<PageLoader />}><AuthCallbackPage /></Suspense> },

      // ── Admin ───────────────────────────────────────────────────────
      {
        path: 'admin',
        errorElement: <RouteErrorBoundary />,
        element: (
          <RequireAuth>
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          </RequireAuth>
        ),
        children: [
          { index: true,              element: <Suspense fallback={<PageLoader />}><AdminDashboardPage /></Suspense> },
          { path: 'products',         element: <Suspense fallback={<PageLoader />}><AdminProductsPage /></Suspense> },
          { path: 'products/new',     element: <Suspense fallback={<PageLoader />}><AdminProductFormPage /></Suspense> },
          { path: 'products/:id/edit', element: <Suspense fallback={<PageLoader />}><AdminProductFormPage /></Suspense> },
          { path: 'orders',           element: <Suspense fallback={<PageLoader />}><AdminOrdersPage /></Suspense> },
          { path: 'orders/:id',       element: <Suspense fallback={<PageLoader />}><AdminOrderDetailPage /></Suspense> },
          { path: 'customers',        element: <Suspense fallback={<PageLoader />}><AdminCustomersPage /></Suspense> },
          { path: 'coupons',          element: <Suspense fallback={<PageLoader />}><AdminCouponsPage /></Suspense> },
          { path: 'delivery',         element: <Suspense fallback={<PageLoader />}><AdminDeliveryPage /></Suspense> },
          { path: 'inventory',        element: <Suspense fallback={<PageLoader />}><AdminInventoryPage /></Suspense> },
          { path: 'reviews',          element: <Suspense fallback={<PageLoader />}><AdminReviewsPage /></Suspense> },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
