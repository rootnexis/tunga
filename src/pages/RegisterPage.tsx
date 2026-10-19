import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Zap,
  Mail,
  User,
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

export default function RegisterPage() {
  const { t } = useT();
  const { signUp } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) {
      e.firstName = t.auth.firstName ? `${t.auth.firstName} is required` : 'First name is required';
    }
    if (!form.lastName.trim()) {
      e.lastName = t.auth.lastName ? `${t.auth.lastName} is required` : 'Last name is required';
    }
    if (!form.email.trim()) {
      e.email = t.auth.emailRequired || `${t.auth.emailAddress} is required`;
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      e.email = t.auth.validEmailRequired || 'Enter a valid email address';
    }
    if (!form.password) {
      e.password = t.auth.passwordRequired || `${t.auth.password} is required`;
    } else if (form.password.length < 8) {
      e.password = 'Must be at least 8 characters';
    }
    if (form.password !== form.confirm) {
      e.confirm = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const { error } = await signUp(form.email, form.password, form.firstName, form.lastName);
    setIsLoading(false);
    if (error) {
      toastError(t.auth.registrationFailed || 'Registration failed', error);
      return;
    }
    success('Account created!', 'Check your email to verify your account.');
    navigate('/auth/verify-email');
  };

  const handleSocialClick = (provider: string) => {
    toastError(
      `${provider} Sign-Up`,
      `Direct ${provider} sign-up will connect to your account. You can also sign up with email and password below.`
    );
  };

  return (
    <>
      <PageSeo
        title={t.auth.createAccount}
        description="Join Ituza today and experience premium curated products with express dispatch."
      />

      <div className="login-page-wrapper">
        <div className="login-modal-box">
          {/* ── Left Visual Banner (Desktop only - strictly hidden on mobile) ── */}
          <div className="login-feature-banner" aria-hidden="true">
            <div className="login-banner-image-wrap">
              <img
                src={loginIllustration}
                alt="Ituza Experience"
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

          {/* ── Right Form Side (Fits Desktop Screen, Responsive on Mobile) ── */}
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
              <h1 className="login-form-title">{t.auth.createAccount}</h1>
              <p className="login-form-subtitle">{t.auth.joinStorefront}</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {/* Names row - 2 columns */}
              <div className="login-row-2col">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-first">
                    {t.auth.firstName}
                  </label>
                  <div className="login-input-group">
                    <input
                      id="reg-first"
                      type="text"
                      className={`login-input-field${errors.firstName ? ' error' : ''}`}
                      value={form.firstName}
                      onChange={set('firstName')}
                      placeholder="Jane"
                      autoComplete="given-name"
                    />
                    <User
                      size={17}
                      style={{
                        position: 'absolute',
                        right: '14px',
                        color: 'var(--slate-400)',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                  {errors.firstName && <p className="form-error">{errors.firstName}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-last">
                    {t.auth.lastName}
                  </label>
                  <div className="login-input-group">
                    <input
                      id="reg-last"
                      type="text"
                      className={`login-input-field${errors.lastName ? ' error' : ''}`}
                      value={form.lastName}
                      onChange={set('lastName')}
                      placeholder="Doe"
                      autoComplete="family-name"
                    />
                    <User
                      size={17}
                      style={{
                        position: 'absolute',
                        right: '14px',
                        color: 'var(--slate-400)',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                  {errors.lastName && <p className="form-error">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">
                  {t.auth.emailAddress}
                </label>
                <div className="login-input-group">
                  <input
                    id="reg-email"
                    type="email"
                    className={`login-input-field${errors.email ? ' error' : ''}`}
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  <Mail
                    size={17}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      color: 'var(--slate-400)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>

              {/* Password & Confirm Password Row */}
              <div className="login-row-2col">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-pass">
                    {t.auth.password}
                  </label>
                  <div className="login-input-group">
                    <input
                      id="reg-pass"
                      type={showPass ? 'text' : 'password'}
                      className={`login-input-field${errors.password ? ' error' : ''}`}
                      value={form.password}
                      onChange={set('password')}
                      placeholder="Min. 8 chars"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="login-eye-btn"
                      onClick={() => setShowPass((p) => !p)}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="form-error">{errors.password}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-confirm">
                    {t.auth.confirmPassword}
                  </label>
                  <div className="login-input-group">
                    <input
                      id="reg-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      className={`login-input-field${errors.confirm ? ' error' : ''}`}
                      value={form.confirm}
                      onChange={set('confirm')}
                      placeholder="Repeat pass"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="login-eye-btn"
                      onClick={() => setShowConfirm((p) => !p)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirm && <p className="form-error">{errors.confirm}</p>}
                </div>
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
                    <span>{t.auth.registering || 'Creating account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{t.auth.registerBtn}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <p style={{ fontSize: '0.72rem', color: 'var(--slate-500)', textAlign: 'center', margin: '2px 0 0' }}>
                By creating an account, you agree to our{' '}
                <Link to="/terms" style={{ color: '#4f46e5', fontWeight: 600 }}>Terms</Link> and{' '}
                <Link to="/privacy" style={{ color: '#4f46e5', fontWeight: 600 }}>Privacy Policy</Link>.
              </p>
            </form>

            {/* Social Logins */}
            <div className="login-or-divider" style={{ margin: '8px 0' }}>
              <div className="login-or-line" />
              <span className="login-or-text">Or sign up with</span>
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

            {/* Bottom Sign In Link */}
            <p className="login-bottom-text">
              {t.auth.hasAccount}{' '}
              <Link to="/auth/login" className="login-bottom-link">
                {t.auth.signInHere}
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
