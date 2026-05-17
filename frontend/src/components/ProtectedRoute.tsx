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
  const staffAllowedPaths = ['/personal-area', '/battalion/soldier', '/battalion/view', '/benefits', '/mailing', '/feedback', '/field-team', '/community'];
  const superAllowedPaths = ['/personal-area', '/battalion/soldier', '/battalion/allocate', '/battalion/user-soldiers', '/battalion/view', '/mailing', '/feedback', '/field-team'];
  const managerAllowedPaths = ['/dashboard', '/battalion/soldier', '/battalion/view', '/mailing'];
  const accountantAllowedPaths = ['/financial'];

  if (user && user.role === 'staff' && !staffAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/personal-area" replace />;
  }

  if (user && user.role === 'super' && !superAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/personal-area" replace />;
  }

  if (user && user.role === 'manager' && !managerAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user && user.role === 'accountant' && !accountantAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/financial" replace />;
  }

  return <>{children}</>;
};
