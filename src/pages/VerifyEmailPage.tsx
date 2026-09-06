import { Link } from 'react-router-dom';
import { CheckCircle, Zap, Mail } from 'lucide-react';
import { PageSeo } from '@/components/shared/PageSeo';

export default function VerifyEmailPage() {
  return (
    <>
      <PageSeo title="Verify Your Email" />
      <div className="auth-page">
        <div className="auth-panel">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <Link to="/" className="auth-logo" style={{ justifyContent: 'center' }}>
              <div className="auth-logo-icon"><Zap size={18} /></div>
              Storefront
            </Link>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--emerald-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-5)' }}>
              <CheckCircle size={36} color="var(--emerald-500)" />
            </div>
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-subtitle">
              We sent a verification link to your email address. Click it to activate your account.
              <br /><br />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                Didn't get it? Check your spam folder or{' '}
                <Link to="/auth/register" style={{ color: 'var(--color-primary)' }}>try again</Link>.
              </span>
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexDirection: 'column' }}>
              <Link to="/auth/login" className="btn btn-primary btn-lg w-full">
                <Mail size={18} />
                Go to Sign In
              </Link>
              <Link to="/" className="btn btn-ghost btn-lg w-full">Back to Home</Link>
            </div>
          </div>
        </div>
        <div className="auth-hero">
          <div className="auth-hero-content">
            <h2 className="auth-hero-title">Almost there!</h2>
            <p className="auth-hero-desc">One quick step and you'll be ready to explore thousands of premium products.</p>
          </div>
        </div>
      </div>
    </>
  );
}
