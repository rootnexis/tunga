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
  AlertCircle,
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
  const [duplicateAccountError, setDuplicateAccountError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: '' }));
    if (duplicateAccountError) setDuplicateAccountError(null);
  };

  // Password Strength Calculations
  const hasMinLength = form.password.length >= 8;
  const hasNumber = /\d/.test(form.password);
  const hasUpper = /[A-Z]/.test(form.password);
  const isMatch = form.password.length > 0 && form.password === form.confirm;

  const strengthScore = [hasMinLength, hasNumber, hasUpper].filter(Boolean).length;
  const strengthLabels = ['Weak', 'Moderate', 'Strong'];
  const strengthColors = ['#ef4444', '#f59e0b', '#10b981'];

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
      e.password = 'Must be at least 8 characters long';
    }
    if (!form.confirm) {
      e.confirm = 'Please confirm your password';
    } else if (form.password !== form.confirm) {
      e.confirm = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setDuplicateAccountError(null);
    if (!validate()) return;

    setIsLoading(true);
    const { error } = await signUp(
      form.email.trim(),
      form.password,
      form.firstName.trim(),
      form.lastName.trim()
    );
    setIsLoading(false);

    if (error) {
      if (error.toLowerCase().includes('already exists') || error.toLowerCase().includes('duplicate')) {
        setDuplicateAccountError(error);
      }
      toastError(t.auth.registrationFailed || 'Registration failed', error);
      return;
    }

    success('Account created!', `Welcome to Ituze, ${form.firstName.trim()}! You are now signed in.`);
    navigate('/account', { replace: true });
  };

  return (
    <>
      <PageSeo
        title={t.auth.createAccount}
        description="Join Ituze today and experience premium curated products with express dispatch."
      />

      <div className="login-page-wrapper">
        <div className="login-modal-box">
          {/* ── Left Feature Visual Banner (Desktop only - strictly hidden on mobile) ── */}
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

          {/* ── Right Form Side ── */}
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
              <Link to="/auth/login" className="auth-segmented-tab">
                <span>{t.auth.signIn}</span>
              </Link>
              <button type="button" className="auth-segmented-tab active">
                <span>{t.auth.createAccount}</span>
              </button>
            </div>

            <div className="login-heading-group">
              <h1 className="login-form-title">{t.auth.createAccount}</h1>
              <p className="login-form-subtitle">{t.auth.joinStorefront || 'Join Ituze today'}</p>
            </div>

            {/* Duplicate Account Alert Callout */}
            {duplicateAccountError && (
              <div className="auth-alert-banner">
                <AlertCircle size={16} />
                <div style={{ flex: 1 }}>
                  <span>{duplicateAccountError}</span>
                  <Link
                    to="/auth/login"
                    style={{ display: 'block', fontWeight: 700, marginTop: 2, color: '#dc2626' }}
                  >
                    Click here to sign in with this email →
                  </Link>
                </div>
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {/* First Name & Last Name (Side by side on desktop) */}
              <div className="login-form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="register-first-name">
                    {t.auth.firstName}
                  </label>
                  <div className="login-input-group">
                    <input
                      id="register-first-name"
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

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="register-last-name">
                    {t.auth.lastName}
                  </label>
                  <div className="login-input-group">
                    <input
                      id="register-last-name"
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
                <label className="form-label" htmlFor="register-email">
                  {t.auth.emailAddress}
                </label>
                <div className="login-input-group">
                  <input
                    id="register-email"
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

              {/* Password & Confirm Password (Side by side on desktop) */}
              <div className="login-form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="register-password">
                    {t.auth.password}
                  </label>
                  <div className="login-input-group">
                    <input
                      id="register-password"
                      type={showPass ? 'text' : 'password'}
                      className={`login-input-field${errors.password ? ' error' : ''}`}
                      value={form.password}
                      onChange={set('password')}
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="login-eye-btn"
                      onClick={() => setShowPass((p) => !p)}
                      aria-label="Toggle password visibility"
                    >
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {errors.password && <p className="form-error">{errors.password}</p>}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="register-confirm">
                    {t.auth.confirmPassword}
                  </label>
                  <div className="login-input-group">
                    <input
                      id="register-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      className={`login-input-field${errors.confirm ? ' error' : ''}`}
                      value={form.confirm}
                      onChange={set('confirm')}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="login-eye-btn"
                      onClick={() => setShowConfirm((p) => !p)}
                      aria-label="Toggle confirm visibility"
                    >
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {errors.confirm && <p className="form-error">{errors.confirm}</p>}
                </div>
              </div>

              {/* Password Strength Meter & Real-time Matching */}
              {form.password.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--slate-600)' }}>Password Strength:</span>
                    <strong style={{ color: strengthColors[Math.max(0, strengthScore - 1)] }}>
                      {strengthLabels[Math.max(0, strengthScore - 1)]}
                    </strong>
                  </div>
                  <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(strengthScore / 3) * 100}%`,
                      height: '100%',
                      background: strengthColors[Math.max(0, strengthScore - 1)],
                      transition: 'all 0.3s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: '0.7rem', color: 'var(--slate-500)', flexWrap: 'wrap' }}>
                    <span style={{ color: hasMinLength ? '#10b981' : 'inherit' }}>
                      {hasMinLength ? '✓' : '•'} 8+ characters
                    </span>
                    <span style={{ color: hasNumber ? '#10b981' : 'inherit' }}>
                      {hasNumber ? '✓' : '•'} 1+ number
                    </span>
                    <span style={{ color: hasUpper ? '#10b981' : 'inherit' }}>
                      {hasUpper ? '✓' : '•'} 1+ uppercase
                    </span>
                    {isMatch && (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        ✓ Passwords match
                      </span>
                    )}
                  </div>
                </div>
              )}

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

            {/* Bottom Sign In Link */}
            <p className="login-bottom-text">
              {t.auth.hasAccount}{' '}
              <Link to="/auth/login" className="login-bottom-link">
                {t.auth.signInHere}
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
