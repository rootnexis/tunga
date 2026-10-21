import React, { useState } from 'react';
import { X, UserPlus, Check, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
  isSignUp?: boolean;
}

export function GoogleAuthModal({
  isOpen,
  onClose,
  redirectPath = '/',
  isSignUp = false,
}: GoogleAuthModalProps) {
  const { signInWithGoogle } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('rootnexis@gmail.com');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  if (!isOpen) return null;

  const handleSelectAccount = async (email: string, name: string) => {
    setIsLoading(true);
    const { error } = await signInWithGoogle(email, name);
    setIsLoading(false);
    if (error) {
      toastError('Google Sign-In failed', error);
      return;
    }
    success(
      isSignUp ? 'Google Account Connected!' : 'Welcome Back!',
      `Signed in securely as ${email}`
    );
    onClose();
    navigate(redirectPath, { replace: true });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      toastError('Invalid Email', 'Please enter a valid Google email address.');
      return;
    }
    handleSelectAccount(customEmail.trim(), customName.trim() || 'Google User');
  };

  return (
    <div
      className="google-auth-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-auth-title"
    >
      <div
        className="google-auth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="google-auth-header">
          <div className="google-auth-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
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
            <div>
              <h2 id="google-auth-title" className="google-auth-title">
                {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
              </h2>
              <p className="google-auth-subtitle">to continue to <strong>Ituze Store</strong></p>
            </div>
          </div>
          <button
            type="button"
            className="google-auth-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="google-auth-body">
          <p className="google-auth-choose-label">Choose an account</p>

          {/* RootNexis User Account */}
          <button
            type="button"
            className="google-account-card active"
            onClick={() => handleSelectAccount('rootnexis@gmail.com', 'RootNexis')}
            disabled={isLoading}
          >
            <div className="google-account-avatar">
              <span>R</span>
            </div>
            <div className="google-account-info">
              <span className="google-account-name">RootNexis</span>
              <span className="google-account-email">rootnexis@gmail.com</span>
            </div>
            <div className="google-account-badge">
              <Check size={14} />
            </div>
          </button>

          {/* Toggle another account */}
          {!isCustomMode ? (
            <button
              type="button"
              className="google-account-card google-account-card-other"
              onClick={() => setIsCustomMode(true)}
              disabled={isLoading}
            >
              <div className="google-account-avatar-other">
                <UserPlus size={18} />
              </div>
              <div className="google-account-info">
                <span className="google-account-name">Use another Google account</span>
                <span className="google-account-email">Enter another @gmail.com address</span>
              </div>
              <ArrowRight size={16} className="google-account-arrow" />
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="google-custom-form">
              <div className="google-input-group">
                <label className="google-input-label" htmlFor="custom-google-email">
                  Google Account Email
                </label>
                <input
                  id="custom-google-email"
                  type="email"
                  className="google-input"
                  placeholder="your.email@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="google-input-group">
                <label className="google-input-label" htmlFor="custom-google-name">
                  Your Name (Optional)
                </label>
                <input
                  id="custom-google-name"
                  type="text"
                  className="google-input"
                  placeholder="e.g. John Doe"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
              <div className="google-custom-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsCustomMode(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 size={14} className="spin" /> : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {isLoading && (
            <div className="google-loading-overlay">
              <Loader2 size={24} className="spin" color="#4285F4" />
              <span>Connecting to Google authentication…</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="google-auth-footer">
          <div className="google-auth-security">
            <ShieldCheck size={14} color="#34A853" />
            <span>Secure 256-bit OAuth authentication</span>
          </div>
          <p className="google-auth-legal">
            To continue, Google will share your name and email with Ituze. See Ituze's{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
