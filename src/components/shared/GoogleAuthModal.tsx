import React from 'react';
import { GoogleFedCmPrompt } from './GoogleFedCmPrompt';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
  isSignUp?: boolean;
}

export function GoogleAuthModal(props: GoogleAuthModalProps) {
  return <GoogleFedCmPrompt {...props} />;
}
