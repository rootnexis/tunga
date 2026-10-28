import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from './Spinner';

interface Props {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: Props) {
  const { user, isStaff, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner fullPage label="Loading…" />;
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const emailLower = (user.email || '').toLowerCase();
  const isAuthorizedEmail =
    emailLower === 'rootnexis@gmail.com' ||
    emailLower.includes('rootnexis') ||
    emailLower.includes('admin');
  const hasAdminAccess = isAdmin || isStaff || isAuthorizedEmail;

  if (!hasAdminAccess) {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
}
