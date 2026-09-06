import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useT } from '@/contexts/LanguageContext';
import { PageSeo } from '@/components/shared/PageSeo';

export default function RegisterPage() {
  const { t } = useT();
  const { signUp } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = `${t.auth.firstName} is required`;
    if (!form.lastName.trim())  e.lastName  = `${t.auth.lastName} is required`;
    if (!form.email.trim())     e.email     = `${t.auth.emailAddress} is required`;
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = `${t.auth.password} is required`;
    else if (form.password.length < 8) e.password = 'Must be at least 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const { error } = await signUp(form.email, form.password, form.firstName, form.lastName);
    setIsLoading(false);
    if (error) { toastError('Registration failed', error); return; }
    success('Account created!', 'Check your email to verify your account.');
    navigate('/auth/verify-email');
  };

  return (
    <>
      <PageSeo title={t.auth.createAccount} description="Join Storefront and start shopping today." />
      <div className="auth-page">
        <div className="auth-panel">
          <div className="auth-card">
            <Link to="/" className="auth-logo">
              <div className="auth-logo-icon"><Zap size={18} /></div>
              {t.siteName}
            </Link>
            <h1 className="auth-title">{t.auth.createAccount}</h1>
            <p className="auth-subtitle">{t.auth.joinStorefront}</p>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-first">{t.auth.firstName}</label>
                  <div className="input-group">
                    <User size={16} className="input-icon-left" />
                    <input id="reg-first" type="text" className={`input${errors.firstName ? ' input-error' : ''}`} value={form.firstName} onChange={set('firstName')} placeholder="Jane" autoComplete="given-name" />
                  </div>
                  {errors.firstName && <p className="form-error">{errors.firstName}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-last">{t.auth.lastName}</label>
                  <div className="input-group">
                    <User size={16} className="input-icon-left" />
                    <input id="reg-last" type="text" className={`input${errors.lastName ? ' input-error' : ''}`} value={form.lastName} onChange={set('lastName')} placeholder="Doe" autoComplete="family-name" />
                  </div>
                  {errors.lastName && <p className="form-error">{errors.lastName}</p>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">{t.auth.emailAddress}</label>
                <div className="input-group">
                  <Mail size={16} className="input-icon-left" />
                  <input id="reg-email" type="email" className={`input${errors.email ? ' input-error' : ''}`} value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
                </div>
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-pass">{t.auth.password}</label>
                <div className="input-group">
                  <Lock size={16} className="input-icon-left" />
                  <input id="reg-pass" type={showPass ? 'text' : 'password'} className={`input${errors.password ? ' input-error' : ''}`} value={form.password} onChange={set('password')} placeholder="Min. 8 characters" autoComplete="new-password" />
                  <button type="button" className="input-icon-right clickable" onClick={() => setShowPass(p => !p)} aria-label="Toggle password">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm">{t.auth.confirmPassword}</label>
                <div className="input-group">
                  <Lock size={16} className="input-icon-left" />
                  <input id="reg-confirm" type={showPass ? 'text' : 'password'} className={`input${errors.confirm ? ' input-error' : ''}`} value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" autoComplete="new-password" />
                </div>
                {errors.confirm && <p className="form-error">{errors.confirm}</p>}
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={isLoading}>
                {isLoading ? t.auth.registering : t.auth.registerBtn}
              </button>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textAlign: 'center', lineHeight: 'var(--leading-relaxed)' }}>
                By creating an account, you agree to our{' '}
                <Link to="/terms" style={{ color: 'var(--color-primary)' }}>{t.policies.terms}</Link> and{' '}
                <Link to="/privacy" style={{ color: 'var(--color-primary)' }}>{t.policies.privacy}</Link>.
              </p>
            </form>

            <p className="auth-footer-text">
              {t.auth.hasAccount} <Link to="/auth/login">{t.auth.signInHere}</Link>
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
