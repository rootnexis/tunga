import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Zap,
  Mail,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';
import loginIllustration from '@/assets/images/login_3d_characters_1792323262471.jpg';

export default function LoginPage() {
  const { t } = useT();
  const { signIn } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) {
      e.email = t.auth.emailRequired || `${t.auth.emailAddress} is required`;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      e.email = t.auth.validEmailRequired || 'Enter a valid email address';
    }
    if (!password) {
      e.password = t.auth.passwordRequired || `${t.auth.password} is required`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      const errorMsg =
        error === 'Invalid login credentials'
          ? t.auth.invalidCredentials || error
          : error;
      toastError(t.auth.signInFailed || 'Sign in failed', errorMsg);
      return;
    }
    success(t.auth.welcomeBack, t.auth.signedInSuccess || 'You are now signed in to Ituze.');
    navigate(from, { replace: true });
  };

  const handleSocialClick = (provider: string) => {
    toastError(
      `${provider} Sign-In`,
      `Direct ${provider} sign-in will connect to your account. You can also sign in with email and password below.`
    );
  };

  return (
    <>
      <PageSeo
        title={t.auth.signIn}
        description="Sign in to your Ituze account to manage orders, wishlist, and exclusive member benefits."
      />

      <div className="login-page-wrapper">
        <div className="login-modal-box">
          {/* ── Left Visual Banner (Desktop only - strictly hidden on mobile) ── */}
          <div className="login-feature-banner" aria-hidden="true">
            <div className="login-banner-image-wrap">
              <img
                src={loginIllustration}
                alt="Ituze Experience"
                className="login-banner-img"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80';
                }}
              />
              <div className="login-banner-img-overlay" />
            </div>

            <div className="login-banner-footer-note">
              <div className="login-brand-icon-sm">
                <Zap size={16} />
              </div>
              <span>Elevating Your Everyday Style & Living</span>
            </div>
          </div>

          {/* ── Right Form Side (Fits Desktop Screen, Perfectly Responsive on Mobile) ── */}
          <div className="login-form-side">
            <div className="login-top-bar">
              <Link to="/" className="login-back-btn">
                <ArrowLeft size={14} />
                <span>Back to Store</span>
              </Link>

              <Link to="/" className="login-brand-header">
                <div className="login-brand-icon">
                  <Zap size={18} />
                </div>
                <span className="login-brand-name">{t.siteName}</span>
              </Link>
            </div>

            <div className="login-heading-group">
              <h1 className="login-form-title">{t.auth.welcomeBack}</h1>
              <p className="login-form-subtitle">{t.auth.signInContinue}</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {/* Email Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  {t.auth.emailAddress}
                </label>
                <div className="login-input-group">
                  <input
                    id="login-email"
                    type="email"
                    className={`login-input-field${errors.email ? ' error' : ''}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  <Mail
                    size={18}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      color: 'var(--slate-400)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="form-group">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>
                    {t.auth.password}
                  </label>
                  <Link
                    to="/auth/forgot-password"
                    style={{
                      fontWeight: 600,
                      fontSize: 'var(--text-xs)',
                      color: '#4f46e5',
                    }}
                  >
                    {t.auth.forgotPassword}
                  </Link>
                </div>

                <div className="login-input-group">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    className={`login-input-field${errors.password ? ' error' : ''}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPass((p) => !p)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password}</p>}
              </div>

              {/* Remember Me & Admin Quick Access */}
              <div className="login-remember-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="login-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me on this device</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@ituza.com');
                    setPassword('admin123');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title="Fill Administrator demo credentials"
                >
                  ⚡ Admin demo
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="login-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>{t.auth.signingIn || 'Signing in...'}</span>
                  </>
                ) : (
                  <>
                    <span>{t.auth.signIn}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Social Logins */}
            <div className="login-or-divider">
              <div className="login-or-line" />
              <span className="login-or-text">Or continue with</span>
              <div className="login-or-line" />
            </div>

            <div className="login-social-grid">
              <button
                type="button"
                className="login-social-btn"
                onClick={() => handleSocialClick('Google')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                className="login-social-btn"
                onClick={() => handleSocialClick('Apple')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.64 1.34-.56.64-1.06 1.7-0.93 2.73 1.02.08 2.04-.47 2.65-1.22z" />
                </svg>
                <span>Apple</span>
              </button>
            </div>

            {/* Bottom Register Link */}
            <p className="login-bottom-text">
              {t.auth.noAccount}{' '}
              <Link to="/auth/register" className="login-bottom-link">
                {t.auth.createAccount}
              </Link>
            </p>

            {/* Trust and RootNexis Attribution */}
            <div className="login-trust-footer">
              <div className="login-trust-badges">
                <span className="login-trust-badge">
                  <ShieldCheck size={13} /> 256-Bit SSL Encrypted
                </span>
                <span className="login-trust-badge">
                  <CheckCircle2 size={13} /> 100% Privacy Protected
                </span>
              </div>
              <p className="login-rootnexis-credit">
                Created with precision by{' '}
                <a
                  href="https://rootnexis.kesug.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="login-rootnexis-link"
                >
                  RootNexis
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
