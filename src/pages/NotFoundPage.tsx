import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageSeo } from '@/components/shared/PageSeo';

export default function NotFoundPage() {
  return (
    <>
      <PageSeo title="404 — Page Not Found" />
      <div className="not-found-page">
        <p className="not-found-code">404</p>
        <h1 className="not-found-title">Page not found</h1>
        <p className="not-found-desc">
          Sorry, we couldn't find the page you're looking for. It might have moved or never existed.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary btn-lg">
            <ArrowLeft size={18} />
            Go Home
          </Link>
          <Link to="/shop" className="btn btn-secondary btn-lg">Browse Shop</Link>
        </div>
      </div>
    </>
  );
}
