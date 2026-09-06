import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';

export default function ForgotPasswordPage() {
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setErr('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setErr('Enter a valid email address'); return; }
    setErr('');
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setIsLoading(false);
    if (error) { toastError('Could not send email', error.message); return; }
    success('Email sent', 'Check your inbox for the reset link.');
    setSent(true);
  };

  return (
    <>
      <PageSeo title="Forgot Password" description="Reset your Storefront account password." />
      <div className="auth-page">
        <div className="auth-panel">
          <div className="auth-card">
            <Link to="/" className="auth-logo">
              <div className="auth-logo-icon"><Zap size={18} /></div>
              Storefront
            </Link>

            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--emerald-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-5)' }}>
                  <CheckCircle size={32} color="var(--emerald-500)" />
                </div>
                <h1 className="auth-title">Check your inbox</h1>
                <p className="auth-subtitle">
                  We sent a password reset link to <strong>{email}</strong>. The link expires in 1 hour.
                </p>
                <Link to="/auth/login" className="btn btn-secondary w-full" style={{ marginTop: 'var(--space-4)' }}>
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                <h1 className="auth-title">Forgot password?</h1>
                <p className="auth-subtitle">No worries — enter your email and we'll send you a reset link.</p>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="forgot-email">Email address</label>
                    <div className="input-group">
                      <Mail size={16} className="input-icon-left" />
                      <input
                        id="forgot-email"
                        type="email"
                        className={`input${err ? ' input-error' : ''}`}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                    {err && <p className="form-error">{err}</p>}
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg w-full" disabled={isLoading}>
                    {isLoading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                  <Link to="/auth/login" className="btn btn-ghost btn-lg w-full" style={{ justifyContent: 'center' }}>
                    <ArrowLeft size={16} />
                    Back to Sign In
                  </Link>
                </form>
              </>
            )}
          </div>
        </div>
        <div className="auth-hero">
          <div className="auth-hero-content">
            <h2 className="auth-hero-title">We've got you covered</h2>
            <p className="auth-hero-desc">Password resets are quick and secure. You'll be back shopping in no time.</p>
          </div>
        </div>
      </div>
    </>
  );
}
