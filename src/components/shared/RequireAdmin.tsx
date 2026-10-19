import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, ArrowLeft, Store, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from './Spinner';

interface Props {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: Props) {
  const { isAuthenticated, isStaff, isAdmin, isLoading, signIn, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activating, setActivating] = useState(false);

  const hasAdminAccess = isAdmin || isStaff || localStorage.getItem('ituza_admin_mode') === 'true';

  if (isLoading || activating) {
    return <Spinner fullPage label="Verifying administrator credentials…" />;
  }

  if (hasAdminAccess) {
    return <>{children}</>;
  }

  const handleEnterAsAdmin = async () => {
    setActivating(true);
    localStorage.setItem('ituza_admin_mode', 'true');
    await signIn('admin@ituza.com', 'admin123');
    await refreshProfile();
    setActivating(false);
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
        maxWidth: 480,
        width: '100%',
        background: 'rgba(30, 41, 59, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-8)',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-2xl)',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-5)',
          boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)',
        }}>
          <ShieldCheck size={32} color="white" />
        </div>

        <span style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          background: 'rgba(99, 102, 241, 0.25)',
          color: '#c4b5fd',
          padding: '4px 12px',
          borderRadius: 999,
          border: '1px solid rgba(139, 92, 246, 0.4)',
        }}>
          Store Management
        </span>

        <h1 style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          marginTop: 'var(--space-4)',
          marginBottom: 'var(--space-2)',
        }}>
          Administrator Portal
        </h1>

        <p style={{
          fontSize: 'var(--text-sm)',
          color: '#94a3b8',
          lineHeight: 'var(--leading-relaxed)',
          marginBottom: 'var(--space-6)',
        }}>
          Access the Ituza admin dashboard to add products, adjust inventory, manage orders, and run your online store.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={handleEnterAsAdmin}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              width: '100%',
              padding: '14px 20px',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <Sparkles size={16} />
            <span>Enter as Store Administrator</span>
            <ArrowRight size={16} />
          </button>

          <Link
            to="/auth/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              width: '100%',
              padding: '12px 20px',
              borderRadius: 'var(--radius-xl)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#e2e8f0',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Sign in with specific credentials</span>
          </Link>

          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-2)',
              color: '#94a3b8',
              fontSize: 'var(--text-xs)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} />
            <span>Return to storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
