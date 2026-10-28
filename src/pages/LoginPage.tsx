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
  AlertCircle,
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
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);

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
    setAuthError(null);
    if (!validate()) return;

    setIsLoading(true);
    const { error } = await signIn(email.trim(), password);
    setIsLoading(false);

    if (error) {
      setAuthError(error);
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

  return (
    <>
      <PageSeo
        title={t.auth.signIn}
        description="Sign in to your Ituze account to manage orders, track shipments, and access member benefits."
      />

      <div className="login-page-wrapper">
        <div className="login-modal-box">
          {/* ── Left Feature Visual Banner (Desktop - Hidden on mobile) ── */}
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

          {/* ── Right Form Container ── */}
          <div className="login-form-side">
            <div className="login-top-bar">
              <Link to="/" className="login-back-btn">
                <ArrowLeft size={14} />
                <span>{t.auth.backToStore || 'Back to Store'}</span>
              </Link>

              <Link to="/" className="login-brand-header">
                <div className="login-brand-icon">
                  <Zap size={18} />
                </div>
                <span className="login-brand-name">{t.siteName}</span>
              </Link>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="auth-segmented-switch">
              <button type="button" className="auth-segmented-tab active">
                <span>{t.auth.signIn}</span>
              </button>
              <Link to="/auth/register" className="auth-segmented-tab">
                <span>{t.auth.createAccount}</span>
              </Link>
            </div>

            <div className="login-heading-group">
              <h1 className="login-form-title">{t.auth.welcomeBack}</h1>
              <p className="login-form-subtitle">{t.auth.signInContinue}</p>
            </div>

            {/* In-Card Error Alert Banner if sign-in fails */}
            {authError && (
              <div className="auth-alert-banner">
                <AlertCircle size={16} />
                <div style={{ flex: 1 }}>
                  <span>{authError}</span>
                  {authError.toLowerCase().includes('no account') && (
                    <Link to="/auth/register" style={{ display: 'block', fontWeight: 700, marginTop: 2, color: '#dc2626' }}>
                      Click here to create an account →
                    </Link>
                  )}
                </div>
              </div>
            )}

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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                    }}
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

              {/* Remember Me */}
              <div className="login-remember-row" style={{ display: 'flex', alignItems: 'center' }}>
                <label className="login-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>{t.auth.rememberMe || 'Remember me on this device'}</span>
                </label>
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

            {/* Bottom Register Link */}
            <p className="login-bottom-text">
              {t.auth.noAccount}{' '}
              <Link to="/auth/register" className="login-bottom-link">
                {t.auth.createAccount}
              </Link>
            </p>

            {/* Trust and Attribution */}
            <div className="login-trust-footer">
              <div className="login-trust-badges">
                <span className="login-trust-badge">
                  <ShieldCheck size={13} /> {t.auth.sslEncrypted || '256-Bit SSL Encrypted'}
                </span>
                <span className="login-trust-badge">
                  <CheckCircle2 size={13} /> {t.auth.privacyProtected || '100% Privacy Protected'}
                </span>
              </div>
              <p className="login-rootnexis-credit">
                {t.auth.createdBy || 'Created with precision by'}{' '}
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
