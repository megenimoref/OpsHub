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

  // Role-based path restrictions
  const staffAllowedPaths = ['/personal-area', '/battalion/soldier', '/benefits'];
  const superAllowedPaths = ['/personal-area', '/battalion/soldier', '/battalion/allocate'];
  const managerAllowedPaths = ['/dashboard', '/battalion/soldier'];

  if (user && user.role === 'staff' && !staffAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/personal-area" replace />;
  }

  if (user && user.role === 'super' && !superAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/personal-area" replace />;
  }

  if (user && user.role === 'manager' && !managerAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
