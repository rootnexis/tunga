import { lazy, Suspense } from 'react';
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

import { CustomerLayout }     from '@/components/layout/CustomerLayout';
import { AdminLayout }        from '@/components/layout/AdminLayout';
import { RequireAuth }        from '@/components/shared/RequireAuth';
import { RequireAdmin }       from '@/components/shared/RequireAdmin';
import { Spinner }            from '@/components/shared/Spinner';

// ── Lazy-loaded pages ──────────────────────────────────────────────────────
const HomePage                = lazy(() => import('@/pages/HomePage'));
const ShopPage                = lazy(() => import('@/pages/ShopPage'));
const ProductPage             = lazy(() => import('@/pages/ProductPage'));
const AboutPage               = lazy(() => import('@/pages/AboutPage'));
const ContactPage             = lazy(() => import('@/pages/ContactPage'));
const FaqPage                 = lazy(() => import('@/pages/FaqPage'));
const TermsPage               = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage             = lazy(() => import('@/pages/PrivacyPage'));
const ShippingPolicyPage      = lazy(() => import('@/pages/ShippingPolicyPage'));
const ReturnsPolicyPage       = lazy(() => import('@/pages/ReturnsPolicyPage'));
const NotFoundPage            = lazy(() => import('@/pages/NotFoundPage'));

const LoginPage               = lazy(() => import('@/pages/LoginPage'));
const RegisterPage            = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage      = lazy(() => import('@/pages/ForgotPasswordPage'));
const VerifyEmailPage         = lazy(() => import('@/pages/VerifyEmailPage'));

const AccountLayout           = lazy(() => import('@/pages/AccountLayout'));
const AccountDashboardPage    = lazy(() => import('@/pages/AccountDashboardPage'));
const AccountOrdersPage       = lazy(() => import('@/pages/AccountOrdersPage'));
const AccountOrderDetailPage  = lazy(() => import('@/pages/AccountOrderDetailPage'));
const AccountWishlistPage     = lazy(() => import('@/pages/AccountWishlistPage'));
const AccountAddressesPage    = lazy(() => import('@/pages/AccountAddressesPage'));
const AccountNotificationsPage = lazy(() => import('@/pages/AccountNotificationsPage'));
const AccountSupportPage      = lazy(() => import('@/pages/AccountSupportPage'));
const AccountProfilePage      = lazy(() => import('@/pages/AccountProfilePage'));

const CheckoutPage            = lazy(() => import('@/pages/CheckoutPage'));

const AdminDashboardPage      = lazy(() => import('@/pages/AdminDashboardPage'));
const AdminProductsPage       = lazy(() => import('@/pages/AdminProductsPage'));
const AdminProductFormPage    = lazy(() => import('@/pages/AdminProductFormPage'));
const AdminOrdersPage         = lazy(() => import('@/pages/AdminOrdersPage'));
const AdminOrderDetailPage    = lazy(() => import('@/pages/AdminOrderDetailPage'));
const AdminCustomersPage      = lazy(() => import('@/pages/AdminCustomersPage'));
const AdminCouponsPage        = lazy(() => import('@/pages/AdminCouponsPage'));
const AdminDeliveryPage       = lazy(() => import('@/pages/AdminDeliveryPage'));
const AdminInventoryPage      = lazy(() => import('@/pages/AdminInventoryPage'));
const AdminReviewsPage        = lazy(() => import('@/pages/AdminReviewsPage'));

// ── Fallback ───────────────────────────────────────────────────────────────
const PageLoader = () => <Spinner fullPage label="Loading…" />;

// ── Providers root — lives INSIDE the router so hooks work everywhere ──────
function AppProviders() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <ScrollRestoration />
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
    children: [
      // ── Public routes with CustomerLayout ──────────────────────────────
      {
        element: <CustomerLayout />,
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
            element: (
              <RequireAuth>
                <Suspense fallback={<PageLoader />}><AccountLayout /></Suspense>
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
      { path: 'auth/login',           element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense> },
      { path: 'auth/register',        element: <Suspense fallback={<PageLoader />}><RegisterPage /></Suspense> },
      { path: 'auth/forgot-password', element: <Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense> },
      { path: 'auth/verify-email',    element: <Suspense fallback={<PageLoader />}><VerifyEmailPage /></Suspense> },

      // ── Admin ───────────────────────────────────────────────────────
      {
        path: 'admin',
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
