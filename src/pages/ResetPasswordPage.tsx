import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';

export default function ResetPasswordPage() {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  // Password strength calculation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const isMatch = password.length > 0 && password === confirmPassword;

  const strengthScore = [hasMinLength, hasNumber, hasUpper].filter(Boolean).length;
  const strengthLabels = ['Weak', 'Moderate', 'Strong'];
  const strengthColors = ['#ef4444', '#f59e0b', '#10b981'];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!password) {
      e.password = 'New password is required';
    } else if (password.length < 8) {
      e.password = 'Password must be at least 8 characters long';
    }
    if (!confirmPassword) {
      e.confirm = 'Please confirm your new password';
    } else if (password !== confirmPassword) {
      e.confirm = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toastError('Password update failed', error.message);
      return;
    }

    success('Password updated!', 'You can now sign in with your new password.');
    setIsSuccess(true);
    setTimeout(() => {
      navigate('/auth/login', { replace: true });
    }, 2000);
  };

  return (
    <>
      <PageSeo title="Set New Password — Ituze" description="Set a secure new password for your Ituze account." />

      <div className="login-page-wrapper">
        <div className="login-modal-box" style={{ maxWidth: 460, gridTemplateColumns: '1fr', padding: '24px' }}>
          <div className="login-form-side" style={{ padding: '8px' }}>
            {/* Top Brand Header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Link to="/" className="login-brand-header" style={{ justifyContent: 'center', margin: '0 auto 12px' }}>
                <div className="login-brand-icon" style={{ background: 'transparent', boxShadow: 'none', padding: 0, overflow: 'hidden' }}>
                  <img
                    src="/assets/aistudio/ituze-favicon-1_10b6b826.svg"
                    alt="Ituze"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: 'inherit' }}
                  />
                </div>
                <span className="login-brand-name">Ituze</span>
              </Link>

              <h1 className="login-form-title" style={{ fontSize: '1.4rem' }}>
                {isSuccess ? 'Password Reset Successful' : 'Create New Password'}
              </h1>
              <p className="login-form-subtitle">
                {isSuccess
                  ? 'Your password has been securely updated. Redirecting to sign in…'
                  : 'Enter a strong password to protect your Ituze account.'}
              </p>
            </div>

            {isSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', marginBottom: 20 }}>
                  You are all set! You can now log into your account with your new password.
                </p>
                <Link to="/auth/login" className="login-submit-btn" style={{ textDecoration: 'none' }}>
                  <span>Proceed to Sign In</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            ) : (
              <form className="login-form" onSubmit={handleSubmit} noValidate>
                {/* New Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="new-password">New Password</label>
                  <div className="login-input-group">
                    <input
                      id="new-password"
                      type={showPass ? 'text' : 'password'}
                      className={`login-input-field${errors.password ? ' error' : ''}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="login-eye-btn"
                      onClick={() => setShowPass(!showPass)}
                      aria-label="Toggle password visibility"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="form-error">{errors.password}</p>}

                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4, height: 4, borderRadius: 2, overflow: 'hidden', background: '#e2e8f0' }}>
                        <div style={{
                          width: `${(strengthScore / 3) * 100}%`,
                          background: strengthColors[Math.max(0, strengthScore - 1)] || '#ef4444',
                          transition: 'all 0.3s ease',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                        <span>Strength: <strong style={{ color: strengthColors[Math.max(0, strengthScore - 1)] }}>{strengthLabels[Math.max(0, strengthScore - 1)]}</strong></span>
                        <span>{hasMinLength && hasNumber && hasUpper ? '✓ All requirements met' : 'Include uppercase & number'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
                  <div className="login-input-group">
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      className={`login-input-field${errors.confirm ? ' error' : ''}`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="login-eye-btn"
                      onClick={() => setShowConfirm(!showConfirm)}
                      aria-label="Toggle confirm visibility"
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirm && <p className="form-error">{errors.confirm}</p>}
                  {isMatch && !errors.confirm && (
                    <p style={{ fontSize: '0.74rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <CheckCircle2 size={13} /> Passwords match
                    </p>
                  )}
                </div>

                <button type="submit" className="login-submit-btn" disabled={isLoading}>
                  {isLoading ? 'Updating Password…' : 'Save New Password & Sign In'}
                </button>

                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <Link to="/auth/login" style={{ fontSize: '0.82rem', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                    Return to Sign In
                  </Link>
                </div>
              </form>
            )}

            <div className="login-trust-footer" style={{ marginTop: 24 }}>
              <div className="login-trust-badges">
                <span className="login-trust-badge"><ShieldCheck size={13} /> 256-Bit SSL Encrypted</span>
                <span className="login-trust-badge"><CheckCircle2 size={13} /> 100% Privacy Protected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
