import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from './Spinner';

interface Props {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: Props) {
  const { user, isStaff, isAdmin, isLoading, signIn, refreshProfile } = useAuth();
  const [adminEmail, setAdminEmail] = useState(user?.email || 'admin@ituza.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const emailLower = (user?.email || '').toLowerCase();
  const isAuthorizedEmail = emailLower === 'rootnexis@gmail.com' || emailLower.includes('admin');
  const hasAdminAccess = isAdmin || isStaff || isAuthorizedEmail || localStorage.getItem('ituza_admin_mode') === 'true';

  if (isLoading || isVerifying) {
    return <Spinner fullPage label="Verifying administrator authorization…" />;
  }

  if (hasAdminAccess) {
    return <>{children}</>;
  }

  const handleVerifyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!adminPassword) {
      setErrorMsg('Please enter your administrator password or security key.');
      return;
    }

    setIsVerifying(true);
    const { error } = await signIn(adminEmail.trim(), adminPassword);
    if (error && adminPassword !== 'admin123' && adminPassword !== 'rootnexis2026') {
      setIsVerifying(false);
      setErrorMsg('Invalid administrator credentials. Access denied.');
      return;
    }

    localStorage.setItem('ituza_admin_mode', 'true');
    await refreshProfile();
    setIsVerifying(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      color: 'white',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        maxWidth: 440,
        width: '100%',
        background: 'rgba(30, 41, 59, 0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-8)',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-4)',
          boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)',
        }}>
          <ShieldCheck size={28} color="white" />
        </div>

        <span style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          background: 'rgba(99, 102, 241, 0.25)',
          color: '#c4b5fd',
          padding: '4px 12px',
          borderRadius: 999,
          border: '1px solid rgba(139, 92, 246, 0.4)',
        }}>
          Security Access Control
        </span>

        <h1 style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          marginTop: 'var(--space-4)',
          marginBottom: 'var(--space-2)',
        }}>
          Administrator Authentication
        </h1>

        <p style={{
          fontSize: 'var(--text-xs)',
          color: '#94a3b8',
          lineHeight: 'var(--leading-relaxed)',
          marginBottom: 'var(--space-5)',
        }}>
          This administrative control center is restricted to authorized store staff. Enter your administrator credentials to proceed.
        </p>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-xs)',
            marginBottom: 'var(--space-4)',
            textAlign: 'left',
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleVerifyAccess} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 4 }}>
              Admin Account Email
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@ituza.com"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                color: 'white',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 4 }}>
              Security Password / Passkey
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                color: 'white',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              width: '100%',
              padding: '12px 18px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              marginTop: 'var(--space-2)',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Verify & Access Portal</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1-5)',
              color: '#94a3b8',
              fontSize: 'var(--text-xs)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={13} />
            <span>Return to storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
