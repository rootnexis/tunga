import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const { success, error: toastError } = useToast();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        // Live Supabase automatically detects the access_token in URL hash or query code
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          if (isMounted) setErrorMsg(error.message);
          toastError('Authentication failed', error.message);
          setTimeout(() => navigate('/auth/login', { replace: true }), 2500);
          return;
        }

        if (data?.session) {
          await refreshProfile();
          success('Welcome to Ituze!', 'Google authentication was successful.');
          navigate('/account', { replace: true });
        } else {
          // If no session found yet, wait briefly for listener
          setTimeout(async () => {
            const { data: delayedData } = await supabase.auth.getSession();
            if (delayedData?.session) {
              await refreshProfile();
              success('Welcome to Ituze!', 'Signed in successfully.');
              navigate('/account', { replace: true });
            } else {
              navigate('/auth/login', { replace: true });
            }
          }, 800);
        }
      } catch (err: any) {
        if (isMounted) setErrorMsg(err?.message || 'Unexpected OAuth error');
        setTimeout(() => navigate('/auth/login', { replace: true }), 2500);
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate, refreshProfile, success, toastError]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 15%, #ffffff 0%, #f1f5f9 100%)',
      padding: '24px',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        maxWidth: 420,
        width: '100%',
        background: '#ffffff',
        borderRadius: '24px',
        padding: '36px 28px',
        textAlign: 'center',
        boxShadow: '0 20px 50px -15px rgba(15, 23, 42, 0.12), 0 0 1px 1px rgba(15, 23, 42, 0.05)',
      }}>
        {errorMsg ? (
          <>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertCircle size={30} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: 8 }}>
              Authentication Error
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', marginBottom: 20 }}>
              {errorMsg}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>
              Redirecting you back to sign in…
            </p>
          </>
        ) : (
          <>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#e8f0fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Loader2 size={28} className="spin" color="#1a73e8" />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: 8 }}>
              Completing Google Sign-In
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', margin: 0 }}>
              Connecting with Google Identity Services and preparing your account…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
