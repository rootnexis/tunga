import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from './Spinner';

interface Props {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: Props) {
  const { isAuthenticated, isStaff, isAdmin, isLoading } = useAuth();

  if (isLoading) return <Spinner fullPage />;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!isStaff && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
