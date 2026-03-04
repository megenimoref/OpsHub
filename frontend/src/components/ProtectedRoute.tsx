import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, initFromStorage } = useAuthStore();
  const location = useLocation();

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

  // Staff users can only access /personal-area and /battalion/soldier
  const staffAllowedPaths = ['/personal-area', '/battalion/soldier'];
  if (user && user.role === 'staff' && !staffAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/personal-area" replace />;
  }

  return <>{children}</>;
};
