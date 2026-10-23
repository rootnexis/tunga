import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleFedCmPrompt } from './GoogleFedCmPrompt';

interface GoogleOneTapProps {
  redirectPath?: string;
  isSignUp?: boolean;
}

const STORAGE_ONE_TAP_DISMISSED = 'ituza_google_onetap_dismissed';

export function GoogleOneTap({ redirectPath = '/', isSignUp = false }: GoogleOneTapProps) {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated || user) {
      setIsOpen(false);
      return;
    }

    const isDismissed = sessionStorage.getItem(STORAGE_ONE_TAP_DISMISSED);
    if (isDismissed === 'true') {
      return;
    }

    // Auto-prompt on page visit like Google FedCM / One-Tap on Pinterest
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem(STORAGE_ONE_TAP_DISMISSED, 'true');
  };

  if (!isOpen || isAuthenticated) return null;

  return (
    <GoogleFedCmPrompt
      isOpen={isOpen}
      onClose={handleClose}
      redirectPath={redirectPath}
      isSignUp={isSignUp}
    />
  );
}
