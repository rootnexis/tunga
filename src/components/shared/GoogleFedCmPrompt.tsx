import React, { useState } from 'react';
import { Loader2, ArrowLeft, Plus, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

interface GoogleFedCmAccount {
  email: string;
  name: string;
  type: 'detected' | 'saved' | 'custom';
  avatarType?: 'circuit' | 'letter';
  avatarColor?: string;
}

interface GoogleFedCmPromptProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
  isSignUp?: boolean;
}

export function GoogleFedCmPrompt({
  isOpen,
  onClose,
  redirectPath = '/',
  isSignUp = false,
}: GoogleFedCmPromptProps) {
  const { signInWithGoogle } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingAccountEmail, setLoadingAccountEmail] = useState('');
  const [viewMode, setViewMode] = useState<'primary' | 'switch' | 'new'>('primary');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  // Primary detected account and secondary choices
  const [accounts, setAccounts] = useState<GoogleFedCmAccount[]>([
    {
      email: 'rootnexis@gmail.com',
      name: 'RootNexis',
      type: 'detected',
      avatarType: 'circuit',
    },
    {
      email: 'shopper.demo@gmail.com',
      name: 'Demo Shopper',
      type: 'saved',
      avatarType: 'letter',
      avatarColor: 'linear-gradient(135deg, #4285F4, #34A853)',
    },
    {
      email: 'alex.murenzi@gmail.com',
      name: 'Alex Murenzi',
      type: 'saved',
      avatarType: 'letter',
      avatarColor: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
    },
  ]);

  if (!isOpen) return null;

  const handleSelectAccount = async (account: GoogleFedCmAccount) => {
    setIsLoading(true);
    setLoadingAccountEmail(account.email);

    setTimeout(async () => {
      const { error } = await signInWithGoogle(account.email, account.name);
      setIsLoading(false);

      if (error) {
        toastError('Google Sign-In failed', error);
        return;
      }

      success(
        isSignUp ? 'Google Account Connected!' : 'Welcome Back!',
        `Signed in securely as ${account.email}`
      );
      onClose();
      navigate(redirectPath, { replace: true });
    }, 650);
  };

  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const email = customEmail.trim();
    if (!email || !email.includes('@') || !email.includes('.')) {
      toastError('Invalid Email', 'Please enter a valid Google email address.');
      return;
    }

    let name = customName.trim();
    if (!name) {
      const prefix = email.split('@')[0];
      name = prefix
        .replace(/[._-]+/g, ' ')
        .split(' ')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
    }

    const newAcc: GoogleFedCmAccount = {
      email,
      name,
      type: 'custom',
      avatarType: 'letter',
      avatarColor: 'linear-gradient(135deg, #0EA5E9, #3B82F6)',
    };

    setAccounts((prev) => [newAcc, ...prev.filter((a) => a.email !== email)]);
    handleSelectAccount(newAcc);
  };

  const primaryAccount = accounts[0];

  return (
    <div
      className="google-fedcm-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-fedcm-title"
    >
      <div
        className="google-fedcm-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Scalloped Google Medallion Graphic with Constellation Dots */}
        <div className="google-fedcm-top-graphic">
          <svg width="220" height="72" viewBox="0 0 220 72" fill="none" aria-hidden="true">
            {/* Constellation dots and dashed coordinate tracks */}
            <g opacity="0.38" stroke="#80868b" strokeWidth="1" strokeDasharray="2 3">
              <line x1="24" y1="36" x2="68" y2="36" />
              <line x1="38" y1="20" x2="72" y2="20" />
              <line x1="152" y1="36" x2="196" y2="36" />
              <line x1="148" y1="52" x2="182" y2="52" />
            </g>
            <circle cx="32" cy="20" r="2.2" fill="#9aa0a6" opacity="0.65" />
            <circle cx="52" cy="36" r="2.6" fill="#bdc1c6" opacity="0.75" />
            <circle cx="64" cy="36" r="2.2" fill="#9aa0a6" opacity="0.65" />
            <circle cx="168" cy="36" r="2.6" fill="#bdc1c6" opacity="0.75" />
            <circle cx="180" cy="36" r="2.2" fill="#9aa0a6" opacity="0.65" />
            <circle cx="190" cy="52" r="2.2" fill="#9aa0a6" opacity="0.55" />

            {/* Medallion shape */}
            <g transform="translate(110, 36)">
              <path
                d="M 0 -25
                   C 4.5 -25, 8.5 -22.5, 12 -22.5
                   C 16 -22.5, 20 -25, 24.5 -23.5
                   C 28.5 -20.5, 29.5 -16.5, 32.5 -12.5
                   C 35.5 -8.5, 39.5 -5.5, 39.5 0
                   C 39.5 5.5, 35.5 8.5, 32.5 12.5
                   C 29.5 16.5, 28.5 20.5, 24.5 23.5
                   C 20 25, 16 22.5, 12 22.5
                   C 8.5 22.5, 4.5 25, 0 25
                   C -4.5 25, -8.5 22.5, -12 22.5
                   C -16 22.5, -20 25, -24.5 23.5
                   C -28.5 20.5, -29.5 16.5, -32.5 12.5
                   C -35.5 8.5, -39.5 5.5, -39.5 0
                   C -39.5 -5.5, -35.5 -8.5, -32.5 -12.5
                   C -29.5 -16.5, -28.5 -20.5, -24.5 -23.5
                   C -20 -25, -16 -22.5, -12 -22.5
                   C -8.5 -22.5, -4.5 -25, 0 -25 Z"
                fill="#2c2d31"
                stroke="#3c4043"
                strokeWidth="1"
              />
              {/* Google 4-color G Logo */}
              <g transform="translate(-13, -13) scale(1.08)">
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
              </g>
            </g>
          </svg>
        </div>

        {/* Title and Subtitle matching the screenshot */}
        <h2 id="google-fedcm-title" className="google-fedcm-title">
          Continue to ituze.com with google.com
        </h2>
        <p className="google-fedcm-subtitle">
          {viewMode === 'primary' ? 'Choose an account to continue' : 'Select or add an account to continue'}
        </p>

        {/* View Mode 1: Primary Account (Matches Screenshot Exactly) */}
        {viewMode === 'primary' && (
          <div className="google-fedcm-accounts-list">
            <div
              className={`google-fedcm-account-row${isLoading && loadingAccountEmail === primaryAccount.email ? ' loading' : ''}`}
              onClick={() => !isLoading && handleSelectAccount(primaryAccount)}
              role="button"
              tabIndex={0}
            >
              {/* Circuit Board Avatar for RootNexis matching screenshot */}
              <div className="google-fedcm-avatar-wrap">
                {primaryAccount.avatarType === 'circuit' ? (
                  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="19" fill="#0d2818" stroke="#10b981" strokeWidth="1" strokeOpacity="0.4" />
                    <path
                      d="M11 20h5l3-5h4l2 3h4M13 26h6l2-3h5M12 14h5l3 3h5"
                      stroke="#10b981"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="29" cy="18" r="1.5" fill="#34d399" />
                    <circle cx="27" cy="26" r="1.5" fill="#34d399" />
                    <circle cx="26" cy="14" r="1.5" fill="#34d399" />
                    <circle cx="11" cy="20" r="1.5" fill="#34d399" />
                  </svg>
                ) : (
                  <div className="google-fedcm-letter-avatar" style={{ background: primaryAccount.avatarColor }}>
                    <span>{primaryAccount.name.charAt(0)}</span>
                  </div>
                )}
              </div>

              {/* Account Details */}
              <div className="google-fedcm-account-details">
                <span className="google-fedcm-account-name">{primaryAccount.name}</span>
                <span className="google-fedcm-account-email">{primaryAccount.email}</span>
              </div>

              {/* Right Arrow indicator matching screenshot */}
              <div className="google-fedcm-arrow">
                {isLoading && loadingAccountEmail === primaryAccount.email ? (
                  <Loader2 size={16} className="spin" color="#8ab4f8" />
                ) : (
                  <span className="google-fedcm-play-arrow">►</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Mode 2: Account Chooser / Switch List */}
        {viewMode === 'switch' && (
          <div className="google-fedcm-accounts-list">
            {accounts.map((acc) => (
              <div
                key={acc.email}
                className={`google-fedcm-account-row${isLoading && loadingAccountEmail === acc.email ? ' loading' : ''}`}
                onClick={() => !isLoading && handleSelectAccount(acc)}
                role="button"
                tabIndex={0}
              >
                <div className="google-fedcm-avatar-wrap">
                  {acc.avatarType === 'circuit' ? (
                    <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
                      <circle cx="20" cy="20" r="19" fill="#0d2818" stroke="#10b981" strokeWidth="1" strokeOpacity="0.4" />
                      <path
                        d="M11 20h5l3-5h4l2 3h4M13 26h6l2-3h5M12 14h5l3 3h5"
                        stroke="#10b981"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="29" cy="18" r="1.5" fill="#34d399" />
                      <circle cx="27" cy="26" r="1.5" fill="#34d399" />
                      <circle cx="26" cy="14" r="1.5" fill="#34d399" />
                      <circle cx="11" cy="20" r="1.5" fill="#34d399" />
                    </svg>
                  ) : (
                    <div className="google-fedcm-letter-avatar" style={{ background: acc.avatarColor }}>
                      <span>{acc.name.charAt(0)}</span>
                    </div>
                  )}
                </div>

                <div className="google-fedcm-account-details">
                  <span className="google-fedcm-account-name">{acc.name}</span>
                  <span className="google-fedcm-account-email">{acc.email}</span>
                </div>

                <div className="google-fedcm-arrow">
                  {isLoading && loadingAccountEmail === acc.email ? (
                    <Loader2 size={16} className="spin" color="#8ab4f8" />
                  ) : (
                    <span className="google-fedcm-play-arrow">►</span>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              className="google-fedcm-add-btn"
              onClick={() => setViewMode('new')}
            >
              <Plus size={16} />
              <span>Add another Google account</span>
            </button>
          </div>
        )}

        {/* View Mode 3: Add New Google Account */}
        {viewMode === 'new' && (
          <form onSubmit={handleAddCustomAccount} className="google-fedcm-new-form">
            <button
              type="button"
              className="google-fedcm-back-btn"
              onClick={() => setViewMode('switch')}
            >
              <ArrowLeft size={14} />
              <span>Back to accounts</span>
            </button>

            <div className="google-fedcm-input-group">
              <label htmlFor="fedcm-email">Google Email Address</label>
              <input
                id="fedcm-email"
                type="email"
                placeholder="your.email@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="google-fedcm-input-group">
              <label htmlFor="fedcm-name">Your Full Name (Optional)</label>
              <input
                id="fedcm-name"
                type="text"
                placeholder="e.g. John Doe"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="google-fedcm-submit-new-btn"
              disabled={isLoading || !customEmail.trim()}
            >
              {isLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
              <span>Sign in with this account</span>
            </button>
          </form>
        )}

        {/* Bottom Actions Row matching the screenshot */}
        <div className="google-fedcm-actions-row">
          {viewMode === 'primary' ? (
            <button
              type="button"
              className="google-fedcm-pill-btn"
              onClick={() => setViewMode('switch')}
              disabled={isLoading}
            >
              Use a different account
            </button>
          ) : (
            <button
              type="button"
              className="google-fedcm-pill-btn"
              onClick={() => setViewMode('primary')}
              disabled={isLoading}
            >
              Back to detected account
            </button>
          )}

          <button
            type="button"
            className="google-fedcm-pill-btn"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
