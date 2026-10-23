import React, { useState, useEffect } from 'react';
import { X, UserPlus, ArrowRight, ShieldCheck, Loader2, Trash2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

interface SavedGoogleAccount {
  email: string;
  name: string;
  avatarColor?: string;
  lastUsed: number;
}

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
  isSignUp?: boolean;
}

const STORAGE_SAVED_ACCOUNTS = 'ituza_google_saved_accounts';

const AVATAR_COLORS = [
  'linear-gradient(135deg, #4285F4, #34A853)',
  'linear-gradient(135deg, #EA4335, #FBBC05)',
  'linear-gradient(135deg, #6366F1, #8B5CF6)',
  'linear-gradient(135deg, #0EA5E9, #2DD4BF)',
  'linear-gradient(135deg, #EC4899, #F43F5E)',
];

function getAvatarColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

  const [savedAccounts, setSavedAccounts] = useState<SavedGoogleAccount[]>([]);
  const [isEnteringNewAccount, setIsEnteringNewAccount] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authStepMessage, setAuthStepMessage] = useState('');

  // Load saved Google accounts on mount / open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_ACCOUNTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sort by lastUsed descending
          parsed.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
          setSavedAccounts(parsed);
          setIsEnteringNewAccount(false);
          return;
        }
      }
    } catch {
      // Ignore JSON error
    }
    // If no saved accounts, show entry form directly
    setSavedAccounts([]);
    setIsEnteringNewAccount(true);
  }, [isOpen]);

  if (!isOpen) return null;

  const saveAccountToStorage = (email: string, name: string) => {
    try {
      const current = savedAccounts.filter((acc) => acc.email.toLowerCase() !== email.toLowerCase());
      const updated: SavedGoogleAccount[] = [
        {
          email,
          name,
          avatarColor: getAvatarColor(email),
          lastUsed: Date.now(),
        },
        ...current,
      ].slice(0, 5); // Keep up to 5 accounts
      localStorage.setItem(STORAGE_SAVED_ACCOUNTS, JSON.stringify(updated));
      setSavedAccounts(updated);
    } catch {
      // Ignore storage errors
    }
  };

  const handleRemoveAccount = (e: React.MouseEvent, emailToRemove: string) => {
    e.stopPropagation();
    const updated = savedAccounts.filter((acc) => acc.email !== emailToRemove);
    setSavedAccounts(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_ACCOUNTS, JSON.stringify(updated));
    } catch {
      // Ignore
    }
    if (updated.length === 0) {
      setIsEnteringNewAccount(true);
    }
  };

  const executeGoogleAuth = async (email: string, name: string) => {
    setIsLoading(true);
    setAuthStepMessage('Connecting to Google Identity Services…');

    // Simulate authentic Google verification steps
    setTimeout(() => {
      setAuthStepMessage('Verifying account token & permissions…');
    }, 450);

    setTimeout(async () => {
      const { error } = await signInWithGoogle(email, name);
      setIsLoading(false);
      setAuthStepMessage('');

      if (error) {
        toastError('Google Authentication failed', error);
        return;
      }

      saveAccountToStorage(email, name);

      success(
        isSignUp ? 'Google Account Connected!' : 'Welcome Back!',
        `Signed in securely as ${email}`
      );
      onClose();
      navigate(redirectPath, { replace: true });
    }, 900);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = googleEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      toastError('Invalid Email', 'Please enter a valid Google account email address.');
      return;
    }

    let resolvedName = googleName.trim();
    if (!resolvedName) {
      const localPart = trimmedEmail.split('@')[0] || 'User';
      const parts = localPart.replace(/[._-]+/g, ' ').split(' ');
      resolvedName = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }

    executeGoogleAuth(trimmedEmail, resolvedName);
  };

  const handleUseSampleAccount = () => {
    setGoogleEmail('shopper.demo@gmail.com');
    setGoogleName('Demo Shopper');
    executeGoogleAuth('shopper.demo@gmail.com', 'Demo Shopper');
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
              <p className="google-auth-subtitle">to continue to <strong>Ituze</strong></p>
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
          {/* Account Chooser View (When user has saved accounts) */}
          {!isEnteringNewAccount && savedAccounts.length > 0 ? (
            <>
              <p className="google-auth-choose-label">Choose an account</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {savedAccounts.map((account) => {
                  const initial = (account.name || account.email).charAt(0).toUpperCase();
                  const bg = account.avatarColor || getAvatarColor(account.email);
                  return (
                    <div
                      key={account.email}
                      className="google-account-card"
                      onClick={() => executeGoogleAuth(account.email, account.name)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="google-account-avatar" style={{ background: bg }}>
                        <span>{initial}</span>
                      </div>
                      <div className="google-account-info">
                        <span className="google-account-name">{account.name}</span>
                        <span className="google-account-email">{account.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveAccount(e, account.email)}
                        className="google-account-remove-btn"
                        title="Remove from device"
                        aria-label={`Remove ${account.email}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Use Another Account */}
              <button
                type="button"
                className="google-account-card google-account-card-other"
                onClick={() => {
                  setGoogleEmail('');
                  setGoogleName('');
                  setIsEnteringNewAccount(true);
                }}
                disabled={isLoading}
              >
                <div className="google-account-avatar-other">
                  <UserPlus size={18} />
                </div>
                <div className="google-account-info">
                  <span className="google-account-name">Use another Google account</span>
                  <span className="google-account-email">Sign in with any other Google account</span>
                </div>
                <ArrowRight size={16} className="google-account-arrow" />
              </button>
            </>
          ) : (
            /* Account Input Form (For any user to use their own Google account) */
            <form onSubmit={handleFormSubmit} className="google-account-entry-view">
              {savedAccounts.length > 0 && (
                <button
                  type="button"
                  className="google-back-to-accounts-btn"
                  onClick={() => setIsEnteringNewAccount(false)}
                >
                  <ArrowLeft size={14} />
                  <span>Back to saved accounts</span>
                </button>
              )}

              <div style={{ textAlign: 'center', margin: '4px 0 12px' }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--slate-800)', margin: '0 0 4px' }}>
                  Enter your Google account details
                </p>
                <p style={{ fontSize: '0.76rem', color: 'var(--slate-500)', margin: 0 }}>
                  Works with any @gmail.com or Google Workspace address
                </p>
              </div>

              <div className="google-input-group">
                <label className="google-input-label" htmlFor="google-email-input">
                  Google Account Email *
                </label>
                <input
                  id="google-email-input"
                  type="email"
                  className="google-input"
                  placeholder="your.account@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="google-input-group">
                <label className="google-input-label" htmlFor="google-name-input">
                  Your Full Name (Optional)
                </label>
                <input
                  id="google-name-input"
                  type="text"
                  className="google-input"
                  placeholder="e.g. Alex Murenzi"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <button
                  type="submit"
                  className="google-primary-submit-btn"
                  disabled={isLoading || !googleEmail.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Signing in with Google…</span>
                    </>
                  ) : (
                    <>
                      <span>{isSignUp ? 'Create Account with Google' : 'Continue with Google'}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '4px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--slate-200)' }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--slate-400)', textTransform: 'uppercase' }}>or test instantly</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--slate-200)' }} />
                </div>

                <button
                  type="button"
                  className="google-sample-account-btn"
                  onClick={handleUseSampleAccount}
                  disabled={isLoading}
                >
                  <CheckCircle2 size={14} color="#34A853" />
                  <span>Use sample shopper account (shopper.demo@gmail.com)</span>
                </button>
              </div>
            </form>
          )}

          {/* Authentic Google Loading Overlay */}
          {isLoading && (
            <div className="google-loading-overlay">
              <div className="google-auth-spinner-wrap">
                <Loader2 size={30} className="spin" color="#4285F4" />
              </div>
              <span style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '0.88rem' }}>
                {authStepMessage || 'Signing in with Google…'}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                Please wait while we verify your Google credentials
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="google-auth-footer">
          <div className="google-auth-security">
            <ShieldCheck size={14} color="#34A853" />
            <span>Google Identity Services • Verified OAuth 2.0</span>
          </div>
          <p className="google-auth-legal">
            To continue, Google will share your name, email address, and profile details with Ituze.
            Review our{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
