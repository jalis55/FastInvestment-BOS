// RoleRoute.jsx (independent of RequiredAuth)
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/use-auth';

export default function RoleRoute({ roles = [], menuPath, children }) {
  const { user, hasRole } = useAuth();
  const location = useLocation();
  const menuAccess = user?.menuAccess;
  const hasAccess = hasRole(roles) && (
    user?.is_super_admin || !menuPath || menuAccess == null || menuAccess.includes(menuPath)
  );

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return hasAccess ? children : <Navigate to="/" replace />;
}
