import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Zap, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';

export default function LoginPage() {
  const { t } = useT();
  const { signIn } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = `${t.auth.emailAddress} is required`;
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = `${t.auth.password} is required`;
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
      toastError('Sign in failed', error);
      return;
    }
    success(t.auth.welcomeBack, 'You are now signed in.');
    navigate(from, { replace: true });
  };

  return (
    <>
      <PageSeo title={t.auth.signIn} description="Sign in to your Storefront account." />
      <div className="auth-page">
        <div className="auth-panel">
          <div className="auth-card">
            <Link to="/" className="auth-logo">
              <div className="auth-logo-icon"><Zap size={18} /></div>
              {t.siteName}
            </Link>
            <h1 className="auth-title">{t.auth.welcomeBack}</h1>
            <p className="auth-subtitle">{t.auth.signInContinue}</p>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">{t.auth.emailAddress}</label>
                <div className="input-group">
                  <Mail size={16} className="input-icon-left" />
                  <input
                    id="login-email"
                    type="email"
                    className={`input${errors.email ? ' input-error' : ''}`}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  {t.auth.password}
                  <Link to="/auth/forgot-password" style={{ float: 'right', fontWeight: 400, fontSize: 'var(--text-xs)', color: 'var(--color-primary)' }}>
                    {t.auth.forgotPassword}
                  </Link>
                </label>
                <div className="input-group">
                  <Lock size={16} className="input-icon-left" />
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    className={`input${errors.password ? ' input-error' : ''}`}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="input-icon-right clickable"
                    onClick={() => setShowPass(p => !p)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password}</p>}
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={isLoading}>
                {isLoading ? t.auth.signingIn : t.auth.signIn}
              </button>
            </form>

            <p className="auth-footer-text">
              {t.auth.noAccount} <Link to="/auth/register">{t.auth.createAccount}</Link>
            </p>
          </div>
        </div>

        <div className="auth-hero">
          <div className="auth-hero-content">
            <h2 className="auth-hero-title">{t.home.heroTitle} {t.home.heroTitleAccent}</h2>
            <p className="auth-hero-desc">
              {t.home.heroDesc}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
