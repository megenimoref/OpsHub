import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, initFromStorage } = useAuthStore();

  React.useEffect(() => {
    initFromStorage();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Force TOTP setup if not yet configured
  if (user && !user.totpEnabled) {
    return <Navigate to="/setup-totp" replace />;
  }

  return <>{children}</>;
};
